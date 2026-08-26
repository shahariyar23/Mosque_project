import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ExpenseStatus, PaymentMethod } from '@prisma/client';

import { ANY_PERMISSION_KEY, PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import type { DeletedExpenseDto, ExpenseResponseDto } from './dto/expense-response.dto';
import type { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';

/**
 * The expenses controller.
 *
 * It shapes envelopes and nothing else — no filtering, no ownership decision, no mosque of its own — so the
 * service is mocked and this file checks the authenticated user reaching it, the envelope's shape, and the
 * permissions written on each route.
 *
 * The last block reads that metadata off the handlers rather than trusting the source to look right. Expenses
 * have no own-records reading: an expense has no owner, since `createdBy` records who typed the row rather
 * than whose money it was. So every route uses `@Permissions` and `@AnyPermission` appears nowhere — asserted
 * here, because an `@AnyPermission('expense.view', 'expense.manage')` that crept onto a write route would let
 * a read-only bookkeeper book payments.
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

const EXPENSE_ID = '5f8c6cfe-6fe5-11d2-883f-0016d3cca431';

const SAMPLE: ExpenseResponseDto = {
  id: EXPENSE_ID,
  category: 'Utilities',
  description: 'Electricity bill for August 2026',
  amount: '4500.00',
  currency: 'BDT',
  paymentMethod: PaymentMethod.bank_transfer,
  status: ExpenseStatus.pending,
  expenseDate: '2026-08-21',
  reference: 'INV-88213',
  notes: null,
  createdBy: { id: ACTOR.id, fullName: 'Ahmed Hasan' },
  createdAt: '2026-08-22T09:00:00.000Z',
  updatedAt: '2026-08-22T09:00:00.000Z',
};

const DELETED: DeletedExpenseDto = {
  id: EXPENSE_ID,
  category: 'Utilities',
  description: 'Electricity bill for August 2026',
  amount: '4500.00',
  currency: 'BDT',
};

const NEW_EXPENSE: CreateExpenseDto = {
  category: 'Utilities',
  description: 'Electricity bill for August 2026',
  amount: '4500.00',
  paymentMethod: PaymentMethod.bank_transfer,
  expenseDate: '2026-08-21',
};

type ServiceMock = Record<'create' | 'findMany' | 'findOne' | 'update' | 'remove', jest.Mock>;

describe('ExpensesController', () => {
  let controller: ExpensesController;
  let expenses: ServiceMock;

  beforeEach(async () => {
    expenses = {
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
      controllers: [ExpensesController],
      providers: [{ provide: ExpensesService, useValue: expenses }],
    }).compile();

    controller = module.get(ExpensesController);
  });

  describe('POST /expenses', () => {
    it('hands the authenticated user and the body to the service', async () => {
      await controller.create(ACTOR, NEW_EXPENSE);

      expect(expenses.create).toHaveBeenCalledWith(ACTOR, NEW_EXPENSE);
    });

    it('answers the recorded expense in the standard envelope', async () => {
      const response = await controller.create(ACTOR, NEW_EXPENSE);

      expect(response).toEqual({
        success: true,
        message: 'Expense recorded successfully',
        data: SAMPLE,
      });
    });
  });

  describe('GET /expenses', () => {
    it('passes the query through untouched', async () => {
      const query = { page: 2, limit: 50, status: ExpenseStatus.paid, from: '2026-08-01' };

      await controller.findAll(ACTOR, query);

      expect(expenses.findMany).toHaveBeenCalledWith(ACTOR, query);
    });

    it('puts the rows in `data` and the figures in `meta`', async () => {
      const response = await controller.findAll(ACTOR, {});

      expect(response).toEqual({
        success: true,
        message: 'Expenses retrieved successfully',
        data: [SAMPLE],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
    });

    // No total spent, no balance: those are report figures, and reports are a later part.
    it('adds nothing of its own to the list envelope', async () => {
      const response = await controller.findAll(ACTOR, {});

      expect(Object.keys(response)).toEqual(['success', 'message', 'data', 'meta']);
    });
  });

  describe('GET /expenses/:id', () => {
    it('asks the service for the id on behalf of the caller', async () => {
      await controller.findOne(ACTOR, EXPENSE_ID);

      expect(expenses.findOne).toHaveBeenCalledWith(ACTOR, EXPENSE_ID);
    });

    it('answers the expense in the standard envelope', async () => {
      const response = await controller.findOne(ACTOR, EXPENSE_ID);

      expect(response).toEqual({
        success: true,
        message: 'Expense retrieved successfully',
        data: SAMPLE,
      });
      expect(Object.keys(response)).toEqual(['success', 'message', 'data']);
    });
  });

  describe('PATCH /expenses/:id', () => {
    it('hands the id and the patch to the service', async () => {
      await controller.update(ACTOR, EXPENSE_ID, { notes: 'Corrected' });

      expect(expenses.update).toHaveBeenCalledWith(ACTOR, EXPENSE_ID, { notes: 'Corrected' });
    });

    it('answers the updated expense in the standard envelope', async () => {
      const response = await controller.update(ACTOR, EXPENSE_ID, {
        status: ExpenseStatus.cancelled,
      });

      expect(response).toEqual({
        success: true,
        message: 'Expense updated successfully',
        data: SAMPLE,
      });
    });
  });

  describe('DELETE /expenses/:id', () => {
    it('asks the service to remove the id on behalf of the caller', async () => {
      await controller.remove(ACTOR, EXPENSE_ID);

      expect(expenses.remove).toHaveBeenCalledWith(ACTOR, EXPENSE_ID);
    });

    // The row is gone, so the response is the last record of what it said. An empty 204 would lose that.
    it('answers what was deleted, including the amount, rather than an empty body', async () => {
      const response = await controller.remove(ACTOR, EXPENSE_ID);

      expect(response).toEqual({
        success: true,
        message: 'Expense deleted successfully',
        data: DELETED,
      });
      expect(response.data.amount).toBe('4500.00');
    });
  });

  it('never echoes the mosque id', async () => {
    const response = await controller.findOne(ACTOR, EXPENSE_ID);

    expect(JSON.stringify(response)).not.toContain(ACTOR.mosqueId);
  });

  /**
   * What the guards will enforce, read off the handlers.
   */
  describe('what each route requires', () => {
    const reflector = new Reflector();
    const handlers = ExpensesController.prototype as unknown as Record<string, () => void>;

    /** Permissions the caller must hold *all* of. */
    const requiresAll = (method: string): string[] | undefined =>
      reflector.get<string[]>(PERMISSIONS_KEY, handlers[method]);

    /** Permissions the caller must hold *at least one* of. */
    const requiresAny = (method: string): string[] | undefined =>
      reflector.get<string[]>(ANY_PERMISSION_KEY, handlers[method]);

    it('needs expense.view to read the list and to read one', () => {
      expect(requiresAll('findAll')).toEqual(['expense.view']);
      expect(requiresAll('findOne')).toEqual(['expense.view']);
    });

    it.each(['create', 'update', 'remove'])('needs expense.manage to %s', (method) => {
      expect(requiresAll(method)).toEqual(['expense.manage']);
    });

    // Being allowed to read the books is not being allowed to write in them.
    it('does not let expense.view stand in for expense.manage', () => {
      for (const method of ['create', 'update', 'remove']) {
        expect(requiresAll(method)).not.toContain('expense.view');
      }
    });

    // There is no view/viewOwn split here, so nothing should be using the OR key. One that appeared on a
    // write route would let `expense.view` alone satisfy it.
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
