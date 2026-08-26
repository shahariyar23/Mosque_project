import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { DonationStatus, PaymentMethod } from '@prisma/client';

import { ANY_PERMISSION_KEY, PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { DonationsController } from './donations.controller';
import { DonationsService } from './donations.service';
import type { CreateDonationDto } from './dto/create-donation.dto';
import type { DonationResponseDto } from './dto/donation-response.dto';

/**
 * The donations controller.
 *
 * It shapes envelopes and nothing else: no filtering, no ownership decision, no mosque of its own. Those
 * belong to the service, which is mocked here so this file can check the three things the controller is
 * actually responsible for — the authenticated user reaching the service, the envelope's shape, and the
 * permissions written on each route.
 *
 * The last block is the important one. It reads the metadata off the handlers rather than trusting the
 * source to look right, so a permission quietly dropped from a route fails here. The two read routes use
 * `@AnyPermission` and the two write routes use `@Permissions`, and those are separate metadata keys — a
 * read route that ended up under `@Permissions('donation.view', 'donation.viewOwn')` would require *both*
 * and lock every member out of their own history, which is why each key is asserted where it belongs and
 * asserted absent where it does not.
 */

const ACTOR: AuthenticatedUser = {
  id: '9c8b7a65-4321-4f6a-8c11-2d5e7a9b0c31',
  mosqueId: 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0',
  email: 'treasurer@noor.example',
  role: 'treasurer',
  permissions: [],
  deniedPermissions: [],
  isActive: true,
};

const DONATION_ID = '1b4e28ba-2fa1-11d2-883f-0016d3cca427';
const FUND_ID = '2c5f39cb-3fb2-11d2-883f-0016d3cca428';

const SAMPLE: DonationResponseDto = {
  id: DONATION_ID,
  amount: '500.00',
  currency: 'BDT',
  paymentMethod: PaymentMethod.cash,
  status: DonationStatus.pending,
  donatedAt: '2026-08-21T14:30:00.000Z',
  donor: null,
  donorName: 'Abdul Karim',
  donorEmail: null,
  fund: { id: FUND_ID, name: 'Zakat', slug: 'zakat' },
  campaign: null,
  reference: 'RCP-2026-00412',
  notes: null,
  createdAt: '2026-08-22T09:00:00.000Z',
  updatedAt: '2026-08-22T09:00:00.000Z',
};

const NEW_DONATION: CreateDonationDto = {
  fundId: FUND_ID,
  amount: '500.00',
  paymentMethod: PaymentMethod.cash,
};

type ServiceMock = Record<'create' | 'findMany' | 'findOne' | 'update', jest.Mock>;

describe('DonationsController', () => {
  let controller: DonationsController;
  let donations: ServiceMock;

  beforeEach(async () => {
    donations = {
      create: jest.fn().mockResolvedValue(SAMPLE),
      findMany: jest.fn().mockResolvedValue({
        rows: [SAMPLE],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }),
      findOne: jest.fn().mockResolvedValue(SAMPLE),
      update: jest.fn().mockResolvedValue(SAMPLE),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DonationsController],
      providers: [{ provide: DonationsService, useValue: donations }],
    }).compile();

    controller = module.get(DonationsController);
  });

  describe('POST /donations', () => {
    it('hands the authenticated user and the body to the service', async () => {
      await controller.create(ACTOR, NEW_DONATION);

      expect(donations.create).toHaveBeenCalledWith(ACTOR, NEW_DONATION);
    });

    it('answers the created donation in the standard envelope', async () => {
      const response = await controller.create(ACTOR, NEW_DONATION);

      expect(response).toEqual({
        success: true,
        message: 'Donation recorded successfully',
        data: SAMPLE,
      });
    });
  });

  describe('GET /donations', () => {
    it('passes the query through untouched', async () => {
      const query = { page: 2, limit: 50, status: DonationStatus.completed };

      await controller.findAll(ACTOR, query);

      expect(donations.findMany).toHaveBeenCalledWith(ACTOR, query);
    });

    it('puts the rows in `data` and the figures in `meta`', async () => {
      const response = await controller.findAll(ACTOR, {});

      expect(response).toEqual({
        success: true,
        message: 'Donations retrieved successfully',
        data: [SAMPLE],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
    });

    // The controller does no filtering of its own, so whatever the service scoped is what is returned.
    it('adds nothing of its own to the list envelope', async () => {
      const response = await controller.findAll(ACTOR, {});

      expect(Object.keys(response)).toEqual(['success', 'message', 'data', 'meta']);
    });
  });

  describe('GET /donations/:id', () => {
    it('asks the service for the id on behalf of the caller', async () => {
      await controller.findOne(ACTOR, DONATION_ID);

      expect(donations.findOne).toHaveBeenCalledWith(ACTOR, DONATION_ID);
    });

    it('answers the donation in the standard envelope', async () => {
      const response = await controller.findOne(ACTOR, DONATION_ID);

      expect(response).toEqual({
        success: true,
        message: 'Donation retrieved successfully',
        data: SAMPLE,
      });
      expect(Object.keys(response)).toEqual(['success', 'message', 'data']);
    });
  });

  describe('PATCH /donations/:id', () => {
    it('hands the id and the patch to the service', async () => {
      await controller.update(ACTOR, DONATION_ID, { notes: 'Corrected' });

      expect(donations.update).toHaveBeenCalledWith(ACTOR, DONATION_ID, { notes: 'Corrected' });
    });

    it('answers the updated donation in the standard envelope', async () => {
      const response = await controller.update(ACTOR, DONATION_ID, {
        status: DonationStatus.cancelled,
      });

      expect(response).toEqual({
        success: true,
        message: 'Donation updated successfully',
        data: SAMPLE,
      });
    });
  });

  // A donation entered in error is corrected or cancelled, never removed. Nothing on this controller
  // deletes, and this asserts that rather than leaving it to a reading of the file.
  it('offers no way to delete a donation', () => {
    expect(controller).not.toHaveProperty('remove');
    expect(controller).not.toHaveProperty('delete');
  });

  it('never echoes the mosque id', async () => {
    const response = await controller.findOne(ACTOR, DONATION_ID);

    expect(JSON.stringify(response)).not.toContain(ACTOR.mosqueId);
  });

  /**
   * What the guards will enforce, read off the handlers.
   */
  describe('what each route requires', () => {
    const reflector = new Reflector();
    const handlers = DonationsController.prototype as unknown as Record<string, () => void>;

    /** Permissions the caller must hold *all* of. */
    const requiresAll = (method: string): string[] | undefined =>
      reflector.get<string[]>(PERMISSIONS_KEY, handlers[method]);

    /** Permissions the caller must hold *at least one* of. */
    const requiresAny = (method: string): string[] | undefined =>
      reflector.get<string[]>(ANY_PERMISSION_KEY, handlers[method]);

    it('needs donation.record to enter one', () => {
      expect(requiresAll('create')).toEqual(['donation.record']);
    });

    // Either permission opens the route; the service then decides how much of the mosque the caller sees.
    it('needs either view permission to read the list', () => {
      expect(requiresAny('findAll')).toEqual(['donation.view', 'donation.viewOwn']);
    });

    it('needs either view permission to read one', () => {
      expect(requiresAny('findOne')).toEqual(['donation.view', 'donation.viewOwn']);
    });

    // The distinction that matters: `@Permissions` is an AND. Listing both view permissions there would
    // require both, and a member holding only `donation.viewOwn` could not read their own giving.
    it('does not require both view permissions at once', () => {
      expect(requiresAll('findAll')).toBeUndefined();
      expect(requiresAll('findOne')).toBeUndefined();
    });

    it('needs donation.manage to correct or withdraw one', () => {
      expect(requiresAll('update')).toEqual(['donation.manage']);
      expect(requiresAny('update')).toBeUndefined();
    });

    // Recording a donation is not reading one, and neither is editing: a cashier who may enter the Friday
    // collection has no business browsing the mosque's giving history.
    it('does not let a write permission stand in for a read one', () => {
      expect(requiresAny('create')).toBeUndefined();
      expect(requiresAll('create')).not.toContain('donation.view');
      expect(requiresAll('update')).not.toContain('donation.view');
    });

    it('leaves no route unguarded', () => {
      for (const method of ['create', 'findAll', 'findOne', 'update']) {
        const guarded =
          (requiresAll(method)?.length ?? 0) > 0 || (requiresAny(method)?.length ?? 0) > 0;
        expect(guarded).toBe(true);
      }
    });
  });
});
