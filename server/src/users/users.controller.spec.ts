import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Position, Role } from '@prisma/client';

import { ANY_PERMISSION_KEY, PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

/**
 * Tests for the users controller.
 *
 * The service is mocked, which is the point: these cases assert that the controller does no work of
 * its own beyond delegating and wrapping. Two things are actually load-bearing here — the response
 * envelope, which every client parses, and the absence of any query building in a route handler.
 */
const SAMPLE: UserResponseDto = {
  id: '9c8b7a65-4321-4f6a-8c11-2d5e7a9b0c31',
  mosqueId: '3f1a7c2e-9b4d-4f6a-8c11-2d5e7a9b0c31',
  fullName: 'Abdul Karim',
  email: 'karim@noor.example',
  phone: '+8801700000002',
  role: 'member',
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
  createdAt: '2026-01-15T10:00:00.000Z',
  updatedAt: '2026-01-15T10:00:00.000Z',
};

type ServiceMock = Record<
  | 'create'
  | 'findMany'
  | 'findOne'
  | 'update'
  | 'setStatus'
  | 'setRole'
  | 'setPositions'
  | 'setPermissions'
  | 'remove',
  jest.Mock
>;

/** The caller the route receives from `@CurrentUser()`, which reads it off the verified request. */
const ACTOR: AuthenticatedUser = {
  id: '5e4d3c2b-1a09-4f6a-8c11-2d5e7a9b0c31',
  mosqueId: SAMPLE.mosqueId,
  email: 'admin@noor.example',
  role: Role.mosque_admin,
  permissions: [],
  deniedPermissions: [],
  isActive: true,
};

describe('UsersController', () => {
  let controller: UsersController;
  let users: ServiceMock;

  beforeEach(async () => {
    users = {
      create: jest.fn().mockResolvedValue(SAMPLE),
      findMany: jest.fn().mockResolvedValue({
        rows: [SAMPLE],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }),
      findOne: jest.fn().mockResolvedValue(SAMPLE),
      update: jest.fn().mockResolvedValue(SAMPLE),
      setStatus: jest.fn().mockResolvedValue({ ...SAMPLE, isActive: false, status: 'inactive' }),
      setRole: jest.fn().mockResolvedValue({ ...SAMPLE, role: 'treasurer' }),
      setPositions: jest.fn().mockResolvedValue({ ...SAMPLE, positions: [Position.president] }),
      setPermissions: jest.fn().mockResolvedValue({ ...SAMPLE, permissions: ['finance.manage'] }),
      remove: jest.fn().mockResolvedValue({ id: SAMPLE.id, deletedAt: '2026-02-01T12:00:00.000Z' }),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: users }],
    }).compile();

    controller = moduleRef.get(UsersController);
  });

  it('returns a created user in the standard envelope', async () => {
    const dto = {
      mosqueId: SAMPLE.mosqueId,
      fullName: SAMPLE.fullName,
      email: SAMPLE.email,
      password: 'Str0ngPassphrase!',
    };

    const response = await controller.create(dto);

    expect(users.create).toHaveBeenCalledWith(dto);
    expect(response).toEqual({
      success: true,
      message: 'User created successfully',
      data: SAMPLE,
    });
  });

  it('returns a list as data plus paging meta', async () => {
    const response = await controller.findAll({ page: 1, limit: 20 });

    // The shape every client reads. Asserted literally because changing it silently breaks them.
    expect(response).toEqual({
      success: true,
      message: 'Users retrieved successfully',
      data: [SAMPLE],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
  });

  it('passes the query through without interpreting it', async () => {
    const query = {
      page: 2,
      limit: 50,
      search: 'karim',
      status: 'active' as const,
      role: Role.member,
      position: Position.president,
    };

    await controller.findAll(query);

    // Including the filters that make this the Members list: the route hands them over verbatim and
    // the service turns them into a `where`. A filter interpreted in two places drifts in one of them.
    expect(users.findMany).toHaveBeenCalledWith(query);
  });

  it('returns one user', async () => {
    const response = await controller.findOne(SAMPLE.id);

    expect(users.findOne).toHaveBeenCalledWith(SAMPLE.id);
    expect(response.message).toBe('User retrieved successfully');
    expect(response.data).toEqual(SAMPLE);
  });

  it('hands the profile update the caller as well as the target', async () => {
    const response = await controller.update(SAMPLE.id, { city: 'Sylhet' }, ACTOR);

    // The caller is passed through because who they are decides which records they may edit: with
    // `user.manage` anyone's, with only `profile.manageOwn` their own. The controller does not make
    // that judgement — it hands the service the identity from the verified token and lets it decide.
    expect(users.update).toHaveBeenCalledWith(SAMPLE.id, { city: 'Sylhet' }, ACTOR);
    expect(response.message).toBe('User updated successfully');
  });

  it('returns the user with its new status', async () => {
    const response = await controller.setStatus(SAMPLE.id, { status: 'inactive' });

    expect(users.setStatus).toHaveBeenCalledWith(SAMPLE.id, { status: 'inactive' });
    expect(response.message).toBe('User status updated successfully');
    expect(response.data.status).toBe('inactive');
  });

  it('hands the role assignment the caller as well as the target', async () => {
    const response = await controller.setRole(SAMPLE.id, { role: Role.treasurer }, ACTOR);

    // The actor is an argument, not something the service digs out of a request. It comes from the
    // verified token, so the escalation rules judge who the caller *is* rather than what they claim.
    expect(users.setRole).toHaveBeenCalledWith(SAMPLE.id, { role: Role.treasurer }, ACTOR);
    expect(response.message).toBe('User role updated successfully');
    expect(response.data.role).toBe('treasurer');
    expect(Object.keys(response)).toEqual(['success', 'message', 'data']);
  });

  it('hands the position assignment the caller as well as the target', async () => {
    const dto = { positions: [Position.president] };

    const response = await controller.setPositions(SAMPLE.id, dto, ACTOR);

    expect(users.setPositions).toHaveBeenCalledWith(SAMPLE.id, dto, ACTOR);
    expect(response.message).toBe('User positions updated successfully');
    expect(response.data.positions).toEqual([Position.president]);
    // The role is untouched by a position change, which is the whole reason the two are separate
    // columns: the president of the committee is still a `member` as far as any guard is concerned.
    expect(response.data.role).toBe('member');
  });

  it('hands the permission assignment the caller as well as the target', async () => {
    const dto = { permissions: ['finance.manage'] };

    const response = await controller.setPermissions(SAMPLE.id, dto, ACTOR);

    expect(users.setPermissions).toHaveBeenCalledWith(SAMPLE.id, dto, ACTOR);
    expect(response.message).toBe('User permissions updated successfully');
    expect(response.data.permissions).toEqual(['finance.manage']);
  });

  it('confirms a delete with the id and the time it happened', async () => {
    const response = await controller.remove(SAMPLE.id);

    expect(users.remove).toHaveBeenCalledWith(SAMPLE.id);
    expect(response).toEqual({
      success: true,
      message: 'User deleted successfully',
      data: { id: SAMPLE.id, deletedAt: '2026-02-01T12:00:00.000Z' },
    });
  });

  it('adds nothing of its own to what the service returns', async () => {
    // Sanitisation happens where the row is read, in the service, so the route must pass the object
    // through untouched — a route that reshaped it would be a second place for a leak to appear.
    const response = await controller.findOne(SAMPLE.id);

    expect(response.data).toBe(SAMPLE);
    expect(Object.keys(response)).toEqual(['success', 'message', 'data']);
  });

  /**
   * What each route requires, read off the real decorators with a real `Reflector`.
   *
   * These are the cases that would catch a privilege escalation, and they belong here rather than in an
   * end-to-end test because the mistake they guard against is a declaration mistake: a route that names
   * the wrong permission, or names none, is wide open however carefully the guard behind it is written.
   * `PermissionsGuard` is tested against its own decorators elsewhere; what is untested until here is
   * whether *these* handlers ask for the right thing.
   */
  describe('what each route requires', () => {
    const reflector = new Reflector();
    const handlers = UsersController.prototype as unknown as Record<string, () => void>;

    const requires = (method: string): string[] | undefined =>
      reflector.get<string[]>(PERMISSIONS_KEY, handlers[method]);

    const requiresAnyOf = (method: string): string[] | undefined =>
      reflector.get<string[]>(ANY_PERMISSION_KEY, handlers[method]);

    it.each([
      ['create', 'user.manage'],
      ['setStatus', 'user.manage'],
      ['remove', 'user.manage'],
    ])('gates %s on %s', (method, permission) => {
      expect(requires(method)).toEqual([permission]);
    });

    it.each([['findAll'], ['findOne']])(
      'gates %s on user.view, so reading the directory is not the same as changing it',
      (method) => {
        expect(requires(method)).toEqual(['user.view']);
      },
    );

    it('gates the profile update on either managing users or managing your own profile', () => {
      // Two permissions, because this is the route a person corrects their own phone number through.
      // `@Permissions` would have meant every field of every profile needs `user.manage`; the service
      // then narrows an own-scope caller to their own row.
      expect(requiresAnyOf('update')).toEqual(['user.manage', 'profile.manageOwn']);
      expect(requires('update')).toBeUndefined();
    });

    it.each([
      ['setRole', 'role.assign'],
      ['setPositions', 'position.assign'],
      ['setPermissions', 'permission.assign'],
    ])('gates %s on %s rather than on user.manage', (method, permission) => {
      // The three columns the permission resolver reads are each behind their own grant, so being able
      // to edit the directory is not the same as being able to hand out authority within it.
      expect(requires(method)).toEqual([permission]);
    });

    it('never lets user.manage stand in for role.assign', () => {
      // The escalation this file exists to prevent: if the role route accepted `user.manage`, anyone who
      // could edit a profile could promote themselves. The two grants are deliberately disjoint here.
      expect(requires('setRole')).not.toContain('user.manage');
      expect(requiresAnyOf('setRole')).toBeUndefined();
    });

    it('leaves no route public and none ungated', () => {
      const routes = [
        'create',
        'findAll',
        'findOne',
        'update',
        'setStatus',
        'setRole',
        'setPositions',
        'setPermissions',
        'remove',
      ];

      for (const route of routes) {
        // Authentication is closed by default and `@Public()` is the only way out of it. No route in the
        // user directory has any business being reachable without a token.
        expect(reflector.get<boolean>(IS_PUBLIC_KEY, handlers[route])).toBeUndefined();
        // And every one of them names an authority, so adding a route without a decorator fails here
        // rather than shipping as an endpoint any signed-in member can call.
        expect(requires(route) ?? requiresAnyOf(route)).toBeDefined();
      }
    });
  });
});
