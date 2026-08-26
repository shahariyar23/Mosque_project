import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from './audit-log.service';
import type { AuditLogQueryDto } from './dto/audit-log-query.dto';
import {
  REDACTED,
  definedChanges,
  redactSecrets,
  type AuditEntry,
  type SelectedAuditLog,
} from './types/audit-log.types';

/**
 * The audit trail's writer and reader.
 *
 * Four things are worth testing here, and only one of them is ordinary CRUD.
 *
 * **That a secret cannot reach the row.** The schema promises the `changes` column holds no password, token or
 * hash. Two independent measures keep that promise — every caller names its fields, and `redactSecrets` filters
 * what they name — and the second is the one a test can check, because it holds even for a caller who was
 * careless. So there are cases for a field called `password`, one called `refreshTokenHash`, one nested two
 * levels down, and one inside an array.
 *
 * **That a failed write does not fail the action.** `record` swallows its own errors by design: an audit table
 * that will not accept a row must not turn a legitimate role change into a 500. That inversion of the usual rule
 * is the kind of thing a later reader deletes as a mistake, so it is asserted explicitly.
 *
 * **That a reader sees one mosque.** Every query is scoped from the token. The one exception is a holder of
 * `platform.manage`, and the exception is asserted too — including that a *suspended* platform administrator
 * loses it, because `effectivePermissions` returns nothing for an inactive account.
 *
 * **That the trail is append-only.** There is no update and no delete to test, so what is tested is the absence:
 * the service exposes exactly `record`, `findMany` and `findOne`.
 */

const ENTRY_ID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const ACTOR_ID = '9c8b7a65-4321-4f6a-8c11-2d5e7a9b0c31';
const MOSQUE_ID = 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0';
const OTHER_MOSQUE = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

const CREATED_AT = new Date('2026-08-20T09:30:00.000Z');

function actor(over: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: ACTOR_ID,
    mosqueId: MOSQUE_ID,
    email: 'admin@noor.example',
    role: 'mosque_admin',
    permissions: [],
    deniedPermissions: [],
    isActive: true,
    ...over,
  };
}

/** A caller who administers across mosques. `platform.manage` is granted, not inferred from the role. */
function platformActor(over: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return actor({ role: 'super_admin', permissions: ['platform.manage'], ...over });
}

function entry(over: Partial<AuditEntry> = {}): AuditEntry {
  return {
    mosqueId: MOSQUE_ID,
    action: 'ROLE_ASSIGNED',
    resource: 'user',
    resourceId: ACTOR_ID,
    actorId: ACTOR_ID,
    actorName: 'Ahmed Hasan',
    actorRole: 'mosque_admin',
    ...over,
  };
}

/** A row as `AUDIT_LOG_SELECT` returns one. */
function row(over: Partial<SelectedAuditLog> = {}): SelectedAuditLog {
  return {
    id: ENTRY_ID,
    mosqueId: MOSQUE_ID,
    actorId: ACTOR_ID,
    actorName: 'Ahmed Hasan',
    actorRole: 'mosque_admin',
    action: 'ROLE_ASSIGNED',
    resource: 'user',
    resourceId: ACTOR_ID,
    changes: { role: { from: 'member', to: 'treasurer' } },
    note: null,
    ipAddress: '203.0.113.24',
    userAgent: 'Mozilla/5.0',
    createdAt: CREATED_AT,
    ...over,
  };
}

describe('AuditLogService', () => {
  let service: AuditLogService;
  let prisma: {
    auditLog: Record<'create' | 'count' | 'findMany' | 'findFirst', jest.Mock>;
    $transaction: jest.Mock;
  };
  let errored: jest.SpyInstance;

  beforeEach(async () => {
    prisma = {
      auditLog: {
        create: jest.fn().mockResolvedValue(row()),
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(row()),
      },
      // The real thing runs the array in one transaction. `Promise.all` is the same shape from the
      // caller's side and preserves what matters: both queries were built and handed over together.
      $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditLogService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(AuditLogService);

    // Silenced rather than ignored: the swallowed-failure cases below assert that it was called.
    errored = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    errored.mockRestore();
  });

  /** The `data` of the write. */
  const written = (): Record<string, unknown> => {
    expect(prisma.auditLog.create).toHaveBeenCalled();
    const args = prisma.auditLog.create.mock.calls[0][0] as Record<string, unknown>;
    return args.data as Record<string, unknown>;
  };

  /** The `where` of one read. */
  const whereOf = (mock: jest.Mock): Record<string, unknown> => {
    expect(mock).toHaveBeenCalled();
    const args = mock.mock.calls[mock.mock.calls.length - 1][0] as Record<string, unknown>;
    return args.where as Record<string, unknown>;
  };

  // ---------------------------------------------------------------------------
  // record
  // ---------------------------------------------------------------------------

  describe('record', () => {
    it('writes the entry the caller described', async () => {
      await service.record(entry({ note: 'Promoted at the committee meeting.' }));

      expect(written()).toEqual({
        mosqueId: MOSQUE_ID,
        actorId: ACTOR_ID,
        actorName: 'Ahmed Hasan',
        actorRole: 'mosque_admin',
        action: 'ROLE_ASSIGNED',
        resource: 'user',
        resourceId: ACTOR_ID,
        changes: undefined,
        note: 'Promoted at the committee meeting.',
        ipAddress: null,
        userAgent: null,
      });
    });

    it('stores nulls rather than undefined for the optional columns', async () => {
      await service.record(entry({ actorId: undefined, actorRole: undefined }));

      const data = written();
      expect(data.actorId).toBeNull();
      expect(data.actorRole).toBeNull();
      expect(data.note).toBeNull();
      expect(data.ipAddress).toBeNull();
    });

    it('caps every value to the width of its column', async () => {
      await service.record(
        entry({
          actorName: 'n'.repeat(200),
          actorRole: 'r'.repeat(50),
          resourceId: 'i'.repeat(90),
          ipAddress: 'p'.repeat(90),
          // A real browser string runs past 255 often enough that not capping would quietly cost the
          // trail every entry from whichever browser is currently the most verbose.
          userAgent: 'u'.repeat(400),
        }),
      );

      const data = written();
      expect(data.actorName).toHaveLength(160);
      expect(data.actorRole).toHaveLength(32);
      expect(data.resourceId).toHaveLength(64);
      expect(data.ipAddress).toHaveLength(64);
      expect(data.userAgent).toHaveLength(255);
    });

    it('leaves a value that already fits exactly as it was', async () => {
      await service.record(entry({ actorName: 'Ahmed Hasan', userAgent: 'jest' }));

      expect(written()).toMatchObject({ actorName: 'Ahmed Hasan', userAgent: 'jest' });
    });

    it('records business values in changes untouched', async () => {
      await service.record(
        entry({ changes: { role: { from: 'member', to: 'treasurer' }, positions: ['cashier'] } }),
      );

      expect(written().changes).toEqual({
        role: { from: 'member', to: 'treasurer' },
        positions: ['cashier'],
      });
    });

    it('redacts anything whose field name suggests a credential', async () => {
      await service.record(
        entry({
          changes: {
            email: 'new@noor.example',
            password: 'Str0ngPassphrase!',
            passwordHash: '$argon2id$v=19$m=65536',
            refreshTokenHash: 'deadbeef',
            apiKey: 'sk-live-1234',
            authorization: 'Bearer abc.def.ghi',
          },
        }),
      );

      expect(written().changes).toEqual({
        email: 'new@noor.example',
        password: REDACTED,
        passwordHash: REDACTED,
        refreshTokenHash: REDACTED,
        apiKey: REDACTED,
        authorization: REDACTED,
      });
    });

    it('redacts a secret nested inside an object or an array', async () => {
      await service.record(
        entry({
          changes: {
            outer: { inner: { resetToken: 'a-token' }, city: 'Dhaka' },
            attempts: [{ secret: 'shh' }, { ip: '203.0.113.9' }],
          },
        }),
      );

      expect(written().changes).toEqual({
        outer: { inner: { resetToken: REDACTED }, city: 'Dhaka' },
        attempts: [{ secret: REDACTED }, { ip: '203.0.113.9' }],
      });
    });

    it('leaves the changes column null when the caller recorded none', async () => {
      await service.record(entry({ changes: null }));

      expect(written().changes).toBeUndefined();
    });

    it('never lets a failed write fail the action it was recording', async () => {
      prisma.auditLog.create.mockRejectedValue(new Error('audit_logs is unreachable'));

      // Resolves rather than throws. A database that will not accept the entry must not turn a
      // legitimate role change into a 500 the administrator can only retry into another 500.
      await expect(service.record(entry())).resolves.toBeUndefined();
      expect(errored).toHaveBeenCalled();
    });

    it('keeps the entry’s contents out of the log line reporting the failure', async () => {
      prisma.auditLog.create.mockRejectedValue(new Error('audit_logs is unreachable'));

      await service.record(
        entry({ changes: { password: 'Str0ngPassphrase!' }, note: 'a private note' }),
      );

      // The application log is not the audit trail and has no business holding what the trail was
      // asked to hold — least of all on the one path where redaction did not run.
      const line = errored.mock.calls.flat().join('\n');
      expect(line).toContain('ROLE_ASSIGNED');
      expect(line).not.toContain('Str0ngPassphrase!');
      expect(line).not.toContain('a private note');
    });
  });

  // ---------------------------------------------------------------------------
  // findMany
  // ---------------------------------------------------------------------------

  describe('findMany', () => {
    it('returns a page with its paging figures', async () => {
      prisma.auditLog.count.mockResolvedValue(3);
      prisma.auditLog.findMany.mockResolvedValue([row()]);

      const result = await service.findMany(actor(), {});

      expect(result.meta).toEqual({ page: 1, limit: 20, total: 3, totalPages: 1 });
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toMatchObject({
        id: ENTRY_ID,
        mosqueId: MOSQUE_ID,
        action: 'ROLE_ASSIGNED',
        resource: 'user',
        createdAt: CREATED_AT.toISOString(),
      });
    });

    it('counts and reads inside one transaction, so the two describe the same rows', async () => {
      await service.findMany(actor(), {});

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(whereOf(prisma.auditLog.count)).toEqual(whereOf(prisma.auditLog.findMany));
    });

    it('orders newest first and breaks ties on id, so no entry lands on two pages', async () => {
      await service.findMany(actor(), {});

      const args = prisma.auditLog.findMany.mock.calls[0][0] as Record<string, unknown>;
      expect(args.orderBy).toEqual([{ createdAt: 'desc' }, { id: 'asc' }]);
    });

    it('translates the page into skip and take', async () => {
      await service.findMany(actor(), { page: 3, limit: 25 });

      const args = prisma.auditLog.findMany.mock.calls[0][0] as Record<string, unknown>;
      expect(args).toMatchObject({ skip: 50, take: 25 });
    });

    it('caps the page size, whatever was asked for', async () => {
      const result = await service.findMany(actor(), { limit: 5_000 });

      expect(result.meta.limit).toBe(100);
      const args = prisma.auditLog.findMany.mock.calls[0][0] as Record<string, unknown>;
      expect(args.take).toBe(100);
    });

    it('floors a page and a limit below one', async () => {
      const result = await service.findMany(actor(), { page: 0, limit: 0 });

      expect(result.meta).toMatchObject({ page: 1, limit: 1 });
      const args = prisma.auditLog.findMany.mock.calls[0][0] as Record<string, unknown>;
      expect(args.skip).toBe(0);
    });

    it('reports no pages when nothing matched', async () => {
      prisma.auditLog.count.mockResolvedValue(0);

      const result = await service.findMany(actor(), {});

      expect(result.meta.totalPages).toBe(0);
      expect(result.rows).toEqual([]);
    });

    it('filters on the action', async () => {
      await service.findMany(actor(), { action: 'LOGIN_FAILED' });

      expect(whereOf(prisma.auditLog.findMany)).toMatchObject({ action: 'LOGIN_FAILED' });
    });

    it('maps the brief’s entity onto the resource column', async () => {
      await service.findMany(actor(), { entity: 'user' });

      const where = whereOf(prisma.auditLog.findMany);
      expect(where).toMatchObject({ resource: 'user' });
      expect(where.entity).toBeUndefined();
    });

    it('maps the brief’s userId onto the actor', async () => {
      await service.findMany(actor(), { userId: ACTOR_ID });

      const where = whereOf(prisma.auditLog.findMany);
      expect(where).toMatchObject({ actorId: ACTOR_ID });
      expect(where.userId).toBeUndefined();
    });

    it('reads a date window as a half-open range, so the last day counts in full', async () => {
      await service.findMany(actor(), { from: '2026-08-01', to: '2026-08-31' });

      expect(whereOf(prisma.auditLog.findMany).createdAt).toEqual({
        gte: new Date('2026-08-01T00:00:00.000Z'),
        // Midnight on the 1st of September. An `lte` on the 31st's midnight would return the entries
        // written in that day's first instant and nothing else.
        lt: new Date('2026-09-01T00:00:00.000Z'),
      });
    });

    it('accepts one end of the window without the other', async () => {
      await service.findMany(actor(), { from: '2026-08-01' });

      expect(whereOf(prisma.auditLog.findMany).createdAt).toEqual({
        gte: new Date('2026-08-01T00:00:00.000Z'),
      });
    });

    it('builds no date predicate when neither end was given', async () => {
      await service.findMany(actor(), {});

      expect(whereOf(prisma.auditLog.findMany).createdAt).toBeUndefined();
    });

    it('refuses a window that ends before it begins', async () => {
      await expect(
        service.findMany(actor(), { from: '2026-08-31', to: '2026-08-01' }),
      ).rejects.toBeInstanceOf(BadRequestException);

      // A 400 rather than an empty page: an audit search that silently returns nothing is the worst
      // possible way to hide a mistake in the request.
      expect(prisma.auditLog.findMany).not.toHaveBeenCalled();
    });

    it('names the refusal, so a client can tell it from a validation failure', async () => {
      await expect(
        service.findMany(actor(), { from: '2026-08-31', to: '2026-08-01' }),
      ).rejects.toMatchObject({ response: { code: 'INVALID_DATE_RANGE' } });
    });

    it('accepts a window of a single day', async () => {
      await expect(
        service.findMany(actor(), { from: '2026-08-20', to: '2026-08-20' }),
      ).resolves.toBeDefined();
    });

    it('scopes every read to the caller’s own mosque', async () => {
      await service.findMany(actor(), {});

      expect(whereOf(prisma.auditLog.count)).toMatchObject({ mosqueId: MOSQUE_ID });
      expect(whereOf(prisma.auditLog.findMany)).toMatchObject({ mosqueId: MOSQUE_ID });
    });

    it('takes the mosque from the token even when the query names another', async () => {
      // There is no `mosqueId` on `AuditLogQueryDto`, so this cannot arrive through the pipe at all —
      // the cast is what a future property, or a caller inside the server, would look like.
      await service.findMany(actor(), { mosqueId: OTHER_MOSQUE } as AuditLogQueryDto);

      expect(whereOf(prisma.auditLog.findMany).mosqueId).toBe(MOSQUE_ID);
    });

    it('lets a platform administrator read across mosques', async () => {
      await service.findMany(platformActor(), {});

      expect(whereOf(prisma.auditLog.findMany).mosqueId).toBeUndefined();
    });

    it('confines a suspended platform administrator to their own mosque', async () => {
      // `effectivePermissions` resolves to nothing for an inactive account, so the exception is lost
      // with the rest of their authority rather than surviving it.
      await service.findMany(platformActor({ isActive: false }), {});

      expect(whereOf(prisma.auditLog.findMany).mosqueId).toBe(MOSQUE_ID);
    });

    it('confines a platform administrator whose permission has been denied', async () => {
      await service.findMany(platformActor({ deniedPermissions: ['platform.manage'] }), {});

      expect(whereOf(prisma.auditLog.findMany).mosqueId).toBe(MOSQUE_ID);
    });

    it('keeps a userId filter from widening what the caller may see', async () => {
      await service.findMany(actor(), { userId: ACTOR_ID });

      // Both clauses, and the mosque is still one of them: naming somebody at another mosque returns
      // an empty page rather than their trail.
      expect(whereOf(prisma.auditLog.findMany)).toMatchObject({
        mosqueId: MOSQUE_ID,
        actorId: ACTOR_ID,
      });
    });

    it('reads back through the projection, so an added column stays invisible', async () => {
      await service.findMany(actor(), {});

      const args = prisma.auditLog.findMany.mock.calls[0][0] as Record<string, unknown>;
      expect(args.select).toMatchObject({ id: true, mosqueId: true, changes: true });
    });

    it('returns null for a changes column holding something that is not an object', async () => {
      prisma.auditLog.findMany.mockResolvedValue([row({ changes: 'not an object' })]);

      const result = await service.findMany(actor(), {});

      expect(result.rows[0].changes).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // findOne
  // ---------------------------------------------------------------------------

  describe('findOne', () => {
    it('returns the entry', async () => {
      const result = await service.findOne(actor(), ENTRY_ID);

      expect(result).toMatchObject({ id: ENTRY_ID, action: 'ROLE_ASSIGNED' });
      expect(whereOf(prisma.auditLog.findFirst)).toEqual({ id: ENTRY_ID, mosqueId: MOSQUE_ID });
    });

    it('answers a missing entry with a 404', async () => {
      prisma.auditLog.findFirst.mockResolvedValue(null);

      await expect(service.findOne(actor(), ENTRY_ID)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('answers another mosque’s entry with the same 404, not a 403', async () => {
      // The scope is in the `where`, so a row at another mosque simply does not match. A 403 would
      // confirm the id exists, which for a log of who did what is itself worth withholding.
      prisma.auditLog.findFirst.mockResolvedValue(null);

      await expect(service.findOne(actor(), ENTRY_ID)).rejects.toMatchObject({
        response: { code: 'AUDIT_LOG_NOT_FOUND' },
      });
      expect(whereOf(prisma.auditLog.findFirst).mosqueId).toBe(MOSQUE_ID);
    });

    it('lets a platform administrator read another mosque’s entry', async () => {
      prisma.auditLog.findFirst.mockResolvedValue(row({ mosqueId: OTHER_MOSQUE }));

      const result = await service.findOne(platformActor(), ENTRY_ID);

      expect(result.mosqueId).toBe(OTHER_MOSQUE);
      expect(whereOf(prisma.auditLog.findFirst).mosqueId).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Append-only
  // ---------------------------------------------------------------------------

  describe('the trail is append-only', () => {
    it('exposes a writer and two readers, and nothing that amends a row', () => {
      const methods = Object.getOwnPropertyNames(AuditLogService.prototype).filter(
        (name) => name !== 'constructor',
      );

      // Private helpers are on the prototype too, so this asserts the absence rather than the exact
      // set: nothing here updates, deletes or otherwise rewrites an entry that has been written.
      for (const forbidden of ['update', 'remove', 'delete', 'setStatus', 'purge']) {
        expect(methods).not.toContain(forbidden);
      }
      expect(methods).toContain('record');
      expect(methods).toContain('findMany');
      expect(methods).toContain('findOne');
    });

    it('issues no write beyond the create', async () => {
      await service.record(entry());
      await service.findMany(actor(), {});
      await service.findOne(actor(), ENTRY_ID);

      expect(Object.keys(prisma.auditLog)).toEqual(['create', 'count', 'findMany', 'findFirst']);
      expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // The helpers the writers use
  // ---------------------------------------------------------------------------

  describe('definedChanges', () => {
    it('drops the fields a partial update never named', () => {
      expect(definedChanges({ fullName: 'Ahmed', phone: undefined, city: undefined })).toEqual({
        fullName: 'Ahmed',
      });
    });

    it('keeps a null, because clearing a field is a change', () => {
      expect(definedChanges({ phone: null, city: undefined })).toEqual({ phone: null });
    });

    it('keeps a false and an empty array, which are values and not absences', () => {
      expect(definedChanges({ newsletter: false, positions: [] })).toEqual({
        newsletter: false,
        positions: [],
      });
    });
  });

  describe('redactSecrets', () => {
    it('matches a secret name as a substring, in any case', () => {
      expect(
        redactSecrets({ NewPassword: 'x', bearer_TOKEN: 'y', Cookie: 'z', plain: 'kept' }),
      ).toEqual({
        NewPassword: REDACTED,
        bearer_TOKEN: REDACTED,
        Cookie: REDACTED,
        plain: 'kept',
      });
    });

    it('leaves a Date alone rather than walking it into its internals', () => {
      const at = new Date('2026-08-20T09:30:00.000Z');

      expect(redactSecrets({ changedAt: at })).toEqual({ changedAt: at });
    });

    it('stops descending before a pathological object can exhaust the stack', () => {
      const deep = { a: { b: { c: { d: { e: { password: 'never reached' } } } } } };

      // Bounded rather than complete: an audit write is not the place to be clever, and every writer
      // in the repository records a flat object one or two levels deep.
      expect(() => redactSecrets(deep)).not.toThrow();
    });
  });
});
