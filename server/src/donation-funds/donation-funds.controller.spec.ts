import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { FundStatus } from '@prisma/client';

import { PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { DonationFundsController } from './donation-funds.controller';
import { DonationFundsService } from './donation-funds.service';
import type { DonationFundResponseDto } from './dto/donation-fund-response.dto';

/**
 * Tests for the donation-funds controller.
 *
 * The service is mocked, which is the point: these cases assert the controller does no work of its own
 * beyond delegating and wrapping. Three things are load-bearing — the response envelope, which every client
 * parses; the permission each route declares, since a route naming the wrong one is wide open however
 * careful the guard behind it is; and that the authenticated user is what reaches the service, because that
 * is the only channel the mosque travels through.
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

const SAMPLE: DonationFundResponseDto = {
  id: '1b4e28ba-2fa1-11d2-883f-0016d3cca427',
  name: 'Zakat',
  slug: 'zakat',
  description: 'Obligatory annual charity, distributed locally.',
  status: FundStatus.active,
  targetAmount: '500000.00',
  openingBalance: '0.00',
  startDate: '2026-03-01',
  endDate: '2026-03-31',
  isPublic: true,
  campaignCount: 2,
  createdAt: '2026-02-01T10:00:00.000Z',
  updatedAt: '2026-02-01T10:00:00.000Z',
};

type ServiceMock = Record<'create' | 'findMany' | 'findOne' | 'update' | 'remove', jest.Mock>;

describe('DonationFundsController', () => {
  let controller: DonationFundsController;
  let funds: ServiceMock;

  beforeEach(async () => {
    funds = {
      create: jest.fn().mockResolvedValue(SAMPLE),
      findMany: jest.fn().mockResolvedValue({
        rows: [SAMPLE],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }),
      findOne: jest.fn().mockResolvedValue(SAMPLE),
      update: jest.fn().mockResolvedValue({ ...SAMPLE, name: 'Zakat al-Fitr' }),
      remove: jest.fn().mockResolvedValue({ id: SAMPLE.id, name: SAMPLE.name, slug: SAMPLE.slug }),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [DonationFundsController],
      providers: [{ provide: DonationFundsService, useValue: funds }],
    }).compile();

    controller = moduleRef.get(DonationFundsController);
  });

  it('returns a created fund in the standard envelope', async () => {
    const dto = { name: 'Zakat', targetAmount: '500000.00' };

    const response = await controller.create(ACTOR, dto);

    // The user goes first, and it is the whole channel the mosque arrives by.
    expect(funds.create).toHaveBeenCalledWith(ACTOR, dto);
    expect(response).toEqual({
      success: true,
      message: 'Donation fund created successfully',
      data: SAMPLE,
    });
  });

  it('returns a list as data plus paging meta', async () => {
    const response = await controller.findAll(ACTOR, { page: 1, limit: 20 });

    // The shape every client reads. Asserted literally because changing it silently breaks them.
    expect(response).toEqual({
      success: true,
      message: 'Donation funds retrieved successfully',
      data: [SAMPLE],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
  });

  it('passes the query through without interpreting it', async () => {
    const query = { page: 2, limit: 50, search: 'zakat', status: FundStatus.active };

    await controller.findAll(ACTOR, query);

    // Handed over verbatim; the service turns it into a `where`. A filter interpreted in two places
    // drifts in one of them.
    expect(funds.findMany).toHaveBeenCalledWith(ACTOR, query);
  });

  it('returns one fund', async () => {
    const response = await controller.findOne(ACTOR, SAMPLE.id);

    expect(funds.findOne).toHaveBeenCalledWith(ACTOR, SAMPLE.id);
    expect(response.message).toBe('Donation fund retrieved successfully');
    expect(response.data).toEqual(SAMPLE);
  });

  it('returns the fund with its updated fields', async () => {
    const dto = { name: 'Zakat al-Fitr' };

    const response = await controller.update(ACTOR, SAMPLE.id, dto);

    expect(funds.update).toHaveBeenCalledWith(ACTOR, SAMPLE.id, dto);
    expect(response.message).toBe('Donation fund updated successfully');
    expect(response.data.name).toBe('Zakat al-Fitr');
  });

  it('confirms a delete with the id, name and freed slug', async () => {
    const response = await controller.remove(ACTOR, SAMPLE.id);

    expect(funds.remove).toHaveBeenCalledWith(ACTOR, SAMPLE.id);
    expect(response).toEqual({
      success: true,
      message: 'Donation fund deleted successfully',
      data: { id: SAMPLE.id, name: 'Zakat', slug: 'zakat' },
    });
  });

  it('adds nothing of its own to what the service returns', async () => {
    const response = await controller.findOne(ACTOR, SAMPLE.id);

    expect(response.data).toBe(SAMPLE);
    expect(Object.keys(response)).toEqual(['success', 'message', 'data']);
  });

  it('reports no money beyond the target it was given', async () => {
    // A fund is a category. If a later part ever adds a balance to the row, this fails rather than
    // quietly publishing an unreconciled figure.
    const responses = [
      await controller.create(ACTOR, { name: 'Zakat' }),
      await controller.findAll(ACTOR, {}),
      await controller.findOne(ACTOR, SAMPLE.id),
      await controller.update(ACTOR, SAMPLE.id, {}),
    ];

    for (const response of responses) {
      const body = JSON.stringify(response);
      for (const forbidden of ['raised', 'balance', 'donationCount', 'collected', 'spent']) {
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
   * Both permissions already existed in the registry for exactly this purpose, so nothing new was minted
   * — and the assertions name them literally, which is what would catch a rename that missed a route.
   */
  describe('what each route requires', () => {
    const reflector = new Reflector();
    const handlers = DonationFundsController.prototype as unknown as Record<string, () => void>;

    const requires = (method: string): string[] | undefined =>
      reflector.get<string[]>(PERMISSIONS_KEY, handlers[method]);

    it.each([['findAll'], ['findOne']])(
      'gates %s on fund.view, so reading the list is not the same as changing it',
      (method) => {
        expect(requires(method)).toEqual(['fund.view']);
      },
    );

    it.each([['create'], ['update'], ['remove']])('gates %s on fund.manage', (method) => {
      expect(requires(method)).toEqual(['fund.manage']);
    });

    it('leaves no route ungated', () => {
      for (const method of ['create', 'findAll', 'findOne', 'update', 'remove']) {
        expect(requires(method)).toBeDefined();
      }
    });
  });
});
