import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { VolunteerStatus } from '@prisma/client';

import { ANY_PERMISSION_KEY, PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import type { UserResponseDto } from '../users/dto/user-response.dto';
import type { VolunteerResponseDto } from './dto/volunteer-response.dto';
import { VolunteersController } from './volunteers.controller';
import { VolunteersService } from './volunteers.service';

/**
 * Tests for the volunteers controller.
 *
 * The service is mocked, which is the point: these cases assert that the controller does no work of its
 * own beyond delegating and wrapping. Two things are load-bearing — the response envelope, which every
 * client parses, and the permission each route declares, since a route that names the wrong permission is
 * wide open however carefully the guard behind it is written.
 */
const USER: UserResponseDto = {
  id: '9c8b7a65-4321-4f6a-8c11-2d5e7a9b0c31',
  mosqueId: '3f1a7c2e-9b4d-4f6a-8c11-2d5e7a9b0c31',
  fullName: 'Rahim Uddin',
  email: 'rahim@noor.example',
  phone: '+8801700000002',
  // The specification's own example: role `treasurer`, volunteer status `active`. The two are
  // independent, and nothing in this file changes the first.
  role: 'treasurer',
  positions: [],
  permissions: [],
  deniedPermissions: [],
  isActive: true,
  status: 'active',
  dateOfBirth: '1990-04-17',
  gender: 'male',
  city: 'Dhaka',
  avatarUrl: null,
  newsletter: false,
  emailVerifiedAt: null,
  lastLoginAt: null,
  createdAt: '2026-03-01T09:00:00.000Z',
  updatedAt: '2026-03-01T09:00:00.000Z',
};

const SAMPLE: VolunteerResponseDto = {
  id: '1b2c3d4e-5f60-4f6a-8c11-2d5e7a9b0c31',
  userId: USER.id,
  status: VolunteerStatus.active,
  skills: 'Event management',
  availability: 'Friday',
  notes: 'Available for community events',
  joinedAt: '2026-03-01T09:00:00.000Z',
  createdAt: '2026-03-01T09:00:00.000Z',
  updatedAt: '2026-03-01T09:00:00.000Z',
  user: USER,
};

type ServiceMock = Record<
  'create' | 'findMany' | 'findOne' | 'update' | 'setStatus' | 'remove',
  jest.Mock
>;

describe('VolunteersController', () => {
  let controller: VolunteersController;
  let volunteers: ServiceMock;

  beforeEach(async () => {
    volunteers = {
      create: jest.fn().mockResolvedValue(SAMPLE),
      findMany: jest.fn().mockResolvedValue({
        rows: [SAMPLE],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }),
      findOne: jest.fn().mockResolvedValue(SAMPLE),
      update: jest.fn().mockResolvedValue({ ...SAMPLE, skills: 'First aid, driving' }),
      setStatus: jest.fn().mockResolvedValue({ ...SAMPLE, status: VolunteerStatus.inactive }),
      remove: jest.fn().mockResolvedValue({ id: SAMPLE.id, userId: USER.id }),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [VolunteersController],
      providers: [{ provide: VolunteersService, useValue: volunteers }],
    }).compile();

    controller = moduleRef.get(VolunteersController);
  });

  it('returns a created volunteer in the standard envelope', async () => {
    const dto = {
      userId: USER.id,
      skills: 'Event management',
      availability: 'Friday',
      notes: 'Available for community events',
    };

    const response = await controller.create(dto);

    expect(volunteers.create).toHaveBeenCalledWith(dto);
    expect(response).toEqual({
      success: true,
      message: 'Volunteer created successfully',
      data: SAMPLE,
    });
  });

  it('returns a list as data plus paging meta', async () => {
    const response = await controller.findAll({ page: 1, limit: 20 });

    // The shape every client reads. Asserted literally because changing it silently breaks them.
    expect(response).toEqual({
      success: true,
      message: 'Volunteers retrieved successfully',
      data: [SAMPLE],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
  });

  it('passes the query through without interpreting it', async () => {
    const query = { page: 2, limit: 50, search: 'rahim', status: VolunteerStatus.active };

    await controller.findAll(query);

    // Handed over verbatim; the service turns it into a `where`. A filter interpreted in two places
    // drifts in one of them.
    expect(volunteers.findMany).toHaveBeenCalledWith(query);
  });

  it('returns one volunteer', async () => {
    const response = await controller.findOne(SAMPLE.id);

    expect(volunteers.findOne).toHaveBeenCalledWith(SAMPLE.id);
    expect(response.message).toBe('Volunteer retrieved successfully');
    expect(response.data).toEqual(SAMPLE);
  });

  it('returns the volunteer with its updated roster fields', async () => {
    const dto = { skills: 'First aid, driving' };

    const response = await controller.update(SAMPLE.id, dto);

    expect(volunteers.update).toHaveBeenCalledWith(SAMPLE.id, dto);
    expect(response.message).toBe('Volunteer updated successfully');
    expect(response.data.skills).toBe('First aid, driving');
  });

  it('returns the volunteer with its new status, and the same user role', async () => {
    const response = await controller.setStatus(SAMPLE.id, { status: VolunteerStatus.inactive });

    expect(volunteers.setStatus).toHaveBeenCalledWith(SAMPLE.id, {
      status: VolunteerStatus.inactive,
    });
    expect(response.data.status).toBe(VolunteerStatus.inactive);
    // The pairing the module exists to keep apart: the roster status changed, the role did not.
    expect(response.data.user.role).toBe('treasurer');
  });

  it('confirms a delete with the roster id and the user who still exists', async () => {
    const response = await controller.remove(SAMPLE.id);

    expect(volunteers.remove).toHaveBeenCalledWith(SAMPLE.id);
    expect(response).toEqual({
      success: true,
      message: 'Volunteer deleted successfully',
      data: { id: SAMPLE.id, userId: USER.id },
    });
  });

  it('adds nothing of its own to what the service returns', async () => {
    // Sanitisation happens where the row is read, in the service, so the route must pass the object
    // through untouched — a route that reshaped it would be a second place for a leak to appear.
    const response = await controller.findOne(SAMPLE.id);

    expect(response.data).toBe(SAMPLE);
    expect(Object.keys(response)).toEqual(['success', 'message', 'data']);
  });

  it('returns no credential through any route', async () => {
    const responses = [
      await controller.create({ userId: USER.id }),
      await controller.findAll({}),
      await controller.findOne(SAMPLE.id),
      await controller.update(SAMPLE.id, {}),
      await controller.setStatus(SAMPLE.id, { status: VolunteerStatus.active }),
    ];

    for (const response of responses) {
      const body = JSON.stringify(response);
      for (const secret of [
        'passwordHash',
        'refreshTokenHash',
        'passwordResetTokenHash',
        'passwordResetExpiresAt',
      ]) {
        expect(body).not.toContain(secret);
      }
    }
  });

  /**
   * What each route requires, read off the real decorators with a real `Reflector`.
   *
   * These belong here rather than in an end-to-end test because the mistake they guard against is a
   * declaration mistake. `PermissionsGuard` is tested against its own decorators elsewhere; what is
   * untested until here is whether *these* handlers ask for the right thing.
   */
  describe('what each route requires', () => {
    const reflector = new Reflector();
    const handlers = VolunteersController.prototype as unknown as Record<string, () => void>;

    const requires = (method: string): string[] | undefined =>
      reflector.get<string[]>(PERMISSIONS_KEY, handlers[method]);

    const requiresAnyOf = (method: string): string[] | undefined =>
      reflector.get<string[]>(ANY_PERMISSION_KEY, handlers[method]);

    it.each([['findAll'], ['findOne']])(
      'gates %s on volunteer.view, so reading the roster is not the same as changing it',
      (method) => {
        expect(requires(method)).toEqual(['volunteer.view']);
      },
    );

    it.each([['create'], ['update'], ['setStatus'], ['remove']])(
      'gates %s on volunteer.manage',
      (method) => {
        expect(requires(method)).toEqual(['volunteer.manage']);
      },
    );

    it('reuses the registry’s existing volunteer permissions rather than inventing any', () => {
      // `volunteer.view` and `volunteer.manage` already exist in the governance group, and the
      // secretary role already carries both. A new `volunteers.*` family would have had to be mirrored
      // in the frontend and granted to somebody before anyone could use these routes.
      const declared = new Set(
        ['create', 'findAll', 'findOne', 'update', 'setStatus', 'remove'].flatMap(
          (route) => requires(route) ?? [],
        ),
      );

      expect([...declared].sort()).toEqual(['volunteer.manage', 'volunteer.view']);
    });

    it('names no role, so being a volunteer is never what authorises a request', () => {
      // The rule that keeps a volunteer from being a kind of account: authority comes from a permission
      // the caller holds, never from whether they are on the roster.
      const declared = ['create', 'findAll', 'findOne', 'update', 'setStatus', 'remove'].flatMap(
        (route) => requires(route) ?? [],
      );

      expect(declared).not.toContain('volunteer');
      expect(declared.every((permission) => permission.includes('.'))).toBe(true);
    });

    it('leaves no route public and none ungated', () => {
      const routes = ['create', 'findAll', 'findOne', 'update', 'setStatus', 'remove'];

      for (const route of routes) {
        // Authentication is closed by default and `@Public()` is the only way out of it. Nothing on the
        // roster has any business being reachable without a token — the notes on a roster entry are the
        // coordinator's, not the public's.
        expect(reflector.get<boolean>(IS_PUBLIC_KEY, handlers[route])).toBeUndefined();
        // And every one of them names an authority, so adding a route without a decorator fails here
        // rather than shipping as an endpoint any signed-in member can call.
        expect(requires(route) ?? requiresAnyOf(route)).toBeDefined();
      }
    });
  });
});
