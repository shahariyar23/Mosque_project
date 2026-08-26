import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CampaignStatus, Prisma } from '@prisma/client';

import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { DonationCampaignsService } from './donation-campaigns.service';
import type { CreateCampaignDto } from './dto/create-campaign.dto';
import type { UpdateCampaignDto } from './dto/update-campaign.dto';

/**
 * Campaigns.
 *
 * Five things carry the weight in this file.
 *
 * The mosque comes from the token and from nowhere else, which the last block asserts directly.
 *
 * A campaign from another mosque is a 404 rather than a 403, so the refusal says nothing about whether the
 * row exists — and a *fund* from another mosque is a 400 naming the field, for the same reason.
 *
 * Money never becomes a float: it goes in as a `Prisma.Decimal` and comes out as an exact string.
 *
 * Publishing needs `campaign.publish` on top of the `campaign.manage` the route already required, and
 * withdrawing deliberately does not.
 *
 * And the date window is checked against the stored row, not only against the request.
 */

const MOSQUE_ID = 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0';
const OTHER_MOSQUE_ID = 'd0b80121-7ac0-11d1-898c-00c04fd8d5c1';
const CAMPAIGN_ID = '1b4e28ba-2fa1-11d2-883f-0016d3cca427';
const FUND_ID = '2c5f39cb-3fb2-11d2-883f-0016d3cca428';

/**
 * A treasurer of `MOSQUE_ID`. The role carries `campaign.publish` through `ROLE_PERMISSIONS`, so this actor
 * may publish — which is what makes `EDITOR` below a meaningful contrast. Nothing in the service reads the
 * role itself; both actors resolve through `effectivePermissions`.
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

/**
 * The same treasurer with `campaign.publish` denied.
 *
 * A deny rather than a different role, because that is the sharper test: the actor still holds
 * `campaign.manage`, so anything refused below is refused by the publish rule specifically and not by a
 * general lack of authority.
 */
const EDITOR: AuthenticatedUser = { ...ACTOR, deniedPermissions: ['campaign.publish'] };

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: CAMPAIGN_ID,
    title: 'Build the New Mosque Roof',
    slug: 'build-the-new-mosque-roof',
    description: 'The roof has leaked through two monsoons.',
    status: CampaignStatus.draft,
    targetAmount: new Prisma.Decimal('1500000.00'),
    startDate: new Date('2026-09-01T00:00:00.000Z'),
    endDate: new Date('2026-12-31T00:00:00.000Z'),
    imageUrl: null,
    isPublic: false,
    createdAt: new Date('2026-08-01T10:00:00.000Z'),
    updatedAt: new Date('2026-08-01T10:00:00.000Z'),
    fund: { id: FUND_ID, name: 'Mosque Construction', slug: 'mosque-construction' },
    ...overrides,
  };
}

/** The minimum a create needs. Both dates and the target are required for a campaign. */
function newCampaign(overrides: Partial<CreateCampaignDto> = {}): CreateCampaignDto {
  return {
    title: 'Build the New Mosque Roof',
    targetAmount: '1500000.00',
    startDate: '2026-09-01',
    endDate: '2026-12-31',
    ...overrides,
  };
}

describe('DonationCampaignsService', () => {
  let service: DonationCampaignsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DonationCampaignsService,
        {
          provide: PrismaService,
          useValue: {
            campaign: {
              count: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            // Read directly rather than through DonationFundsService — one scoped query, against a
            // dependency between two feature modules that would outlive the reason for it.
            donationFund: { findFirst: jest.fn() },
            // `remove` counts donations filed against the campaign before deleting it. Only that path
            // touches this table, which is why it is a bare `count` rather than a full model mock.
            donation: { count: jest.fn().mockResolvedValue(0) },
            $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
          },
        },
      ],
    }).compile();

    service = module.get(DonationCampaignsService);
    prisma = module.get(PrismaService);
  });

  const campaigns = () => prisma.campaign as unknown as Record<string, jest.Mock>;
  const donationFunds = () => prisma.donationFund as unknown as Record<string, jest.Mock>;
  const donations = () => prisma.donation as unknown as Record<string, jest.Mock>;

  const writtenData = (call: jest.Mock): Record<string, unknown> =>
    (call.mock.calls[0][0] as { data: Record<string, unknown> }).data;

  const queriedWhere = (call: jest.Mock): Record<string, unknown> =>
    (call.mock.calls[0][0] as { where: Record<string, unknown> }).where;

  describe('create', () => {
    it('files the campaign under the caller’s own mosque', async () => {
      campaigns().create.mockResolvedValue(row());

      await service.create(ACTOR, newCampaign());

      expect(writtenData(campaigns().create).mosqueId).toBe(MOSQUE_ID);
    });

    it('derives a slug from the title when none is sent', async () => {
      campaigns().create.mockResolvedValue(row());

      await service.create(ACTOR, newCampaign({ title: 'Build the New Mosque Roof' }));

      expect(writtenData(campaigns().create).slug).toBe('build-the-new-mosque-roof');
    });

    it('asks for a slug instead of inventing one for a title it cannot transliterate', async () => {
      await expect(service.create(ACTOR, newCampaign({ title: 'ছাদ নির্মাণ' }))).rejects.toThrow(
        BadRequestException,
      );
      expect(campaigns().create).not.toHaveBeenCalled();
    });

    it('stores the target as a Decimal, not a number', async () => {
      campaigns().create.mockResolvedValue(row());

      await service.create(ACTOR, newCampaign({ targetAmount: '1500000.00' }));

      const stored = writtenData(campaigns().create).targetAmount;
      expect(stored).toBeInstanceOf(Prisma.Decimal);
      expect(typeof stored).not.toBe('number');
    });

    it('keeps an amount a float would round, in and out', async () => {
      campaigns().create.mockResolvedValue(row({ targetAmount: new Prisma.Decimal('1234567.89') }));

      const created = await service.create(ACTOR, newCampaign({ targetAmount: '1234567.89' }));

      expect((writtenData(campaigns().create).targetAmount as Prisma.Decimal).toFixed(2)).toBe(
        '1234567.89',
      );
      expect(created.targetAmount).toBe('1234567.89');
      expect(typeof created.targetAmount).toBe('string');
    });

    it('writes the dates as calendar days, not as the server’s midnight', async () => {
      campaigns().create.mockResolvedValue(row());

      await service.create(ACTOR, newCampaign({ startDate: '2026-09-01', endDate: '2026-12-31' }));

      const data = writtenData(campaigns().create);
      expect((data.startDate as Date).toISOString()).toBe('2026-09-01T00:00:00.000Z');
      expect((data.endDate as Date).toISOString()).toBe('2026-12-31T00:00:00.000Z');
    });

    it('refuses a window that ends before it starts', async () => {
      await expect(
        service.create(ACTOR, newCampaign({ startDate: '2026-12-31', endDate: '2026-09-01' })),
      ).rejects.toThrow(BadRequestException);
      expect(campaigns().create).not.toHaveBeenCalled();
    });

    it('accepts a single-day appeal', async () => {
      campaigns().create.mockResolvedValue(row());

      await expect(
        service.create(ACTOR, newCampaign({ startDate: '2026-09-01', endDate: '2026-09-01' })),
      ).resolves.toBeDefined();
    });

    it('creates a campaign with no fund at all', async () => {
      campaigns().create.mockResolvedValue(row({ fund: null }));

      const created = await service.create(ACTOR, newCampaign());

      expect(writtenData(campaigns().create).fundId).toBeNull();
      expect(donationFunds().findFirst).not.toHaveBeenCalled();
      expect(created.fund).toBeNull();
    });

    it('checks a fundId inside the caller’s mosque before writing it', async () => {
      donationFunds().findFirst.mockResolvedValue({ id: FUND_ID });
      campaigns().create.mockResolvedValue(row());

      await service.create(ACTOR, newCampaign({ fundId: FUND_ID }));

      expect(queriedWhere(donationFunds().findFirst)).toEqual({
        id: FUND_ID,
        mosqueId: MOSQUE_ID,
      });
      expect(writtenData(campaigns().create).fundId).toBe(FUND_ID);
    });

    // The one identifier a client may supply that points at another row.
    it('refuses another mosque’s fund with a 400 and writes nothing', async () => {
      // What the mosque-scoped lookup returns for a fund that exists but belongs to somebody else — the
      // same answer as for an id that does not exist anywhere, so the caller learns nothing either way.
      donationFunds().findFirst.mockResolvedValue(null);

      await expect(service.create(ACTOR, newCampaign({ fundId: FUND_ID }))).rejects.toThrow(
        BadRequestException,
      );
      expect(campaigns().create).not.toHaveBeenCalled();
    });

    it('names the field rather than the other mosque when it refuses a fundId', async () => {
      donationFunds().findFirst.mockResolvedValue(null);

      await expect(service.create(ACTOR, newCampaign({ fundId: FUND_ID }))).rejects.toMatchObject({
        response: { code: 'FUND_NOT_FOUND' },
      });
    });

    it('turns a duplicate slug into a 409 rather than leaking the constraint', async () => {
      campaigns().create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '6.0.0',
        }),
      );

      await expect(service.create(ACTOR, newCampaign())).rejects.toThrow(ConflictException);
    });

    it('stores an image as a link and nothing else', async () => {
      campaigns().create.mockResolvedValue(
        row({ imageUrl: 'https://cdn.example.org/campaigns/roof.jpg' }),
      );

      const created = await service.create(
        ACTOR,
        newCampaign({ imageUrl: 'https://cdn.example.org/campaigns/roof.jpg' }),
      );

      expect(writtenData(campaigns().create).imageUrl).toBe(
        'https://cdn.example.org/campaigns/roof.jpg',
      );
      expect(created.imageUrl).toBe('https://cdn.example.org/campaigns/roof.jpg');
    });

    it('does not write any field the DTO did not name', async () => {
      campaigns().create.mockResolvedValue(row());

      await service.create(ACTOR, newCampaign());

      expect(Object.keys(writtenData(campaigns().create)).sort()).toEqual([
        'description',
        'endDate',
        'fundId',
        'imageUrl',
        'isPublic',
        'mosqueId',
        'slug',
        'startDate',
        'status',
        'targetAmount',
        'title',
      ]);
    });
  });

  /**
   * The publish rule.
   *
   * `campaign.manage` is on the route; this is the part the route cannot express, because whether a request
   * publishes depends on its body. The refusals below all belong to an actor who still holds
   * `campaign.manage`, so nothing here is explained by a general lack of authority.
   */
  describe('publishing', () => {
    it('lets a draft through for someone who cannot publish', async () => {
      campaigns().create.mockResolvedValue(row());

      await expect(service.create(EDITOR, newCampaign())).resolves.toBeDefined();
    });

    it('refuses isPublic true without campaign.publish', async () => {
      await expect(service.create(EDITOR, newCampaign({ isPublic: true }))).rejects.toThrow(
        ForbiddenException,
      );
      expect(campaigns().create).not.toHaveBeenCalled();
    });

    it('refuses a status other than draft without campaign.publish', async () => {
      await expect(
        service.create(EDITOR, newCampaign({ status: CampaignStatus.active })),
      ).rejects.toThrow(ForbiddenException);
      expect(campaigns().create).not.toHaveBeenCalled();
    });

    it('allows both to someone who holds campaign.publish', async () => {
      campaigns().create.mockResolvedValue(row({ status: CampaignStatus.active, isPublic: true }));

      await expect(
        service.create(ACTOR, newCampaign({ status: CampaignStatus.active, isPublic: true })),
      ).resolves.toBeDefined();
    });

    // The asymmetry is the point: a campaign that should not be up must be able to come down at once.
    it('lets someone without campaign.publish set isPublic false', async () => {
      campaigns().findFirst.mockResolvedValue(row({ isPublic: true }));
      campaigns().update.mockResolvedValue(row({ isPublic: false }));

      await expect(service.update(EDITOR, CAMPAIGN_ID, { isPublic: false })).resolves.toBeDefined();
    });

    it('lets someone without campaign.publish pull a campaign back to draft', async () => {
      campaigns().findFirst.mockResolvedValue(row({ status: CampaignStatus.active }));
      campaigns().update.mockResolvedValue(row({ status: CampaignStatus.draft }));

      await expect(
        service.update(EDITOR, CAMPAIGN_ID, { status: CampaignStatus.draft }),
      ).resolves.toBeDefined();
    });

    it('refuses a patch that publishes, before it reads the row', async () => {
      await expect(service.update(EDITOR, CAMPAIGN_ID, { isPublic: true })).rejects.toThrow(
        ForbiddenException,
      );
      // Refused without the request having any effect, and without revealing whether the row exists.
      expect(campaigns().findFirst).not.toHaveBeenCalled();
      expect(campaigns().update).not.toHaveBeenCalled();
    });

    it('refuses cancelling and archiving too, since neither is a draft', async () => {
      for (const status of [CampaignStatus.cancelled, CampaignStatus.archived]) {
        await expect(service.update(EDITOR, CAMPAIGN_ID, { status })).rejects.toThrow(
          ForbiddenException,
        );
      }
    });

    it('says which permission was missing', async () => {
      await expect(service.create(EDITOR, newCampaign({ isPublic: true }))).rejects.toMatchObject({
        response: { code: 'CAMPAIGN_PUBLISH_REFUSED' },
      });
    });

    // A deactivated account resolves to no permissions at all, base ones included.
    it('refuses an inactive actor even with the role that carries the permission', async () => {
      const suspended: AuthenticatedUser = { ...ACTOR, isActive: false };

      await expect(service.create(suspended, newCampaign({ isPublic: true }))).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findMany', () => {
    beforeEach(() => {
      campaigns().count.mockResolvedValue(0);
      campaigns().findMany.mockResolvedValue([]);
    });

    it('scopes every list to the caller’s mosque', async () => {
      await service.findMany(ACTOR, {});

      expect(queriedWhere(campaigns().findMany).mosqueId).toBe(MOSQUE_ID);
      expect(queriedWhere(campaigns().count).mosqueId).toBe(MOSQUE_ID);
    });

    it('defaults to page 1 of 20', async () => {
      await service.findMany(ACTOR, {});

      expect(campaigns().findMany.mock.calls[0][0]).toMatchObject({ skip: 0, take: 20 });
    });

    it('caps the page size at 100 even when the service is called directly', async () => {
      await service.findMany(ACTOR, { limit: 5000 });

      expect((campaigns().findMany.mock.calls[0][0] as { take: number }).take).toBe(100);
    });

    it('orders newest first, with the id breaking ties', async () => {
      await service.findMany(ACTOR, {});

      expect((campaigns().findMany.mock.calls[0][0] as { orderBy: unknown }).orderBy).toEqual([
        { createdAt: 'desc' },
        { id: 'asc' },
      ]);
    });

    it('filters on status when asked', async () => {
      await service.findMany(ACTOR, { status: CampaignStatus.active });

      expect(queriedWhere(campaigns().findMany)).toEqual({
        mosqueId: MOSQUE_ID,
        status: CampaignStatus.active,
      });
    });

    it('narrows to one fund when asked', async () => {
      await service.findMany(ACTOR, { fundId: FUND_ID });

      expect(queriedWhere(campaigns().findMany)).toEqual({
        mosqueId: MOSQUE_ID,
        fundId: FUND_ID,
      });
    });

    // The mosque clause does the work here, so a borrowed fund id needs no separate check on a read: it
    // matches nothing in the caller's own mosque.
    it('returns nothing for another mosque’s fundId rather than refusing', async () => {
      const { rows, meta } = await service.findMany(ACTOR, { fundId: FUND_ID });

      expect(queriedWhere(campaigns().findMany).mosqueId).toBe(MOSQUE_ID);
      expect(rows).toEqual([]);
      expect(meta.total).toBe(0);
    });

    it('searches title, slug and description case-insensitively', async () => {
      await service.findMany(ACTOR, { search: 'roof' });

      expect(queriedWhere(campaigns().findMany).OR).toEqual([
        { title: { contains: 'roof', mode: 'insensitive' } },
        { slug: { contains: 'roof', mode: 'insensitive' } },
        { description: { contains: 'roof', mode: 'insensitive' } },
      ]);
    });

    it('reports paging figures that match the filter, not the page', async () => {
      campaigns().count.mockResolvedValue(7);
      campaigns().findMany.mockResolvedValue([row()]);

      const { meta } = await service.findMany(ACTOR, { page: 2, limit: 3 });

      expect(meta).toEqual({ page: 2, limit: 3, total: 7, totalPages: 3 });
    });

    it('counts and reads in one transaction', async () => {
      await service.findMany(ACTOR, {});

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('returns the fund as a name and slug, and no money it did not read', async () => {
      campaigns().count.mockResolvedValue(1);
      campaigns().findMany.mockResolvedValue([row()]);

      const { rows } = await service.findMany(ACTOR, {});

      expect(rows[0].fund).toEqual({
        id: FUND_ID,
        name: 'Mosque Construction',
        slug: 'mosque-construction',
      });
      const body = JSON.stringify(rows[0]);
      for (const forbidden of ['raised', 'balance', 'donationCount', 'collected', 'progress']) {
        expect(body).not.toContain(forbidden);
      }
    });

    it('never returns the mosque id', async () => {
      campaigns().count.mockResolvedValue(1);
      campaigns().findMany.mockResolvedValue([row()]);

      const { rows } = await service.findMany(ACTOR, {});

      expect(rows[0]).not.toHaveProperty('mosqueId');
    });
  });

  describe('findOne', () => {
    it('asks for the id inside the caller’s mosque, not the id alone', async () => {
      campaigns().findFirst.mockResolvedValue(row());

      await service.findOne(ACTOR, CAMPAIGN_ID);

      expect(queriedWhere(campaigns().findFirst)).toEqual({
        id: CAMPAIGN_ID,
        mosqueId: MOSQUE_ID,
      });
    });

    it('answers 404 for another mosque’s campaign, never 403', async () => {
      campaigns().findFirst.mockResolvedValue(null);

      await expect(service.findOne(ACTOR, CAMPAIGN_ID)).rejects.toThrow(NotFoundException);
    });

    it('serialises the dates as calendar days and the target as an exact string', async () => {
      campaigns().findFirst.mockResolvedValue(row());

      const campaign = await service.findOne(ACTOR, CAMPAIGN_ID);

      expect(campaign.startDate).toBe('2026-09-01');
      expect(campaign.endDate).toBe('2026-12-31');
      expect(campaign.targetAmount).toBe('1500000.00');
    });
  });

  describe('update', () => {
    it('refuses before writing when the campaign is another mosque’s', async () => {
      campaigns().findFirst.mockResolvedValue(null);

      await expect(service.update(ACTOR, CAMPAIGN_ID, { title: 'Renamed' })).rejects.toThrow(
        NotFoundException,
      );
      expect(campaigns().update).not.toHaveBeenCalled();
    });

    it('touches only the fields that were sent', async () => {
      campaigns().findFirst.mockResolvedValue(row());
      campaigns().update.mockResolvedValue(row({ title: 'Rebuild the Roof' }));

      await service.update(ACTOR, CAMPAIGN_ID, { title: 'Rebuild the Roof' });

      expect(writtenData(campaigns().update)).toEqual({ title: 'Rebuild the Roof' });
    });

    it('does not re-derive the slug when the title changes', async () => {
      campaigns().findFirst.mockResolvedValue(row());
      campaigns().update.mockResolvedValue(row({ title: 'Something Else' }));

      await service.update(ACTOR, CAMPAIGN_ID, { title: 'Something Else' });

      expect(writtenData(campaigns().update)).not.toHaveProperty('slug');
    });

    it('detaches the campaign from its fund on an explicit null', async () => {
      campaigns().findFirst.mockResolvedValue(row());
      campaigns().update.mockResolvedValue(row({ fund: null }));

      await service.update(ACTOR, CAMPAIGN_ID, { fundId: null });

      expect(writtenData(campaigns().update)).toEqual({ fundId: null });
      // Nothing to verify when there is no fund to verify.
      expect(donationFunds().findFirst).not.toHaveBeenCalled();
    });

    it('checks a new fundId inside the caller’s mosque', async () => {
      campaigns().findFirst.mockResolvedValue(row());
      donationFunds().findFirst.mockResolvedValue({ id: FUND_ID });
      campaigns().update.mockResolvedValue(row());

      await service.update(ACTOR, CAMPAIGN_ID, { fundId: FUND_ID });

      expect(queriedWhere(donationFunds().findFirst)).toEqual({
        id: FUND_ID,
        mosqueId: MOSQUE_ID,
      });
    });

    it('refuses to move a campaign onto another mosque’s fund', async () => {
      campaigns().findFirst.mockResolvedValue(row());
      donationFunds().findFirst.mockResolvedValue(null);

      await expect(service.update(ACTOR, CAMPAIGN_ID, { fundId: FUND_ID })).rejects.toThrow(
        BadRequestException,
      );
      expect(campaigns().update).not.toHaveBeenCalled();
    });

    it('checks a lone endDate against the stored startDate', async () => {
      campaigns().findFirst.mockResolvedValue(
        row({ startDate: new Date('2026-09-10T00:00:00.000Z') }),
      );

      await expect(service.update(ACTOR, CAMPAIGN_ID, { endDate: '2026-09-05' })).rejects.toThrow(
        BadRequestException,
      );
      expect(campaigns().update).not.toHaveBeenCalled();
    });

    it('allows a lone endDate that still falls after the stored startDate', async () => {
      campaigns().findFirst.mockResolvedValue(
        row({ startDate: new Date('2026-09-01T00:00:00.000Z') }),
      );
      campaigns().update.mockResolvedValue(row());

      await expect(
        service.update(ACTOR, CAMPAIGN_ID, { endDate: '2027-01-31' }),
      ).resolves.toBeDefined();
    });

    it('checks a lone startDate against the stored endDate', async () => {
      campaigns().findFirst.mockResolvedValue(
        row({ endDate: new Date('2026-12-31T00:00:00.000Z') }),
      );

      await expect(service.update(ACTOR, CAMPAIGN_ID, { startDate: '2027-06-01' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('writes a changed target as a Decimal', async () => {
      campaigns().findFirst.mockResolvedValue(row());
      campaigns().update.mockResolvedValue(row({ targetAmount: new Prisma.Decimal('2000000.00') }));

      await service.update(ACTOR, CAMPAIGN_ID, { targetAmount: '2000000.00' });

      expect(writtenData(campaigns().update).targetAmount).toBeInstanceOf(Prisma.Decimal);
    });

    it('turns a slug collision into a 409', async () => {
      campaigns().findFirst.mockResolvedValue(row());
      campaigns().update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '6.0.0',
        }),
      );

      await expect(service.update(ACTOR, CAMPAIGN_ID, { slug: 'roof-appeal' })).rejects.toThrow(
        ConflictException,
      );
    });

    // The fund could be deleted between the check and the write. The foreign key catches it, and its
    // error has to become the same answer the pre-check gives.
    it('translates a lost fund foreign key into the same 400', async () => {
      campaigns().findFirst.mockResolvedValue(row());
      donationFunds().findFirst.mockResolvedValue({ id: FUND_ID });
      campaigns().update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
          code: 'P2003',
          clientVersion: '6.0.0',
        }),
      );

      await expect(service.update(ACTOR, CAMPAIGN_ID, { fundId: FUND_ID })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('refuses another mosque’s campaign with a 404 and does not delete', async () => {
      campaigns().findFirst.mockResolvedValue(null);

      await expect(service.remove(ACTOR, CAMPAIGN_ID)).rejects.toThrow(NotFoundException);
      expect(campaigns().delete).not.toHaveBeenCalled();
    });

    it('deletes the campaign and reports what it removed', async () => {
      campaigns().findFirst.mockResolvedValue(row());
      campaigns().delete.mockResolvedValue(row());

      const deleted = await service.remove(ACTOR, CAMPAIGN_ID);

      expect(campaigns().delete).toHaveBeenCalledWith({ where: { id: CAMPAIGN_ID } });
      expect(deleted).toEqual({
        id: CAMPAIGN_ID,
        title: 'Build the New Mosque Roof',
        slug: 'build-the-new-mosque-roof',
      });
    });

    it('answers 404 when the row vanished between the read and the delete', async () => {
      campaigns().findFirst.mockResolvedValue(row());
      campaigns().delete.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '6.0.0',
        }),
      );

      await expect(service.remove(ACTOR, CAMPAIGN_ID)).rejects.toThrow(NotFoundException);
    });

    it('refuses with a 409 while donations are recorded against the campaign', async () => {
      campaigns().findFirst.mockResolvedValue(row());
      donations().count.mockResolvedValue(4);

      await expect(service.remove(ACTOR, CAMPAIGN_ID)).rejects.toMatchObject({
        response: { code: 'CAMPAIGN_IN_USE' },
      });
      expect(campaigns().delete).not.toHaveBeenCalled();
    });

    it('counts those donations by campaign, not across the table', async () => {
      campaigns().findFirst.mockResolvedValue(row());
      donations().count.mockResolvedValue(1);

      await expect(service.remove(ACTOR, CAMPAIGN_ID)).rejects.toThrow(ConflictException);

      expect(queriedWhere(donations().count)).toEqual({ campaignId: CAMPAIGN_ID });
    });

    // The pre-check can lose a race with a donation recorded a moment later, and the foreign key is what
    // actually holds the line. Its P2003 must not surface as the shared translation's "bad fundId" — this
    // request has no `fundId` at all.
    it('reads a foreign-key refusal on delete as the campaign being in use', async () => {
      campaigns().findFirst.mockResolvedValue(row());
      campaigns().delete.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
          code: 'P2003',
          clientVersion: '6.0.0',
        }),
      );

      await expect(service.remove(ACTOR, CAMPAIGN_ID)).rejects.toMatchObject({
        response: { code: 'CAMPAIGN_IN_USE' },
      });
    });
  });

  /**
   * The mosque comes from the token, and there is no other way to supply one.
   */
  describe('mosque id from the token only', () => {
    const intruder: AuthenticatedUser = { ...ACTOR, mosqueId: OTHER_MOSQUE_ID };

    it('scopes a read to whichever mosque the token names', async () => {
      campaigns().findFirst.mockResolvedValue(null);

      await expect(service.findOne(intruder, CAMPAIGN_ID)).rejects.toThrow(NotFoundException);

      expect(queriedWhere(campaigns().findFirst)).toEqual({
        id: CAMPAIGN_ID,
        mosqueId: OTHER_MOSQUE_ID,
      });
    });

    it('files a create under whichever mosque the token names', async () => {
      campaigns().create.mockResolvedValue(row());

      await service.create(intruder, newCampaign());

      expect(writtenData(campaigns().create).mosqueId).toBe(OTHER_MOSQUE_ID);
    });

    it('scopes the fund check to the token’s mosque as well', async () => {
      donationFunds().findFirst.mockResolvedValue(null);

      await expect(service.create(intruder, newCampaign({ fundId: FUND_ID }))).rejects.toThrow(
        BadRequestException,
      );

      expect(queriedWhere(donationFunds().findFirst)).toEqual({
        id: FUND_ID,
        mosqueId: OTHER_MOSQUE_ID,
      });
    });

    it('ignores a mosqueId smuggled into a create body', async () => {
      campaigns().create.mockResolvedValue(row());

      // The DTO has no such field and the global pipe rejects it over HTTP; this asserts the service
      // would not honour one even if it arrived.
      const smuggled = {
        ...newCampaign(),
        mosqueId: OTHER_MOSQUE_ID,
      } as unknown as CreateCampaignDto;

      await service.create(ACTOR, smuggled);

      expect(writtenData(campaigns().create).mosqueId).toBe(MOSQUE_ID);
    });

    it('ignores a mosqueId smuggled into a patch body', async () => {
      campaigns().findFirst.mockResolvedValue(row());
      campaigns().update.mockResolvedValue(row());

      const smuggled = {
        title: 'Rebuild the Roof',
        mosqueId: OTHER_MOSQUE_ID,
      } as unknown as UpdateCampaignDto;

      await service.update(ACTOR, CAMPAIGN_ID, smuggled);

      expect(writtenData(campaigns().update)).toEqual({ title: 'Rebuild the Roof' });
    });
  });
});
