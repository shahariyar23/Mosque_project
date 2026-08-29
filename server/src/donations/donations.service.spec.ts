import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DonationStatus, PaymentMethod, Prisma } from '@prisma/client';

import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { DonationsService } from './donations.service';
import type { CreateDonationDto } from './dto/create-donation.dto';
import type { UpdateDonationDto } from './dto/update-donation.dto';

/**
 * Donations.
 *
 * Five things carry the weight in this file.
 *
 * The mosque comes from the token and from nowhere else, which the last block asserts directly.
 *
 * A member reads their own giving and nothing more. That is the *"a normal user may only access their own
 * donation history"* rule, and the cases below check it where it is enforced — in the `where` clause, not in a
 * filter applied to rows that have already been read. Another member's donation is a 404, the same answer
 * another mosque's donation gives, because a 403 would confirm the record exists.
 *
 * Money never becomes a float: it goes in as a `Prisma.Decimal` and comes out as an exact string, and one
 * case uses a value binary floating point cannot hold to prove it.
 *
 * All three ids a client may supply — `fundId`, `campaignId`, `userId` — are checked against the caller's own
 * mosque before anything is written, and a campaign has to collect into the fund named beside it.
 *
 * And an anonymous donation is a first-class record: no account, no name, still a donation.
 */

const MOSQUE_ID = 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0';
const OTHER_MOSQUE_ID = 'd0b80121-7ac0-11d1-898c-00c04fd8d5c1';
const DONATION_ID = '1b4e28ba-2fa1-11d2-883f-0016d3cca427';
const FUND_ID = '2c5f39cb-3fb2-11d2-883f-0016d3cca428';
const CAMPAIGN_ID = '3d6a4adc-4fc3-11d2-883f-0016d3cca429';
const DONOR_ID = '4e7b5bed-5fd4-11d2-883f-0016d3cca430';

/**
 * A treasurer of `MOSQUE_ID`. The role carries `donation.view`, so this actor reads the whole mosque's
 * giving — which is what makes `MEMBER` below a meaningful contrast. Nothing in the service reads the role
 * itself; both actors resolve through `effectivePermissions`.
 */
const ACTOR: AuthenticatedUser = {
  id: '9c8b7a65-4321-4f6a-8c11-2d5e7a9b0c31',
  mosqueId: MOSQUE_ID,
  email: 'treasurer@noor.example',
  role: 'treasurer',
  permissions: [],
  deniedPermissions: [],
  isActive: true,
};

/** A member of the same mosque. The role carries `donation.viewOwn` and nothing wider. */
const MEMBER: AuthenticatedUser = {
  id: '7a6b5c43-2109-4f6a-8c11-2d5e7a9b0c32',
  mosqueId: MOSQUE_ID,
  email: 'member@noor.example',
  role: 'member',
  permissions: [],
  deniedPermissions: [],
  isActive: true,
};

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: DONATION_ID,
    amount: new Prisma.Decimal('500.00'),
    currency: 'BDT',
    paymentMethod: PaymentMethod.cash,
    status: DonationStatus.pending,
    donatedAt: new Date('2026-08-21T14:30:00.000Z'),
    donorName: null,
    donorEmail: null,
    reference: 'RCP-2026-00412',
    notes: null,
    createdAt: new Date('2026-08-22T09:00:00.000Z'),
    updatedAt: new Date('2026-08-22T09:00:00.000Z'),
    donor: { id: DONOR_ID, fullName: 'Abdul Karim' },
    fund: { id: FUND_ID, name: 'Zakat', slug: 'zakat' },
    campaign: null,
    ...overrides,
  };
}

/** The minimum a create needs: what it was for, how much, and how it changed hands. */
function newDonation(overrides: Partial<CreateDonationDto> = {}): CreateDonationDto {
  return {
    fundId: FUND_ID,
    amount: '500.00',
    paymentMethod: PaymentMethod.cash,
    ...overrides,
  };
}

describe('DonationsService', () => {
  let service: DonationsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DonationsService,
        {
          provide: PrismaService,
          useValue: {
            donation: {
              count: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            transaction: {
              findFirst: jest.fn().mockResolvedValue(null),
              create: jest.fn().mockResolvedValue({ id: 'tx-1' }),
              update: jest.fn().mockResolvedValue({ id: 'tx-1' }),
            },
            donationFund: { findFirst: jest.fn().mockResolvedValue({ id: FUND_ID }) },
            campaign: {
              findFirst: jest.fn().mockResolvedValue({ id: CAMPAIGN_ID, fundId: FUND_ID }),
            },
            receipt: {
              findFirst: jest.fn().mockResolvedValue(null),
              create: jest.fn().mockResolvedValue({ id: 'r1', receiptNumber: 'REC-2026-00001' }),
            },
            user: { findFirst: jest.fn().mockResolvedValue({ id: DONOR_ID }) },
            mosqueSettings: { findUnique: jest.fn().mockResolvedValue({ currency: 'BDT' }) },
            $executeRaw: jest.fn().mockResolvedValue(1),
            $transaction: jest.fn((arg: any) => {
              if (typeof arg === 'function') {
                return arg(prisma);
              }
              return Promise.all(arg);
            }),
          },
        },
        {
          provide: MailService,
          useValue: {
            sendReceiptIssuedEmail: jest.fn().mockResolvedValue({ success: true }),
            sendMail: jest.fn().mockResolvedValue({ success: true }),
          },
        },
      ],
    }).compile();

    service = module.get(DonationsService);
    prisma = module.get(PrismaService);
  });

  const donations = () => prisma.donation as unknown as Record<string, jest.Mock>;
  const funds = () => prisma.donationFund as unknown as Record<string, jest.Mock>;
  const campaigns = () => prisma.campaign as unknown as Record<string, jest.Mock>;
  const users = () => prisma.user as unknown as Record<string, jest.Mock>;
  const settings = () => prisma.mosqueSettings as unknown as Record<string, jest.Mock>;

  /** The `data` a write was given, typed so an assertion is not reading `any` off a jest mock. */
  const writtenData = (call: jest.Mock): Record<string, unknown> =>
    (call.mock.calls[0][0] as { data: Record<string, unknown> }).data;

  /** The `where` a query was given. */
  const queriedWhere = (call: jest.Mock): Record<string, unknown> =>
    (call.mock.calls[0][0] as { where: Record<string, unknown> }).where;

  describe('create', () => {
    it('files the donation under the caller’s own mosque', async () => {
      donations().create.mockResolvedValue(row());

      await service.create(ACTOR, newDonation());

      expect(writtenData(donations().create).mosqueId).toBe(MOSQUE_ID);
    });

    it('stores the amount as a Decimal, not a number', async () => {
      donations().create.mockResolvedValue(row());

      await service.create(ACTOR, newDonation({ amount: '500.00' }));

      const stored = writtenData(donations().create).amount;
      expect(stored).toBeInstanceOf(Prisma.Decimal);
      expect(typeof stored).not.toBe('number');
    });

    // The point of Decimal, stated as a value: 1234567.89 has no exact binary representation.
    it('keeps an amount a float would round, in and out', async () => {
      donations().create.mockResolvedValue(row({ amount: new Prisma.Decimal('1234567.89') }));

      const created = await service.create(ACTOR, newDonation({ amount: '1234567.89' }));

      expect((writtenData(donations().create).amount as Prisma.Decimal).toFixed(2)).toBe(
        '1234567.89',
      );
      expect(created.amount).toBe('1234567.89');
      expect(typeof created.amount).toBe('string');
    });

    it('checks the fund inside the caller’s mosque before writing it', async () => {
      donations().create.mockResolvedValue(row());

      await service.create(ACTOR, newDonation());

      expect(queriedWhere(funds().findFirst)).toEqual({ id: FUND_ID, mosqueId: MOSQUE_ID });
    });

    it('refuses another mosque’s fund with a 400 and writes nothing', async () => {
      // What the mosque-scoped lookup returns for a fund that exists but belongs to somebody else — the
      // same answer as for an id that does not exist anywhere, so the caller learns nothing either way.
      funds().findFirst.mockResolvedValue(null);

      await expect(service.create(ACTOR, newDonation())).rejects.toMatchObject({
        response: { code: 'FUND_NOT_FOUND' },
      });
      expect(donations().create).not.toHaveBeenCalled();
    });

    it('checks the campaign inside the caller’s mosque too', async () => {
      donations().create.mockResolvedValue(row());

      await service.create(ACTOR, newDonation({ campaignId: CAMPAIGN_ID }));

      expect(queriedWhere(campaigns().findFirst)).toEqual({
        id: CAMPAIGN_ID,
        mosqueId: MOSQUE_ID,
      });
    });

    it('refuses another mosque’s campaign with a 400', async () => {
      campaigns().findFirst.mockResolvedValue(null);

      await expect(
        service.create(ACTOR, newDonation({ campaignId: CAMPAIGN_ID })),
      ).rejects.toMatchObject({ response: { code: 'CAMPAIGN_NOT_FOUND' } });
      expect(donations().create).not.toHaveBeenCalled();
    });

    // A gift recorded against the roof appeal but credited to the zakat fund appears in one place and is
    // spent from another.
    it('refuses a campaign that collects into a different fund', async () => {
      campaigns().findFirst.mockResolvedValue({ id: CAMPAIGN_ID, fundId: 'another-fund' });

      await expect(
        service.create(ACTOR, newDonation({ campaignId: CAMPAIGN_ID })),
      ).rejects.toMatchObject({ response: { code: 'CAMPAIGN_FUND_MISMATCH' } });
      expect(donations().create).not.toHaveBeenCalled();
    });

    it('refuses a campaign attached to no fund at all', async () => {
      campaigns().findFirst.mockResolvedValue({ id: CAMPAIGN_ID, fundId: null });

      await expect(service.create(ACTOR, newDonation({ campaignId: CAMPAIGN_ID }))).rejects.toThrow(
        BadRequestException,
      );
    });

    it('checks a named donor inside the caller’s mosque, and only a live account', async () => {
      donations().create.mockResolvedValue(row());

      await service.create(ACTOR, newDonation({ userId: DONOR_ID }));

      expect(queriedWhere(users().findFirst)).toEqual({
        id: DONOR_ID,
        mosqueId: MOSQUE_ID,
        deletedAt: null,
      });
    });

    it('refuses another mosque’s user as the donor', async () => {
      users().findFirst.mockResolvedValue(null);

      await expect(service.create(ACTOR, newDonation({ userId: DONOR_ID }))).rejects.toMatchObject({
        response: { code: 'DONOR_NOT_FOUND' },
      });
      expect(donations().create).not.toHaveBeenCalled();
    });

    // The Friday collection box: no account, no name, still a donation.
    it('records an anonymous donation with no donor at all', async () => {
      donations().create.mockResolvedValue(row({ donor: null }));

      const created = await service.create(ACTOR, newDonation());

      const data = writtenData(donations().create);
      expect(data.userId).toBeNull();
      expect(data.donorName).toBeNull();
      expect(data.donorEmail).toBeNull();
      // Nothing to verify when there is nobody to verify.
      expect(users().findFirst).not.toHaveBeenCalled();
      expect(created.donor).toBeNull();
    });

    it('records a named donor who has no account', async () => {
      donations().create.mockResolvedValue(
        row({ donor: null, donorName: 'Abdul Karim', donorEmail: 'karim@example.com' }),
      );

      const created = await service.create(
        ACTOR,
        newDonation({ donorName: 'Abdul Karim', donorEmail: 'karim@example.com' }),
      );

      expect(writtenData(donations().create).userId).toBeNull();
      expect(users().findFirst).not.toHaveBeenCalled();
      expect(created.donorName).toBe('Abdul Karim');
      expect(created.donor).toBeNull();
    });

    it('defaults the currency to the mosque’s configured one and writes it onto the row', async () => {
      settings().findUnique.mockResolvedValue({ currency: 'usd' });
      donations().create.mockResolvedValue(row({ currency: 'USD' }));

      await service.create(ACTOR, newDonation());

      expect(queriedWhere(settings().findUnique)).toEqual({ mosqueId: MOSQUE_ID });
      expect(writtenData(donations().create).currency).toBe('USD');
    });

    it('keeps a currency the caller sent rather than the mosque default', async () => {
      donations().create.mockResolvedValue(row({ currency: 'GBP' }));

      await service.create(ACTOR, newDonation({ currency: 'GBP' }));

      expect(writtenData(donations().create).currency).toBe('GBP');
      // Nothing to look up when the caller has already said.
      expect(settings().findUnique).not.toHaveBeenCalled();
    });

    // The column is a VarChar with no format constraint, so a mosque could be holding "Taka" in it.
    it('falls back to BDT when the configured currency is not a currency code', async () => {
      settings().findUnique.mockResolvedValue({ currency: 'Taka' });
      donations().create.mockResolvedValue(row());

      await service.create(ACTOR, newDonation());

      expect(writtenData(donations().create).currency).toBe('BDT');
    });

    it('falls back to BDT when the mosque has no settings row', async () => {
      settings().findUnique.mockResolvedValue(null);
      donations().create.mockResolvedValue(row());

      await service.create(ACTOR, newDonation());

      expect(writtenData(donations().create).currency).toBe('BDT');
    });

    // Friday's collection, entered on Monday.
    it('back-dates a donation to when the money was actually given', async () => {
      donations().create.mockResolvedValue(row());

      await service.create(ACTOR, newDonation({ donatedAt: '2026-08-21T14:30:00Z' }));

      expect((writtenData(donations().create).donatedAt as Date).toISOString()).toBe(
        '2026-08-21T14:30:00.000Z',
      );
    });

    it('reads a bare date as midnight UTC rather than the server’s midnight', async () => {
      donations().create.mockResolvedValue(row());

      await service.create(ACTOR, newDonation({ donatedAt: '2026-08-21' }));

      expect((writtenData(donations().create).donatedAt as Date).toISOString()).toBe(
        '2026-08-21T00:00:00.000Z',
      );
    });

    // Left out of the `data` entirely, so the column default decides rather than the service guessing.
    it('leaves donatedAt and status to the database when neither was sent', async () => {
      donations().create.mockResolvedValue(row());

      await service.create(ACTOR, newDonation());

      const data = writtenData(donations().create);
      expect(data).not.toHaveProperty('donatedAt');
      expect(data).not.toHaveProperty('status');
    });

    it('records a completed donation when the recorder says the money is in', async () => {
      donations().create.mockResolvedValue(row({ status: DonationStatus.completed }));

      const created = await service.create(
        ACTOR,
        newDonation({ status: DonationStatus.completed }),
      );

      expect(writtenData(donations().create).status).toBe(DonationStatus.completed);
      expect(created.status).toBe(DonationStatus.completed);
    });

    it('does not write any field the DTO did not name', async () => {
      donations().create.mockResolvedValue(row());

      await service.create(ACTOR, newDonation());

      expect(Object.keys(writtenData(donations().create)).sort()).toEqual([
        'amount',
        'campaignId',
        'currency',
        'donorEmail',
        'donorName',
        'fundId',
        'mosqueId',
        'notes',
        'paymentMethod',
        'reference',
        'userId',
      ]);
    });

    it('translates a lost reference into a 400 rather than leaking the constraint', async () => {
      donations().create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
          code: 'P2003',
          clientVersion: '6.0.0',
        }),
      );

      await expect(service.create(ACTOR, newDonation())).rejects.toMatchObject({
        response: { code: 'DONATION_REFERENCE_INVALID' },
      });
    });

    // Nothing is credited anywhere. The figures a report needs are derived from these rows later.
    it('touches no fund, campaign or account balance', async () => {
      donations().create.mockResolvedValue(
        row({ campaign: { id: CAMPAIGN_ID, title: 'Roof', slug: 'roof' } }),
      );

      await service.create(ACTOR, newDonation({ campaignId: CAMPAIGN_ID }));

      expect(funds().findFirst).toHaveBeenCalledTimes(1);
      expect(campaigns().findFirst).toHaveBeenCalledTimes(1);
      // Reads only. No `update` on either table exists on the mock, so an attempt would throw.
      expect(Object.keys(funds())).toEqual(['findFirst']);
      expect(Object.keys(campaigns())).toEqual(['findFirst']);
    });
  });

  describe('findMany', () => {
    beforeEach(() => {
      donations().count.mockResolvedValue(0);
      donations().findMany.mockResolvedValue([]);
    });

    it('scopes every list to the caller’s mosque', async () => {
      await service.findMany(ACTOR, {});

      expect(queriedWhere(donations().findMany).mosqueId).toBe(MOSQUE_ID);
      expect(queriedWhere(donations().count).mosqueId).toBe(MOSQUE_ID);
    });

    it('lists the whole mosque’s giving for someone holding donation.view', async () => {
      await service.findMany(ACTOR, {});

      expect(queriedWhere(donations().findMany)).toEqual({ mosqueId: MOSQUE_ID });
      expect(queriedWhere(donations().findMany)).not.toHaveProperty('userId');
    });

    // The whole of the own-history rule, enforced in the query rather than after the read.
    it('narrows a member to their own donations', async () => {
      await service.findMany(MEMBER, {});

      expect(queriedWhere(donations().findMany)).toEqual({
        mosqueId: MOSQUE_ID,
        userId: MEMBER.id,
      });
      expect(queriedWhere(donations().count).userId).toBe(MEMBER.id);
    });

    it('does not let a member widen the scope through the query string', async () => {
      // `userId` is not a query field, so the closest a member can come is another filter — and none of
      // them touch the ownership clause.
      await service.findMany(MEMBER, { fundId: FUND_ID, status: DonationStatus.completed });

      expect(queriedWhere(donations().findMany).userId).toBe(MEMBER.id);
    });

    it('refuses a caller holding neither donation.view nor donation.viewOwn', async () => {
      const outsider: AuthenticatedUser = { ...MEMBER, deniedPermissions: ['donation.viewOwn'] };

      await expect(service.findMany(outsider, {})).rejects.toThrow(ForbiddenException);
      expect(donations().findMany).not.toHaveBeenCalled();
    });

    // A deactivated account resolves to no permissions at all, base ones included.
    it('refuses an inactive actor even with the role that carries the permission', async () => {
      const suspended: AuthenticatedUser = { ...ACTOR, isActive: false };

      await expect(service.findMany(suspended, {})).rejects.toThrow(ForbiddenException);
    });

    it('defaults to page 1 of 20', async () => {
      await service.findMany(ACTOR, {});

      expect(donations().findMany.mock.calls[0][0]).toMatchObject({ skip: 0, take: 20 });
    });

    it('caps the page size at 100 even when the service is called directly', async () => {
      await service.findMany(ACTOR, { limit: 5000 });

      expect((donations().findMany.mock.calls[0][0] as { take: number }).take).toBe(100);
    });

    it('orders newest first, with the id breaking ties', async () => {
      await service.findMany(ACTOR, {});

      expect((donations().findMany.mock.calls[0][0] as { orderBy: unknown }).orderBy).toEqual([
        { createdAt: 'desc' },
        { id: 'asc' },
      ]);
    });

    it('filters on status, payment method, fund and campaign', async () => {
      await service.findMany(ACTOR, {
        status: DonationStatus.completed,
        paymentMethod: PaymentMethod.bank_transfer,
        fundId: FUND_ID,
        campaignId: CAMPAIGN_ID,
      });

      expect(queriedWhere(donations().findMany)).toEqual({
        mosqueId: MOSQUE_ID,
        status: DonationStatus.completed,
        paymentMethod: PaymentMethod.bank_transfer,
        fundId: FUND_ID,
        campaignId: CAMPAIGN_ID,
      });
    });

    // The mosque clause does the work, so a borrowed fund id needs no separate check on a read.
    it('returns nothing for another mosque’s fundId rather than refusing', async () => {
      const { rows, meta } = await service.findMany(ACTOR, { fundId: FUND_ID });

      expect(queriedWhere(donations().findMany).mosqueId).toBe(MOSQUE_ID);
      expect(rows).toEqual([]);
      expect(meta.total).toBe(0);
    });

    it('searches donor name, donor email and reference case-insensitively', async () => {
      await service.findMany(ACTOR, { search: 'karim' });

      expect(queriedWhere(donations().findMany).OR).toEqual([
        { donorName: { contains: 'karim', mode: 'insensitive' } },
        { donorEmail: { contains: 'karim', mode: 'insensitive' } },
        { reference: { contains: 'karim', mode: 'insensitive' } },
      ]);
    });

    it('does not search the notes', async () => {
      await service.findMany(ACTOR, { search: 'karim' });

      const clauses = queriedWhere(donations().findMany).OR as Record<string, unknown>[];
      expect(clauses.some((clause) => 'notes' in clause)).toBe(false);
    });

    it('reports paging figures that match the filter, not the page', async () => {
      donations().count.mockResolvedValue(7);
      donations().findMany.mockResolvedValue([row()]);

      const { meta } = await service.findMany(ACTOR, { page: 2, limit: 3 });

      expect(meta).toEqual({ page: 2, limit: 3, total: 7, totalPages: 3 });
    });

    it('counts and reads in one transaction', async () => {
      await service.findMany(ACTOR, {});

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('returns exact amounts and no total across the page', async () => {
      donations().count.mockResolvedValue(2);
      donations().findMany.mockResolvedValue([
        row({ amount: new Prisma.Decimal('500.00') }),
        row({ amount: new Prisma.Decimal('0.05') }),
      ]);

      const { rows } = await service.findMany(ACTOR, {});

      expect(rows.map((r) => r.amount)).toEqual(['500.00', '0.05']);
      const body = JSON.stringify(rows);
      for (const forbiddenField of ['raised', 'balance', 'collected', 'progress', 'sum']) {
        expect(body).not.toContain(forbiddenField);
      }
    });

    it('never returns the mosque id', async () => {
      donations().count.mockResolvedValue(1);
      donations().findMany.mockResolvedValue([row()]);

      const { rows } = await service.findMany(ACTOR, {});

      expect(rows[0]).not.toHaveProperty('mosqueId');
    });

    // A treasurer reading the list needs to know who gave, not how to contact them.
    it('names the donor without handing over their account details', async () => {
      donations().count.mockResolvedValue(1);
      donations().findMany.mockResolvedValue([row()]);

      const { rows } = await service.findMany(ACTOR, {});

      expect(rows[0].donor).toEqual({ id: DONOR_ID, fullName: 'Abdul Karim' });
      const body = JSON.stringify(rows[0]);
      for (const forbiddenField of ['passwordHash', 'phone', 'role', 'refreshToken']) {
        expect(body).not.toContain(forbiddenField);
      }
    });
  });

  describe('findOne', () => {
    it('asks for the id inside the caller’s mosque, not the id alone', async () => {
      donations().findFirst.mockResolvedValue(row());

      await service.findOne(ACTOR, DONATION_ID);

      expect(queriedWhere(donations().findFirst)).toEqual({
        id: DONATION_ID,
        mosqueId: MOSQUE_ID,
      });
    });

    it('answers 404 for another mosque’s donation, never 403', async () => {
      donations().findFirst.mockResolvedValue(null);

      await expect(service.findOne(ACTOR, DONATION_ID)).rejects.toThrow(NotFoundException);
    });

    // Same shape of answer for a member reading somebody else's gift: the ownership is part of the
    // question the query asks, so a record they may not see is a record that was not found.
    it('makes a member’s read ask for their own donation as well', async () => {
      donations().findFirst.mockResolvedValue(row());

      await service.findOne(MEMBER, DONATION_ID);

      expect(queriedWhere(donations().findFirst)).toEqual({
        id: DONATION_ID,
        mosqueId: MOSQUE_ID,
        userId: MEMBER.id,
      });
    });

    it('answers 404 when a member asks for another member’s donation', async () => {
      // What the ownership-scoped lookup returns for a donation in the same mosque that belongs to
      // somebody else.
      donations().findFirst.mockResolvedValue(null);

      await expect(service.findOne(MEMBER, DONATION_ID)).rejects.toThrow(NotFoundException);
    });

    it('refuses a caller holding neither permission before it reads anything', async () => {
      const outsider: AuthenticatedUser = { ...MEMBER, deniedPermissions: ['donation.viewOwn'] };

      await expect(service.findOne(outsider, DONATION_ID)).rejects.toThrow(ForbiddenException);
      expect(donations().findFirst).not.toHaveBeenCalled();
    });

    it('serialises the amount as an exact string and the timestamps as ISO instants', async () => {
      donations().findFirst.mockResolvedValue(row());

      const donation = await service.findOne(ACTOR, DONATION_ID);

      expect(donation.amount).toBe('500.00');
      expect(donation.donatedAt).toBe('2026-08-21T14:30:00.000Z');
      expect(donation.createdAt).toBe('2026-08-22T09:00:00.000Z');
    });

    it('reports the fund and campaign as references, not as balances', async () => {
      donations().findFirst.mockResolvedValue(
        row({ campaign: { id: CAMPAIGN_ID, title: 'Build the Roof', slug: 'build-the-roof' } }),
      );

      const donation = await service.findOne(ACTOR, DONATION_ID);

      expect(donation.fund).toEqual({ id: FUND_ID, name: 'Zakat', slug: 'zakat' });
      expect(donation.campaign).toEqual({
        id: CAMPAIGN_ID,
        title: 'Build the Roof',
        slug: 'build-the-roof',
      });
    });
  });

  describe('update', () => {
    it('refuses before writing when the donation is another mosque’s', async () => {
      donations().findFirst.mockResolvedValue(null);

      await expect(service.update(ACTOR, DONATION_ID, { notes: 'Corrected' })).rejects.toThrow(
        NotFoundException,
      );
      expect(donations().update).not.toHaveBeenCalled();
    });

    it('touches only the fields that were sent', async () => {
      donations().findFirst.mockResolvedValue(row());
      donations().update.mockResolvedValue(row({ notes: 'Corrected' }));

      await service.update(ACTOR, DONATION_ID, { notes: 'Corrected' });

      expect(writtenData(donations().update)).toEqual({ notes: 'Corrected' });
    });

    // The endpoint that stands in for a delete.
    it('withdraws a donation by cancelling it rather than removing it', async () => {
      donations().findFirst.mockResolvedValue(row());
      donations().update.mockResolvedValue(row({ status: DonationStatus.cancelled }));

      const updated = await service.update(ACTOR, DONATION_ID, {
        status: DonationStatus.cancelled,
      });

      expect(writtenData(donations().update)).toEqual({ status: DonationStatus.cancelled });
      expect(updated.status).toBe(DonationStatus.cancelled);
      expect(updated.id).toBe(DONATION_ID);
    });

    it('writes a corrected amount as a Decimal', async () => {
      donations().findFirst.mockResolvedValue(row());
      donations().update.mockResolvedValue(row({ amount: new Prisma.Decimal('750.50') }));

      const updated = await service.update(ACTOR, DONATION_ID, { amount: '750.50' });

      expect(writtenData(donations().update).amount).toBeInstanceOf(Prisma.Decimal);
      expect(updated.amount).toBe('750.50');
    });

    it('makes a donation anonymous on an explicit null donor', async () => {
      donations().findFirst.mockResolvedValue(row());
      donations().update.mockResolvedValue(row({ donor: null }));

      await service.update(ACTOR, DONATION_ID, { userId: null });

      expect(writtenData(donations().update)).toEqual({ userId: null });
      // Nothing to verify when there is nobody to verify.
      expect(users().findFirst).not.toHaveBeenCalled();
    });

    it('checks a new donor inside the caller’s mosque', async () => {
      donations().findFirst.mockResolvedValue(row());
      donations().update.mockResolvedValue(row());

      await service.update(ACTOR, DONATION_ID, { userId: DONOR_ID });

      expect(queriedWhere(users().findFirst)).toEqual({
        id: DONOR_ID,
        mosqueId: MOSQUE_ID,
        deletedAt: null,
      });
    });

    it('refuses to move a donation onto another mosque’s fund', async () => {
      donations().findFirst.mockResolvedValue(row());
      funds().findFirst.mockResolvedValue(null);

      await expect(service.update(ACTOR, DONATION_ID, { fundId: FUND_ID })).rejects.toThrow(
        BadRequestException,
      );
      expect(donations().update).not.toHaveBeenCalled();
    });

    // The rule no per-field validator can see: the campaign has to agree with the fund already stored.
    it('checks a lone campaignId against the stored fundId', async () => {
      donations().findFirst.mockResolvedValue(row());
      campaigns().findFirst.mockResolvedValue({ id: CAMPAIGN_ID, fundId: 'a-different-fund' });

      await expect(
        service.update(ACTOR, DONATION_ID, { campaignId: CAMPAIGN_ID }),
      ).rejects.toMatchObject({ response: { code: 'CAMPAIGN_FUND_MISMATCH' } });
      expect(donations().update).not.toHaveBeenCalled();
    });

    it('checks a lone fundId against the stored campaign', async () => {
      donations().findFirst.mockResolvedValue(
        row({ campaign: { id: CAMPAIGN_ID, title: 'Roof', slug: 'roof' } }),
      );
      campaigns().findFirst.mockResolvedValue({ id: CAMPAIGN_ID, fundId: 'the-old-fund' });

      await expect(service.update(ACTOR, DONATION_ID, { fundId: FUND_ID })).rejects.toMatchObject({
        response: { code: 'CAMPAIGN_FUND_MISMATCH' },
      });
    });

    it('accepts a fund and campaign that agree', async () => {
      donations().findFirst.mockResolvedValue(row());
      donations().update.mockResolvedValue(row());

      await expect(
        service.update(ACTOR, DONATION_ID, { fundId: FUND_ID, campaignId: CAMPAIGN_ID }),
      ).resolves.toBeDefined();
    });

    it('needs no agreement check for a patch that clears the campaign', async () => {
      donations().findFirst.mockResolvedValue(
        row({ campaign: { id: CAMPAIGN_ID, title: 'Roof', slug: 'roof' } }),
      );
      donations().update.mockResolvedValue(row());

      await service.update(ACTOR, DONATION_ID, { campaignId: null });

      expect(writtenData(donations().update)).toEqual({ campaignId: null });
      expect(campaigns().findFirst).not.toHaveBeenCalled();
    });

    // Re-reading the campaign on every patch would be a query for an answer that cannot have changed.
    it('does not re-check an untouched pair', async () => {
      donations().findFirst.mockResolvedValue(
        row({ campaign: { id: CAMPAIGN_ID, title: 'Roof', slug: 'roof' } }),
      );
      donations().update.mockResolvedValue(row());

      await service.update(ACTOR, DONATION_ID, { notes: 'Corrected' });

      expect(campaigns().findFirst).not.toHaveBeenCalled();
      expect(funds().findFirst).not.toHaveBeenCalled();
    });

    it('answers 404 when the row vanished between the read and the write', async () => {
      donations().findFirst.mockResolvedValue(row());
      donations().update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '6.0.0',
        }),
      );

      await expect(service.update(ACTOR, DONATION_ID, { notes: 'Corrected' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('translates a lost reference into a 400', async () => {
      donations().findFirst.mockResolvedValue(row());
      donations().update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
          code: 'P2003',
          clientVersion: '6.0.0',
        }),
      );

      await expect(service.update(ACTOR, DONATION_ID, { userId: DONOR_ID })).rejects.toMatchObject({
        response: { code: 'DONATION_REFERENCE_INVALID' },
      });
    });

    // The route requires `donation.manage`, and nobody holds that "for their own donations only". The
    // read here is deliberately not ownership-scoped: an administrator correcting a member's receipt is
    // the normal case.
    it('does not narrow the row it reads by donor', async () => {
      donations().findFirst.mockResolvedValue(row());
      donations().update.mockResolvedValue(row());

      await service.update(ACTOR, DONATION_ID, { notes: 'Corrected' });

      expect(queriedWhere(donations().findFirst)).toEqual({
        id: DONATION_ID,
        mosqueId: MOSQUE_ID,
      });
    });
  });

  /**
   * The mosque comes from the token, and there is no other way to supply one.
   */
  describe('mosque id from the token only', () => {
    const intruder: AuthenticatedUser = { ...ACTOR, mosqueId: OTHER_MOSQUE_ID };

    it('scopes a read to whichever mosque the token names', async () => {
      donations().findFirst.mockResolvedValue(null);

      await expect(service.findOne(intruder, DONATION_ID)).rejects.toThrow(NotFoundException);

      expect(queriedWhere(donations().findFirst)).toEqual({
        id: DONATION_ID,
        mosqueId: OTHER_MOSQUE_ID,
      });
    });

    it('files a create under whichever mosque the token names', async () => {
      donations().create.mockResolvedValue(row());

      await service.create(intruder, newDonation());

      expect(writtenData(donations().create).mosqueId).toBe(OTHER_MOSQUE_ID);
    });

    it('scopes all three ownership checks to the token’s mosque', async () => {
      donations().create.mockResolvedValue(row());

      await service.create(intruder, newDonation({ campaignId: CAMPAIGN_ID, userId: DONOR_ID }));

      expect(queriedWhere(funds().findFirst).mosqueId).toBe(OTHER_MOSQUE_ID);
      expect(queriedWhere(campaigns().findFirst).mosqueId).toBe(OTHER_MOSQUE_ID);
      expect(queriedWhere(users().findFirst).mosqueId).toBe(OTHER_MOSQUE_ID);
    });

    it('ignores a mosqueId smuggled into a create body', async () => {
      donations().create.mockResolvedValue(row());

      // The DTO has no such field and the global pipe rejects it over HTTP; this asserts the service
      // would not honour one even if it arrived.
      const smuggled = {
        ...newDonation(),
        mosqueId: OTHER_MOSQUE_ID,
      } as unknown as CreateDonationDto;

      await service.create(ACTOR, smuggled);

      expect(writtenData(donations().create).mosqueId).toBe(MOSQUE_ID);
    });

    it('ignores a mosqueId smuggled into a patch body', async () => {
      donations().findFirst.mockResolvedValue(row());
      donations().update.mockResolvedValue(row());

      const smuggled = {
        notes: 'Corrected',
        mosqueId: OTHER_MOSQUE_ID,
      } as unknown as UpdateDonationDto;

      await service.update(ACTOR, DONATION_ID, smuggled);

      expect(writtenData(donations().update)).toEqual({ notes: 'Corrected' });
    });
  });
});
