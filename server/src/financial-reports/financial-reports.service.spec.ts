import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  BudgetStatus,
  DonationStatus,
  ExpenseStatus,
  PaymentMethod,
  Prisma,
  SalaryStatus,
} from '@prisma/client';

import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import type { FinancialReportQueryDto } from './dto/financial-report-query.dto';
import { FinancialReportsService } from './financial-reports.service';

/**
 * The financial reports service.
 *
 * Four things are worth testing here and they are not the obvious ones.
 *
 * **That nothing is loaded.** The brief is explicit: totals come from the database, not from fetching rows and
 * adding them up. A version of this service that called `findMany` and summed in a loop would return every number
 * in this file correctly and fall over on a mosque with three years of donations. So several tests assert on what
 * was *not* called, which is the only way that requirement can be checked from outside.
 *
 * **Which statuses count.** A total that quietly included pending donations would look plausible in every response
 * and overstate what the mosque holds. Each report's headline `where` is inspected for its status, and each
 * `byStatus` breakdown for the absence of one.
 *
 * **The window, per table.** The four tables do not store dates the same way, so one date pair becomes three
 * different predicates: a half-open upper bound for donations, whose `donatedAt` is a timestamp; inclusive bounds
 * for expenses and salaries, whose columns are dates; and an overlap test for budgets, which have two dates of
 * their own. Each is asserted separately, because getting any of them wrong loses money from a report silently and
 * only ever at the edges.
 *
 * **That the mosque comes from the token.** Every `where` this service builds is inspected for it.
 *
 * Authorization is not tested here, because it is not decided here. These reports have no own-records reading — a
 * financial report is a whole-mosque figure by definition — so there is no scope to resolve and no reason for the
 * service to re-litigate what `PermissionsGuard` already settled. What each route requires is asserted in the
 * controller spec, off the handler metadata.
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

const OTHER_MOSQUE = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

/** A window used throughout, so the expected `Date` values below stay readable. */
const WINDOW: FinancialReportQueryDto = { from: '2026-07-01', to: '2026-09-30' };

const FROM = new Date('2026-07-01T00:00:00.000Z');
const TO = new Date('2026-09-30T00:00:00.000Z');
/** Midnight after `to`, which is what an exclusive upper bound on a timestamp column needs. */
const AFTER_TO = new Date('2026-10-01T00:00:00.000Z');

/** An `aggregate`/`groupBy` result. A `null` amount is what the database returns when nothing matched. */
const agg = (amount: string | null, count: number) => ({
  _sum: { amount: amount === null ? null : new Prisma.Decimal(amount) },
  _count: { _all: count },
});

const byStatus = (status: string, amount: string, count: number) => ({
  status,
  ...agg(amount, count),
});

const byCategory = (category: string, amount: string, count: number) => ({
  category,
  ...agg(amount, count),
});

const byMethod = (paymentMethod: PaymentMethod, amount: string, count: number) => ({
  paymentMethod,
  ...agg(amount, count),
});

const byPeriod = (payPeriod: string, amount: string, count: number) => ({
  payPeriod,
  ...agg(amount, count),
});

type TableMock = Record<'aggregate' | 'groupBy' | 'findMany' | 'findFirst', jest.Mock>;

const table = (): TableMock => ({
  aggregate: jest.fn().mockResolvedValue(agg(null, 0)),
  groupBy: jest.fn().mockResolvedValue([]),
  findMany: jest.fn().mockResolvedValue([]),
  findFirst: jest.fn().mockResolvedValue(null),
});

describe('FinancialReportsService', () => {
  let service: FinancialReportsService;
  let prisma: {
    transaction: TableMock;
    donation: TableMock;
    expense: TableMock;
    budget: TableMock;
    salaryRecord: TableMock;
    mosqueSettings: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      transaction: table(),
      donation: table(),
      expense: table(),
      budget: table(),
      salaryRecord: table(),
      mosqueSettings: { findUnique: jest.fn().mockResolvedValue({ currency: 'BDT' }) },
      // The real thing runs the array inside one database transaction. `Promise.all` is the same shape from
      // the caller's side, and it preserves what matters to these tests: the queries were built and handed
      // over together, in the order the service listed them.
      $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [FinancialReportsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(FinancialReportsService);
  });

  /** The arguments of one call to a mock. */
  const argsOf = (mock: jest.Mock, call = 0): Record<string, unknown> =>
    mock.mock.calls[call][0] as Record<string, unknown>;

  /** The `where` of one call. */
  const whereOf = (mock: jest.Mock, call = 0): Record<string, unknown> =>
    argsOf(mock, call).where as Record<string, unknown>;

  /** Every `where` this service built during the current test, across all four tables. */
  const everyWhere = (): Record<string, unknown>[] => {
    const wheres: Record<string, unknown>[] = [];

    for (const model of [prisma.donation, prisma.expense, prisma.budget, prisma.salaryRecord]) {
      for (const query of [model.aggregate, model.groupBy]) {
        for (let call = 0; call < query.mock.calls.length; call += 1) {
          wheres.push(whereOf(query, call));
        }
      }
    }

    return wheres;
  };

  /** Whether any of the four tables was asked for rows rather than for a total. */
  const loadedRows = (): boolean =>
    [prisma.donation, prisma.expense, prisma.budget, prisma.salaryRecord].some(
      (mock) => mock.findMany.mock.calls.length > 0 || mock.findFirst.mock.calls.length > 0,
    );

  describe('summary', () => {
    it('counts only money that actually moved', async () => {
      await service.summary(ACTOR, {});

      expect(whereOf(prisma.donation.aggregate).status).toBe(DonationStatus.completed);
      expect(whereOf(prisma.expense.aggregate).status).toBe(ExpenseStatus.paid);
      expect(whereOf(prisma.salaryRecord.aggregate).status).toBe(SalaryStatus.paid);
      expect(whereOf(prisma.budget.aggregate).status).toBe(BudgetStatus.active);
    });

    it('returns each total with the number of rows behind it', async () => {
      prisma.donation.aggregate.mockResolvedValue(agg('182500.00', 34));
      prisma.expense.aggregate.mockResolvedValue(agg('144500.00', 27));
      prisma.salaryRecord.aggregate.mockResolvedValue(agg('315000.00', 9));
      prisma.budget.aggregate.mockResolvedValue(agg('250000.00', 4));

      const summary = await service.summary(ACTOR, {});

      expect(summary.donations).toEqual({ total: '182500.00', count: 34 });
      expect(summary.expenses).toEqual({ total: '144500.00', count: 27 });
      expect(summary.salaries).toEqual({ total: '315000.00', count: 9 });
      expect(summary.budget.total).toBe('250000.00');
      expect(summary.budget.count).toBe(4);
    });

    // Nothing matched is a real answer with a real total. `"0.00"` rather than `null`, an empty string, or
    // the `null` the database actually returns for a sum over no rows.
    it('reads an empty window as zero rather than nothing', async () => {
      const summary = await service.summary(ACTOR, {});

      expect(summary.donations).toEqual({ total: '0.00', count: 0 });
      expect(summary.expenses).toEqual({ total: '0.00', count: 0 });
      expect(summary.salaries).toEqual({ total: '0.00', count: 0 });
      expect(summary.netBalance).toBe('0.00');
    });

    it('nets donations against expenses and salaries', async () => {
      prisma.donation.aggregate.mockResolvedValue(agg('100000.10', 12));
      prisma.expense.aggregate.mockResolvedValue(agg('33333.33', 8));
      prisma.salaryRecord.aggregate.mockResolvedValue(agg('0.07', 1));

      const summary = await service.summary(ACTOR, {});

      expect(summary.netBalance).toBe('66666.70');
    });

    // A mosque that spent more than it took in should be told so, not shown a floor of zero.
    it('lets the net balance go negative', async () => {
      prisma.donation.aggregate.mockResolvedValue(agg('500.00', 2));
      prisma.expense.aggregate.mockResolvedValue(agg('900.00', 3));
      prisma.salaryRecord.aggregate.mockResolvedValue(agg('100.00', 1));

      const summary = await service.summary(ACTOR, {});

      expect(summary.netBalance).toBe('-500.00');
    });

    // Both kinds of spending come off the plan. A remaining figure that ignored payroll would be the least
    // useful number on the page for a mosque whose largest budget line is its staff.
    it('takes both expenses and salaries off the budget', async () => {
      prisma.budget.aggregate.mockResolvedValue(agg('250000.00', 4));
      prisma.expense.aggregate.mockResolvedValue(agg('33333.33', 8));
      prisma.salaryRecord.aggregate.mockResolvedValue(agg('0.07', 1));

      const summary = await service.summary(ACTOR, {});

      expect(summary.budget.remaining).toBe('216666.60');
    });

    it('reports an overspent budget as negative', async () => {
      prisma.budget.aggregate.mockResolvedValue(agg('10000.00', 1));
      prisma.expense.aggregate.mockResolvedValue(agg('9000.00', 4));
      prisma.salaryRecord.aggregate.mockResolvedValue(agg('2000.00', 1));

      const summary = await service.summary(ACTOR, {});

      expect(summary.budget.remaining).toBe('-1000.00');
    });

    // `null`, not `"0.00"`: there is no plan to have a remainder of, and a zero would read as fully spent.
    it('has no remaining figure when no active budget overlaps the window', async () => {
      prisma.expense.aggregate.mockResolvedValue(agg('9000.00', 4));

      const summary = await service.summary(ACTOR, {});

      expect(summary.budget).toEqual({ total: '0.00', count: 0, remaining: null });
    });

    // Every figure stays a string from the database to the response. That is the whole guarantee — an amount
    // that never becomes a JavaScript number cannot pick up a rounding error on the way out.
    it('returns every figure as an exact decimal string', async () => {
      prisma.donation.aggregate.mockResolvedValue(agg('35000.5', 3));
      prisma.budget.aggregate.mockResolvedValue(agg('1000', 1));

      const summary = await service.summary(ACTOR, {});

      expect(summary.donations.total).toBe('35000.50');
      expect(summary.budget.total).toBe('1000.00');
      expect(typeof summary.netBalance).toBe('string');
      expect(typeof summary.budget.remaining).toBe('string');
    });

    it('echoes the window it covered', async () => {
      expect((await service.summary(ACTOR, WINDOW)).range).toEqual({
        from: '2026-07-01',
        to: '2026-09-30',
      });

      expect((await service.summary(ACTOR, {})).range).toEqual({ from: null, to: null });
    });

    // One round trip for four figures. Run separately, a donation recorded between the first query and the
    // last would be in one total and not another, and a summary whose parts disagree is worse than a stale one.
    it('asks for the four totals in a single transaction', async () => {
      await service.summary(ACTOR, {});

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.donation.aggregate).toHaveBeenCalledTimes(1);
      expect(prisma.expense.aggregate).toHaveBeenCalledTimes(1);
      expect(prisma.salaryRecord.aggregate).toHaveBeenCalledTimes(1);
      expect(prisma.budget.aggregate).toHaveBeenCalledTimes(1);
    });

    it('sums in the database and never loads a row', async () => {
      await service.summary(ACTOR, WINDOW);

      expect(loadedRows()).toBe(false);
      expect(prisma.donation.groupBy).not.toHaveBeenCalled();
    });
  });

  describe('the currency the figures are labelled with', () => {
    it('is the mosque’s configured one', async () => {
      prisma.mosqueSettings.findUnique.mockResolvedValue({ currency: 'USD' });

      expect((await service.summary(ACTOR, {})).currency).toBe('USD');
      expect(prisma.mosqueSettings.findUnique).toHaveBeenCalledWith({
        where: { mosqueId: ACTOR.mosqueId },
        select: { currency: true },
      });
    });

    it('accepts a lower-case code and upper-cases it', async () => {
      prisma.mosqueSettings.findUnique.mockResolvedValue({ currency: ' sar ' });

      expect((await service.summary(ACTOR, {})).currency).toBe('SAR');
    });

    // The column is a `VarChar(8)` with no format constraint, so it can hold something that is not a code.
    it('falls back to BDT when the stored value is not a currency code', async () => {
      prisma.mosqueSettings.findUnique.mockResolvedValue({ currency: 'Taka' });

      expect((await service.summary(ACTOR, {})).currency).toBe('BDT');
    });

    it('falls back to BDT when the mosque has no settings row', async () => {
      prisma.mosqueSettings.findUnique.mockResolvedValue(null);

      expect((await service.summary(ACTOR, {})).currency).toBe('BDT');
    });

    it('labels every report', async () => {
      prisma.mosqueSettings.findUnique.mockResolvedValue({ currency: 'GBP' });

      expect((await service.donations(ACTOR, {})).currency).toBe('GBP');
      expect((await service.expenses(ACTOR, {})).currency).toBe('GBP');
      expect((await service.budget(ACTOR, {})).currency).toBe('GBP');
      expect((await service.salary(ACTOR, {})).currency).toBe('GBP');
    });
  });

  /**
   * One date pair, three predicates.
   *
   * This is the part of the module most likely to be wrong without anyone noticing, because every mistake here
   * loses rows only at the edge of the window — a report that is short by one evening's donations still looks
   * like a report.
   */
  describe('the window', () => {
    it('runs to the end of the last day for donations, not to its midnight', async () => {
      await service.summary(ACTOR, WINDOW);

      // `donatedAt` is a timestamp. `lte: 2026-09-30T00:00Z` would drop a gift recorded that afternoon.
      expect(whereOf(prisma.donation.aggregate).donatedAt).toEqual({ gte: FROM, lt: AFTER_TO });
    });

    it('uses plain inclusive days for expenses and salaries', async () => {
      await service.summary(ACTOR, WINDOW);

      expect(whereOf(prisma.expense.aggregate).expenseDate).toEqual({ gte: FROM, lte: TO });
      expect(whereOf(prisma.salaryRecord.aggregate).paymentDate).toEqual({ gte: FROM, lte: TO });
    });

    // Overlap, not containment: a quarterly budget governs each of its months, so a monthly report must return
    // it even though neither of its own dates falls inside the month.
    it('matches budgets whose period overlaps the window', async () => {
      await service.summary(ACTOR, WINDOW);

      const where = whereOf(prisma.budget.aggregate);

      expect(where.periodStart).toEqual({ lte: TO });
      expect(where.periodEnd).toEqual({ gte: FROM });
    });

    it('leaves either end open', async () => {
      await service.summary(ACTOR, { from: '2026-07-01' });

      expect(whereOf(prisma.donation.aggregate).donatedAt).toEqual({ gte: FROM });
      expect(whereOf(prisma.expense.aggregate).expenseDate).toEqual({ gte: FROM });
      expect(whereOf(prisma.budget.aggregate).periodStart).toBeUndefined();
      expect(whereOf(prisma.budget.aggregate).periodEnd).toEqual({ gte: FROM });

      await service.summary(ACTOR, { to: '2026-09-30' });

      expect(whereOf(prisma.donation.aggregate, 1).donatedAt).toEqual({ lt: AFTER_TO });
      expect(whereOf(prisma.expense.aggregate, 1).expenseDate).toEqual({ lte: TO });
      expect(whereOf(prisma.budget.aggregate, 1).periodStart).toEqual({ lte: TO });
      expect(whereOf(prisma.budget.aggregate, 1).periodEnd).toBeUndefined();
    });

    // No window at all means everything the mosque has ever recorded, which is what a since-inception figure
    // is. The date keys must be absent rather than present and empty.
    it('constrains no dates when neither end was given', async () => {
      await service.summary(ACTOR, {});

      expect(whereOf(prisma.donation.aggregate).donatedAt).toBeUndefined();
      expect(whereOf(prisma.expense.aggregate).expenseDate).toBeUndefined();
      expect(whereOf(prisma.salaryRecord.aggregate).paymentDate).toBeUndefined();
      expect(whereOf(prisma.budget.aggregate).periodStart).toBeUndefined();
      expect(whereOf(prisma.budget.aggregate).periodEnd).toBeUndefined();
    });

    it('accepts a window of one day', async () => {
      await service.expenses(ACTOR, { from: '2026-09-30', to: '2026-09-30' });

      expect(whereOf(prisma.expense.aggregate).expenseDate).toEqual({ gte: TO, lte: TO });
    });

    it('refuses a window that ends before it starts', async () => {
      const inverted = { from: '2026-09-30', to: '2026-07-01' };

      await expect(service.summary(ACTOR, inverted)).rejects.toThrow(BadRequestException);
      await expect(service.donations(ACTOR, inverted)).rejects.toThrow(BadRequestException);
      await expect(service.expenses(ACTOR, inverted)).rejects.toThrow(BadRequestException);
      await expect(service.budget(ACTOR, inverted)).rejects.toThrow(BadRequestException);
      await expect(service.salary(ACTOR, inverted)).rejects.toThrow(BadRequestException);
    });

    // A page of zeroes would read as "the mosque took nothing this quarter", which is a worse answer than
    // an error, so the code is specific enough for a client to act on.
    it('names the problem when the window is inverted', async () => {
      await expect(
        service.summary(ACTOR, { from: '2026-09-30', to: '2026-07-01' }),
      ).rejects.toMatchObject({
        response: { code: 'INVALID_DATE_RANGE', message: 'to must not fall before from.' },
      });
    });

    it('refuses before running any query', async () => {
      await expect(
        service.summary(ACTOR, { from: '2026-09-30', to: '2026-07-01' }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.mosqueSettings.findUnique).not.toHaveBeenCalled();
    });

    it('allows a window that starts and ends on the same day as the bounds are equal', async () => {
      await expect(
        service.summary(ACTOR, { from: '2026-07-01', to: '2026-07-01' }),
      ).resolves.toBeDefined();
    });
  });

  describe('donations', () => {
    it('totals completed donations only', async () => {
      prisma.donation.aggregate.mockResolvedValue(agg('182500.00', 34));

      const report = await service.donations(ACTOR, {});

      expect(whereOf(prisma.donation.aggregate).status).toBe(DonationStatus.completed);
      expect(report.total).toBe('182500.00');
      expect(report.count).toBe(34);
    });

    // The point of the breakdown is to show what the headline left out, so it must not carry a status filter.
    it('breaks down every status, filtering on none of them', async () => {
      prisma.donation.groupBy
        .mockResolvedValueOnce([
          byStatus(DonationStatus.completed, '182500.00', 34),
          byStatus(DonationStatus.pending, '4000.00', 2),
          byStatus(DonationStatus.failed, '500.00', 1),
        ])
        .mockResolvedValueOnce([]);

      const report = await service.donations(ACTOR, {});

      expect(whereOf(prisma.donation.groupBy, 0).status).toBeUndefined();
      expect(argsOf(prisma.donation.groupBy, 0).by).toEqual(['status']);
      expect(report.byStatus).toEqual([
        { status: 'completed', total: '182500.00', count: 34 },
        { status: 'pending', total: '4000.00', count: 2 },
        { status: 'failed', total: '500.00', count: 1 },
      ]);
    });

    // Completed only, so these parts add up to the headline. A breakdown that included pending money would
    // not sum to the total it sits beside, and a treasurer would be right to distrust the page.
    it('breaks down completed donations by how the money arrived', async () => {
      prisma.donation.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          byMethod(PaymentMethod.bank_transfer, '96000.00', 8),
          byMethod(PaymentMethod.cash, '86500.00', 26),
        ]);

      const report = await service.donations(ACTOR, {});

      expect(whereOf(prisma.donation.groupBy, 1).status).toBe(DonationStatus.completed);
      expect(argsOf(prisma.donation.groupBy, 1).by).toEqual(['paymentMethod']);
      expect(report.byPaymentMethod).toEqual([
        { paymentMethod: 'bank_transfer', total: '96000.00', count: 8 },
        { paymentMethod: 'cash', total: '86500.00', count: 26 },
      ]);
    });

    it('orders both breakdowns by size', async () => {
      await service.donations(ACTOR, {});

      expect(argsOf(prisma.donation.groupBy, 0).orderBy).toEqual({ _sum: { amount: 'desc' } });
      expect(argsOf(prisma.donation.groupBy, 1).orderBy).toEqual({ _sum: { amount: 'desc' } });
    });

    it('windows on when the money was given, not when the row was written', async () => {
      await service.donations(ACTOR, WINDOW);

      for (const where of everyWhere()) {
        expect(where.donatedAt).toEqual({ gte: FROM, lt: AFTER_TO });
        expect(where.createdAt).toBeUndefined();
      }
    });

    it('names no donor', async () => {
      prisma.donation.aggregate.mockResolvedValue(agg('182500.00', 34));

      const report = await service.donations(ACTOR, {});

      expect(Object.keys(report)).toEqual([
        'range',
        'currency',
        'total',
        'count',
        'byStatus',
        'byPaymentMethod',
      ]);
    });

    it('never loads a donation', async () => {
      await service.donations(ACTOR, WINDOW);

      expect(loadedRows()).toBe(false);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('expenses', () => {
    it('totals paid expenses only', async () => {
      prisma.expense.aggregate.mockResolvedValue(agg('144500.00', 27));

      const report = await service.expenses(ACTOR, {});

      expect(whereOf(prisma.expense.aggregate).status).toBe(ExpenseStatus.paid);
      expect(report.total).toBe('144500.00');
      expect(report.count).toBe(27);
    });

    // `pending` and `approved` are money owed but not yet gone. Excluded from the total, visible here.
    it('shows the money owed but not yet gone', async () => {
      prisma.expense.groupBy
        .mockResolvedValueOnce([
          byStatus(ExpenseStatus.paid, '144500.00', 27),
          byStatus(ExpenseStatus.approved, '12000.00', 3),
          byStatus(ExpenseStatus.pending, '800.00', 1),
        ])
        .mockResolvedValueOnce([]);

      const report = await service.expenses(ACTOR, {});

      expect(whereOf(prisma.expense.groupBy, 0).status).toBeUndefined();
      expect(report.byStatus).toEqual([
        { status: 'paid', total: '144500.00', count: 27 },
        { status: 'approved', total: '12000.00', count: 3 },
        { status: 'pending', total: '800.00', count: 1 },
      ]);
    });

    it('breaks paid spending down by category', async () => {
      prisma.expense.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          byCategory('Utilities', '43200.00', 9),
          byCategory('Repairs', '7000.00', 2),
        ]);

      const report = await service.expenses(ACTOR, {});

      expect(whereOf(prisma.expense.groupBy, 1).status).toBe(ExpenseStatus.paid);
      expect(argsOf(prisma.expense.groupBy, 1).by).toEqual(['category']);
      expect(report.byCategory).toEqual([
        { category: 'Utilities', total: '43200.00', count: 9 },
        { category: 'Repairs', total: '7000.00', count: 2 },
      ]);
    });

    it('windows on the day the expense is booked to', async () => {
      await service.expenses(ACTOR, WINDOW);

      for (const where of everyWhere()) {
        expect(where.expenseDate).toEqual({ gte: FROM, lte: TO });
      }
    });

    it('never loads an expense', async () => {
      await service.expenses(ACTOR, WINDOW);

      expect(loadedRows()).toBe(false);
    });
  });

  describe('budget', () => {
    it('totals active budgets only', async () => {
      prisma.budget.aggregate.mockResolvedValue(agg('250000.00', 4));

      const report = await service.budget(ACTOR, {});

      expect(whereOf(prisma.budget.aggregate).status).toBe(BudgetStatus.active);
      expect(report.total).toBe('250000.00');
      expect(report.count).toBe(4);
    });

    // A draft is a proposal. Visible as a draft, not counted as a plan in force.
    it('shows draft and cancelled plans without counting them', async () => {
      prisma.budget.groupBy
        .mockResolvedValueOnce([
          byStatus(BudgetStatus.active, '250000.00', 4),
          byStatus(BudgetStatus.draft, '30000.00', 1),
        ])
        .mockResolvedValueOnce([]);

      const report = await service.budget(ACTOR, {});

      expect(whereOf(prisma.budget.groupBy, 0).status).toBeUndefined();
      expect(report.byStatus).toEqual([
        { status: 'active', total: '250000.00', count: 4 },
        { status: 'draft', total: '30000.00', count: 1 },
      ]);
    });

    /**
     * The lines put a plan beside what was spent against it, matched on the category string — the only
     * relationship the two tables have.
     *
     * All three shapes appear in one assertion because it is the interesting case: a category with both, one
     * budgeted and untouched, and one spent on with no budget at all. The last is unbudgeted expenditure, and
     * dropping it for want of a matching budget row would hide the finding a report exists to surface.
     */
    it('puts each category’s plan beside its spending', async () => {
      prisma.budget.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          byCategory('Salaries', '100000.00', 1),
          byCategory('Utilities', '50000.00', 2),
        ]);
      prisma.expense.groupBy.mockResolvedValue([
        byCategory('Repairs', '7000.00', 1),
        byCategory('Utilities', '43200.00', 9),
      ]);

      const report = await service.budget(ACTOR, {});

      expect(report.lines).toEqual([
        { category: 'Repairs', planned: '0.00', spent: '7000.00', remaining: '-7000.00' },
        { category: 'Salaries', planned: '100000.00', spent: '0.00', remaining: '100000.00' },
        { category: 'Utilities', planned: '50000.00', spent: '43200.00', remaining: '6800.00' },
      ]);
    });

    it('takes the plan from active budgets and the spending from paid expenses', async () => {
      await service.budget(ACTOR, {});

      expect(whereOf(prisma.budget.groupBy, 1).status).toBe(BudgetStatus.active);
      expect(argsOf(prisma.budget.groupBy, 1).by).toEqual(['category']);
      expect(whereOf(prisma.expense.groupBy, 0).status).toBe(ExpenseStatus.paid);
      expect(argsOf(prisma.expense.groupBy, 0).by).toEqual(['category']);
    });

    // A salary record has no category, so there is no honest line to charge it to. The summary's `remaining`
    // is the figure that accounts for payroll; this endpoint answers the narrower question.
    it('does not look at salaries', async () => {
      await service.budget(ACTOR, WINDOW);

      expect(prisma.salaryRecord.aggregate).not.toHaveBeenCalled();
      expect(prisma.salaryRecord.groupBy).not.toHaveBeenCalled();
    });

    it('never loads a budget or an expense', async () => {
      await service.budget(ACTOR, WINDOW);

      expect(loadedRows()).toBe(false);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('salary', () => {
    it('totals paid records only', async () => {
      prisma.salaryRecord.aggregate.mockResolvedValue(agg('315000.00', 9));

      const report = await service.salary(ACTOR, {});

      expect(whereOf(prisma.salaryRecord.aggregate).status).toBe(SalaryStatus.paid);
      expect(report.total).toBe('315000.00');
      expect(report.count).toBe(9);
    });

    it('shows payroll owed as pending', async () => {
      prisma.salaryRecord.groupBy
        .mockResolvedValueOnce([
          byStatus(SalaryStatus.paid, '315000.00', 9),
          byStatus(SalaryStatus.pending, '35000.00', 1),
        ])
        .mockResolvedValueOnce([]);

      const report = await service.salary(ACTOR, {});

      expect(whereOf(prisma.salaryRecord.groupBy, 0).status).toBeUndefined();
      expect(report.byStatus).toEqual([
        { status: 'paid', total: '315000.00', count: 9 },
        { status: 'pending', total: '35000.00', count: 1 },
      ]);
    });

    it('groups paid records by pay period, newest first', async () => {
      prisma.salaryRecord.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          byPeriod('2026-08', '105000.00', 3),
          byPeriod('2026-07', '105000.00', 3),
        ]);

      const report = await service.salary(ACTOR, {});

      expect(whereOf(prisma.salaryRecord.groupBy, 1).status).toBe(SalaryStatus.paid);
      expect(argsOf(prisma.salaryRecord.groupBy, 1).by).toEqual(['payPeriod']);
      expect(argsOf(prisma.salaryRecord.groupBy, 1).orderBy).toEqual({ payPeriod: 'desc' });
      expect(report.byPeriod).toEqual([
        { payPeriod: '2026-08', total: '105000.00', count: 3 },
        { payPeriod: '2026-07', total: '105000.00', count: 3 },
      ]);
    });

    // On `paymentDate`, when the money left the account — not on `payPeriod`, the month it was earned. A
    // September report is asking what the mosque spent in September, and August's salary settled on the 3rd did.
    it('windows on the payment date, not the pay period', async () => {
      await service.salary(ACTOR, WINDOW);

      for (const where of everyWhere()) {
        expect(where.paymentDate).toEqual({ gte: FROM, lte: TO });
        expect(where.payPeriod).toBeUndefined();
      }
    });

    // The payroll total, not the payroll. Anyone needing per-person figures uses `/api/v1/salaries`, where a
    // caller holding only `salary.viewOwn` is narrowed to themselves.
    it('names nobody', async () => {
      const report = await service.salary(ACTOR, {});

      expect(Object.keys(report)).toEqual([
        'range',
        'currency',
        'total',
        'count',
        'byStatus',
        'byPeriod',
      ]);
      expect(JSON.stringify(report)).not.toContain('userId');
    });

    it('never loads a salary record', async () => {
      await service.salary(ACTOR, WINDOW);

      expect(loadedRows()).toBe(false);
    });
  });

  /**
   * One mosque, taken from the token.
   *
   * These reports are the widest read in the application — one request returns everything a mosque has
   * received, spent and paid out — so the scoping is checked on every query each method builds rather than on
   * a representative one.
   */
  describe('mosque id from the token only', () => {
    it.each([
      ['summary', (query: FinancialReportQueryDto) => service.summary(ACTOR, query)],
      ['donations', (query: FinancialReportQueryDto) => service.donations(ACTOR, query)],
      ['expenses', (query: FinancialReportQueryDto) => service.expenses(ACTOR, query)],
      ['budget', (query: FinancialReportQueryDto) => service.budget(ACTOR, query)],
      ['salary', (query: FinancialReportQueryDto) => service.salary(ACTOR, query)],
    ])('scopes every query %s makes to the caller’s mosque', async (_name, run) => {
      await run(WINDOW);

      const wheres = everyWhere();

      expect(wheres.length).toBeGreaterThan(0);

      for (const where of wheres) {
        expect(where.mosqueId).toBe(ACTOR.mosqueId);
      }
    });

    // The DTO has no `mosqueId`, so `forbidNonWhitelisted` rejects one before this point — but a report is
    // the last place that should depend on a pipe being configured. Smuggled through the type, it is ignored.
    it('ignores a mosque id smuggled into the query', async () => {
      const smuggled = { ...WINDOW, mosqueId: OTHER_MOSQUE } as unknown as FinancialReportQueryDto;

      await service.summary(ACTOR, smuggled);

      for (const where of everyWhere()) {
        expect(where.mosqueId).toBe(ACTOR.mosqueId);
      }

      expect(JSON.stringify(everyWhere())).not.toContain(OTHER_MOSQUE);
    });

    it('reads the settings of the caller’s mosque and no other', async () => {
      const smuggled = { mosqueId: OTHER_MOSQUE } as unknown as FinancialReportQueryDto;

      await service.summary(ACTOR, smuggled);

      expect(prisma.mosqueSettings.findUnique).toHaveBeenCalledWith({
        where: { mosqueId: ACTOR.mosqueId },
        select: { currency: true },
      });
    });
  });
});
