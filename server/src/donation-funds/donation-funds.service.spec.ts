import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FundStatus, Prisma } from '@prisma/client';

import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { DonationFundsService } from './donation-funds.service';
import type { CreateDonationFundDto } from './dto/create-donation-fund.dto';
import type { UpdateDonationFundDto } from './dto/update-donation-fund.dto';

/**
 * Donation funds.
 *
 * Four things carry the weight in this file.
 *
 * The mosque comes from the token and from nowhere else, which the last block asserts directly: no method
 * accepts a mosque id, and every query carries the caller's own.
 *
 * A fund from another mosque is a 404 rather than a 403, so the refusal says nothing about whether the row
 * exists.
 *
 * Money never becomes a float. The amount goes in as a `Prisma.Decimal` and comes out as an exact string,
 * and the case below uses a value binary floating point cannot hold to prove it.
 *
 * And a fund that is in use refuses to be deleted, because deleting one would leave the records filed under
 * it pointing at nothing.
 */

const MOSQUE_ID = 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0';
const OTHER_MOSQUE_ID = 'd0b80121-7ac0-11d1-898c-00c04fd8d5c1';
const FUND_ID = '1b4e28ba-2fa1-11d2-883f-0016d3cca427';

/** A treasurer of `MOSQUE_ID`. The role is incidental — nothing in the service reads it. */
const ACTOR: AuthenticatedUser = {
  id: '9c8b7a65-4321-4f6a-8c11-2d5e7a9b0c31',
  mosqueId: MOSQUE_ID,
  email: 'treasurer@noor.example',
  role: 'treasurer',
  permissions: [],
  deniedPermissions: [],
  isActive: true,
};

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: FUND_ID,
    name: 'Zakat',
    slug: 'zakat',
    description: 'Obligatory annual charity.',
    status: FundStatus.active,
    targetAmount: new Prisma.Decimal('500000.00'),
    openingBalance: new Prisma.Decimal('0.00'),
    startDate: new Date('2026-03-01T00:00:00.000Z'),
    endDate: new Date('2026-03-31T00:00:00.000Z'),
    isPublic: true,
    createdAt: new Date('2026-02-01T10:00:00.000Z'),
    updatedAt: new Date('2026-02-01T10:00:00.000Z'),
    _count: { campaigns: 0 },
    ...overrides,
  };
}

describe('DonationFundsService', () => {
  let service: DonationFundsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DonationFundsService,
        {
          provide: PrismaService,
          useValue: {
            donationFund: {
              count: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            // `remove` counts donations filed under the fund before deleting it. Only that path touches
            // this table, which is why it is a bare `count` rather than a full model mock.
            donation: { count: jest.fn().mockResolvedValue(0) },
            // The service transacts the count with the page. The mock resolves the array it is handed,
            // which is what `$transaction([...])` does with already-issued promises.
            $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
          },
        },
      ],
    }).compile();

    service = module.get(DonationFundsService);
    prisma = module.get(PrismaService);
  });

  const funds = () => prisma.donationFund as unknown as Record<string, jest.Mock>;
  const donations = () => prisma.donation as unknown as Record<string, jest.Mock>;

  /** The `data` a write was given, typed so an assertion is not reading `any` off a jest mock. */
  const writtenData = (call: jest.Mock): Record<string, unknown> =>
    (call.mock.calls[0][0] as { data: Record<string, unknown> }).data;

  /** The `where` a query was given. */
  const queriedWhere = (call: jest.Mock): Record<string, unknown> =>
    (call.mock.calls[0][0] as { where: Record<string, unknown> }).where;

  describe('create', () => {
    it('files the fund under the caller’s own mosque', async () => {
      funds().create.mockResolvedValue(row());

      await service.create(ACTOR, { name: 'Zakat', targetAmount: '500000.00' });

      expect(writtenData(funds().create).mosqueId).toBe(MOSQUE_ID);
    });

    it('derives a slug from the name when none is sent', async () => {
      funds().create.mockResolvedValue(row());

      await service.create(ACTOR, { name: 'Mosque Construction Fund' });

      expect(writtenData(funds().create).slug).toBe('mosque-construction-fund');
    });

    it('keeps a slug that was sent rather than re-deriving it', async () => {
      funds().create.mockResolvedValue(row());

      await service.create(ACTOR, { name: 'Zakat al-Mal', slug: 'zakat-1447' });

      expect(writtenData(funds().create).slug).toBe('zakat-1447');
    });

    // A name with no Latin spelling cannot be guessed at, and a slug is a permanent public URL.
    it('asks for a slug instead of inventing one for a name it cannot transliterate', async () => {
      await expect(service.create(ACTOR, { name: 'যাকাত' })).rejects.toThrow(BadRequestException);
      expect(funds().create).not.toHaveBeenCalled();
    });

    it('stores the amount as a Decimal, not a number', async () => {
      funds().create.mockResolvedValue(row());

      await service.create(ACTOR, { name: 'Zakat', targetAmount: '500000.10' });

      const stored = writtenData(funds().create).targetAmount;
      expect(stored).toBeInstanceOf(Prisma.Decimal);
      expect(typeof stored).not.toBe('number');
    });

    // 0.1 + 0.2 is the standard demonstration; a fund target of 1234567.89 is the realistic one. Neither
    // survives a float, and both survive this path exactly.
    it('keeps an amount a float would round', async () => {
      funds().create.mockResolvedValue(row({ targetAmount: new Prisma.Decimal('1234567.89') }));

      const created = await service.create(ACTOR, { name: 'Roof', targetAmount: '1234567.89' });

      expect((writtenData(funds().create).targetAmount as Prisma.Decimal).toFixed(2)).toBe(
        '1234567.89',
      );
      // And it leaves as an exact string rather than a JSON number.
      expect(created.targetAmount).toBe('1234567.89');
      expect(typeof created.targetAmount).toBe('string');
    });

    it('accepts a fund with no target and no window', async () => {
      funds().create.mockResolvedValue(row({ targetAmount: null, startDate: null, endDate: null }));

      const created = await service.create(ACTOR, { name: 'General Fund' });

      const data = writtenData(funds().create);
      expect(data.targetAmount).toBeNull();
      expect(data.startDate).toBeNull();
      expect(data.endDate).toBeNull();
      expect(created.targetAmount).toBeNull();
    });

    it('writes the dates as calendar days, not as the server’s midnight', async () => {
      funds().create.mockResolvedValue(row());

      await service.create(ACTOR, {
        name: 'Ramadan Iftar',
        startDate: '2026-03-01',
        endDate: '2026-03-31',
      });

      const data = writtenData(funds().create);
      expect((data.startDate as Date).toISOString()).toBe('2026-03-01T00:00:00.000Z');
      expect((data.endDate as Date).toISOString()).toBe('2026-03-31T00:00:00.000Z');
    });

    it('refuses a window that ends before it starts', async () => {
      await expect(
        service.create(ACTOR, {
          name: 'Ramadan Iftar',
          startDate: '2026-03-31',
          endDate: '2026-03-01',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(funds().create).not.toHaveBeenCalled();
    });

    it('accepts a single-day window', async () => {
      funds().create.mockResolvedValue(row());

      await expect(
        service.create(ACTOR, {
          name: 'Eid Collection',
          startDate: '2026-03-20',
          endDate: '2026-03-20',
        }),
      ).resolves.toBeDefined();
    });

    it('turns a duplicate slug into a 409 rather than leaking the constraint', async () => {
      funds().create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '6.0.0',
        }),
      );

      await expect(service.create(ACTOR, { name: 'Zakat' })).rejects.toThrow(ConflictException);
    });

    it('does not write any field the DTO did not name', async () => {
      funds().create.mockResolvedValue(row());

      await service.create(ACTOR, { name: 'Zakat' });

      // The write is built field by field, so the set of keys is fixed by the service and not by
      // whatever a request body happened to carry.
      expect(Object.keys(writtenData(funds().create)).sort()).toEqual([
        'description',
        'endDate',
        'isPublic',
        'mosqueId',
        'name',
        'openingBalance',
        'slug',
        'startDate',
        'status',
        'targetAmount',
      ]);
    });
  });

  describe('findMany', () => {
    beforeEach(() => {
      funds().count.mockResolvedValue(0);
      funds().findMany.mockResolvedValue([]);
    });

    it('scopes every list to the caller’s mosque', async () => {
      await service.findMany(ACTOR, {});

      expect(queriedWhere(funds().findMany).mosqueId).toBe(MOSQUE_ID);
      expect(queriedWhere(funds().count).mosqueId).toBe(MOSQUE_ID);
    });

    it('defaults to page 1 of 20', async () => {
      await service.findMany(ACTOR, {});

      const args = funds().findMany.mock.calls[0][0] as { skip: number; take: number };
      expect(args).toMatchObject({ skip: 0, take: 20 });
    });

    it('caps the page size at 100 even when the service is called directly', async () => {
      // The DTO rejects this first over HTTP. The service is also reached from tests and from other
      // services, so it does not rely on that.
      await service.findMany(ACTOR, { limit: 5000 });

      expect((funds().findMany.mock.calls[0][0] as { take: number }).take).toBe(100);
    });

    it('orders newest first, with the id breaking ties', async () => {
      await service.findMany(ACTOR, {});

      expect((funds().findMany.mock.calls[0][0] as { orderBy: unknown }).orderBy).toEqual([
        { createdAt: 'desc' },
        { id: 'asc' },
      ]);
    });

    it('filters on status when asked', async () => {
      await service.findMany(ACTOR, { status: FundStatus.archived });

      expect(queriedWhere(funds().findMany)).toEqual({
        mosqueId: MOSQUE_ID,
        status: FundStatus.archived,
      });
    });

    it('searches name, slug and description case-insensitively', async () => {
      await service.findMany(ACTOR, { search: 'zakat' });

      expect(queriedWhere(funds().findMany).OR).toEqual([
        { name: { contains: 'zakat', mode: 'insensitive' } },
        { slug: { contains: 'zakat', mode: 'insensitive' } },
        { description: { contains: 'zakat', mode: 'insensitive' } },
      ]);
    });

    it('reports paging figures that match the filter, not the page', async () => {
      funds().count.mockResolvedValue(7);
      funds().findMany.mockResolvedValue([row()]);

      const { meta } = await service.findMany(ACTOR, { page: 2, limit: 3 });

      expect(meta).toEqual({ page: 2, limit: 3, total: 7, totalPages: 3 });
    });

    it('counts and reads in one transaction, so the total describes the rows returned', async () => {
      await service.findMany(ACTOR, {});

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('returns campaignCount as a row count, and no money it did not read', async () => {
      funds().count.mockResolvedValue(1);
      funds().findMany.mockResolvedValue([row({ _count: { campaigns: 3 } })]);

      const { rows } = await service.findMany(ACTOR, {});

      expect(rows[0].campaignCount).toBe(3);
      // No total raised, balance or donation count anywhere in the response.
      const body = JSON.stringify(rows[0]);
      for (const forbidden of ['raised', 'balance', 'donationCount', 'collected']) {
        expect(body).not.toContain(forbidden);
      }
    });

    it('never returns the mosque id', async () => {
      funds().count.mockResolvedValue(1);
      funds().findMany.mockResolvedValue([row()]);

      const { rows } = await service.findMany(ACTOR, {});

      expect(rows[0]).not.toHaveProperty('mosqueId');
    });
  });

  describe('findOne', () => {
    it('asks for the id inside the caller’s mosque, not the id alone', async () => {
      funds().findFirst.mockResolvedValue(row());

      await service.findOne(ACTOR, FUND_ID);

      expect(queriedWhere(funds().findFirst)).toEqual({ id: FUND_ID, mosqueId: MOSQUE_ID });
    });

    it('answers 404 for another mosque’s fund, never 403', async () => {
      // What the scoped query returns for a fund that exists but belongs to somebody else.
      funds().findFirst.mockResolvedValue(null);

      await expect(service.findOne(ACTOR, FUND_ID)).rejects.toThrow(NotFoundException);
    });

    it('serialises the dates as calendar days', async () => {
      funds().findFirst.mockResolvedValue(row());

      const fund = await service.findOne(ACTOR, FUND_ID);

      expect(fund.startDate).toBe('2026-03-01');
      expect(fund.endDate).toBe('2026-03-31');
    });
  });

  describe('update', () => {
    it('refuses before writing when the fund is another mosque’s', async () => {
      funds().findFirst.mockResolvedValue(null);

      await expect(service.update(ACTOR, FUND_ID, { name: 'Renamed' })).rejects.toThrow(
        NotFoundException,
      );
      expect(funds().update).not.toHaveBeenCalled();
    });

    it('touches only the fields that were sent', async () => {
      funds().findFirst.mockResolvedValue(row());
      funds().update.mockResolvedValue(row({ name: 'Zakat al-Fitr' }));

      await service.update(ACTOR, FUND_ID, { name: 'Zakat al-Fitr' });

      expect(writtenData(funds().update)).toEqual({ name: 'Zakat al-Fitr' });
    });

    it('clears a nullable field on an explicit null, and leaves it alone when omitted', async () => {
      funds().findFirst.mockResolvedValue(row());
      funds().update.mockResolvedValue(row({ targetAmount: null }));

      await service.update(ACTOR, FUND_ID, { targetAmount: null });

      expect(writtenData(funds().update)).toEqual({ targetAmount: null });
    });

    it('does not re-derive the slug when the name changes', async () => {
      funds().findFirst.mockResolvedValue(row());
      funds().update.mockResolvedValue(row({ name: 'Something Else' }));

      await service.update(ACTOR, FUND_ID, { name: 'Something Else' });

      // A public page may already link to the old slug.
      expect(writtenData(funds().update)).not.toHaveProperty('slug');
    });

    // The rule no per-field validator can enforce: one end of the window is in the request, the other is
    // in the database.
    it('checks a lone endDate against the stored startDate', async () => {
      funds().findFirst.mockResolvedValue(row({ startDate: new Date('2026-03-10T00:00:00.000Z') }));

      await expect(service.update(ACTOR, FUND_ID, { endDate: '2026-03-05' })).rejects.toThrow(
        BadRequestException,
      );
      expect(funds().update).not.toHaveBeenCalled();
    });

    it('allows a lone endDate that still falls after the stored startDate', async () => {
      funds().findFirst.mockResolvedValue(row({ startDate: new Date('2026-03-01T00:00:00.000Z') }));
      funds().update.mockResolvedValue(row());

      await expect(
        service.update(ACTOR, FUND_ID, { endDate: '2026-04-30' }),
      ).resolves.toBeDefined();
    });

    it('allows clearing one end of the window', async () => {
      funds().findFirst.mockResolvedValue(row());
      funds().update.mockResolvedValue(row({ endDate: null }));

      await expect(service.update(ACTOR, FUND_ID, { endDate: null })).resolves.toBeDefined();
      expect(writtenData(funds().update)).toEqual({ endDate: null });
    });

    it('turns a slug collision into a 409', async () => {
      funds().findFirst.mockResolvedValue(row());
      funds().update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '6.0.0',
        }),
      );

      await expect(service.update(ACTOR, FUND_ID, { slug: 'sadaqah' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('archives a fund through status rather than deleting it', async () => {
      funds().findFirst.mockResolvedValue(row({ _count: { campaigns: 4 } }));
      funds().update.mockResolvedValue(row({ status: FundStatus.archived }));

      const updated = await service.update(ACTOR, FUND_ID, { status: FundStatus.archived });

      expect(updated.status).toBe(FundStatus.archived);
    });
  });

  describe('remove', () => {
    it('refuses another mosque’s fund with a 404 and does not delete', async () => {
      funds().findFirst.mockResolvedValue(null);

      await expect(service.remove(ACTOR, FUND_ID)).rejects.toThrow(NotFoundException);
      expect(funds().delete).not.toHaveBeenCalled();
    });

    it('deletes a fund nothing points at', async () => {
      funds().findFirst.mockResolvedValue(row({ _count: { campaigns: 0 } }));
      funds().delete.mockResolvedValue(row());

      const deleted = await service.remove(ACTOR, FUND_ID);

      expect(funds().delete).toHaveBeenCalledWith({ where: { id: FUND_ID } });
      expect(deleted).toEqual({ id: FUND_ID, name: 'Zakat', slug: 'zakat' });
    });

    it('refuses with a 409 while the fund still has campaigns', async () => {
      funds().findFirst.mockResolvedValue(row({ _count: { campaigns: 2 } }));

      await expect(service.remove(ACTOR, FUND_ID)).rejects.toThrow(ConflictException);
      expect(funds().delete).not.toHaveBeenCalled();
    });

    it('names archiving as the alternative when it refuses', async () => {
      funds().findFirst.mockResolvedValue(row({ _count: { campaigns: 2 } }));

      await expect(service.remove(ACTOR, FUND_ID)).rejects.toMatchObject({
        response: { code: 'FUND_IN_USE' },
      });
    });

    // Donations are the other thing filed under a fund, and they are counted separately because only a
    // delete asks the question.
    it('refuses with a 409 while donations are still filed under the fund', async () => {
      funds().findFirst.mockResolvedValue(row({ _count: { campaigns: 0 } }));
      donations().count.mockResolvedValue(3);

      await expect(service.remove(ACTOR, FUND_ID)).rejects.toMatchObject({
        response: { code: 'FUND_IN_USE' },
      });
      expect(funds().delete).not.toHaveBeenCalled();
    });

    it('counts those donations by fund, not across the table', async () => {
      funds().findFirst.mockResolvedValue(row({ _count: { campaigns: 0 } }));
      donations().count.mockResolvedValue(1);

      await expect(service.remove(ACTOR, FUND_ID)).rejects.toThrow(ConflictException);

      expect(queriedWhere(donations().count)).toEqual({ fundId: FUND_ID });
    });

    // The pre-check can lose a race with a campaign created a moment later; the foreign key is what
    // actually holds the line, and its error has to become the same answer.
    it('translates the foreign-key refusal into the same 409', async () => {
      funds().findFirst.mockResolvedValue(row({ _count: { campaigns: 0 } }));
      funds().delete.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
          code: 'P2003',
          clientVersion: '6.0.0',
        }),
      );

      await expect(service.remove(ACTOR, FUND_ID)).rejects.toThrow(ConflictException);
    });

    it('answers 404 when the row vanished between the read and the delete', async () => {
      funds().findFirst.mockResolvedValue(row({ _count: { campaigns: 0 } }));
      funds().delete.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '6.0.0',
        }),
      );

      await expect(service.remove(ACTOR, FUND_ID)).rejects.toThrow(NotFoundException);
    });
  });

  /**
   * The mosque comes from the token, and there is no other way to supply one.
   *
   * Every case above passes `ACTOR`, so these assert the shape of the surface rather than a behaviour: no
   * method takes a mosque id, and an actor from another mosque produces queries scoped to *that* mosque
   * with nothing carried over.
   */
  describe('mosque id from the token only', () => {
    const intruder: AuthenticatedUser = { ...ACTOR, mosqueId: OTHER_MOSQUE_ID };

    it('scopes a read to whichever mosque the token names', async () => {
      funds().findFirst.mockResolvedValue(null);

      await expect(service.findOne(intruder, FUND_ID)).rejects.toThrow(NotFoundException);

      expect(queriedWhere(funds().findFirst)).toEqual({ id: FUND_ID, mosqueId: OTHER_MOSQUE_ID });
    });

    it('files a create under whichever mosque the token names', async () => {
      funds().create.mockResolvedValue(row());

      await service.create(intruder, { name: 'Zakat' });

      expect(writtenData(funds().create).mosqueId).toBe(OTHER_MOSQUE_ID);
    });

    it('ignores a mosqueId smuggled into a create body', async () => {
      funds().create.mockResolvedValue(row());

      // The DTO has no such field and the global pipe rejects it over HTTP; this asserts the service
      // would not honour one even if it arrived, which is why the cast is here rather than in the DTO.
      const smuggled = {
        name: 'Zakat',
        mosqueId: OTHER_MOSQUE_ID,
      } as unknown as CreateDonationFundDto;

      await service.create(ACTOR, smuggled);

      expect(writtenData(funds().create).mosqueId).toBe(MOSQUE_ID);
    });

    it('ignores a mosqueId smuggled into a patch body', async () => {
      funds().findFirst.mockResolvedValue(row());
      funds().update.mockResolvedValue(row());

      const smuggled = {
        name: 'Zakat',
        mosqueId: OTHER_MOSQUE_ID,
      } as unknown as UpdateDonationFundDto;

      await service.update(ACTOR, FUND_ID, smuggled);

      expect(writtenData(funds().update)).toEqual({ name: 'Zakat' });
    });
  });
});
