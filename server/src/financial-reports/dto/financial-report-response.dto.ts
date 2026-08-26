import { ApiProperty } from '@nestjs/swagger';
import {
  BudgetStatus,
  DonationStatus,
  ExpenseStatus,
  PaymentMethod,
  SalaryStatus,
} from '@prisma/client';

/**
 * What the financial reports return.
 *
 * Three conventions run through the whole file.
 *
 * **Every money figure is an exact decimal string**, for the reason `common/utils/money` gives: the rule that money
 * is `Decimal` and never `Float` only holds if the value never becomes a JavaScript number on either side of the
 * database. A report is the worst place to break it — a total is the sum of hundreds of rows, so a float's error
 * accumulates instead of cancelling.
 *
 * **A headline total counts only money that actually moved.** Donations count when `completed`, expenses and
 * salaries when `paid`. A pending donation is a promise and a pending expense is a bill, and adding either to a
 * total would overstate what the mosque holds. The pending figures are not hidden — every report also carries a
 * `byStatus` breakdown, so a treasurer can see what is outstanding — they are just not summed into the headline.
 *
 * **Every figure is scoped to one mosque and one currency.** The currency named on each report is the mosque's
 * configured one, and the totals are sums of the `amount` columns. A mosque that records rows in more than one
 * currency would therefore be adding unlike things: there are no exchange rates anywhere in this system, so no
 * report can convert, and none pretends to. A mosque keeping two currencies should read the `byStatus` and
 * per-category breakdowns rather than the headline.
 *
 * Declaration order matters here and is not stylistic. `emitDecoratorMetadata` writes an eager `design:type`
 * reference for every decorated property whose type is a single class, so a class used as a property type must be
 * declared before the class using it or it is read inside its temporal dead zone and throws the moment the module
 * loads. Array-typed properties emit `Array` and are safe either way; the small classes are still declared first,
 * for reading.
 */

/** The window the figures cover, echoed back. `null` at either end means unbounded. */
export class ReportRangeDto {
  @ApiProperty({
    format: 'date',
    nullable: true,
    example: '2026-07-01',
    description: 'Inclusive. `null` when the report runs from the beginning.',
  })
  from!: string | null;

  @ApiProperty({
    format: 'date',
    nullable: true,
    example: '2026-09-30',
    description: 'Inclusive, whole day. `null` when the report runs to the present.',
  })
  to!: string | null;
}

/** A total and the number of rows behind it. */
export class ReportTotalDto {
  @ApiProperty({
    example: '182500.00',
    description: 'An exact decimal string. `"0.00"` when nothing matched.',
  })
  total!: string;

  @ApiProperty({
    example: 34,
    description: 'Rows summed. Zero is a real answer, not a missing one.',
  })
  count!: number;
}

/**
 * The budget side of the summary.
 *
 * `total` is what the mosque planned: the sum of `active` budgets whose period overlaps the window. Draft budgets
 * are excluded because a draft is a proposal, and cancelled and closed ones because they no longer govern
 * anything.
 *
 * `remaining` is that figure less the money that went out in the same window — paid expenses **and** paid
 * salaries, since both are the mosque spending. It is `null`, not `"0.00"`, when no active budget overlaps the
 * window: there is nothing to have a remainder of, and returning zero would read as "fully spent". It goes
 * negative when spending has exceeded the plan, which is a fact worth reporting rather than clamping.
 */
export class BudgetSummaryDto {
  @ApiProperty({
    example: '250000.00',
    description: 'Sum of `active` budgets overlapping the window.',
  })
  total!: string;

  @ApiProperty({ example: 4, description: 'How many active budgets overlap the window.' })
  count!: number;

  @ApiProperty({
    nullable: true,
    example: '67500.00',
    description:
      'Planned less paid expenses and paid salaries. `null` when no active budget overlaps the window; ' +
      'negative when the plan has been overspent.',
  })
  remaining!: string | null;
}

/**
 * One mosque's finances over a window, in a single response.
 *
 * Six aggregate queries, no row loading. Nothing here is computed by fetching transactions and adding them up in
 * JavaScript — the database sums, and this object carries the results.
 */
export class FinancialSummaryDto {
  @ApiProperty({ type: ReportRangeDto })
  range!: ReportRangeDto;

  @ApiProperty({
    example: 'BDT',
    description: 'The mosque’s configured currency. See the file comment.',
  })
  currency!: string;

  @ApiProperty({ type: ReportTotalDto, description: 'Money received. `completed` donations only.' })
  donations!: ReportTotalDto;

  @ApiProperty({ type: ReportTotalDto, description: 'Money spent. `paid` expenses only.' })
  expenses!: ReportTotalDto;

  @ApiProperty({
    type: ReportTotalDto,
    description: 'Payroll paid out. `paid` salary records only.',
  })
  salaries!: ReportTotalDto;

  @ApiProperty({ type: BudgetSummaryDto })
  budget!: BudgetSummaryDto;

  @ApiProperty({
    example: '38000.00',
    description:
      'Donations less expenses less salaries — what the window added to or took from the mosque’s funds. ' +
      'Negative when more went out than came in.',
  })
  netBalance!: string;
}

/** A total against one status, for whichever enum the report is breaking down. */
export class StatusTotalDto {
  @ApiProperty({
    example: 'completed',
    description: 'A status of the table being reported on. Only statuses actually present appear.',
    enum: [
      ...new Set([
        ...Object.values(DonationStatus),
        ...Object.values(ExpenseStatus),
        ...Object.values(SalaryStatus),
        ...Object.values(BudgetStatus),
      ]),
    ],
  })
  status!: string;

  @ApiProperty({ example: '182500.00' })
  total!: string;

  @ApiProperty({ example: 34 })
  count!: number;
}

/** How the money came in. */
export class PaymentMethodTotalDto {
  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.cash })
  paymentMethod!: PaymentMethod;

  @ApiProperty({ example: '96000.00' })
  total!: string;

  @ApiProperty({ example: 21 })
  count!: number;
}

/** What a category of spending came to. */
export class CategoryTotalDto {
  @ApiProperty({ example: 'Utilities' })
  category!: string;

  @ApiProperty({ example: '43200.00' })
  total!: string;

  @ApiProperty({ example: 9 })
  count!: number;
}

/**
 * A budget category against what was actually spent on it.
 *
 * The join is on the category string, which is how `Budget.category` and `Expense.category` relate — there is no
 * foreign key between them, and an expense is not assigned to a particular budget row.
 *
 * `spent` counts paid expenses only, and **not salaries**: a salary record has no category, so there is no
 * honest category to charge it to. A mosque that budgets for payroll will see that line's `spent` stay at zero
 * while the summary's `remaining` does account for the salaries — the two answer different questions, and the
 * summary is the one to read for "how much of the plan is left".
 *
 * A category appears here if it has a budget, spending, or both. One with spending and no budget shows
 * `planned: "0.00"` and a negative `remaining`, which is unbudgeted expenditure and precisely the thing a report
 * exists to surface.
 */
export class BudgetLineDto {
  @ApiProperty({ example: 'Utilities' })
  category!: string;

  @ApiProperty({
    example: '50000.00',
    description: 'Sum of `active` budgets for this category in the window.',
  })
  planned!: string;

  @ApiProperty({
    example: '43200.00',
    description: 'Sum of `paid` expenses in this category in the window.',
  })
  spent!: string;

  @ApiProperty({
    example: '6800.00',
    description: 'Planned less spent. Negative where spending has run past the plan.',
  })
  remaining!: string;
}

/** A pay period and what was paid out for it. */
export class PayPeriodTotalDto {
  @ApiProperty({ example: '2026-08', description: 'The month the pay was *for*, `YYYY-MM`.' })
  payPeriod!: string;

  @ApiProperty({ example: '105000.00' })
  total!: string;

  @ApiProperty({ example: 3 })
  count!: number;
}

/** Donations over the window. The headline counts `completed` only; `byStatus` shows the rest. */
export class DonationReportDto {
  @ApiProperty({ type: ReportRangeDto })
  range!: ReportRangeDto;

  @ApiProperty({ example: 'BDT' })
  currency!: string;

  @ApiProperty({ example: '182500.00', description: '`completed` donations only.' })
  total!: string;

  @ApiProperty({ example: 34, description: '`completed` donations only.' })
  count!: number;

  @ApiProperty({
    type: [StatusTotalDto],
    description:
      'Every status present, so pending and failed money is visible rather than merely excluded.',
  })
  byStatus!: StatusTotalDto[];

  @ApiProperty({
    type: [PaymentMethodTotalDto],
    description: '`completed` donations only, so the parts sum to `total`.',
  })
  byPaymentMethod!: PaymentMethodTotalDto[];
}

/** Expenses over the window. The headline counts `paid` only. */
export class ExpenseReportDto {
  @ApiProperty({ type: ReportRangeDto })
  range!: ReportRangeDto;

  @ApiProperty({ example: 'BDT' })
  currency!: string;

  @ApiProperty({ example: '144500.00', description: '`paid` expenses only.' })
  total!: string;

  @ApiProperty({ example: 27, description: '`paid` expenses only.' })
  count!: number;

  @ApiProperty({
    type: [StatusTotalDto],
    description: 'Every status present. `pending` and `approved` are money owed but not yet gone.',
  })
  byStatus!: StatusTotalDto[];

  @ApiProperty({
    type: [CategoryTotalDto],
    description: '`paid` expenses only, so the parts sum to `total`.',
  })
  byCategory!: CategoryTotalDto[];
}

/** Budgets overlapping the window, and how each category is tracking against them. */
export class BudgetReportDto {
  @ApiProperty({ type: ReportRangeDto })
  range!: ReportRangeDto;

  @ApiProperty({ example: 'BDT' })
  currency!: string;

  @ApiProperty({ example: '250000.00', description: '`active` budgets only.' })
  total!: string;

  @ApiProperty({ example: 4, description: '`active` budgets only.' })
  count!: number;

  @ApiProperty({
    type: [StatusTotalDto],
    description:
      'Every status present, so a draft plan is visible without being counted as one in force.',
  })
  byStatus!: StatusTotalDto[];

  @ApiProperty({
    type: [BudgetLineDto],
    description: 'Category by category, plan against spending.',
  })
  lines!: BudgetLineDto[];
}

/**
 * Salaries over the window. The headline counts `paid` only.
 *
 * Grouped by pay period, and deliberately **not by person**. A per-person breakdown would make one endpoint hand
 * over every member of staff's pay, and anyone needing that can list `/api/v1/salaries`, where the same
 * permissions apply and a caller holding only `salary.viewOwn` is narrowed to themselves. A report gated on
 * `finance.view` is the wrong shape for it.
 *
 * `from` and `to` filter on `paymentDate` — when the money moved — which is why a September window can show a
 * `2026-08` pay period. That is not an inconsistency: it is August's salary, paid in September.
 */
export class SalaryReportDto {
  @ApiProperty({ type: ReportRangeDto })
  range!: ReportRangeDto;

  @ApiProperty({ example: 'BDT' })
  currency!: string;

  @ApiProperty({ example: '315000.00', description: '`paid` salary records only.' })
  total!: string;

  @ApiProperty({ example: 9, description: '`paid` salary records only.' })
  count!: number;

  @ApiProperty({
    type: [StatusTotalDto],
    description: 'Every status present. `pending` is payroll owed.',
  })
  byStatus!: StatusTotalDto[];

  @ApiProperty({
    type: [PayPeriodTotalDto],
    description: '`paid` records only, newest period first, so the parts sum to `total`.',
  })
  byPeriod!: PayPeriodTotalDto[];
}

/** The envelope every financial report returns. `success` is always true — failures go to the filter. */
export class FinancialSummaryEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Financial summary retrieved successfully' })
  message!: string;

  @ApiProperty({ type: FinancialSummaryDto })
  data!: FinancialSummaryDto;
}

export class DonationReportEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Donation report retrieved successfully' })
  message!: string;

  @ApiProperty({ type: DonationReportDto })
  data!: DonationReportDto;
}

export class ExpenseReportEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Expense report retrieved successfully' })
  message!: string;

  @ApiProperty({ type: ExpenseReportDto })
  data!: ExpenseReportDto;
}

export class BudgetReportEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Budget report retrieved successfully' })
  message!: string;

  @ApiProperty({ type: BudgetReportDto })
  data!: BudgetReportDto;
}

export class SalaryReportEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Salary report retrieved successfully' })
  message!: string;

  @ApiProperty({ type: SalaryReportDto })
  data!: SalaryReportDto;
}
