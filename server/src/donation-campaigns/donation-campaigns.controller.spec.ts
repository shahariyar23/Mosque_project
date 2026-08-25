import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { CampaignStatus } from '@prisma/client';

import { PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { DonationCampaignsController } from './donation-campaigns.controller';
import { DonationCampaignsService } from './donation-campaigns.service';
import type { CampaignResponseDto } from './dto/campaign-response.dto';

/**
 * Tests for the donation-campaigns controller.
 *
 * The service is mocked on purpose: what is under test is that the controller delegates and wraps, and does
 * no work of its own. Three things carry weight — the response envelope, which every client parses; the
 * permission each route declares, since a route naming the wrong one is open however careful the guard
 * behind it is; and that the authenticated user reaches the service, because the token is the only channel
 * the mosque travels through.
 *
 * The publish rule is deliberately *not* asserted here. It lives in the service, because whether a request
 * publishes depends on its body, and a route decorator cannot read a body. Its cases are in
 * `donation-campaigns.service.spec.ts`; what this file checks is that the route asks for `campaign.manage`,
 * which is the floor the publish check sits on top of.
 */
const ACTOR: AuthenticatedUser = {
  id: '9c8b7a65-4321-4f6a-8c11-2d5e7a9b0c31',
  mosqueId: '3f1a7c2e-9b4d-4f6a-8c11-2d5e7a9b0c31',
  email: 'treasurer@noor.example',
  role: 'treasurer',
  permissions: [],
  deniedPermissions: [],
  isActive: true,
};

const SAMPLE: CampaignResponseDto = {
  id: '1b4e28ba-2fa1-11d2-883f-0016d3cca427',
  title: 'Build the New Mosque Roof',
  slug: 'build-the-new-mosque-roof',
  description: 'The roof has leaked through two monsoons.',
  status: CampaignStatus.active,
  targetAmount: '1500000.00',
  startDate: '2026-09-01',
  endDate: '2026-12-31',
  imageUrl: 'https://cdn.example.org/campaigns/roof.jpg',
  isPublic: true,
  fund: {
    id: '2c5f39cb-3fb2-11d2-883f-0016d3cca428',
    name: 'Mosque Construction',
    slug: 'mosque-construction',
  },
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
};

/** The minimum a create needs: a title, a goal and a window. */
const NEW_CAMPAIGN = {
  title: 'Build the New Mosque Roof',
  targetAmount: '1500000.00',
  startDate: '2026-09-01',
  endDate: '2026-12-31',
};

type ServiceMock = Record<'create' | 'findMany' | 'findOne' | 'update' | 'remove', jest.Mock>;

describe('DonationCampaignsController', () => {
  let controller: DonationCampaignsController;
  let campaigns: ServiceMock;

  beforeEach(async () => {
    campaigns = {
      create: jest.fn().mockResolvedValue(SAMPLE),
      findMany: jest.fn().mockResolvedValue({
        rows: [SAMPLE],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }),
      findOne: jest.fn().mockResolvedValue(SAMPLE),
      update: jest.fn().mockResolvedValue({ ...SAMPLE, title: 'Rebuild the Roof' }),
      remove: jest
        .fn()
        .mockResolvedValue({ id: SAMPLE.id, title: SAMPLE.title, slug: SAMPLE.slug }),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [DonationCampaignsController],
      providers: [{ provide: DonationCampaignsService, useValue: campaigns }],
    }).compile();

    controller = moduleRef.get(DonationCampaignsController);
  });

  it('returns a created campaign in the standard envelope', async () => {
    const response = await controller.create(ACTOR, NEW_CAMPAIGN);

    // The user goes first, and it is the whole channel the mosque arrives by.
    expect(campaigns.create).toHaveBeenCalledWith(ACTOR, NEW_CAMPAIGN);
    expect(response).toEqual({
      success: true,
      message: 'Campaign created successfully',
      data: SAMPLE,
    });
  });

  it('returns a list as data plus paging meta', async () => {
    const response = await controller.findAll(ACTOR, { page: 1, limit: 20 });

    // The shape every client reads. Asserted literally because changing it silently breaks them.
    expect(response).toEqual({
      success: true,
      message: 'Campaigns retrieved successfully',
      data: [SAMPLE],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
  });

  it('passes the query through without interpreting it', async () => {
    const query = {
      page: 2,
      limit: 50,
      search: 'roof',
      status: CampaignStatus.active,
      fundId: SAMPLE.fund?.id,
    };

    await controller.findAll(ACTOR, query);

    // Handed over verbatim; the service turns it into a `where`. A filter interpreted in two places
    // drifts in one of them.
    expect(campaigns.findMany).toHaveBeenCalledWith(ACTOR, query);
  });

  it('returns one campaign', async () => {
    const response = await controller.findOne(ACTOR, SAMPLE.id);

    expect(campaigns.findOne).toHaveBeenCalledWith(ACTOR, SAMPLE.id);
    expect(response.message).toBe('Campaign retrieved successfully');
    expect(response.data).toEqual(SAMPLE);
  });

  it('returns the campaign with its updated fields', async () => {
    const dto = { title: 'Rebuild the Roof' };

    const response = await controller.update(ACTOR, SAMPLE.id, dto);

    expect(campaigns.update).toHaveBeenCalledWith(ACTOR, SAMPLE.id, dto);
    expect(response.message).toBe('Campaign updated successfully');
    expect(response.data.title).toBe('Rebuild the Roof');
  });

  it('confirms a delete with the id, title and freed slug', async () => {
    const response = await controller.remove(ACTOR, SAMPLE.id);

    expect(campaigns.remove).toHaveBeenCalledWith(ACTOR, SAMPLE.id);
    expect(response).toEqual({
      success: true,
      message: 'Campaign deleted successfully',
      data: { id: SAMPLE.id, title: SAMPLE.title, slug: SAMPLE.slug },
    });
  });

  it('adds nothing of its own to what the service returns', async () => {
    const response = await controller.findOne(ACTOR, SAMPLE.id);

    expect(response.data).toBe(SAMPLE);
    expect(Object.keys(response)).toEqual(['success', 'message', 'data']);
  });

  it('reports the fund as a reference, not as a balance', async () => {
    const response = await controller.findOne(ACTOR, SAMPLE.id);

    expect(response.data.fund).toEqual({
      id: SAMPLE.fund?.id,
      name: 'Mosque Construction',
      slug: 'mosque-construction',
    });
  });

  it('reports no money beyond the target it was given', async () => {
    // A campaign is an appeal, not a ledger. If a later part ever attaches a running total to the row,
    // this fails rather than quietly publishing an unreconciled figure.
    const responses = [
      await controller.create(ACTOR, NEW_CAMPAIGN),
      await controller.findAll(ACTOR, {}),
      await controller.findOne(ACTOR, SAMPLE.id),
      await controller.update(ACTOR, SAMPLE.id, {}),
    ];

    for (const response of responses) {
      const body = JSON.stringify(response);
      for (const forbidden of ['raised', 'balance', 'donationCount', 'collected', 'progress']) {
        expect(body).not.toContain(forbidden);
      }
    }
  });

  it('never echoes the mosque id', async () => {
    const response = await controller.findOne(ACTOR, SAMPLE.id);

    expect(JSON.stringify(response)).not.toContain(ACTOR.mosqueId);
  });

  /**
   * What each route requires, read off the real decorators with a real `Reflector`.
   *
   * These belong here rather than in an end-to-end test because the mistake they guard against is a
   * declaration mistake: `PermissionsGuard` is tested against its own decorators elsewhere, and what is
   * untested until here is whether *these* handlers ask for the right thing.
   *
   * The permissions are named literally, which is what would catch a rename that missed a route.
   */
  describe('what each route requires', () => {
    const reflector = new Reflector();
    const handlers = DonationCampaignsController.prototype as unknown as Record<string, () => void>;

    const requires = (method: string): string[] | undefined =>
      reflector.get<string[]>(PERMISSIONS_KEY, handlers[method]);

    it.each([['findAll'], ['findOne']])(
      'gates %s on campaign.view, so reading the list is not the same as changing it',
      (method) => {
        expect(requires(method)).toEqual(['campaign.view']);
      },
    );

    it.each([['create'], ['update'], ['remove']])('gates %s on campaign.manage', (method) => {
      expect(requires(method)).toEqual(['campaign.manage']);
    });

    // `campaign.publish` is not on any route: the routes that could publish also accept requests that do
    // not, and refusing those at the guard would make an unpublished draft impossible to save. The
    // service applies it against the body instead.
    it('does not put campaign.publish on a route', () => {
      for (const method of ['create', 'update']) {
        expect(requires(method)).not.toContain('campaign.publish');
      }
    });

    it('leaves no route ungated', () => {
      for (const method of ['create', 'findAll', 'findOne', 'update', 'remove']) {
        expect(requires(method)).toBeDefined();
      }
    });
  });
});
