import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

import { ANY_PERMISSION_KEY, PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { AuditLogService } from './audit-log.service';
import { AuditLogsController } from './audit-logs.controller';
import type { AuditLogQueryDto } from './dto/audit-log-query.dto';
import type { AuditLogResponseDto } from './dto/audit-log-response.dto';

/**
 * Reading the audit trail.
 *
 * The controller does very little on purpose — envelope the service's answer, hand the query through — so the
 * interesting assertions here are about what it *is not*.
 *
 * **It is read-only.** Two `GET` handlers and nothing else. An audit log with a write route is a log an attacker can
 * furnish, and one with a delete route is a log that will be emptied by whoever most needs it emptied. The absence is
 * asserted directly, because the way that protection breaks is that somebody adds a fourth method to the class.
 *
 * **It takes no mosque from the request.** The scope comes from the token, inside the authenticated user, and the
 * query DTO has no `mosqueId` for a caller to set.
 *
 * **It is guarded.** `audit.view` is declared once on the class rather than repeated per handler, so a new route
 * inherits the requirement instead of being born open. That inheritance is what the metadata assertions check, and
 * they read it the way `PermissionsGuard` does — `getAllAndOverride` over the handler *and* the class — because a
 * plain `get` on the handler would report `undefined` for a class-level declaration and pass while proving nothing.
 */

const ACTOR: AuthenticatedUser = {
  id: '9c8b7a65-4321-4f6a-8c11-2d5e7a9b0c31',
  mosqueId: 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0',
  email: 'admin@noor.example',
  role: 'mosque_admin',
  permissions: [],
  deniedPermissions: [],
  isActive: true,
};

const ENTRY_ID = '0f8fad5b-d9cb-469f-a165-70867728950e';

const ENTRY: AuditLogResponseDto = {
  id: ENTRY_ID,
  mosqueId: ACTOR.mosqueId,
  action: 'ROLE_ASSIGNED',
  resource: 'user',
  resourceId: '4b9d6f2a-1c3e-4f7b-9a2d-6e8c0b1d3f5a',
  actorId: ACTOR.id,
  actorName: 'Ahmed Hasan',
  actorRole: 'mosque_admin',
  changes: { role: { from: 'member', to: 'treasurer' } },
  note: null,
  ipAddress: '203.0.113.24',
  userAgent: 'Mozilla/5.0',
  createdAt: '2026-08-20T09:30:00.000Z',
};

const META = { page: 1, limit: 20, total: 1, totalPages: 1 };

const QUERY: AuditLogQueryDto = { page: 1, limit: 20, action: 'ROLE_ASSIGNED', entity: 'user' };

type ServiceMock = Record<'record' | 'findMany' | 'findOne', jest.Mock>;

describe('AuditLogsController', () => {
  let controller: AuditLogsController;
  let audit: ServiceMock;

  beforeEach(async () => {
    audit = {
      record: jest.fn().mockResolvedValue(undefined),
      findMany: jest.fn().mockResolvedValue({ rows: [ENTRY], meta: META }),
      findOne: jest.fn().mockResolvedValue(ENTRY),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogsController],
      providers: [{ provide: AuditLogService, useValue: audit }],
    }).compile();

    controller = module.get(AuditLogsController);
  });

  describe('GET /admin/audit-logs', () => {
    it('wraps the page in the standard envelope, paging figures alongside the rows', async () => {
      const response = await controller.findAll(ACTOR, QUERY);

      expect(response).toEqual({
        success: true,
        message: 'Audit log entries retrieved successfully',
        data: [ENTRY],
        meta: META,
      });
    });

    it('hands the caller and the query through untouched', async () => {
      await controller.findAll(ACTOR, QUERY);

      expect(audit.findMany).toHaveBeenCalledWith(ACTOR, QUERY);
    });

    it('forwards an empty query rather than inventing filters', async () => {
      await controller.findAll(ACTOR, {});

      expect(audit.findMany).toHaveBeenCalledWith(ACTOR, {});
    });

    it('returns an empty page as an empty list, not as a 404', async () => {
      audit.findMany.mockResolvedValue({
        rows: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });

      const response = await controller.findAll(ACTOR, {});

      expect(response.data).toEqual([]);
      expect(response.success).toBe(true);
    });

    it('does not swallow a refused date range', async () => {
      audit.findMany.mockRejectedValue(new Error('to must not fall before from.'));

      await expect(controller.findAll(ACTOR, {})).rejects.toThrow('to must not fall before from.');
    });
  });

  describe('GET /admin/audit-logs/:id', () => {
    it('wraps the entry in the standard envelope', async () => {
      const response = await controller.findOne(ACTOR, ENTRY_ID);

      expect(response).toEqual({
        success: true,
        message: 'Audit log entry retrieved successfully',
        data: ENTRY,
      });
    });

    it('passes the caller and the id to the service', async () => {
      await controller.findOne(ACTOR, ENTRY_ID);

      expect(audit.findOne).toHaveBeenCalledWith(ACTOR, ENTRY_ID);
    });

    it('does not swallow the 404 for another mosque’s entry', async () => {
      audit.findOne.mockRejectedValue(new Error('No such audit log entry.'));

      await expect(controller.findOne(ACTOR, ENTRY_ID)).rejects.toThrow('No such audit log entry.');
    });
  });

  describe('both routes', () => {
    const call = (method: 'findAll' | 'findOne') =>
      method === 'findAll' ? controller.findAll(ACTOR, QUERY) : controller.findOne(ACTOR, ENTRY_ID);

    const routes = ['findAll', 'findOne'] as const;

    it.each(routes)('answers %s with success first and no stray keys', async (method) => {
      const response = await call(method);

      const expected =
        method === 'findAll'
          ? ['success', 'message', 'data', 'meta']
          : ['success', 'message', 'data'];

      expect(Object.keys(response)).toEqual(expected);
      expect(response.success).toBe(true);
    });

    // The mosque is neither a route parameter nor a query parameter. It reaches the service inside the
    // authenticated user and nowhere else, so there is nothing here for a caller to substitute.
    it.each(routes)('takes no mosque from the request on %s', async (method) => {
      await call(method);

      const mock = method === 'findAll' ? audit.findMany : audit.findOne;
      const [user, second] = mock.mock.calls[0] as [AuthenticatedUser, unknown];

      expect(user.mosqueId).toBe(ACTOR.mosqueId);
      expect(typeof second === 'object' ? { ...second } : {}).not.toHaveProperty('mosqueId');
    });

    it.each(routes)('does not record an entry for having read one on %s', async (method) => {
      await call(method);

      // Reading the trail is not an event in the trail. Auditing the audit reader turns one
      // administrator's afternoon of reading into thousands of rows that bury what they were reading.
      expect(audit.record).not.toHaveBeenCalled();
    });

    it.each(routes)('does not swallow a failure from %s', async (method) => {
      audit.findMany.mockRejectedValue(new Error('database unavailable'));
      audit.findOne.mockRejectedValue(new Error('database unavailable'));

      await expect(call(method)).rejects.toThrow('database unavailable');
    });
  });

  describe('the trail cannot be written or erased through the API', () => {
    it('declares two handlers, both of them reads', () => {
      const declared = Object.getOwnPropertyNames(AuditLogsController.prototype).filter(
        (name) => name !== 'constructor',
      );

      expect(declared.sort()).toEqual(['findAll', 'findOne']);
    });

    it('has no handler that could create, amend or remove an entry', () => {
      const handlers = AuditLogsController.prototype as unknown as Record<string, unknown>;

      for (const absent of [
        'create',
        'record',
        'update',
        'patch',
        'remove',
        'delete',
        'purge',
        'clear',
        'export',
      ]) {
        expect(handlers[absent]).toBeUndefined();
      }
    });

    it('never reaches the service’s writer, even though it is injected', async () => {
      await controller.findAll(ACTOR, QUERY);
      await controller.findOne(ACTOR, ENTRY_ID);

      // `AuditLogService` is one class for both jobs, so the writer is in reach here. Nothing in this
      // controller calls it, and nothing should: entries come from the code performing the action,
      // which is the only caller that knows what actually happened.
      expect(audit.record).not.toHaveBeenCalled();
    });
  });

  describe('what each route requires', () => {
    const reflector = new Reflector();
    const handlers = AuditLogsController.prototype as unknown as Record<string, () => void>;
    const routes = ['findAll', 'findOne'];

    /**
     * Read the way the guard reads it: handler first, class behind it.
     *
     * `audit.view` is declared once on the class, so a plain `get` on the handler would answer
     * `undefined` here — the test would pass against a controller with no requirement at all.
     */
    const requiresAll = (method: string): string[] | undefined =>
      reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        handlers[method],
        AuditLogsController,
      ]);

    const requiresAny = (method: string): string[] | undefined =>
      reflector.getAllAndOverride<string[]>(ANY_PERMISSION_KEY, [
        handlers[method],
        AuditLogsController,
      ]);

    it.each(routes)('needs audit.view to read %s', (method) => {
      expect(requiresAll(method)).toEqual(['audit.view']);
      expect(requiresAny(method)).toBeUndefined();
    });

    it('declares the requirement on the class, so a new route inherits it', () => {
      expect(reflector.get<string[]>(PERMISSIONS_KEY, AuditLogsController)).toEqual(['audit.view']);

      for (const method of routes) {
        expect(reflector.get<string[]>(PERMISSIONS_KEY, handlers[method])).toBeUndefined();
      }
    });

    it('asks for the registry’s existing permission, not a second name for it', () => {
      // The brief suggested `audit_logs.view`. It would have been a synonym for an authority that
      // already exists, and a second thing to keep in step with the role map for ever after.
      for (const method of routes) {
        const required = requiresAll(method) ?? [];

        expect(required).not.toContain('audit_logs.view');
        expect(required).not.toContain('admin_users.view');
      }
    });

    it('does not let a general read permission open the trail', () => {
      for (const method of routes) {
        const required = requiresAll(method) ?? [];

        // Who changed a salary and when is not the same disclosure as the salary.
        for (const narrower of ['user.view', 'report.view', 'finance.view', 'profile.manageOwn']) {
          expect(required).not.toContain(narrower);
        }
      }
    });

    it('leaves no route unguarded', () => {
      for (const method of routes) {
        const required = (requiresAll(method) ?? []).length + (requiresAny(method) ?? []).length;

        expect(required).toBeGreaterThan(0);
      }
    });
  });
});
