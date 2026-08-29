import { BadRequestException, Injectable } from '@nestjs/common';
import {
  BudgetStatus,
  DonationStatus,
  ExpenseStatus,
  Prisma,
  SalaryStatus,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';

import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { CURRENCY_PATTERN, FALLBACK_CURRENCY, normalizeCurrency } from '../common/utils/currency';
import { toDateOnly } from '../common/utils/date-only';
import { fromMoney } from '../common/utils/money';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialReportQueryDto } from './dto/financial-report-query.dto';
import {
  BudgetLineDto,
  BudgetReportDto,
  DonationReportDto,
  ExpenseReportDto,
  FinancialSummaryDto,
  PaymentMethodTotalDto,
  ReportRangeDto,
  SalaryReportDto,
  StatusTotalDto,
} from './dto/financial-report-response.dto';

/**
 * The five financial reports, computed rather than stored.
 *
 * **There is no report table.** Every figure here is derived from the donations, expenses, budgets and salary
 * records that already exist, so a report cannot drift from what it describes — there is no cached total to go
 * stale, nothing to invalidate when a donation is voided, and no second copy of the numbers to reconcile against
 * the first. The cost is that each request runs a handful of aggregate queries, which is the right trade for a page
 * a treasurer opens a few times a month.
 *
 * **Nothing is summed in JavaScript.** Every total comes from `aggregate` or `groupBy`, so the database adds the
 * rows and returns one number. A mosque with fifty thousand donations transfers a `Decimal` and a count, not fifty
 * thousand rows — which is the difference between a report that keeps working and one that runs the process out of
 * memory in its third year. The only arithmetic in this file is over already-grouped results: subtracting spending
 * from a plan, and matching a handful of budget categories against a handful of expense categories.
 *
 * **The arithmetic that is here is `Decimal`.** `Prisma.Decimal.sub` rather than `-`, because the moment a total
 * becomes a JavaScript number the schema's rule that money is never a float has been broken on the way out. Zero
 * is `new Prisma.Decimal(0)` and not `0` for the same reason.
 *
 * **A total counts only money that actually moved:** donations when `completed`, expenses and salaries when `paid`,
 * budgets when `active`. Every report also returns a full `byStatus` breakdown, so nothing is hidden — a pending
 * donation is visible as pending rather than counted as received.
 *
 * **Every query is scoped to the caller's mosque, taken from the token.** `mosqueId` is the first condition in
 * every `where` in this file and is never read from the request; the query DTO has no such field, and
 * `forbidNonWhitelisted` rejects one that is sent. There is no read here that could cross a mosque boundary.
 *
 * Authorization is the guard's: each route requires `finance.view`. There is no scope resolution because there is
 * nothing to resolve — a financial report is a whole-mosque figure by definition, so there is no "own records"
 * reading of it, and the view/viewOwn split that donations and salaries use has no meaning here. That is why this
 * service takes an `AuthenticatedUser` and reads only its `mosqueId`.
 */
@Injectable()
export class FinancialReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Everything at once: received, spent, paid out, planned, and what is left.
   *
   * Four aggregates in one transaction, so the figures describe a single moment. Run separately, a donation
   * recorded between the first query and the third would appear in one total and not the other, and a summary
   * whose parts do not agree is worse than a slightly stale one.
   */
  async summary(
    actor: AuthenticatedUser,
    query: FinancialReportQueryDto,
  ): Promise<FinancialSummaryDto> {
    this.assertRange(query);

    const currency = await this.currencyOf(actor.mosqueId);

    const transactionIncomeWhere: Prisma.TransactionWhereInput = {
      mosqueId: actor.mosqueId,
      type: TransactionType.income,
      status: TransactionStatus.completed,
      ...(query.from || query.to
        ? {
            transactedAt: {
              ...(query.from ? { gte: toDateOnly(query.from) } : {}),
              ...(query.to ? { lt: dayAfter(query.to) } : {}),
            },
          }
        : {}),
    };

    const transactionExpenseWhere: Prisma.TransactionWhereInput = {
      mosqueId: actor.mosqueId,
      type: TransactionType.expense,
      status: TransactionStatus.completed,
      ...(query.from || query.to
        ? {
            transactedAt: {
              ...(query.from ? { gte: toDateOnly(query.from) } : {}),
              ...(query.to ? { lt: dayAfter(query.to) } : {}),
            },
          }
        : {}),
    };

    const [incomeTx, expenseTx, donations, expenses, salaries, budgets] = await this.prisma.$transaction([
      this.prisma.transaction.aggregate({
        where: transactionIncomeWhere,
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.transaction.aggregate({
        where: transactionExpenseWhere,
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.donation.aggregate({
        where: this.donationWhere(actor.mosqueId, query, DonationStatus.completed),
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.expense.aggregate({
        where: this.expenseWhere(actor.mosqueId, query, ExpenseStatus.paid),
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.salaryRecord.aggregate({
        where: this.salaryWhere(actor.mosqueId, query, SalaryStatus.paid),
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.budget.aggregate({
        where: this.budgetWhere(actor.mosqueId, query, BudgetStatus.active),
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);

    const txIncomeAmount = amountOf(incomeTx);
    const donationAmount = amountOf(donations);
    const received = countOf(incomeTx) > 0 ? txIncomeAmount : donationAmount;

    const txExpenseAmount = amountOf(expenseTx);
    const expenseAmount = amountOf(expenses);
    const salaryAmount = amountOf(salaries);
    const spent = countOf(expenseTx) > 0 ? txExpenseAmount : expenseAmount.add(salaryAmount);

    const planned = amountOf(budgets);
    const budgetCount = countOf(budgets);

    return {
      range: this.rangeOf(query),
      currency,
      income: { total: fromMoney(received), count: countOf(incomeTx) > 0 ? countOf(incomeTx) : countOf(donations) },
      donations: { total: fromMoney(donationAmount), count: countOf(donations) },
      expenses: { total: fromMoney(expenseAmount), count: countOf(expenses) },
      salaries: { total: fromMoney(salaryAmount), count: countOf(salaries) },
      budget: {
        total: fromMoney(planned),
        count: budgetCount,
        // `null` rather than `"0.00"` when nothing is in force
        remaining: budgetCount === 0 ? null : fromMoney(planned.sub(spent)),
      },
      // Decimal subtraction, not `-`. Negative when more went out than came in.
      netBalance: fromMoney(received.sub(spent)),
    };
  }

  /** Donations over the window: the received total, plus every status and how the money arrived. */
  async donations(
    actor: AuthenticatedUser,
    query: FinancialReportQueryDto,
  ): Promise<DonationReportDto> {
    this.assertRange(query);

    const currency = await this.currencyOf(actor.mosqueId);

    const [received, byStatus, byMethod] = await this.prisma.$transaction([
      this.prisma.donation.aggregate({
        where: this.donationWhere(actor.mosqueId, query, DonationStatus.completed),
        _sum: { amount: true },
        _count: { _all: true },
      }),
      // No status filter: the point of this breakdown is to show what was *not* counted in the total.
      this.prisma.donation.groupBy({
        by: ['status'],
        where: this.donationWhere(actor.mosqueId, query),
        _sum: { amount: true },
        _count: { _all: true },
        orderBy: { _sum: { amount: 'desc' } },
      }),
      // Completed only, so these parts sum to the headline figure.
      this.prisma.donation.groupBy({
        by: ['paymentMethod'],
        where: this.donationWhere(actor.mosqueId, query, DonationStatus.completed),
        _sum: { amount: true },
        _count: { _all: true },
        orderBy: { _sum: { amount: 'desc' } },
      }),
    ]);

    return {
      range: this.rangeOf(query),
      currency,
      total: fromMoney(amountOf(received)),
      count: countOf(received),
      byStatus: statusTotals(byStatus),
      byPaymentMethod: byMethod.map((group): PaymentMethodTotalDto => ({
        paymentMethod: group.paymentMethod,
        total: fromMoney(amountOf(group)),
        count: countOf(group),
      })),
    };
  }

  /** Expenses over the window: the paid total, plus every status and every category. */
  async expenses(
    actor: AuthenticatedUser,
    query: FinancialReportQueryDto,
  ): Promise<ExpenseReportDto> {
    this.assertRange(query);

    const currency = await this.currencyOf(actor.mosqueId);

    const [paid, byStatus, byCategory] = await this.prisma.$transaction([
      this.prisma.expense.aggregate({
        where: this.expenseWhere(actor.mosqueId, query, ExpenseStatus.paid),
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.expense.groupBy({
        by: ['status'],
        where: this.expenseWhere(actor.mosqueId, query),
        _sum: { amount: true },
        _count: { _all: true },
        orderBy: { _sum: { amount: 'desc' } },
      }),
      this.prisma.expense.groupBy({
        by: ['category'],
        where: this.expenseWhere(actor.mosqueId, query, ExpenseStatus.paid),
        _sum: { amount: true },
        _count: { _all: true },
        orderBy: { _sum: { amount: 'desc' } },
      }),
    ]);

    return {
      range: this.rangeOf(query),
      currency,
      total: fromMoney(amountOf(paid)),
      count: countOf(paid),
      byStatus: statusTotals(byStatus),
      byCategory: byCategory.map((group) => ({
        category: group.category,
        total: fromMoney(amountOf(group)),
        count: countOf(group),
      })),
    };
  }

  /**
   * Budgets overlapping the window, and how each category is tracking.
   *
   * The per-category lines join `Budget.category` to `Expense.category` on the string, because that is the only
   * relationship between them — an expense is not assigned to a particular budget row, and there is no foreign
   * key to follow. Two `groupBy` queries come back with one row per category, and those are merged. That
   * in-memory step is over categories, not transactions: a mosque has a dozen or so, whatever its volume.
   */
  async budget(actor: AuthenticatedUser, query: FinancialReportQueryDto): Promise<BudgetReportDto> {
    this.assertRange(query);

    const currency = await this.currencyOf(actor.mosqueId);

    const [active, byStatus, planned, spent] = await this.prisma.$transaction([
      this.prisma.budget.aggregate({
        where: this.budgetWhere(actor.mosqueId, query, BudgetStatus.active),
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.budget.groupBy({
        by: ['status'],
        where: this.budgetWhere(actor.mosqueId, query),
        _sum: { amount: true },
        _count: { _all: true },
        orderBy: { _sum: { amount: 'desc' } },
      }),
      // Both by category and both ordered by it, so the two result sets line up as they are merged. The merge
      // re-sorts anyway — a category with spending and no budget joins the list late — but reading two ordered
      // lists is easier to follow than two arbitrary ones.
      this.prisma.budget.groupBy({
        by: ['category'],
        where: this.budgetWhere(actor.mosqueId, query, BudgetStatus.active),
        _sum: { amount: true },
        _count: { _all: true },
        orderBy: { category: 'asc' },
      }),
      this.prisma.expense.groupBy({
        by: ['category'],
        where: this.expenseWhere(actor.mosqueId, query, ExpenseStatus.paid),
        _sum: { amount: true },
        _count: { _all: true },
        orderBy: { category: 'asc' },
      }),
    ]);

    return {
      range: this.rangeOf(query),
      currency,
      total: fromMoney(amountOf(active)),
      count: countOf(active),
      byStatus: statusTotals(byStatus),
      lines: this.budgetLines(planned, spent),
    };
  }

  /**
   * Salaries over the window: the paid total, plus every status and every pay period.
   *
   * Not broken down by person, on purpose — see `SalaryReportDto`. The window is on `paymentDate`, so a September
   * report legitimately shows an August pay period: that is August's salary, paid in September.
   */
  async salary(actor: AuthenticatedUser, query: FinancialReportQueryDto): Promise<SalaryReportDto> {
    this.assertRange(query);

    const currency = await this.currencyOf(actor.mosqueId);

    const [paid, byStatus, byPeriod] = await this.prisma.$transaction([
      this.prisma.salaryRecord.aggregate({
        where: this.salaryWhere(actor.mosqueId, query, SalaryStatus.paid),
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.salaryRecord.groupBy({
        by: ['status'],
        where: this.salaryWhere(actor.mosqueId, query),
        _sum: { amount: true },
        _count: { _all: true },
        orderBy: { _sum: { amount: 'desc' } },
      }),
      // Newest period first. `YYYY-MM` sorts correctly as a string — fixed width, most significant field first —
      // which is one of the reasons the column has that shape.
      this.prisma.salaryRecord.groupBy({
        by: ['payPeriod'],
        where: this.salaryWhere(actor.mosqueId, query, SalaryStatus.paid),
        _sum: { amount: true },
        _count: { _all: true },
        orderBy: { payPeriod: 'desc' },
      }),
    ]);

    return {
      range: this.rangeOf(query),
      currency,
      total: fromMoney(amountOf(paid)),
      count: countOf(paid),
      byStatus: statusTotals(byStatus),
      byPeriod: byPeriod.map((group) => ({
        payPeriod: group.payPeriod,
        total: fromMoney(amountOf(group)),
        count: countOf(group),
      })),
    };
  }

  // ---- internals ------------------------------------------------------------

  /**
   * Donations in the window, optionally of one status.
   *
   * `donatedAt` is a `@db.Timestamptz`, not a date, so the upper bound is **exclusive at the start of the
   * following day** rather than `lte` on `to`. With `lte` a donation timestamped 18:40 on the last day of the
   * window would be compared against that day's midnight and dropped — silently, and only for the final day of
   * every report. A caller sending the same `to` as they would for an expense gets the whole day either way.
   *
   * The comparison is in UTC, like every other date in this codebase.
   */
  private donationWhere(
    mosqueId: string,
    query: FinancialReportQueryDto,
    status?: DonationStatus,
  ): Prisma.DonationWhereInput {
    return {
      mosqueId,
      ...(status ? { status } : {}),
      ...(query.from || query.to
        ? {
            donatedAt: {
              ...(query.from ? { gte: toDateOnly(query.from) } : {}),
              ...(query.to ? { lt: dayAfter(query.to) } : {}),
            },
          }
        : {}),
    };
  }

  /** Expenses in the window. `expenseDate` is a `@db.Date`, so both bounds are plain inclusive days. */
  private expenseWhere(
    mosqueId: string,
    query: FinancialReportQueryDto,
    status?: ExpenseStatus,
  ): Prisma.ExpenseWhereInput {
    return {
      mosqueId,
      ...(status ? { status } : {}),
      ...(query.from || query.to
        ? {
            expenseDate: {
              ...(query.from ? { gte: toDateOnly(query.from) } : {}),
              ...(query.to ? { lte: toDateOnly(query.to) } : {}),
            },
          }
        : {}),
    };
  }

  /**
   * Salary records in the window, by `paymentDate` — when the money moved.
   *
   * Not by `payPeriod`. A report for September is asking what left the mosque's account in September, and
   * August's salary settled on 3 September did. Reporting on the period instead would put money in the month it
   * was earned rather than the month it was spent, and no bank statement would ever agree with it.
   */
  private salaryWhere(
    mosqueId: string,
    query: FinancialReportQueryDto,
    status?: SalaryStatus,
  ): Prisma.SalaryRecordWhereInput {
    return {
      mosqueId,
      ...(status ? { status } : {}),
      ...(query.from || query.to
        ? {
            paymentDate: {
              ...(query.from ? { gte: toDateOnly(query.from) } : {}),
              ...(query.to ? { lte: toDateOnly(query.to) } : {}),
            },
          }
        : {}),
    };
  }

  /**
   * Budgets in force during the window: **overlap, not containment**.
   *
   * A budget running July to September governs spending throughout August even though neither of its own dates
   * falls inside an August window, so the test is `periodStart <= to && periodEnd >= from`. Requiring the whole
   * period to sit inside the window instead would make a quarterly budget invisible to every monthly report,
   * which is the report a mosque actually runs.
   *
   * Each half is applied only when its bound was given, so an open-ended window matches everything.
   */
  private budgetWhere(
    mosqueId: string,
    query: FinancialReportQueryDto,
    status?: BudgetStatus,
  ): Prisma.BudgetWhereInput {
    return {
      mosqueId,
      ...(status ? { status } : {}),
      ...(query.to ? { periodStart: { lte: toDateOnly(query.to) } } : {}),
      ...(query.from ? { periodEnd: { gte: toDateOnly(query.from) } } : {}),
    };
  }

  /**
   * Budget categories against what was spent on them.
   *
   * A category appears if it has a plan, spending, or both. One with spending and no plan comes out with
   * `planned: "0.00"` and a negative remainder — unbudgeted expenditure, which is exactly what a report should
   * make visible rather than quietly drop for having no matching budget row.
   *
   * Salaries are absent from `spent` because a salary record has no category to charge. The summary's
   * `remaining` does count them; these lines answer the narrower question of how each budgeted category is
   * tracking.
   */
  private budgetLines(planned: CategoryGroup[], spent: CategoryGroup[]): BudgetLineDto[] {
    const lines = new Map<string, { planned: Prisma.Decimal; spent: Prisma.Decimal }>();

    for (const group of planned) {
      lines.set(group.category, { planned: amountOf(group), spent: ZERO });
    }

    for (const group of spent) {
      const line = lines.get(group.category);

      if (line) line.spent = amountOf(group);
      else lines.set(group.category, { planned: ZERO, spent: amountOf(group) });
    }

    return [...lines.entries()]
      .map(([category, line]) => ({
        category,
        planned: fromMoney(line.planned),
        spent: fromMoney(line.spent),
        // Decimal subtraction. Deliberately not clamped at zero: an overspend is the finding.
        remaining: fromMoney(line.planned.sub(line.spent)),
      }))
      .sort((first, second) => first.category.localeCompare(second.category));
  }

  /** The window, echoed back, so a stored or shared report says what it covers. */
  private rangeOf(query: FinancialReportQueryDto): ReportRangeDto {
    return { from: query.from ?? null, to: query.to ?? null };
  }

  /**
   * `to >= from`, when both were given.
   *
   * ISO `YYYY-MM-DD` strings compare correctly as strings, so this needs no date parsing and cannot pick up a
   * timezone on the way. An inverted window is a 400 rather than a report full of zeroes, because a page of
   * zeroes reads as "the mosque took nothing this quarter" and that is a worse answer than an error.
   */
  private assertRange(query: FinancialReportQueryDto): void {
    const { from, to } = query;

    if (!from || !to || to >= from) return;

    throw new BadRequestException({
      code: 'INVALID_DATE_RANGE',
      message: 'to must not fall before from.',
    });
  }

  /**
   * The currency to label the figures with.
   *
   * The mosque's configured one, or `BDT`. Re-checked against the pattern rather than trusted, because the
   * settings column is a `VarChar(8)` with no format constraint and a mosque could be holding `"Taka"` in it.
   *
   * This labels the report; it does not filter it. Rows carry their own currency, and nothing in this system
   * holds an exchange rate, so a mosque recording in two currencies would be summing unlike things — see the
   * response DTO's file comment. Filtering to one currency instead would silently omit money the mosque
   * genuinely received, which is the worse of the two failures for a report to have.
   */
  private async currencyOf(mosqueId: string): Promise<string> {
    const settings = await this.prisma.mosqueSettings.findUnique({
      where: { mosqueId },
      select: { currency: true },
    });

    const configured = normalizeCurrency(settings?.currency);

    return typeof configured === 'string' && CURRENCY_PATTERN.test(configured)
      ? configured
      : FALLBACK_CURRENCY;
  }
}

/** Zero as a `Decimal`. Immutable, so one instance is safe to share. */
const ZERO = new Prisma.Decimal(0);

const MS_PER_DAY = 86_400_000;

/**
 * Midnight UTC on the day after `isoDate`.
 *
 * Arithmetic on the epoch rather than on calendar fields, so month ends and leap years need no special case, and
 * UTC throughout so no daylight-saving transition can make a day 23 or 25 hours long.
 */
function dayAfter(isoDate: string): Date {
  return new Date(toDateOnly(isoDate).getTime() + MS_PER_DAY);
}

/**
 * The shape every aggregate and group in this file shares.
 *
 * Deliberately loose, because `aggregate` and `groupBy` do not type their results the same way. An aggregate's
 * `_sum` is `{ amount } | null`, while a group's is `{ amount? } | undefined`; a group's `_count` is wider still,
 * `true | { …per-field counts…, _all? } | undefined`, because `_count: true` is a legal thing to ask `groupBy` for.
 * Every query in this file asks for `{ _all: true }`, so the `true` arm never occurs at runtime — but it is in the
 * type, so it has to be handled here.
 *
 * Widening to cover both is what lets one pair of readers serve all four tables and both query kinds. The
 * alternatives were eight near-identical copies, or a cast, which would throw the type checking away at exactly
 * the place it is doing work.
 */
type AmountGroup = {
  _sum?: { amount?: Prisma.Decimal | null } | null;
  _count?: true | { _all?: number } | null;
};

type CategoryGroup = AmountGroup & { category: string };

type StatusGroup = AmountGroup & { status: string };

/** A group's summed amount, with an empty group reading as zero rather than null. */
function amountOf(group: AmountGroup): Prisma.Decimal {
  return group._sum?.amount ?? ZERO;
}

/** A group's row count. Zero for an empty group, and for the `_count: true` shape this file never asks for. */
function countOf(group: AmountGroup): number {
  const count = group._count;

  if (typeof count !== 'object' || count === null) return 0;

  return count._all ?? 0;
}

/** The same status breakdown for all four tables — the enums differ, the shape does not. */
function statusTotals(groups: StatusGroup[]): StatusTotalDto[] {
  return groups.map((group) => ({
    status: group.status,
    total: fromMoney(amountOf(group)),
    count: countOf(group),
  }));
}
