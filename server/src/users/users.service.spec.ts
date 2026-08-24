import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Position, Prisma, Role } from '@prisma/client';
import * as argon2 from 'argon2';

import { MAX_PAGE_SIZE } from '../common/pagination/page';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { USER_SELECT, type SelectedUser } from './types/user.types';
import { UsersService } from './users.service';

/**
 * Tests for the users service.
 *
 * Prisma is mocked rather than pointed at a database, so what is asserted here is the decisions the
 * service makes: which columns it reads, what it writes, what it refuses. The cases were chosen
 * because each one would be a real defect if it regressed — a leaked credential, a duplicate account,
 * a permission granted through a profile edit — not to walk every branch for its own sake.
 *
 * Argon2 is stubbed. `jest.mock` is hoisted above the imports, so the service receives the stub. What
 * matters is which algorithm is asked for and what the service does with the result; argon2's own
 * correctness is argon2's to test, and the real function costs about a tenth of a second per call.
 */
jest.mock('argon2', () => ({
  argon2id: 2,
  hash: jest.fn(() => Promise.resolve('$argon2id$v=19$m=65536,t=3,p=4$c3R1Yg$c3R1Yg')),
}));

const HASHED = '$argon2id$v=19$m=65536,t=3,p=4$c3R1Yg$c3R1Yg';
const PLAINTEXT = 'Str0ngPassphrase!';
const MOSQUE_ID = '3f1a7c2e-9b4d-4f6a-8c11-2d5e7a9b0c31';
const USER_ID = '9c8b7a65-4321-4f6a-8c11-2d5e7a9b0c31';
const OTHER_ID = '5e4d3c2b-1a09-4f6a-8c11-2d5e7a9b0c31';

const hashMock = argon2.hash as unknown as jest.Mock;

type MockedDelegate<K extends string> = Record<K, jest.Mock>;

interface PrismaMock {
  user: MockedDelegate<'create' | 'findFirst' | 'findMany' | 'update' | 'count'>;
  mosque: MockedDelegate<'findUnique'>;
  refreshToken: MockedDelegate<'updateMany'>;
  $transaction: jest.Mock;
}

const CREATED_AT = new Date('2026-01-15T10:00:00.000Z');

/** A row shaped exactly as `USER_SELECT` returns one. */
function userRow(over: Partial<SelectedUser> = {}): SelectedUser {
  return {
    id: USER_ID,
    mosqueId: MOSQUE_ID,
    fullName: 'Abdul Karim',
    email: 'karim@noor.example',
    phone: '+8801700000002',
    role: Role.member,
    positions: [],
    permissions: [],
    deniedPermissions: [],
    isActive: true,
    dateOfBirth: new Date('1990-04-17T00:00:00.000Z'),
    gender: 'male',
    city: 'Dhaka',
    avatarUrl: null,
    newsletter: false,
    emailVerifiedAt: new Date('2026-01-16T09:00:00.000Z'),
    lastLoginAt: null,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...over,
  };
}

function createDto(over: Partial<CreateUserDto> = {}): CreateUserDto {
  return {
    mosqueId: MOSQUE_ID,
    fullName: 'Abdul Karim',
    email: 'karim@noor.example',
    password: PLAINTEXT,
    ...over,
  };
}

/** The columns an assignment reads off the target: what they can do now, to judge what changes. */
function assignmentRow(
  over: Partial<Pick<SelectedUser, 'id' | 'role' | 'permissions' | 'deniedPermissions'>> = {},
): Pick<SelectedUser, 'id' | 'role' | 'permissions' | 'deniedPermissions'> {
  return { id: USER_ID, role: Role.member, permissions: [], deniedPermissions: [], ...over };
}

/**
 * The caller, as `JwtStrategy` builds one from the verified token and the database.
 *
 * Never as a request body describes one: a payload carrying `"role": "super_admin"` is not what these
 * methods read, and the escalation tests below pass an actor whose authority is exactly what the
 * registry gives their role.
 */
function actor(over: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: OTHER_ID,
    mosqueId: MOSQUE_ID,
    email: 'admin@noor.example',
    role: Role.mosque_admin,
    permissions: [],
    deniedPermissions: [],
    isActive: true,
    ...over,
  };
}

/** The argument object of a mock's most recent call, for inspecting what was sent to Prisma. */
function argsOf(mock: jest.Mock): Record<string, unknown> {
  expect(mock).toHaveBeenCalled();
  return mock.mock.calls[mock.mock.calls.length - 1][0] as Record<string, unknown>;
}

function dataOf(mock: jest.Mock): Record<string, unknown> {
  return argsOf(mock).data as Record<string, unknown>;
}

function whereOf(mock: jest.Mock): Record<string, unknown> {
  return argsOf(mock).where as Record<string, unknown>;
}

function knownRequestError(code: string, target?: string[]): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('database said no', {
    code,
    clientVersion: '6.3.0',
    meta: target ? { target } : undefined,
  });
}

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = {
      user: {
        create: jest.fn(),
        findFirst: jest.fn(),
        // The contact-uniqueness pre-check runs on most write paths; free by default.
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      mosque: { findUnique: jest.fn().mockResolvedValue({ id: MOSQUE_ID }) },
      refreshToken: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      // The real client runs the operations it is handed in one transaction and resolves to their
      // results in order, which for mocked delegates is exactly `Promise.all`.
      $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
    };

    hashMock.mockClear();

    const moduleRef = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  describe('create', () => {
    it('stores an argon2id hash and never the password itself', async () => {
      prisma.user.create.mockResolvedValue(userRow());

      const result = await service.create(createDto());

      expect(hashMock).toHaveBeenCalledWith(PLAINTEXT, { type: argon2.argon2id });

      const data = dataOf(prisma.user.create);
      expect(data.passwordHash).toBe(HASHED);
      expect(data).not.toHaveProperty('password');
      // The whole payload, not just the field: a plaintext copied into any other column would be
      // just as much of a leak.
      expect(JSON.stringify(data)).not.toContain(PLAINTEXT);

      expect(JSON.stringify(result)).not.toContain(PLAINTEXT);
      expect(JSON.stringify(result)).not.toContain(HASHED);
    });

    it('leaves role, positions and permissions to the schema defaults', async () => {
      prisma.user.create.mockResolvedValue(userRow());

      await service.create(createDto());

      // A create request must not be able to mint an administrator, so these columns are not written
      // at all — they are assigned by their own endpoints, under their own permission.
      const data = dataOf(prisma.user.create);
      expect(data).not.toHaveProperty('role');
      expect(data).not.toHaveProperty('positions');
      expect(data).not.toHaveProperty('permissions');
      expect(data).not.toHaveProperty('deniedPermissions');
    });

    it('defaults to active, and honours an explicit inactive status', async () => {
      prisma.user.create.mockResolvedValue(userRow());

      await service.create(createDto());
      expect(dataOf(prisma.user.create).isActive).toBe(true);

      await service.create(createDto({ status: 'inactive' }));
      expect(dataOf(prisma.user.create).isActive).toBe(false);
    });

    it('reads a date of birth as UTC midnight, so the calendar day cannot shift', async () => {
      prisma.user.create.mockResolvedValue(userRow());

      await service.create(createDto({ dateOfBirth: '1990-04-17' }));

      expect(dataOf(prisma.user.create).dateOfBirth).toEqual(new Date('1990-04-17T00:00:00.000Z'));
    });

    it('refuses a mosque that does not exist, before hashing anything', async () => {
      prisma.mosque.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto())).rejects.toBeInstanceOf(BadRequestException);

      expect(hashMock).not.toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('refuses an email already used in the same mosque', async () => {
      prisma.user.findMany.mockResolvedValue([{ email: 'karim@noor.example', phone: null }]);

      await expect(service.create(createDto())).rejects.toMatchObject({
        response: { code: 'EMAIL_TAKEN' },
      });
      await expect(service.create(createDto())).rejects.toBeInstanceOf(ConflictException);

      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('refuses a phone already used in the same mosque', async () => {
      prisma.user.findMany.mockResolvedValue([
        { email: 'someone.else@noor.example', phone: '+8801700000002' },
      ]);

      await expect(service.create(createDto({ phone: '+8801700000002' }))).rejects.toMatchObject({
        response: { code: 'PHONE_TAKEN' },
      });

      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('turns the unique-constraint race into a conflict rather than a 500', async () => {
      // Two requests for the same address arriving between the pre-check and the insert: the
      // pre-check sees nothing, the database does.
      prisma.user.create.mockRejectedValue(knownRequestError('P2002', ['mosqueId', 'email']));

      await expect(service.create(createDto())).rejects.toMatchObject({
        response: { code: 'EMAIL_TAKEN' },
      });
    });

    it('does not let a raw database message reach the caller', async () => {
      prisma.user.create.mockRejectedValue(knownRequestError('P2002', ['mosqueId', 'phone']));

      await expect(service.create(createDto())).rejects.toMatchObject({
        response: { code: 'PHONE_TAKEN' },
      });
      await expect(service.create(createDto())).rejects.not.toMatchObject({
        message: 'database said no',
      });
    });
  });

  describe('findOne', () => {
    it('returns the user, read through USER_SELECT', async () => {
      prisma.user.findFirst.mockResolvedValue(userRow());

      const result = await service.findOne(USER_ID);

      expect(result.id).toBe(USER_ID);
      expect(result.email).toBe('karim@noor.example');
      expect(argsOf(prisma.user.findFirst).select).toBe(USER_SELECT);
    });

    it('does not see a soft-deleted account', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.findOne(USER_ID)).rejects.toBeInstanceOf(NotFoundException);
      expect(whereOf(prisma.user.findFirst)).toMatchObject({ id: USER_ID, deletedAt: null });
    });

    it('reports a missing user as USER_NOT_FOUND', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.findOne(USER_ID)).rejects.toMatchObject({
        response: { code: 'USER_NOT_FOUND' },
      });
    });

    it('serialises a date of birth as a calendar date and timestamps as instants', async () => {
      prisma.user.findFirst.mockResolvedValue(userRow());

      const result = await service.findOne(USER_ID);

      expect(result.dateOfBirth).toBe('1990-04-17');
      expect(result.createdAt).toBe('2026-01-15T10:00:00.000Z');
    });
  });

  describe('findMany', () => {
    it('pages from 1 with the default size when nothing is asked for', async () => {
      prisma.user.count.mockResolvedValue(42);
      prisma.user.findMany.mockResolvedValue([userRow()]);

      const { rows, meta } = await service.findMany({});

      expect(meta).toEqual({ page: 1, limit: 20, total: 42, totalPages: 3 });
      expect(rows).toHaveLength(1);
      expect(argsOf(prisma.user.findMany)).toMatchObject({ skip: 0, take: 20 });
    });

    it('skips whole pages', async () => {
      prisma.user.count.mockResolvedValue(42);
      prisma.user.findMany.mockResolvedValue([]);

      const { meta } = await service.findMany({ page: 3, limit: 5 });

      expect(meta).toEqual({ page: 3, limit: 5, total: 42, totalPages: 9 });
      expect(argsOf(prisma.user.findMany)).toMatchObject({ skip: 10, take: 5 });
    });

    it('caps the page size, so one request cannot ask for the whole directory', async () => {
      prisma.user.count.mockResolvedValue(5000);
      prisma.user.findMany.mockResolvedValue([]);

      const { meta } = await service.findMany({ limit: 5000 });

      expect(meta.limit).toBe(MAX_PAGE_SIZE);
      expect(argsOf(prisma.user.findMany).take).toBe(MAX_PAGE_SIZE);
    });

    it('reports no pages when nothing matches', async () => {
      prisma.user.count.mockResolvedValue(0);
      prisma.user.findMany.mockResolvedValue([]);

      const { rows, meta } = await service.findMany({});

      expect(rows).toEqual([]);
      expect(meta).toEqual({ page: 1, limit: 20, total: 0, totalPages: 0 });
    });

    it('counts and reads the same set of rows in one transaction', async () => {
      prisma.user.count.mockResolvedValue(1);
      prisma.user.findMany.mockResolvedValue([userRow()]);

      await service.findMany({});

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(whereOf(prisma.user.count)).toEqual(whereOf(prisma.user.findMany));
    });

    it('searches name, email and phone, and hides deleted accounts', async () => {
      prisma.user.count.mockResolvedValue(1);
      prisma.user.findMany.mockResolvedValue([userRow()]);

      await service.findMany({ search: '  karim  ' });

      const where = whereOf(prisma.user.findMany);
      expect(where.deletedAt).toBeNull();
      expect(where.OR).toEqual([
        { fullName: { contains: 'karim', mode: 'insensitive' } },
        { email: { contains: 'karim', mode: 'insensitive' } },
        { phone: { contains: 'karim', mode: 'insensitive' } },
      ]);
    });

    it('turns a status filter into the isActive column', async () => {
      prisma.user.count.mockResolvedValue(0);
      prisma.user.findMany.mockResolvedValue([]);

      await service.findMany({ status: 'inactive' });
      expect(whereOf(prisma.user.findMany).isActive).toBe(false);

      await service.findMany({ status: 'active' });
      expect(whereOf(prisma.user.findMany).isActive).toBe(true);

      await service.findMany({});
      expect(whereOf(prisma.user.findMany)).not.toHaveProperty('isActive');
    });

    it('filters by role as an exact match on the indexed column', async () => {
      prisma.user.count.mockResolvedValue(1);
      prisma.user.findMany.mockResolvedValue([userRow({ role: Role.treasurer })]);

      await service.findMany({ role: Role.treasurer });

      // Not a `contains`: a role is one of seven known values, and `@@index([mosqueId, role])` is
      // there to be used.
      expect(whereOf(prisma.user.findMany).role).toBe(Role.treasurer);

      await service.findMany({});
      expect(whereOf(prisma.user.findMany)).not.toHaveProperty('role');
    });

    it('filters by position with `has`, because a person holds several posts', async () => {
      prisma.user.count.mockResolvedValue(1);
      prisma.user.findMany.mockResolvedValue([
        userRow({ positions: [Position.treasurer, Position.cashier] }),
      ]);

      await service.findMany({ position: Position.cashier });

      // `positions` is a scalar list. An equality filter would only match somebody whose *only* post
      // is cashier, which would hide every person holding two — and holding two is normal here.
      expect(whereOf(prisma.user.findMany).positions).toEqual({ has: Position.cashier });

      await service.findMany({});
      expect(whereOf(prisma.user.findMany)).not.toHaveProperty('positions');
    });

    it('combines the filters, so a leadership list is one query', async () => {
      prisma.user.count.mockResolvedValue(0);
      prisma.user.findMany.mockResolvedValue([]);

      await service.findMany({
        search: 'rahim',
        status: 'active',
        role: Role.member,
        position: Position.president,
      });

      // The case §6 describes: Rahim, role `member`, position `president`. Every filter narrows the
      // same `where` rather than replacing it, and the soft-delete condition survives all of them.
      expect(whereOf(prisma.user.findMany)).toMatchObject({
        deletedAt: null,
        isActive: true,
        role: Role.member,
        positions: { has: Position.president },
      });
      expect(whereOf(prisma.user.findMany).OR).toHaveLength(3);
    });

    it('orders by a unique tiebreaker, so a row cannot fall between pages', async () => {
      prisma.user.count.mockResolvedValue(0);
      prisma.user.findMany.mockResolvedValue([]);

      await service.findMany({});

      expect(argsOf(prisma.user.findMany).orderBy).toEqual([{ createdAt: 'desc' }, { id: 'asc' }]);
    });
  });

  describe('update', () => {
    /** Holds `user.manage` through the role, so every case below is a directory administrator's edit. */
    const admin = actor();

    beforeEach(() => {
      prisma.user.findFirst.mockResolvedValue({
        id: USER_ID,
        mosqueId: MOSQUE_ID,
        email: 'karim@noor.example',
      });
    });

    it('writes profile fields and nothing that carries authority', async () => {
      prisma.user.update.mockResolvedValue(userRow({ city: 'Sylhet' }));

      const result = await service.update(USER_ID, { city: 'Sylhet' }, admin);

      expect(result.city).toBe('Sylhet');

      const data = dataOf(prisma.user.update);
      for (const field of [
        'role',
        'positions',
        'permissions',
        'deniedPermissions',
        'password',
        'passwordHash',
        'isActive',
        'mosqueId',
        'deletedAt',
      ]) {
        expect(data).not.toHaveProperty(field);
      }
    });

    it('clears the email verification when the address changes', async () => {
      prisma.user.update.mockResolvedValue(userRow({ email: 'new@noor.example' }));

      await service.update(USER_ID, { email: 'new@noor.example' }, admin);

      expect(dataOf(prisma.user.update).emailVerifiedAt).toBeNull();
    });

    it('leaves the verification alone when the address is resubmitted unchanged', async () => {
      prisma.user.update.mockResolvedValue(userRow());

      await service.update(USER_ID, { email: 'karim@noor.example' }, admin);

      // Re-saving a form must not be a conflict with the user's own row, nor undo their verification.
      expect(dataOf(prisma.user.update)).not.toHaveProperty('emailVerifiedAt');
      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });

    it('refuses an email that belongs to somebody else in the mosque', async () => {
      prisma.user.findMany.mockResolvedValue([{ email: 'taken@noor.example', phone: null }]);

      await expect(
        service.update(USER_ID, { email: 'taken@noor.example' }, admin),
      ).rejects.toMatchObject({
        response: { code: 'EMAIL_TAKEN' },
      });

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('excludes the user’s own row from the uniqueness check', async () => {
      prisma.user.update.mockResolvedValue(userRow());

      await service.update(USER_ID, { phone: '+8801700000002' }, admin);

      expect(whereOf(prisma.user.findMany)).toMatchObject({ id: { not: USER_ID } });
    });

    it('does not touch a user it cannot find', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.update(OTHER_ID, { city: 'Sylhet' }, admin)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    describe('who may edit whom', () => {
      /** A plain member: no `user.manage`, and `profile.manageOwn` from the base set. */
      const member = actor({ id: USER_ID, role: Role.member, email: 'karim@noor.example' });

      it('lets a member edit their own profile', async () => {
        prisma.user.update.mockResolvedValue(userRow({ city: 'Sylhet' }));

        const result = await service.update(USER_ID, { city: 'Sylhet' }, member);

        // `profile.manageOwn` is a base permission, and this is the route it exists for. Gating the
        // endpoint on `user.manage` alone would mean nobody could fix their own phone number.
        expect(result.city).toBe('Sylhet');
        expect(prisma.user.update).toHaveBeenCalled();
      });

      it('refuses a member editing somebody else, before reading the row', async () => {
        await expect(service.update(OTHER_ID, { city: 'Sylhet' }, member)).rejects.toBeInstanceOf(
          ForbiddenException,
        );

        // The refusal comes first, so an unauthorised caller cannot use this endpoint to learn who
        // exists: a real id and a made-up one answer identically.
        expect(prisma.user.findFirst).not.toHaveBeenCalled();
        expect(prisma.user.update).not.toHaveBeenCalled();
      });

      it('lets an administrator edit somebody else', async () => {
        prisma.user.findFirst.mockResolvedValue({
          id: OTHER_ID,
          mosqueId: MOSQUE_ID,
          email: 'other@noor.example',
        });
        prisma.user.update.mockResolvedValue(userRow({ id: OTHER_ID }));

        await service.update(OTHER_ID, { city: 'Sylhet' }, actor({ id: USER_ID }));

        expect(prisma.user.update).toHaveBeenCalled();
      });

      it('refuses a suspended account editing even itself', async () => {
        await expect(
          service.update(USER_ID, { city: 'Sylhet' }, actor({ ...member, isActive: false })),
        ).rejects.toBeInstanceOf(ForbiddenException);

        // An inactive account resolves to no permissions at all, base ones included, so it has no
        // `profile.manageOwn` to stand on.
        expect(prisma.user.update).not.toHaveBeenCalled();
      });

      it('refuses without naming the rule it applied', async () => {
        const logged = jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);

        await expect(service.update(OTHER_ID, { city: 'Sylhet' }, member)).rejects.toMatchObject({
          response: { code: 'FORBIDDEN' },
        });

        // Same code and same sentence as every other refusal; the actor, the target and the scope go
        // to the log where the caller cannot read them.
        expect(logged).toHaveBeenCalledWith(expect.stringContaining(OTHER_ID));
        logged.mockRestore();
      });

      it('cannot be used to change a role, whatever the caller sends', async () => {
        prisma.user.update.mockResolvedValue(userRow());

        // The DTO does not declare `role`, and the global pipe runs with `forbidNonWhitelisted`, so
        // over HTTP this is a 400 before the service is reached. Should that ever change, the service
        // must still not write the column — it is not in the payload it builds.
        await service.update(USER_ID, { city: 'Sylhet', role: Role.super_admin } as never, member);

        const data = dataOf(prisma.user.update);
        expect(data).not.toHaveProperty('role');
        expect(data).not.toHaveProperty('permissions');
      });
    });
  });

  describe('setStatus', () => {
    beforeEach(() => {
      prisma.user.findFirst.mockResolvedValue({
        id: USER_ID,
        mosqueId: MOSQUE_ID,
        email: 'karim@noor.example',
      });
    });

    it('suspends an account by clearing isActive, and changes nothing else', async () => {
      prisma.user.update.mockResolvedValue(userRow({ isActive: false }));

      const result = await service.setStatus(USER_ID, { status: 'inactive' });

      expect(dataOf(prisma.user.update)).toEqual({ isActive: false });
      expect(result.isActive).toBe(false);
      expect(result.status).toBe('inactive');
    });

    it('reactivates an account', async () => {
      prisma.user.update.mockResolvedValue(userRow({ isActive: true }));

      const result = await service.setStatus(USER_ID, { status: 'active' });

      expect(dataOf(prisma.user.update)).toEqual({ isActive: true });
      expect(result.status).toBe('active');
    });

    it('reports a missing user rather than creating one', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.setStatus(USER_ID, { status: 'active' })).rejects.toMatchObject({
        response: { code: 'USER_NOT_FOUND' },
      });

      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('setRole', () => {
    let logged: jest.SpyInstance;

    beforeEach(() => {
      prisma.user.findFirst.mockResolvedValue(assignmentRow());
      // A refusal logs its reason and does not return it; silenced here, asserted below.
      logged = jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
    });

    afterEach(() => {
      logged.mockRestore();
    });

    it('writes the role column and nothing else', async () => {
      prisma.user.update.mockResolvedValue(userRow({ role: Role.treasurer }));

      const result = await service.setRole(USER_ID, { role: Role.treasurer }, actor());

      expect(dataOf(prisma.user.update)).toEqual({ role: Role.treasurer });
      expect(result.role).toBe(Role.treasurer);
      // The individual grants are a separate endpoint: changing a role must not silently clear them.
      expect(dataOf(prisma.user.update)).not.toHaveProperty('permissions');
      expect(JSON.stringify(result)).not.toContain(HASHED);
    });

    it('refuses to mint a super admin without platform authority', async () => {
      // The hole this closes: a mosque admin holds `role.assign`, so the guard lets them through. It
      // is this check, not the guard, that stops them promoting anyone past their own reach.
      await expect(
        service.setRole(USER_ID, { role: Role.super_admin }, actor({ role: Role.mosque_admin })),
      ).rejects.toMatchObject({ response: { code: 'ESCALATION_REFUSED' } });

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('allows it for a caller who does hold platform authority', async () => {
      prisma.user.update.mockResolvedValue(userRow({ role: Role.super_admin }));

      const result = await service.setRole(
        USER_ID,
        { role: Role.super_admin },
        actor({ role: Role.super_admin }),
      );

      expect(result.role).toBe(Role.super_admin);
    });

    it('refuses to demote a super admin without platform authority', async () => {
      // The same rule read the other way. Left out, a mosque admin could lock the platform owner out
      // of their own platform — a downgrade is as much of an attack as an upgrade.
      prisma.user.findFirst.mockResolvedValue(assignmentRow({ role: Role.super_admin }));

      await expect(
        service.setRole(USER_ID, { role: Role.member }, actor({ role: Role.mosque_admin })),
      ).rejects.toMatchObject({ response: { code: 'ESCALATION_REFUSED' } });

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('refuses a caller changing their own role, whatever they hold', async () => {
      await expect(
        service.setRole(
          USER_ID,
          { role: Role.member },
          actor({ id: USER_ID, role: Role.super_admin }),
        ),
      ).rejects.toMatchObject({ response: { code: 'CANNOT_CHANGE_OWN_ROLE' } });

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('reports a missing user rather than creating one', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.setRole(USER_ID, { role: Role.imam }, actor())).rejects.toMatchObject({
        response: { code: 'USER_NOT_FOUND' },
      });

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('logs why it refused instead of answering with it', async () => {
      await expect(
        service.setRole(USER_ID, { role: Role.super_admin }, actor()),
      ).rejects.toMatchObject({
        response: {
          code: 'ESCALATION_REFUSED',
          message: 'You cannot grant authority you do not hold yourself.',
        },
      });

      expect(logged).toHaveBeenCalledWith(expect.stringContaining('platform.manage'));
    });
  });

  describe('setPermissions', () => {
    let logged: jest.SpyInstance;

    beforeEach(() => {
      prisma.user.findFirst.mockResolvedValue(assignmentRow());
      logged = jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
    });

    afterEach(() => {
      logged.mockRestore();
    });

    it('refuses a request that asks for no change, before reading the user', async () => {
      await expect(service.setPermissions(USER_ID, {}, actor())).rejects.toMatchObject({
        response: { code: 'NOTHING_TO_UPDATE' },
      });
      await expect(service.setPermissions(USER_ID, {}, actor())).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(prisma.user.findFirst).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('writes only the array it was sent', async () => {
      prisma.user.update.mockResolvedValue(userRow({ permissions: ['finance.manage'] }));

      const result = await service.setPermissions(
        USER_ID,
        { permissions: ['finance.manage'] },
        actor({ role: Role.treasurer }),
      );

      // An omitted array is left alone rather than emptied, so a caller editing grants cannot wipe
      // somebody's denials by not mentioning them.
      expect(dataOf(prisma.user.update)).toEqual({ permissions: ['finance.manage'] });
      expect(result.permissions).toEqual(['finance.manage']);
      expect(JSON.stringify(result)).not.toContain(HASHED);
    });

    it('replaces the denial column when that is the array sent', async () => {
      prisma.user.update.mockResolvedValue(userRow({ deniedPermissions: ['finance.manage'] }));

      await service.setPermissions(
        USER_ID,
        { deniedPermissions: ['finance.manage'] },
        actor({ role: Role.secretary }),
      );

      // Imposing a denial only ever reduces what the target can do, so a secretary may deny a finance
      // permission they do not hold themselves.
      expect(dataOf(prisma.user.update)).toEqual({ deniedPermissions: ['finance.manage'] });
    });

    it('refuses to grant a permission the caller does not hold', async () => {
      await expect(
        service.setPermissions(
          USER_ID,
          { permissions: ['finance.manage'] },
          actor({ role: Role.secretary }),
        ),
      ).rejects.toMatchObject({ response: { code: 'ESCALATION_REFUSED' } });

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('refuses to lift a denial of a permission the caller does not hold', async () => {
      // The subtle half of the rule: this request *removes* a value, and hands `finance.manage` back
      // to a target whose role grants it. A caller without finance authority cannot do that.
      prisma.user.findFirst.mockResolvedValue(
        assignmentRow({ role: Role.treasurer, deniedPermissions: ['finance.manage'] }),
      );

      await expect(
        service.setPermissions(USER_ID, { deniedPermissions: [] }, actor({ role: Role.secretary })),
      ).rejects.toMatchObject({ response: { code: 'ESCALATION_REFUSED' } });

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('lets a caller lift a denial of a permission they do hold', async () => {
      prisma.user.findFirst.mockResolvedValue(
        assignmentRow({ deniedPermissions: ['finance.manage'] }),
      );
      prisma.user.update.mockResolvedValue(userRow());

      await service.setPermissions(
        USER_ID,
        { deniedPermissions: [] },
        actor({ role: Role.treasurer }),
      );

      expect(dataOf(prisma.user.update)).toEqual({ deniedPermissions: [] });
    });

    it('treats a grant the target already has as no change', async () => {
      prisma.user.findFirst.mockResolvedValue(assignmentRow({ permissions: ['finance.manage'] }));
      prisma.user.update.mockResolvedValue(userRow({ permissions: ['finance.manage'] }));

      // Resubmitting an unchanged form is not an escalation attempt, so a secretary reordering
      // somebody's grants is not refused for the ones that were already there.
      await service.setPermissions(
        USER_ID,
        { permissions: ['finance.manage'] },
        actor({ role: Role.secretary }),
      );

      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('puts a target holding a platform role out of reach', async () => {
      prisma.user.findFirst.mockResolvedValue(assignmentRow({ role: Role.super_admin }));

      await expect(
        service.setPermissions(
          USER_ID,
          { deniedPermissions: ['platform.manage'] },
          actor({ role: Role.mosque_admin }),
        ),
      ).rejects.toMatchObject({ response: { code: 'ESCALATION_REFUSED' } });

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('names no permission in the refusal it returns', async () => {
      await expect(
        service.setPermissions(
          USER_ID,
          { permissions: ['finance.manage'] },
          actor({ role: Role.secretary }),
        ),
      ).rejects.toMatchObject({
        response: {
          code: 'ESCALATION_REFUSED',
          message: 'You cannot grant authority you do not hold yourself.',
        },
      });

      // Reported once, to the log. Answering "you are missing finance.manage" would let a member map
      // the permission model one rejected request at a time.
      expect(logged).toHaveBeenCalledWith(expect.stringContaining('finance.manage'));
    });

    it('reports a missing user rather than creating one', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.setPermissions(USER_ID, { permissions: [] }, actor()),
      ).rejects.toMatchObject({ response: { code: 'USER_NOT_FOUND' } });

      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('setPositions', () => {
    beforeEach(() => {
      prisma.user.findFirst.mockResolvedValue({
        id: USER_ID,
        mosqueId: MOSQUE_ID,
        email: 'karim@noor.example',
      });
    });

    it('replaces the positions column and nothing else', async () => {
      prisma.user.update.mockResolvedValue(userRow({ positions: [Position.president] }));

      const result = await service.setPositions(
        USER_ID,
        { positions: [Position.president] },
        actor(),
      );

      expect(result.positions).toEqual([Position.president]);

      const data = dataOf(prisma.user.update);
      expect(data).toEqual({ positions: [Position.president] });
    });

    it('holds several posts at once, because one person often does', async () => {
      prisma.user.update.mockResolvedValue(
        userRow({ positions: [Position.treasurer, Position.cashier] }),
      );

      const result = await service.setPositions(
        USER_ID,
        { positions: [Position.treasurer, Position.cashier] },
        actor(),
      );

      expect(result.positions).toEqual([Position.treasurer, Position.cashier]);
    });

    it('clears every post when sent an empty array', async () => {
      prisma.user.update.mockResolvedValue(userRow({ positions: [] }));

      await service.setPositions(USER_ID, { positions: [] }, actor());

      expect(dataOf(prisma.user.update).positions).toEqual([]);
    });

    it('does not touch the role, the permissions or the status', async () => {
      prisma.user.update.mockResolvedValue(userRow({ positions: [Position.president] }));

      const result = await service.setPositions(
        USER_ID,
        { positions: [Position.president] },
        actor(),
      );

      // The point of the whole Role/Position split: a president is not an administrator. Assigning the
      // post must leave the account exactly as authorised as it was.
      const data = dataOf(prisma.user.update);
      for (const field of ['role', 'permissions', 'deniedPermissions', 'isActive']) {
        expect(data).not.toHaveProperty(field);
      }
      expect(result.role).toBe(Role.member);
      expect(result.permissions).toEqual([]);
    });

    it('reports a missing user rather than creating one', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.setPositions(USER_ID, { positions: [Position.imam] }, actor()),
      ).rejects.toMatchObject({ response: { code: 'USER_NOT_FOUND' } });

      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    const deletedAt = new Date('2026-02-01T12:00:00.000Z');

    beforeEach(() => {
      prisma.user.findFirst.mockResolvedValue({
        id: USER_ID,
        mosqueId: MOSQUE_ID,
        email: 'karim@noor.example',
      });
      prisma.user.update.mockResolvedValue({ id: USER_ID, deletedAt });
    });

    it('marks the row instead of deleting it, and deactivates the account', async () => {
      const result = await service.remove(USER_ID);

      const data = dataOf(prisma.user.update);
      expect(data.deletedAt).toBeInstanceOf(Date);
      expect(data.isActive).toBe(false);
      expect(result).toEqual({ id: USER_ID, deletedAt: deletedAt.toISOString() });
    });

    it('revokes the account’s live sessions in the same transaction', async () => {
      await service.remove(USER_ID);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(argsOf(prisma.refreshToken.updateMany)).toMatchObject({
        where: { userId: USER_ID, revokedAt: null },
      });
    });

    it('treats a second delete as a missing user', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.remove(USER_ID)).rejects.toMatchObject({
        response: { code: 'USER_NOT_FOUND' },
      });

      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('sanitisation', () => {
    it('never asks the database for the password hash', () => {
      // The strongest form of the guarantee: the column is not read, so no endpoint is in a position
      // to return it by accident.
      expect(USER_SELECT).not.toHaveProperty('passwordHash');
      expect(USER_SELECT).not.toHaveProperty('deletedAt');
    });

    it('drops a credential even if a query hands one over', async () => {
      // Belt and braces against a future `select` that forgets: the response is built field by
      // field, so anything not on the allow-list cannot travel.
      prisma.user.findFirst.mockResolvedValue({
        ...userRow(),
        passwordHash: HASHED,
        deletedAt: null,
      });

      const result = await service.findOne(USER_ID);
      const keys = Object.keys(result);

      expect(keys).not.toContain('passwordHash');
      expect(keys).not.toContain('password');
      expect(keys).not.toContain('deletedAt');
      expect(keys).not.toContain('refreshToken');
      expect(JSON.stringify(result)).not.toContain(HASHED);
    });

    it('reads every user through the same allow-list', async () => {
      prisma.user.count.mockResolvedValue(1);
      prisma.user.findMany.mockResolvedValue([userRow()]);
      await service.findMany({});
      expect(argsOf(prisma.user.findMany).select).toBe(USER_SELECT);

      // `user.findMany` serves the list *and* the contact-uniqueness pre-check, so the row staged
      // above has to be cleared before a create is attempted or it reads as a duplicate account.
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.create.mockResolvedValue(userRow());
      await service.create(createDto());
      expect(argsOf(prisma.user.create).select).toBe(USER_SELECT);
    });
  });
});
