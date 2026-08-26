import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

import { ANY_PERMISSION_KEY, PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import type { FinancialReportQueryDto } from './dto/financial-report-query.dto';
import { FinancialReportsController } from './financial-reports.controller';
import { FinancialReportsService } from './financial-reports.service';

/**
 * The financial reports controller.
 *
 * Two jobs, and this is where the second one is decided.
 *
 * The first is the envelope: five read-only routes that wrap what the service computed in the same
 * `{ success, message, data }` shape as every other endpoint, and hand the query through untouched.
 *
 * The second is **authorization**, which for this module lives entirely in the route metadata. Unlike donations or
 * salaries, a financial report has no own-records reading to resolve — a mosque's total is a whole-mosque figure by
 * definition — so the service has no scope to narrow and does not re-check anything. `PermissionsGuard` resolves
 * `finance.view` against the caller's effective permissions, which is also what refuses a deactivated account. That
 * makes the declaration on each handler the whole of the access control, so it is asserted directly rather than
 * inferred from behaviour: read off the handler with a real `Reflector`, exactly as the guard reads it at runtime.
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

const RANGE = { from: '2026-07-01', to: '2026-09-30' };

const SUMMARY = {
  range: RANGE,
  currency: 'BDT',
  donations: { total: '182500.00', count: 34 },
  expenses: { total: '144500.00', count: 27 },
  salaries: { total: '315000.00', count: 9 },
  budget: { total: '250000.00', count: 4, remaining: '-209500.00' },
  netBalance: '-277000.00',
};

const DONATIONS = {
  range: RANGE,
  currency: 'BDT',
  total: '182500.00',
  count: 34,
  byStatus: [{ status: 'completed', total: '182500.00', count: 34 }],
  byPaymentMethod: [{ paymentMethod: 'cash', total: '182500.00', count: 34 }],
};

const EXPENSES = {
  range: RANGE,
  currency: 'BDT',
  total: '144500.00',
  count: 27,
  byStatus: [{ status: 'paid', total: '144500.00', count: 27 }],
  byCategory: [{ category: 'Utilities', total: '144500.00', count: 27 }],
};

const BUDGET = {
  range: RANGE,
  currency: 'BDT',
  total: '250000.00',
  count: 4,
  byStatus: [{ status: 'active', total: '250000.00', count: 4 }],
  lines: [
    { category: 'Utilities', planned: '250000.00', spent: '144500.00', remaining: '105500.00' },
  ],
};

const SALARY = {
  range: RANGE,
  currency: 'BDT',
  total: '315000.00',
  count: 9,
  byStatus: [{ status: 'paid', total: '315000.00', count: 9 }],
  byPeriod: [{ payPeriod: '2026-08', total: '105000.00', count: 3 }],
};

type ServiceMock = Record<'summary' | 'donations' | 'expenses' | 'budget' | 'salary', jest.Mock>;

describe('FinancialReportsController', () => {
  let controller: FinancialReportsController;
  let reports: ServiceMock;

  beforeEach(async () => {
    reports = {
      summary: jest.fn().mockResolvedValue(SUMMARY),
      donations: jest.fn().mockResolvedValue(DONATIONS),
      expenses: jest.fn().mockResolvedValue(EXPENSES),
      budget: jest.fn().mockResolvedValue(BUDGET),
      salary: jest.fn().mockResolvedValue(SALARY),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FinancialReportsController],
      providers: [{ provide: FinancialReportsService, useValue: reports }],
    }).compile();

    controller = module.get(FinancialReportsController);
  });

  describe('GET summary', () => {
    it('wraps the summary in the standard envelope', async () => {
      const response = await controller.summary(ACTOR, RANGE);

      expect(response).toEqual({
        success: true,
        message: 'Financial summary retrieved successfully',
        data: SUMMARY,
      });
    });

    it('passes the caller and the window to the service', async () => {
      await controller.summary(ACTOR, RANGE);

      expect(reports.summary).toHaveBeenCalledWith(ACTOR, RANGE);
    });
  });

  describe('GET donations', () => {
    it('wraps the donation report in the standard envelope', async () => {
      const response = await controller.donations(ACTOR, RANGE);

      expect(response).toEqual({
        success: true,
        message: 'Donation report retrieved successfully',
        data: DONATIONS,
      });
    });
  });

  describe('GET expenses', () => {
    it('wraps the expense report in the standard envelope', async () => {
      const response = await controller.expenses(ACTOR, RANGE);

      expect(response).toEqual({
        success: true,
        message: 'Expense report retrieved successfully',
        data: EXPENSES,
      });
    });
  });

  describe('GET budget', () => {
    it('wraps the budget report in the standard envelope', async () => {
      const response = await controller.budget(ACTOR, RANGE);

      expect(response).toEqual({
        success: true,
        message: 'Budget report retrieved successfully',
        data: BUDGET,
      });
    });
  });

  describe('GET salary', () => {
    it('wraps the salary report in the standard envelope', async () => {
      const response = await controller.salary(ACTOR, RANGE);

      expect(response).toEqual({
        success: true,
        message: 'Salary report retrieved successfully',
        data: SALARY,
      });
    });
  });

  describe('every route', () => {
    const call = (
      method: 'summary' | 'donations' | 'expenses' | 'budget' | 'salary',
      query: FinancialReportQueryDto = RANGE,
    ) => controller[method](ACTOR, query);

    const routes = ['summary', 'donations', 'expenses', 'budget', 'salary'] as const;

    it.each(routes)('answers %s with exactly success, message and data', async (method) => {
      const response = await call(method);

      expect(Object.keys(response)).toEqual(['success', 'message', 'data']);
      expect(response.success).toBe(true);
    });

    it.each(routes)('hands %s the query through untouched', async (method) => {
      await call(method, RANGE);

      expect(reports[method]).toHaveBeenCalledWith(ACTOR, RANGE);
    });

    it.each(routes)(
      'forwards an empty query for %s rather than inventing a window',
      async (method) => {
        await call(method, {});

        expect(reports[method]).toHaveBeenCalledWith(ACTOR, {});
      },
    );

    // The mosque is not a route parameter and not a query parameter. It reaches the service inside the
    // authenticated user and nowhere else, so there is nothing here for a caller to substitute.
    it.each(routes)('takes no mosque from the request on %s', async (method) => {
      await call(method);

      const [user, query] = reports[method].mock.calls[0] as [
        AuthenticatedUser,
        Record<string, unknown>,
      ];

      expect(user.mosqueId).toBe(ACTOR.mosqueId);
      expect(query.mosqueId).toBeUndefined();
    });

    // A report describes the mosque; it should not hand its id back out. Nothing in the envelope needs it.
    it.each(routes)('never echoes the mosque id in %s', async (method) => {
      const response = await call(method);

      expect(JSON.stringify(response)).not.toContain(ACTOR.mosqueId);
    });

    it.each(routes)('does not swallow a failure from %s', async (method) => {
      reports[method].mockRejectedValue(new Error('database unavailable'));

      await expect(call(method)).rejects.toThrow('database unavailable');
    });
  });

  // There is no report table, so there is nothing to create, amend or delete. A write handler appearing here
  // later would mean the module had grown a store behind the reports, which is the thing the brief ruled out.
  it('exposes read handlers only', () => {
    const handlers = FinancialReportsController.prototype as unknown as Record<string, unknown>;

    for (const absent of ['create', 'update', 'remove', 'delete', 'export', 'generate']) {
      expect(handlers[absent]).toBeUndefined();
    }
  });

  describe('what each route requires', () => {
    const reflector = new Reflector();
    const handlers = FinancialReportsController.prototype as unknown as Record<string, () => void>;
    const routes = ['summary', 'donations', 'expenses', 'budget', 'salary'];

    /** Permissions the caller must hold *all* of. */
    const requiresAll = (method: string): string[] | undefined =>
      reflector.get<string[]>(PERMISSIONS_KEY, handlers[method]);

    /** Permissions the caller must hold *at least one* of. */
    const requiresAny = (method: string): string[] | undefined =>
      reflector.get<string[]>(ANY_PERMISSION_KEY, handlers[method]);

    it.each(routes)('needs finance.view to read %s', (method) => {
      expect(requiresAll(method)).toEqual(['finance.view']);
      expect(requiresAny(method)).toBeUndefined();
    });

    // `report.view` reaches the secretary, who is walled off from finance on purpose, and the imam, who holds
    // `salary.viewOwn` so they can see their own pay rather than the payroll. One of these routes is the payroll.
    it.each(routes)('does not let report.view open %s', (method) => {
      expect(requiresAll(method)).not.toContain('report.view');
      expect(requiresAll(method)).not.toContain('report.export');
    });

    // A read permission for one table is not a key to a report that spans four of them.
    it.each(routes)('does not let a single-table permission open %s', (method) => {
      const required = requiresAll(method) ?? [];

      for (const narrower of [
        'donation.view',
        'expense.view',
        'budget.view',
        'salary.view',
        'salary.viewOwn',
      ]) {
        expect(required).not.toContain(narrower);
      }
    });

    it('leaves no route unguarded', () => {
      for (const method of routes) {
        const required = (requiresAll(method) ?? []).length + (requiresAny(method) ?? []).length;

        expect(required).toBeGreaterThan(0);
      }
    });

    it('has no sixth route to guard', () => {
      const declared = Object.getOwnPropertyNames(FinancialReportsController.prototype).filter(
        (name) => name !== 'constructor',
      );

      expect(declared.sort()).toEqual([...routes].sort());
    });
  });
});
