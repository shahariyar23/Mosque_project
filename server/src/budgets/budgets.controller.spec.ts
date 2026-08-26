import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { BudgetStatus } from '@prisma/client';

import { ANY_PERMISSION_KEY, PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { BudgetsController } from './budgets.controller';
import { BudgetsService } from './budgets.service';
import type { BudgetResponseDto, DeletedBudgetDto } from './dto/budget-response.dto';
import type { CreateBudgetDto } from './dto/create-budget.dto';

/**
 * The budgets controller.
 *
 * It shapes envelopes and nothing else — no filtering, no ownership decision, no mosque of its own — so the
 * service is mocked and this file checks the authenticated user reaching it, the envelope's shape, and the
 * permissions written on each route.
 *
 * The last block reads that metadata off the handlers rather than trusting the source to look right. Budgets
 * have no own-records reading: a budget has no owner, since `createdBy` records who set the figure rather than
 * whose money it is. So every route uses `@Permissions` and `@AnyPermission` appears nowhere — asserted here,
 * because an `@AnyPermission('budget.view', 'budget.manage')` that crept onto a write route would let a
 * read-only bookkeeper rewrite the plan.
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

const BUDGET_ID = '7a9c6cfe-6fe5-11d2-883f-0016d3cca432';

const SAMPLE: BudgetResponseDto = {
  id: BUDGET_ID,
  name: 'Q3 Utilities',
  category: 'Utilities',
  amount: '50000.00',
  currency: 'BDT',
  periodStart: '2026-07-01',
  periodEnd: '2026-09-30',
  status: BudgetStatus.draft,
  notes: null,
  createdBy: { id: ACTOR.id, fullName: 'Ahmed Hasan' },
  createdAt: '2026-06-25T09:00:00.000Z',
  updatedAt: '2026-06-25T09:00:00.000Z',
};

const DELETED: DeletedBudgetDto = {
  id: BUDGET_ID,
  name: 'Q3 Utilities',
  category: 'Utilities',
  amount: '50000.00',
  currency: 'BDT',
};

const NEW_BUDGET: CreateBudgetDto = {
  name: 'Q3 Utilities',
  category: 'Utilities',
  amount: '50000.00',
  periodStart: '2026-07-01',
  periodEnd: '2026-09-30',
};

type ServiceMock = Record<'create' | 'findMany' | 'findOne' | 'update' | 'remove', jest.Mock>;

describe('BudgetsController', () => {
  let controller: BudgetsController;
  let budgets: ServiceMock;

  beforeEach(async () => {
    budgets = {
      create: jest.fn().mockResolvedValue(SAMPLE),
      findMany: jest.fn().mockResolvedValue({
        rows: [SAMPLE],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }),
      findOne: jest.fn().mockResolvedValue(SAMPLE),
      update: jest.fn().mockResolvedValue(SAMPLE),
      remove: jest.fn().mockResolvedValue(DELETED),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BudgetsController],
      providers: [{ provide: BudgetsService, useValue: budgets }],
    }).compile();

    controller = module.get(BudgetsController);
  });

  describe('POST /budgets', () => {
    it('hands the authenticated user and the body to the service', async () => {
      await controller.create(ACTOR, NEW_BUDGET);

      expect(budgets.create).toHaveBeenCalledWith(ACTOR, NEW_BUDGET);
    });

    it('answers the new budget in the standard envelope', async () => {
      const response = await controller.create(ACTOR, NEW_BUDGET);

      expect(response).toEqual({
        success: true,
        message: 'Budget created successfully',
        data: SAMPLE,
      });
    });
  });

  describe('GET /budgets', () => {
    it('passes the query through untouched', async () => {
      const query = { page: 2, limit: 50, status: BudgetStatus.active, from: '2026-08-01' };

      await controller.findAll(ACTOR, query);

      expect(budgets.findMany).toHaveBeenCalledWith(ACTOR, query);
    });

    it('puts the rows in `data` and the figures in `meta`', async () => {
      const response = await controller.findAll(ACTOR, {});

      expect(response).toEqual({
        success: true,
        message: 'Budgets retrieved successfully',
        data: [SAMPLE],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
    });

    // No spent and no remaining: those are report figures, and `/financial-reports/budget` is where they live.
    it('adds nothing of its own to the list envelope', async () => {
      const response = await controller.findAll(ACTOR, {});

      expect(Object.keys(response)).toEqual(['success', 'message', 'data', 'meta']);
    });
  });

  describe('GET /budgets/:id', () => {
    it('asks the service for the id on behalf of the caller', async () => {
      await controller.findOne(ACTOR, BUDGET_ID);

      expect(budgets.findOne).toHaveBeenCalledWith(ACTOR, BUDGET_ID);
    });

    it('answers the budget in the standard envelope', async () => {
      const response = await controller.findOne(ACTOR, BUDGET_ID);

      expect(response).toEqual({
        success: true,
        message: 'Budget retrieved successfully',
        data: SAMPLE,
      });
      expect(Object.keys(response)).toEqual(['success', 'message', 'data']);
    });
  });

  describe('PATCH /budgets/:id', () => {
    it('hands the id and the patch to the service', async () => {
      await controller.update(ACTOR, BUDGET_ID, { notes: 'Revised' });

      expect(budgets.update).toHaveBeenCalledWith(ACTOR, BUDGET_ID, { notes: 'Revised' });
    });

    it('answers the updated budget in the standard envelope', async () => {
      const response = await controller.update(ACTOR, BUDGET_ID, { status: BudgetStatus.active });

      expect(response).toEqual({
        success: true,
        message: 'Budget updated successfully',
        data: SAMPLE,
      });
    });
  });

  describe('DELETE /budgets/:id', () => {
    it('asks the service to remove the id on behalf of the caller', async () => {
      await controller.remove(ACTOR, BUDGET_ID);

      expect(budgets.remove).toHaveBeenCalledWith(ACTOR, BUDGET_ID);
    });

    // The row is gone, so the response is the last record of what it said. An empty 204 would lose that.
    it('answers what was deleted, including the amount, rather than an empty body', async () => {
      const response = await controller.remove(ACTOR, BUDGET_ID);

      expect(response).toEqual({
        success: true,
        message: 'Budget deleted successfully',
        data: DELETED,
      });
      expect(response.data.amount).toBe('50000.00');
    });
  });

  it('never echoes the mosque id', async () => {
    const response = await controller.findOne(ACTOR, BUDGET_ID);

    expect(JSON.stringify(response)).not.toContain(ACTOR.mosqueId);
  });

  /**
   * What the guards will enforce, read off the handlers.
   */
  describe('what each route requires', () => {
    const reflector = new Reflector();
    const handlers = BudgetsController.prototype as unknown as Record<string, () => void>;

    /** Permissions the caller must hold *all* of. */
    const requiresAll = (method: string): string[] | undefined =>
      reflector.get<string[]>(PERMISSIONS_KEY, handlers[method]);

    /** Permissions the caller must hold *at least one* of. */
    const requiresAny = (method: string): string[] | undefined =>
      reflector.get<string[]>(ANY_PERMISSION_KEY, handlers[method]);

    it('needs budget.view to read the list and to read one', () => {
      expect(requiresAll('findAll')).toEqual(['budget.view']);
      expect(requiresAll('findOne')).toEqual(['budget.view']);
    });

    it.each(['create', 'update', 'remove'])('needs budget.manage to %s', (method) => {
      expect(requiresAll(method)).toEqual(['budget.manage']);
    });

    // Being allowed to read the plan is not being allowed to change it.
    it('does not let budget.view stand in for budget.manage', () => {
      for (const method of ['create', 'update', 'remove']) {
        expect(requiresAll(method)).not.toContain('budget.view');
      }
    });

    // There is no view/viewOwn split here, so nothing should be using the OR key. One that appeared on a write
    // route would let `budget.view` alone satisfy it.
    it('uses no any-of permission on any route', () => {
      for (const method of ['create', 'findAll', 'findOne', 'update', 'remove']) {
        expect(requiresAny(method)).toBeUndefined();
      }
    });

    it('leaves no route unguarded', () => {
      for (const method of ['create', 'findAll', 'findOne', 'update', 'remove']) {
        expect(requiresAll(method)?.length ?? 0).toBeGreaterThan(0);
      }
    });
  });
});
