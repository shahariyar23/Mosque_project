import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ExpenseStatus, PaymentMethod, Prisma } from '@prisma/client';

import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { FundBalanceService } from '../fund-balance/fund-balance.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateExpenseDto } from './dto/create-expense.dto';
import type { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpensesService } from './expenses.service';

/**
 * Expenses.
 *
 * Four things carry the weight in this file.
 *
 * The mosque comes from the token and from nowhere else, which the last block asserts directly. So does
 * `createdById`: who booked a payment is a fact about the request, and a body that asserts one is ignored.
 *
 * Money never becomes a float: it goes in as a `Prisma.Decimal` and comes out as an exact string, and one
 * case uses a value binary floating point cannot hold to prove it.
 *
 * `expenseDate` is a calendar day, not an instant. It goes in as midnight UTC and comes back as
 * `YYYY-MM-DD`, so a bill booked to the 21st cannot drift to the 20th on a server west of Greenwich.
 *
 * And a delete is only allowed while the expense is still `pending`. Past that it is a financial record
 * rather than a draft, and the answer is a 409 naming `status: cancelled` instead — which is the whole of
 * *"prefer status changes over permanently deleting financial records"*, expressed as a test.
 */

const MOSQUE_ID = 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0';
const OTHER_MOSQUE_ID = 'd0b80121-7ac0-11d1-898c-00c04fd8d5c1';
const EXPENSE_ID = '5f8c6cfe-6fe5-11d2-883f-0016d3cca431';

/**
 * A treasurer of `MOSQUE_ID`. Nothing in the service reads the role; it resolves permissions through
 * `effectivePermissions` like everything else, and expenses have no scope to resolve besides the mosque.
 */
const ACTOR: AuthenticatedUser = {
  id: '9c8b7a65-4321-4f6a-8c11-2d5e7a9b0c31',
  mosqueId: MOSQUE_ID,
  email: 'treasurer@noor.example',
  role: 'treasurer',
  permissions: [],
  deniedPermissions: [],
  isActive: true,
};

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: EXPENSE_ID,
    category: 'Utilities',
    description: 'Electricity bill for August 2026',
    amount: new Prisma.Decimal('4500.00'),
    currency: 'BDT',
    paymentMethod: PaymentMethod.bank_transfer,
    status: ExpenseStatus.pending,
    expenseDate: new Date('2026-08-21T00:00:00.000Z'),
    reference: 'INV-88213',
    notes: null,
    createdAt: new Date('2026-08-22T09:00:00.000Z'),
    updatedAt: new Date('2026-08-22T09:00:00.000Z'),
    createdBy: { id: ACTOR.id, fullName: 'Ahmed Hasan' },
    ...overrides,
  };
}

/** The minimum a create needs: what kind of spending, what for, how much, how, and when. */
function newExpense(overrides: Partial<CreateExpenseDto> = {}): CreateExpenseDto {
  return {
    category: 'Utilities',
    description: 'Electricity bill for August 2026',
    amount: '4500.00',
    paymentMethod: PaymentMethod.bank_transfer,
    expenseDate: '2026-08-21',
    ...overrides,
  };
}

describe('ExpensesService', () => {
  let service: ExpensesService;
  let prisma: PrismaService;
  let fundBalanceService: { assertSufficientFundsTx: jest.Mock };

  beforeEach(async () => {
    fundBalanceService = {
      assertSufficientFundsTx: jest.fn().mockResolvedValue({ availableBalance: new Prisma.Decimal('1000.00') }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpensesService,
        { provide: FundBalanceService, useValue: fundBalanceService },
        {
          provide: PrismaService,
          useValue: {
            expense: {
              count: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            transaction: {
              findFirst: jest.fn().mockResolvedValue(null),
              create: jest.fn().mockResolvedValue({ id: 'tx-exp-1' }),
              update: jest.fn().mockResolvedValue({ id: 'tx-exp-1' }),
            },
            mosqueSettings: { findUnique: jest.fn().mockResolvedValue({ currency: 'BDT' }) },
            $transaction: jest.fn((arg: any) => {
              if (typeof arg === 'function') {
                return arg(prisma);
              }
              return Promise.all(arg);
            }),
          },
        },
      ],
    }).compile();

    service = module.get(ExpensesService);
    prisma = module.get(PrismaService);
  });

  const expenses = () => prisma.expense as unknown as Record<string, jest.Mock>;
  const settings = () => prisma.mosqueSettings as unknown as Record<string, jest.Mock>;

  /** The `data` a write was given, typed so an assertion is not reading `any` off a jest mock. */
  const writtenData = (call: jest.Mock): Record<string, unknown> =>
    (call.mock.calls[0][0] as { data: Record<string, unknown> }).data;

  /** The `where` a query was given. */
  const queriedWhere = (call: jest.Mock): Record<string, unknown> =>
    (call.mock.calls[0][0] as { where: Record<string, unknown> }).where;

  describe('create', () => {
    it('books the expense to the caller’s own mosque', async () => {
      expenses().create.mockResolvedValue(row());

      await service.create(ACTOR, newExpense());

      expect(writtenData(expenses().create).mosqueId).toBe(MOSQUE_ID);
    });

    // The column that answers "who booked this?", taken from the token rather than the body.
    it('attributes the expense to the authenticated caller', async () => {
      expenses().create.mockResolvedValue(row());

      const created = await service.create(ACTOR, newExpense());

      expect(writtenData(expenses().create).createdById).toBe(ACTOR.id);
      expect(created.createdBy).toEqual({ id: ACTOR.id, fullName: 'Ahmed Hasan' });
    });

    it('stores the amount as a Decimal, not a number', async () => {
      expenses().create.mockResolvedValue(row());

      await service.create(ACTOR, newExpense());

      const stored = writtenData(expenses().create).amount;
      expect(stored).toBeInstanceOf(Prisma.Decimal);
      expect(typeof stored).not.toBe('number');
    });

    // The point of Decimal, stated as a value: 1234567.89 has no exact binary representation.
    it('keeps an amount a float would round, in and out', async () => {
      expenses().create.mockResolvedValue(row({ amount: new Prisma.Decimal('1234567.89') }));

      const created = await service.create(ACTOR, newExpense({ amount: '1234567.89' }));

      expect((writtenData(expenses().create).amount as Prisma.Decimal).toFixed(2)).toBe(
        '1234567.89',
      );
      expect(created.amount).toBe('1234567.89');
      expect(typeof created.amount).toBe('string');
    });

    // A day, not an instant: midnight UTC in, the same calendar date out, on any server.
    it('stores the expense date as a day and returns it as one', async () => {
      expenses().create.mockResolvedValue(row());

      const created = await service.create(ACTOR, newExpense({ expenseDate: '2026-08-21' }));

      expect((writtenData(expenses().create).expenseDate as Date).toISOString()).toBe(
        '2026-08-21T00:00:00.000Z',
      );
      expect(created.expenseDate).toBe('2026-08-21');
    });

    it('trims the category and the description', async () => {
      expenses().create.mockResolvedValue(row());

      await service.create(
        ACTOR,
        newExpense({ category: '  Utilities  ', description: '  August bill  ' }),
      );

      const data = writtenData(expenses().create);
      expect(data.category).toBe('Utilities');
      expect(data.description).toBe('August bill');
    });

    it('defaults the currency to the mosque’s configured one and writes it onto the row', async () => {
      settings().findUnique.mockResolvedValue({ currency: 'usd' });
      expenses().create.mockResolvedValue(row({ currency: 'USD' }));

      await service.create(ACTOR, newExpense());

      expect(queriedWhere(settings().findUnique)).toEqual({ mosqueId: MOSQUE_ID });
      expect(writtenData(expenses().create).currency).toBe('USD');
    });

    it('keeps a currency the caller sent rather than the mosque default', async () => {
      expenses().create.mockResolvedValue(row({ currency: 'GBP' }));

      await service.create(ACTOR, newExpense({ currency: 'GBP' }));

      expect(writtenData(expenses().create).currency).toBe('GBP');
      // Nothing to look up when the caller has already said.
      expect(settings().findUnique).not.toHaveBeenCalled();
    });

    // The column is a VarChar with no format constraint, so a mosque could be holding "Taka" in it — and a
    // payment is not the place to discover that.
    it('falls back to BDT when the configured currency is not a currency code', async () => {
      settings().findUnique.mockResolvedValue({ currency: 'Taka' });
      expenses().create.mockResolvedValue(row());

      await service.create(ACTOR, newExpense());

      expect(writtenData(expenses().create).currency).toBe('BDT');
    });

    it('falls back to BDT when the mosque has no settings row', async () => {
      settings().findUnique.mockResolvedValue(null);
      expenses().create.mockResolvedValue(row());

      await service.create(ACTOR, newExpense());

      expect(writtenData(expenses().create).currency).toBe('BDT');
    });

    // Left out of the `data` entirely, so the column default decides rather than the service guessing.
    it('leaves the status to the database when it was not sent', async () => {
      expenses().create.mockResolvedValue(row());

      await service.create(ACTOR, newExpense());

      expect(writtenData(expenses().create)).not.toHaveProperty('status');
    });

    it('records a paid expense when the caller says the money is already out', async () => {
      expenses().create.mockResolvedValue(row({ status: ExpenseStatus.paid }));

      const created = await service.create(ACTOR, newExpense({ status: ExpenseStatus.paid }));

      expect(writtenData(expenses().create).status).toBe(ExpenseStatus.paid);
      expect(created.status).toBe(ExpenseStatus.paid);
    });

    it('validates sufficient funds atomically when a fundId is provided for a paid expense', async () => {
      expenses().create.mockResolvedValue(row({ status: ExpenseStatus.paid }));

      await service.create(
        ACTOR,
        newExpense({ status: ExpenseStatus.paid, fundId: '1b4e28ba-2fa1-11d2-883f-0016d3cca427', amount: '700.00' }),
      );

      expect(fundBalanceService.assertSufficientFundsTx).toHaveBeenCalledWith(
        expect.anything(),
        MOSQUE_ID,
        '1b4e28ba-2fa1-11d2-883f-0016d3cca427',
        new Prisma.Decimal('700.00'),
      );
    });

    it('rejects paid expense when fund has insufficient funds (Fund = ৳300, Expense = ৳500)', async () => {
      fundBalanceService.assertSufficientFundsTx.mockRejectedValueOnce(
        new BadRequestException({
          code: 'INSUFFICIENT_FUNDS',
          message: 'Insufficient funds in Maintenance Fund. Available ৳300, required ৳500.',
        }),
      );

      await expect(
        service.create(
          ACTOR,
          newExpense({ status: ExpenseStatus.paid, fundId: '1b4e28ba-2fa1-11d2-883f-0016d3cca427', amount: '500.00' }),
        ),
      ).rejects.toThrow(
        new BadRequestException({
          code: 'INSUFFICIENT_FUNDS',
          message: 'Insufficient funds in Maintenance Fund. Available ৳300, required ৳500.',
        }),
      );
    });

    it('does not write any field the DTO did not name', async () => {
      expenses().create.mockResolvedValue(row());

      await service.create(ACTOR, newExpense());

      expect(Object.keys(writtenData(expenses().create)).sort()).toEqual([
        'amount',
        'category',
        'createdById',
        'currency',
        'description',
        'expenseDate',
        'mosqueId',
        'notes',
        'paymentMethod',
        'reference',
      ]);
    });

    // Nothing is drawn down. The figures a report needs are derived from these rows later.
    it('touches no budget, balance or approval', async () => {
      expenses().create.mockResolvedValue(row({ status: ExpenseStatus.paid }));

      await service.create(ACTOR, newExpense({ status: ExpenseStatus.paid }));

      // The only other table this path reads is the settings row, for the currency.
      expect(Object.keys(settings())).toEqual(['findUnique']);
      expect(expenses().update).not.toHaveBeenCalled();
    });
  });

  describe('findMany', () => {
    beforeEach(() => {
      expenses().count.mockResolvedValue(0);
      expenses().findMany.mockResolvedValue([]);
    });

    it('scopes every list to the caller’s mosque', async () => {
      await service.findMany(ACTOR, {});

      expect(queriedWhere(expenses().findMany)).toEqual({ mosqueId: MOSQUE_ID });
      expect(queriedWhere(expenses().count).mosqueId).toBe(MOSQUE_ID);
    });

    // No view/viewOwn split here: `createdBy` says who typed the row, not whose money it was, so there is
    // nothing for a caller to own. `expense.view` either opens the list or it does not, and the route
    // decorator settles that.
    it('does not narrow the list by who entered the rows', async () => {
      await service.findMany(ACTOR, {});

      expect(queriedWhere(expenses().findMany)).not.toHaveProperty('createdById');
    });

    it('defaults to page 1 of 20', async () => {
      await service.findMany(ACTOR, {});

      expect(expenses().findMany.mock.calls[0][0]).toMatchObject({ skip: 0, take: 20 });
    });

    it('caps the page size at 100 even when the service is called directly', async () => {
      await service.findMany(ACTOR, { limit: 5000 });

      expect((expenses().findMany.mock.calls[0][0] as { take: number }).take).toBe(100);
    });

    it('orders newest first, with the id breaking ties', async () => {
      await service.findMany(ACTOR, {});

      expect((expenses().findMany.mock.calls[0][0] as { orderBy: unknown }).orderBy).toEqual([
        { createdAt: 'desc' },
        { id: 'asc' },
      ]);
    });

    it('filters on status and on an exact category', async () => {
      await service.findMany(ACTOR, { status: ExpenseStatus.paid, category: '  Utilities  ' });

      expect(queriedWhere(expenses().findMany)).toEqual({
        mosqueId: MOSQUE_ID,
        status: ExpenseStatus.paid,
        category: 'Utilities',
      });
    });

    // The window is on `expenseDate` — the day the money was spent — not on `createdAt`, because a stack of
    // August receipts entered in September belongs to August.
    it('filters a date window inclusively on the day the money was spent', async () => {
      await service.findMany(ACTOR, { from: '2026-08-01', to: '2026-08-31' });

      const { expenseDate } = queriedWhere(expenses().findMany) as {
        expenseDate: { gte: Date; lte: Date };
      };
      expect(expenseDate.gte.toISOString()).toBe('2026-08-01T00:00:00.000Z');
      expect(expenseDate.lte.toISOString()).toBe('2026-08-31T00:00:00.000Z');
    });

    it('accepts an open-ended window from either side', async () => {
      await service.findMany(ACTOR, { from: '2026-08-01' });
      const fromOnly = queriedWhere(expenses().findMany) as { expenseDate: Record<string, Date> };
      expect(Object.keys(fromOnly.expenseDate)).toEqual(['gte']);

      expenses().findMany.mockClear();
      await service.findMany(ACTOR, { to: '2026-08-31' });
      const toOnly = queriedWhere(expenses().findMany) as { expenseDate: Record<string, Date> };
      expect(Object.keys(toOnly.expenseDate)).toEqual(['lte']);
    });

    it('leaves the date filter out entirely when neither end was given', async () => {
      await service.findMany(ACTOR, {});

      expect(queriedWhere(expenses().findMany)).not.toHaveProperty('expenseDate');
    });

    // An empty page would hide the mistake.
    it('refuses an inverted window with a 400 rather than returning nothing', async () => {
      await expect(
        service.findMany(ACTOR, { from: '2026-08-31', to: '2026-08-01' }),
      ).rejects.toMatchObject({ response: { code: 'INVALID_DATE_RANGE' } });
      expect(expenses().findMany).not.toHaveBeenCalled();
    });

    it('allows a window of a single day', async () => {
      await expect(
        service.findMany(ACTOR, { from: '2026-08-21', to: '2026-08-21' }),
      ).resolves.toBeDefined();
    });

    it('searches category, description and reference case-insensitively', async () => {
      await service.findMany(ACTOR, { search: 'electric' });

      expect(queriedWhere(expenses().findMany).OR).toEqual([
        { category: { contains: 'electric', mode: 'insensitive' } },
        { description: { contains: 'electric', mode: 'insensitive' } },
        { reference: { contains: 'electric', mode: 'insensitive' } },
      ]);
    });

    it('does not search the notes', async () => {
      await service.findMany(ACTOR, { search: 'electric' });

      const clauses = queriedWhere(expenses().findMany).OR as Record<string, unknown>[];
      expect(clauses.some((clause) => 'notes' in clause)).toBe(false);
    });

    it('reports paging figures that match the filter, not the page', async () => {
      expenses().count.mockResolvedValue(7);
      expenses().findMany.mockResolvedValue([row()]);

      const { meta } = await service.findMany(ACTOR, { page: 2, limit: 3 });

      expect(meta).toEqual({ page: 2, limit: 3, total: 7, totalPages: 3 });
    });

    it('counts and reads in one transaction', async () => {
      await service.findMany(ACTOR, {});

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('returns exact amounts and no total across the page', async () => {
      expenses().count.mockResolvedValue(2);
      expenses().findMany.mockResolvedValue([
        row({ amount: new Prisma.Decimal('4500.00') }),
        row({ amount: new Prisma.Decimal('0.05') }),
      ]);

      const { rows } = await service.findMany(ACTOR, {});

      expect(rows.map((r) => r.amount)).toEqual(['4500.00', '0.05']);
      const body = JSON.stringify(rows);
      for (const derived of ['spent', 'balance', 'remaining', 'budget', 'sum']) {
        expect(body).not.toContain(derived);
      }
    });

    it('never returns the mosque id', async () => {
      expenses().count.mockResolvedValue(1);
      expenses().findMany.mockResolvedValue([row()]);

      const { rows } = await service.findMany(ACTOR, {});

      expect(rows[0]).not.toHaveProperty('mosqueId');
    });

    // Reading the books should not hand out the staff's contact details.
    it('names who booked each row without handing over their account', async () => {
      expenses().count.mockResolvedValue(1);
      expenses().findMany.mockResolvedValue([row()]);

      const { rows } = await service.findMany(ACTOR, {});

      expect(rows[0].createdBy).toEqual({ id: ACTOR.id, fullName: 'Ahmed Hasan' });
      const body = JSON.stringify(rows[0]);
      for (const secret of ['passwordHash', 'email', 'phone', 'role', 'refreshToken']) {
        expect(body).not.toContain(secret);
      }
    });
  });

  describe('findOne', () => {
    it('asks for the id inside the caller’s mosque, not the id alone', async () => {
      expenses().findFirst.mockResolvedValue(row());

      await service.findOne(ACTOR, EXPENSE_ID);

      expect(queriedWhere(expenses().findFirst)).toEqual({ id: EXPENSE_ID, mosqueId: MOSQUE_ID });
    });

    it('answers 404 for another mosque’s expense, never 403', async () => {
      // What the mosque-scoped lookup returns for a row that exists but belongs to somebody else. A 403
      // would confirm the record exists.
      expenses().findFirst.mockResolvedValue(null);

      await expect(service.findOne(ACTOR, EXPENSE_ID)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(ACTOR, EXPENSE_ID)).rejects.toMatchObject({
        response: { code: 'EXPENSE_NOT_FOUND' },
      });
    });

    it('serialises the amount, the day and the timestamps in their own formats', async () => {
      expenses().findFirst.mockResolvedValue(row());

      const expense = await service.findOne(ACTOR, EXPENSE_ID);

      expect(expense.amount).toBe('4500.00');
      expect(expense.expenseDate).toBe('2026-08-21');
      expect(expense.createdAt).toBe('2026-08-22T09:00:00.000Z');
    });
  });

  describe('update', () => {
    it('refuses before writing when the expense is another mosque’s', async () => {
      expenses().findFirst.mockResolvedValue(null);

      await expect(service.update(ACTOR, EXPENSE_ID, { notes: 'Corrected' })).rejects.toThrow(
        NotFoundException,
      );
      expect(expenses().update).not.toHaveBeenCalled();
    });

    it('touches only the fields that were sent', async () => {
      expenses().findFirst.mockResolvedValue(row());
      expenses().update.mockResolvedValue(row({ notes: 'Corrected' }));

      await service.update(ACTOR, EXPENSE_ID, { notes: 'Corrected' });

      expect(writtenData(expenses().update)).toEqual({ notes: 'Corrected' });
    });

    // The alternative a refused delete points at, and the one that works at any status.
    it('withdraws a paid expense by cancelling it rather than removing it', async () => {
      expenses().findFirst.mockResolvedValue(row({ status: ExpenseStatus.paid }));
      expenses().update.mockResolvedValue(row({ status: ExpenseStatus.cancelled }));

      const updated = await service.update(ACTOR, EXPENSE_ID, {
        status: ExpenseStatus.cancelled,
      });

      expect(writtenData(expenses().update)).toEqual({ status: ExpenseStatus.cancelled });
      expect(updated.status).toBe(ExpenseStatus.cancelled);
      expect(expenses().delete).not.toHaveBeenCalled();
    });

    it('writes a corrected amount as a Decimal', async () => {
      expenses().findFirst.mockResolvedValue(row());
      expenses().update.mockResolvedValue(row({ amount: new Prisma.Decimal('4750.50') }));

      const updated = await service.update(ACTOR, EXPENSE_ID, { amount: '4750.50' });

      expect(writtenData(expenses().update).amount).toBeInstanceOf(Prisma.Decimal);
      expect(updated.amount).toBe('4750.50');
    });

    it('re-books an expense to a different day', async () => {
      expenses().findFirst.mockResolvedValue(row());
      expenses().update.mockResolvedValue(row({ expenseDate: new Date('2026-07-31T00:00:00Z') }));

      const updated = await service.update(ACTOR, EXPENSE_ID, { expenseDate: '2026-07-31' });

      expect((writtenData(expenses().update).expenseDate as Date).toISOString()).toBe(
        '2026-07-31T00:00:00.000Z',
      );
      expect(updated.expenseDate).toBe('2026-07-31');
    });

    it('clears the reference on an explicit null', async () => {
      expenses().findFirst.mockResolvedValue(row());
      expenses().update.mockResolvedValue(row({ reference: null }));

      await service.update(ACTOR, EXPENSE_ID, { reference: null });

      expect(writtenData(expenses().update)).toEqual({ reference: null });
    });

    // An audit trail anyone with edit rights can rewrite is not one.
    it('cannot reassign who booked the expense', async () => {
      expenses().findFirst.mockResolvedValue(row());
      expenses().update.mockResolvedValue(row());

      // Neither field is on the DTO and the global pipe rejects both over HTTP; this asserts the service
      // would not honour them even if they arrived.
      const smuggled = {
        notes: 'Corrected',
        createdById: '00000000-0000-4000-8000-000000000000',
      } as unknown as UpdateExpenseDto;

      await service.update(ACTOR, EXPENSE_ID, smuggled);

      const data = writtenData(expenses().update);
      expect(data).toEqual({ notes: 'Corrected' });
      expect(data).not.toHaveProperty('createdById');
      expect(data).not.toHaveProperty('createdBy');
    });

    it('answers 404 when the row vanished between the read and the write', async () => {
      expenses().findFirst.mockResolvedValue(row());
      expenses().update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '6.0.0',
        }),
      );

      await expect(service.update(ACTOR, EXPENSE_ID, { notes: 'Corrected' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('deletes a pending expense and reports what went', async () => {
      expenses().findFirst.mockResolvedValue(row());
      expenses().delete.mockResolvedValue(row());

      const deleted = await service.remove(ACTOR, EXPENSE_ID);

      expect(expenses().delete).toHaveBeenCalledWith({ where: { id: EXPENSE_ID } });
      expect(deleted).toEqual({
        id: EXPENSE_ID,
        category: 'Utilities',
        description: 'Electricity bill for August 2026',
        amount: '4500.00',
        currency: 'BDT',
      });
    });

    it('checks ownership before deleting, and answers 404 for another mosque’s expense', async () => {
      expenses().findFirst.mockResolvedValue(null);

      await expect(service.remove(ACTOR, EXPENSE_ID)).rejects.toThrow(NotFoundException);

      expect(queriedWhere(expenses().findFirst)).toEqual({ id: EXPENSE_ID, mosqueId: MOSQUE_ID });
      expect(expenses().delete).not.toHaveBeenCalled();
    });

    // The financial rule, as a test: once an expense has a history it is retired, not removed.
    it.each([ExpenseStatus.approved, ExpenseStatus.paid, ExpenseStatus.cancelled])(
      'refuses to delete a %s expense',
      async (status) => {
        expenses().findFirst.mockResolvedValue(row({ status }));

        await expect(service.remove(ACTOR, EXPENSE_ID)).rejects.toMatchObject({
          response: { code: 'EXPENSE_NOT_DELETABLE' },
        });
        expect(expenses().delete).not.toHaveBeenCalled();
      },
    );

    it('refuses with a 409, not a 403 or a silent success', async () => {
      expenses().findFirst.mockResolvedValue(row({ status: ExpenseStatus.paid }));

      await expect(service.remove(ACTOR, EXPENSE_ID)).rejects.toThrow(ConflictException);
    });

    it('names cancelling as the alternative when it refuses', async () => {
      expenses().findFirst.mockResolvedValue(row({ status: ExpenseStatus.paid }));

      await expect(service.remove(ACTOR, EXPENSE_ID)).rejects.toMatchObject({
        response: { message: expect.stringContaining('cancelled') },
      });
    });

    it('answers 404 when the expense was deleted a moment earlier', async () => {
      expenses().findFirst.mockResolvedValue(row());
      expenses().delete.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '6.0.0',
        }),
      );

      await expect(service.remove(ACTOR, EXPENSE_ID)).rejects.toThrow(NotFoundException);
    });

    it('reports the amount of the deleted row as an exact string', async () => {
      expenses().findFirst.mockResolvedValue(row({ amount: new Prisma.Decimal('1234567.89') }));
      expenses().delete.mockResolvedValue(row());

      const deleted = await service.remove(ACTOR, EXPENSE_ID);

      // The row is gone, so this is the last chance anyone has to see what it said.
      expect(deleted.amount).toBe('1234567.89');
      expect(typeof deleted.amount).toBe('string');
    });
  });

  /**
   * The mosque and the author both come from the token, and there is no other way to supply either.
   */
  describe('mosque id from the token only', () => {
    const intruder: AuthenticatedUser = {
      ...ACTOR,
      id: 'a1b2c3d4-5678-4f6a-8c11-2d5e7a9b0c33',
      mosqueId: OTHER_MOSQUE_ID,
    };

    it('scopes a read to whichever mosque the token names', async () => {
      expenses().findFirst.mockResolvedValue(null);

      await expect(service.findOne(intruder, EXPENSE_ID)).rejects.toThrow(NotFoundException);

      expect(queriedWhere(expenses().findFirst)).toEqual({
        id: EXPENSE_ID,
        mosqueId: OTHER_MOSQUE_ID,
      });
    });

    it('books a create to whichever mosque and author the token names', async () => {
      expenses().create.mockResolvedValue(row());

      await service.create(intruder, newExpense());

      const data = writtenData(expenses().create);
      expect(data.mosqueId).toBe(OTHER_MOSQUE_ID);
      expect(data.createdById).toBe(intruder.id);
    });

    it('ignores a mosqueId and a createdById smuggled into a create body', async () => {
      expenses().create.mockResolvedValue(row());

      // Neither field is on the DTO and the global pipe rejects both over HTTP; this asserts the service
      // would not honour them even if they arrived.
      const smuggled = {
        ...newExpense(),
        mosqueId: OTHER_MOSQUE_ID,
        createdById: '00000000-0000-4000-8000-000000000000',
      } as unknown as CreateExpenseDto;

      await service.create(ACTOR, smuggled);

      const data = writtenData(expenses().create);
      expect(data.mosqueId).toBe(MOSQUE_ID);
      expect(data.createdById).toBe(ACTOR.id);
    });

    it('ignores a mosqueId smuggled into a patch body', async () => {
      expenses().findFirst.mockResolvedValue(row());
      expenses().update.mockResolvedValue(row());

      const smuggled = {
        notes: 'Corrected',
        mosqueId: OTHER_MOSQUE_ID,
      } as unknown as UpdateExpenseDto;

      await service.update(ACTOR, EXPENSE_ID, smuggled);

      expect(writtenData(expenses().update)).toEqual({ notes: 'Corrected' });
    });

    it('scopes a delete to the token’s mosque before it removes anything', async () => {
      expenses().findFirst.mockResolvedValue(null);

      await expect(service.remove(intruder, EXPENSE_ID)).rejects.toThrow(NotFoundException);

      expect(queriedWhere(expenses().findFirst).mosqueId).toBe(OTHER_MOSQUE_ID);
      expect(expenses().delete).not.toHaveBeenCalled();
    });
  });

  // The date-range guard is the one piece of query validation the DTO cannot express, so it is checked as a
  // 400 rather than left to produce an empty page.
  it('treats an inverted window as a bad request, not an empty result', async () => {
    await expect(service.findMany(ACTOR, { from: '2026-12-01', to: '2026-01-01' })).rejects.toThrow(
      BadRequestException,
    );
  });
});
