import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma, Role, VolunteerStatus } from '@prisma/client';

import { MAX_PAGE_SIZE } from '../common/pagination/page';
import { PrismaService } from '../prisma/prisma.service';
import { USER_SELECT, type SelectedUser } from '../users/types/user.types';
import { CreateVolunteerDto } from './dto/create-volunteer.dto';
import { VOLUNTEER_SELECT, type SelectedVolunteer } from './types/volunteer.types';
import { VolunteersService } from './volunteers.service';

/**
 * Tests for the volunteers service.
 *
 * Prisma is mocked, so what is asserted is the decisions the service makes: which tables it writes, which
 * columns it reads, what it refuses. Three of these would be real defects if they regressed, and they are
 * the reason the file exists — a volunteer created for a user who does not exist, a person enrolled twice,
 * and a roster change that reached `User.role`.
 */
const USER_ID = '9c8b7a65-4321-4f6a-8c11-2d5e7a9b0c31';
const OTHER_USER_ID = '5e4d3c2b-1a09-4f6a-8c11-2d5e7a9b0c31';
const VOLUNTEER_ID = '1b2c3d4e-5f60-4f6a-8c11-2d5e7a9b0c31';
const MOSQUE_ID = '3f1a7c2e-9b4d-4f6a-8c11-2d5e7a9b0c31';
const HASHED = '$argon2id$v=19$m=65536,t=3,p=4$c3R1Yg$c3R1Yg';

const CREATED_AT = new Date('2026-03-01T09:00:00.000Z');

type MockedDelegate<K extends string> = Record<K, jest.Mock>;

interface PrismaMock {
  volunteer: MockedDelegate<
    'create' | 'findFirst' | 'findUnique' | 'findMany' | 'update' | 'delete' | 'count'
  >;
  user: MockedDelegate<'findFirst' | 'update'>;
  $transaction: jest.Mock;
}

/** A user row shaped exactly as `USER_SELECT` returns one. */
function userRow(over: Partial<SelectedUser> = {}): SelectedUser {
  return {
    id: USER_ID,
    mosqueId: MOSQUE_ID,
    fullName: 'Rahim Uddin',
    email: 'rahim@noor.example',
    phone: '+8801700000002',
    // A treasurer on purpose: the example from the specification is a user whose role is `treasurer` and
    // whose volunteer status is `active`, and every status test below leans on that pairing.
    role: Role.treasurer,
    positions: [],
    permissions: [],
    deniedPermissions: [],
    isActive: true,
    dateOfBirth: new Date('1990-04-17T00:00:00.000Z'),
    gender: 'male',
    city: 'Dhaka',
    avatarUrl: null,
    newsletter: false,
    emailVerifiedAt: null,
    lastLoginAt: null,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...over,
  };
}

/** A volunteer row shaped exactly as `VOLUNTEER_SELECT` returns one. */
function volunteerRow(over: Partial<SelectedVolunteer> = {}): SelectedVolunteer {
  return {
    id: VOLUNTEER_ID,
    userId: USER_ID,
    status: VolunteerStatus.active,
    skills: 'Event management',
    availability: 'Friday',
    notes: 'Available for community events',
    joinedAt: CREATED_AT,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    user: userRow(),
    ...over,
  };
}

function createDto(over: Partial<CreateVolunteerDto> = {}): CreateVolunteerDto {
  return { userId: USER_ID, ...over };
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

describe('VolunteersService', () => {
  let service: VolunteersService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = {
      volunteer: {
        create: jest.fn(),
        findFirst: jest.fn(),
        // The duplicate-enrolment pre-check; nobody is enrolled by default.
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        delete: jest.fn().mockResolvedValue({ id: VOLUNTEER_ID }),
        count: jest.fn().mockResolvedValue(0),
      },
      // The user exists by default, because most cases are not about a missing one.
      user: { findFirst: jest.fn().mockResolvedValue({ id: USER_ID }), update: jest.fn() },
      // The real client runs the operations it is handed in one transaction and resolves to their
      // results in order, which for mocked delegates is exactly `Promise.all`.
      $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [VolunteersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(VolunteersService);
  });

  describe('create', () => {
    it('enrols an existing user, writing the roster fields and nothing else', async () => {
      prisma.volunteer.create.mockResolvedValue(volunteerRow());

      const result = await service.create(
        createDto({
          skills: 'Event management',
          availability: 'Friday',
          notes: 'Available for community events',
        }),
      );

      const data = dataOf(prisma.volunteer.create);
      expect(data.userId).toBe(USER_ID);
      expect(data.skills).toBe('Event management');
      expect(data.availability).toBe('Friday');
      expect(data.notes).toBe('Available for community events');

      // The person is referenced, not copied: their name and contact details stay on `User`, so there
      // is no second copy of them to drift.
      expect(data).not.toHaveProperty('fullName');
      expect(data).not.toHaveProperty('email');
      expect(data).not.toHaveProperty('phone');
      // And nothing here carries authority.
      expect(data).not.toHaveProperty('role');
      expect(data).not.toHaveProperty('permissions');

      expect(result.userId).toBe(USER_ID);
      expect(result.user.fullName).toBe('Rahim Uddin');
    });

    it('creates no user of its own', async () => {
      prisma.volunteer.create.mockResolvedValue(volunteerRow());

      await service.create(createDto());

      // The rule the module is built on: a volunteer belongs to somebody the mosque already knows, so
      // there is no path from this endpoint to a new account. The user delegate is read, never written.
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.user.findFirst).toHaveBeenCalled();
    });

    it('refuses a user that does not exist, before writing anything', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.create(createDto())).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.create(createDto())).rejects.toMatchObject({
        response: { code: 'USER_NOT_FOUND' },
      });

      expect(prisma.volunteer.create).not.toHaveBeenCalled();
    });

    it('treats a soft-deleted account as no user at all', async () => {
      // A deleted account is invisible to every other read in the system, so enrolling one would
      // produce a volunteer that the list can never show.
      await service.create(createDto()).catch(() => undefined);

      expect(whereOf(prisma.user.findFirst)).toEqual({ id: USER_ID, deletedAt: null });
    });

    it('refuses to enrol the same user twice', async () => {
      prisma.volunteer.findUnique.mockResolvedValue({ id: VOLUNTEER_ID });

      await expect(service.create(createDto())).rejects.toBeInstanceOf(ConflictException);
      await expect(service.create(createDto())).rejects.toMatchObject({
        response: { code: 'VOLUNTEER_EXISTS' },
      });

      expect(prisma.volunteer.create).not.toHaveBeenCalled();
      // Checked on the unique column, which is what makes one lookup enough.
      expect(whereOf(prisma.volunteer.findUnique)).toEqual({ userId: USER_ID });
    });

    it('turns the duplicate-enrolment race into a conflict rather than a 500', async () => {
      // Two requests for the same person can both pass the pre-check; only one passes the index. The
      // loser must read as a duplicate, not as a server fault.
      prisma.volunteer.create.mockRejectedValue(knownRequestError('P2002', ['userId']));

      await expect(service.create(createDto())).rejects.toMatchObject({
        response: { code: 'VOLUNTEER_EXISTS' },
      });
    });

    it('turns a broken user reference into a bad request', async () => {
      prisma.volunteer.create.mockRejectedValue(knownRequestError('P2003'));

      await expect(service.create(createDto())).rejects.toMatchObject({
        response: { code: 'USER_NOT_FOUND' },
      });
    });

    it('does not let a raw database message reach the caller', async () => {
      prisma.volunteer.create.mockRejectedValue(knownRequestError('P2010'));

      // Unrecognised codes travel on unchanged so the global filter answers 500 and logs it. Inventing
      // a 4xx for a database fault would hide a bug and mislead the client.
      await expect(service.create(createDto())).rejects.toBeInstanceOf(
        Prisma.PrismaClientKnownRequestError,
      );
    });

    it('defaults the roster status and the join date to the schema', async () => {
      prisma.volunteer.create.mockResolvedValue(volunteerRow());

      await service.create(createDto());

      const data = dataOf(prisma.volunteer.create);
      expect(data.status).toBeUndefined();
      expect(data.joinedAt).toBeUndefined();
    });

    it('accepts a join date in the past, because a volunteer of ten years may be entered today', async () => {
      prisma.volunteer.create.mockResolvedValue(volunteerRow());

      await service.create(createDto({ joinedAt: '2016-05-04T06:00:00.000Z' }));

      expect(dataOf(prisma.volunteer.create).joinedAt).toEqual(
        new Date('2016-05-04T06:00:00.000Z'),
      );
    });
  });

  describe('findOne', () => {
    it('returns the volunteer with the person attached', async () => {
      prisma.volunteer.findFirst.mockResolvedValue(volunteerRow());

      const result = await service.findOne(VOLUNTEER_ID);

      expect(argsOf(prisma.volunteer.findFirst).select).toBe(VOLUNTEER_SELECT);
      expect(result.id).toBe(VOLUNTEER_ID);
      expect(result.user.email).toBe('rahim@noor.example');
      // Timestamps leave as ISO strings, so a client does not have to guess at a serialisation.
      expect(result.joinedAt).toBe('2026-03-01T09:00:00.000Z');
    });

    it('does not see a volunteer whose account has been deleted', async () => {
      prisma.volunteer.findFirst.mockResolvedValue(null);

      await expect(service.findOne(VOLUNTEER_ID)).rejects.toBeInstanceOf(NotFoundException);
      expect(whereOf(prisma.volunteer.findFirst)).toEqual({
        id: VOLUNTEER_ID,
        user: { deletedAt: null },
      });
    });

    it('reports a missing volunteer as VOLUNTEER_NOT_FOUND', async () => {
      prisma.volunteer.findFirst.mockResolvedValue(null);

      await expect(service.findOne(VOLUNTEER_ID)).rejects.toMatchObject({
        response: { code: 'VOLUNTEER_NOT_FOUND' },
      });
    });
  });

  describe('findMany', () => {
    it('pages from 1 with the default size when nothing is asked for', async () => {
      prisma.volunteer.count.mockResolvedValue(1);
      prisma.volunteer.findMany.mockResolvedValue([volunteerRow()]);

      const { rows, meta } = await service.findMany({});

      expect(rows).toHaveLength(1);
      expect(meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
      expect(argsOf(prisma.volunteer.findMany)).toMatchObject({ skip: 0, take: 20 });
    });

    it('skips whole pages', async () => {
      prisma.volunteer.count.mockResolvedValue(45);
      prisma.volunteer.findMany.mockResolvedValue([]);

      const { meta } = await service.findMany({ page: 3, limit: 20 });

      expect(argsOf(prisma.volunteer.findMany)).toMatchObject({ skip: 40, take: 20 });
      expect(meta).toEqual({ page: 3, limit: 20, total: 45, totalPages: 3 });
    });

    it('caps the page size, so one request cannot ask for the whole roster', async () => {
      prisma.volunteer.count.mockResolvedValue(500);
      prisma.volunteer.findMany.mockResolvedValue([]);

      const { meta } = await service.findMany({ limit: 5000 });

      expect(argsOf(prisma.volunteer.findMany).take).toBe(MAX_PAGE_SIZE);
      expect(meta.limit).toBe(MAX_PAGE_SIZE);
    });

    it('reports no pages when nothing matches', async () => {
      prisma.volunteer.count.mockResolvedValue(0);

      const { rows, meta } = await service.findMany({});

      expect(rows).toEqual([]);
      expect(meta.totalPages).toBe(0);
    });

    it('counts and reads the same set of rows in one transaction', async () => {
      prisma.volunteer.count.mockResolvedValue(1);
      prisma.volunteer.findMany.mockResolvedValue([volunteerRow()]);

      await service.findMany({});

      // Counting outside the transaction lets a concurrent enrolment produce a total that does not
      // match the rows returned.
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(whereOf(prisma.volunteer.count)).toEqual(whereOf(prisma.volunteer.findMany));
    });

    it('searches the person’s name, email and phone, and hides deleted accounts', async () => {
      await service.findMany({ search: 'rahim' });

      // The search matches `User`, because that is where a name and a phone number live — the roster
      // row holds only what volunteering adds.
      expect(whereOf(prisma.volunteer.findMany)).toEqual({
        user: {
          deletedAt: null,
          OR: [
            { fullName: { contains: 'rahim', mode: 'insensitive' } },
            { email: { contains: 'rahim', mode: 'insensitive' } },
            { phone: { contains: 'rahim', mode: 'insensitive' } },
          ],
        },
      });
    });

    it('trims the search term, so a stray space does not empty the page', async () => {
      await service.findMany({ search: '  rahim  ' });

      const where = whereOf(prisma.volunteer.findMany) as {
        user: { OR: { fullName: { contains: string } }[] };
      };
      expect(where.user.OR[0].fullName.contains).toBe('rahim');
    });

    it('filters by roster status as an exact match on the enum column', async () => {
      await service.findMany({ status: VolunteerStatus.on_leave });

      expect(whereOf(prisma.volunteer.findMany)).toEqual({
        status: VolunteerStatus.on_leave,
        user: { deletedAt: null },
      });
    });

    it('combines a search with a status filter in one query', async () => {
      await service.findMany({ search: 'rahim', status: VolunteerStatus.active });

      const where = whereOf(prisma.volunteer.findMany);
      expect(where.status).toBe(VolunteerStatus.active);
      expect(where.user).toMatchObject({ deletedAt: null });
    });

    it('hides deleted accounts even with no filter at all', async () => {
      await service.findMany({});

      expect(whereOf(prisma.volunteer.findMany)).toEqual({ user: { deletedAt: null } });
    });

    it('orders by a unique tiebreaker, so a row cannot fall between pages', async () => {
      await service.findMany({});

      // Seeding and bulk import both produce rows sharing a timestamp; without `id` a volunteer can
      // appear on two pages or on none.
      expect(argsOf(prisma.volunteer.findMany).orderBy).toEqual([
        { createdAt: 'desc' },
        { id: 'asc' },
      ]);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      prisma.volunteer.findFirst.mockResolvedValue(volunteerRow());
      prisma.volunteer.update.mockResolvedValue(volunteerRow({ skills: 'First aid, driving' }));
    });

    it('writes the roster fields it was sent', async () => {
      await service.update(VOLUNTEER_ID, {
        skills: 'First aid, driving',
        availability: 'weekends after Asr',
        notes: 'Trained first responder',
        status: VolunteerStatus.on_leave,
      });

      expect(dataOf(prisma.volunteer.update)).toEqual({
        skills: 'First aid, driving',
        availability: 'weekends after Asr',
        notes: 'Trained first responder',
        status: VolunteerStatus.on_leave,
      });
    });

    it('cannot move a roster entry to another user, whatever the caller sends', async () => {
      // `UpdateVolunteerDto` does not declare `userId`, so the global pipe rejects a request carrying
      // it before this method is entered. Asserted anyway: if the DTO ever gained the field, the write
      // must still not touch the column.
      await service.update(VOLUNTEER_ID, {
        userId: OTHER_USER_ID,
        status: VolunteerStatus.inactive,
      } as never);

      expect(dataOf(prisma.volunteer.update)).not.toHaveProperty('userId');
    });

    it('does not touch the user, so an update cannot change what anybody may do', async () => {
      await service.update(VOLUNTEER_ID, { skills: 'First aid' });

      expect(prisma.user.update).not.toHaveBeenCalled();
      const data = dataOf(prisma.volunteer.update);
      expect(data).not.toHaveProperty('role');
      expect(data).not.toHaveProperty('permissions');
      expect(data).not.toHaveProperty('isActive');
    });

    it('does not accept a new join date', async () => {
      await service.update(VOLUNTEER_ID, { joinedAt: '2016-05-04T06:00:00.000Z' } as never);

      expect(dataOf(prisma.volunteer.update)).not.toHaveProperty('joinedAt');
    });

    it('does not touch a volunteer it cannot find', async () => {
      prisma.volunteer.findFirst.mockResolvedValue(null);

      await expect(service.update(VOLUNTEER_ID, { skills: 'First aid' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.volunteer.update).not.toHaveBeenCalled();
    });
  });

  describe('setStatus', () => {
    beforeEach(() => {
      prisma.volunteer.findFirst.mockResolvedValue(volunteerRow());
      prisma.volunteer.update.mockResolvedValue(volunteerRow({ status: VolunteerStatus.inactive }));
    });

    it('writes the status column and nothing else', async () => {
      const result = await service.setStatus(VOLUNTEER_ID, { status: VolunteerStatus.inactive });

      expect(dataOf(prisma.volunteer.update)).toEqual({ status: VolunteerStatus.inactive });
      expect(result.status).toBe(VolunteerStatus.inactive);
    });

    it('leaves the user’s role exactly as it was', async () => {
      // The rule the whole module rests on. A treasurer who steps off the roster is still the
      // treasurer: the `users` table is not written, and the role in the response is unchanged.
      const result = await service.setStatus(VOLUNTEER_ID, { status: VolunteerStatus.inactive });

      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(result.user.role).toBe(Role.treasurer);
    });

    it('takes a volunteer on leave without deleting the record', async () => {
      prisma.volunteer.update.mockResolvedValue(volunteerRow({ status: VolunteerStatus.on_leave }));

      const result = await service.setStatus(VOLUNTEER_ID, { status: VolunteerStatus.on_leave });

      expect(result.status).toBe(VolunteerStatus.on_leave);
      expect(prisma.volunteer.delete).not.toHaveBeenCalled();
    });

    it('reports a missing volunteer rather than creating one', async () => {
      prisma.volunteer.findFirst.mockResolvedValue(null);

      await expect(
        service.setStatus(VOLUNTEER_ID, { status: VolunteerStatus.active }),
      ).rejects.toMatchObject({ response: { code: 'VOLUNTEER_NOT_FOUND' } });
      expect(prisma.volunteer.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      prisma.volunteer.findFirst.mockResolvedValue(volunteerRow());
    });

    it('deletes the roster entry and leaves the person alone', async () => {
      const result = await service.remove(VOLUNTEER_ID);

      expect(whereOf(prisma.volunteer.delete)).toEqual({ id: VOLUNTEER_ID });
      // Nothing on `users` is written — not a soft-delete marker, not the status. Taking someone off
      // the volunteer list is not a way to remove their account.
      expect(prisma.user.update).not.toHaveBeenCalled();
      // The user id comes back as the confirmation of exactly that.
      expect(result).toEqual({ id: VOLUNTEER_ID, userId: USER_ID });
    });

    it('treats a second delete as a missing volunteer', async () => {
      prisma.volunteer.findFirst.mockResolvedValue(null);

      await expect(service.remove(VOLUNTEER_ID)).rejects.toMatchObject({
        response: { code: 'VOLUNTEER_NOT_FOUND' },
      });
      expect(prisma.volunteer.delete).not.toHaveBeenCalled();
    });
  });

  describe('sanitisation', () => {
    it('never asks the database for a credential', () => {
      // The strongest form of the guarantee: the columns are not read, so no volunteer endpoint is in a
      // position to return one by accident. `VOLUNTEER_SELECT` nests the users module's own allow-list,
      // so there is one definition of a safe user and this module cannot drift from it.
      expect(VOLUNTEER_SELECT.user.select).toBe(USER_SELECT);

      for (const secret of [
        'passwordHash',
        'refreshTokenHash',
        'passwordResetTokenHash',
        'passwordResetExpiresAt',
      ]) {
        expect(USER_SELECT).not.toHaveProperty(secret);
      }
    });

    it('drops a credential even if a query hands one over', async () => {
      // Belt and braces against a future `select` that forgets: the response is built field by field,
      // so anything not on the allow-list cannot travel.
      prisma.volunteer.findFirst.mockResolvedValue({
        ...volunteerRow(),
        user: { ...userRow(), passwordHash: HASHED, passwordResetTokenHash: 'reset-token' },
      });

      const result = await service.findOne(VOLUNTEER_ID);

      expect(Object.keys(result.user)).not.toContain('passwordHash');
      expect(Object.keys(result.user)).not.toContain('passwordResetTokenHash');
      expect(Object.keys(result.user)).not.toContain('deletedAt');
      expect(JSON.stringify(result)).not.toContain(HASHED);
      expect(JSON.stringify(result)).not.toContain('reset-token');
    });

    it('reads every volunteer through the same allow-list', async () => {
      prisma.volunteer.count.mockResolvedValue(1);
      prisma.volunteer.findMany.mockResolvedValue([volunteerRow()]);
      await service.findMany({});
      expect(argsOf(prisma.volunteer.findMany).select).toBe(VOLUNTEER_SELECT);

      prisma.volunteer.create.mockResolvedValue(volunteerRow());
      await service.create(createDto());
      expect(argsOf(prisma.volunteer.create).select).toBe(VOLUNTEER_SELECT);

      prisma.volunteer.update.mockResolvedValue(volunteerRow());
      prisma.volunteer.findFirst.mockResolvedValue(volunteerRow());
      await service.update(VOLUNTEER_ID, { skills: 'First aid' });
      expect(argsOf(prisma.volunteer.update).select).toBe(VOLUNTEER_SELECT);

      await service.setStatus(VOLUNTEER_ID, { status: VolunteerStatus.active });
      expect(argsOf(prisma.volunteer.update).select).toBe(VOLUNTEER_SELECT);
    });
  });
});
