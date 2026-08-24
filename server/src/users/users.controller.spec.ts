import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';

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
    const query = { page: 2, limit: 50, search: 'karim', status: 'active' as const };

    await controller.findAll(query);

    expect(users.findMany).toHaveBeenCalledWith(query);
  });

  it('returns one user', async () => {
    const response = await controller.findOne(SAMPLE.id);

    expect(users.findOne).toHaveBeenCalledWith(SAMPLE.id);
    expect(response.message).toBe('User retrieved successfully');
    expect(response.data).toEqual(SAMPLE);
  });

  it('returns the updated user', async () => {
    const response = await controller.update(SAMPLE.id, { city: 'Sylhet' });

    expect(users.update).toHaveBeenCalledWith(SAMPLE.id, { city: 'Sylhet' });
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
});
