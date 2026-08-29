/**
 * `GET /financial-reports/*` — the mosque's money, totalled by the database.
 *
 * Read-only: five GETs, no POST, no PATCH, no DELETE, and no report table behind any of it. Every figure is
 * computed from the donations, expenses, budgets and salary records that already exist, which is why a
 * report cannot disagree with the rows it describes.
 *
 * **This module is why the frontend never adds money up.** Each response is the output of aggregate queries
 * run in the database, so a total shown on a dashboard is the server's total, not a sum over the current
 * page. Every amount is an exact decimal `string` — see `web/src/lib/finance/decimal.ts` for why nothing
 * here is ever passed through `Number()`.
 *
 * All five routes require `finance.view`, which is held by the treasurer, the mosque admin and the platform
 * admin. `report.view` — held by the secretary and the imam — is deliberately *not* accepted by the
 * backend for these, and one of them reports on salaries.
 */

import { apiGet } from "./apiClient";
import type { BudgetStatus, DonationStatus, ExpenseStatus, PaymentMethod, SalaryStatus } from "./enums";

/**
 * The window every report takes, and the only two parameters any of them accepts.
 *
 * There is no `mosqueId` — it comes from the access token — and no `page`, because a report is one object.
 * Both bounds are optional, both inclusive, and omitting both reports on everything ever recorded.
 */
export type ReportWindow = {
  /** Inclusive start, `YYYY-MM-DD`. */
  from?: string;
  /** Inclusive end, `YYYY-MM-DD` — the whole day, including an evening donation. */
  to?: string;
};

/** The window echoed back. `null` at either end means unbounded. */
export type ReportRange = {
  from: string | null;
  to: string | null;
};

/** A total and the number of rows behind it. `"0.00"` and `0` are real answers, not missing ones. */
export type ReportTotal = {
  total: string;
  count: number;
};

/**
 * The budget side of the summary.
 *
 * `remaining` is the plan less paid expenses **and** paid salaries. It is `null` when no active budget
 * overlaps the window — nothing to have a remainder of, and `"0.00"` would read as "fully spent" — and
 * negative when the plan has been overspent.
 */
export type BudgetSummary = {
  total: string;
  count: number;
  remaining: string | null;
};

/**
 * One mosque's finances over a window.
 *
 * A headline total counts only money that moved: donations when `completed`, expenses and salaries when
 * `paid`, budgets when `active`. Outstanding amounts are not hidden — they are in the `byStatus` breakdowns
 * on the reports below — they are just not summed into a figure that claims to be what the mosque holds.
 */
export type FinancialSummary = {
  range: ReportRange;
  /** The mosque's configured currency. There are no exchange rates anywhere in this system. */
  currency: string;
  income?: ReportTotal;
  donations: ReportTotal;
  expenses: ReportTotal;
  salaries: ReportTotal;
  budget: BudgetSummary;
  /** Donations/income less expenses less salaries. Negative when more went out than came in. */
  netBalance: string;
};

/**
 * A total against one status.
 *
 * `status` is a plain `string` rather than a union: the backend types it as one because the same DTO
 * carries donation, expense, budget and salary statuses, and only the statuses actually present appear.
 * Widening it here would be a lie in the other direction, so it stays as the backend declares it.
 */
export type StatusTotal = {
  status: DonationStatus | ExpenseStatus | BudgetStatus | SalaryStatus | string;
  total: string;
  count: number;
};

export type PaymentMethodTotal = {
  paymentMethod: PaymentMethod;
  total: string;
  count: number;
};

export type CategoryTotal = {
  category: string;
  total: string;
  count: number;
};

/**
 * A budget category against what was spent on it.
 *
 * `spent` counts paid expenses only and **not salaries**, because a salary record has no category. A
 * category with spending and no budget shows `planned: "0.00"` and a negative `remaining` — unbudgeted
 * expenditure, which is the thing a report exists to surface.
 */
export type BudgetLine = {
  category: string;
  planned: string;
  spent: string;
  remaining: string;
};

export type PayPeriodTotal = {
  /** `YYYY-MM`. */
  payPeriod: string;
  total: string;
  count: number;
};

/** Headline counts `completed` only; `byPaymentMethod` also counts `completed`, so its parts sum to it. */
export type DonationReport = {
  range: ReportRange;
  currency: string;
  total: string;
  count: number;
  byStatus: StatusTotal[];
  byPaymentMethod: PaymentMethodTotal[];
};

/** Headline counts `paid` only. `pending` and `approved` appear in `byStatus` as money owed. */
export type ExpenseReport = {
  range: ReportRange;
  currency: string;
  total: string;
  count: number;
  byStatus: StatusTotal[];
  byCategory: CategoryTotal[];
};

/** A budget counts if its period *overlaps* the window, not if it falls inside it. */
export type BudgetReport = {
  range: ReportRange;
  currency: string;
  total: string;
  count: number;
  byStatus: StatusTotal[];
  lines: BudgetLine[];
};

/**
 * Payroll over the window, grouped by pay period and deliberately **not by person**.
 *
 * The window filters on `paymentDate`, when the money left the account — which is why a September window
 * can show an August pay period. That is August's salary, paid in September.
 */
export type SalaryReport = {
  range: ReportRange;
  currency: string;
  total: string;
  count: number;
  byStatus: StatusTotal[];
  byPeriod: PayPeriodTotal[];
};

/**
 * Builds the query.
 *
 * `whitelist: true, forbidNonWhitelisted: true` is on globally, so a key the DTO does not declare is a 400
 * rather than something the server ignores. `FinancialReportQueryDto` declares `from` and `to` and nothing
 * else, so nothing else may be sent — and `apiGet` drops the keys whose value is `undefined`.
 */
function windowQuery(window: ReportWindow = {}) {
  return { from: window.from, to: window.to };
}

export function fetchFinancialSummary(window?: ReportWindow): Promise<FinancialSummary> {
  return apiGet<FinancialSummary>("/financial-reports/summary", windowQuery(window));
}

export function fetchDonationReport(window?: ReportWindow): Promise<DonationReport> {
  return apiGet<DonationReport>("/financial-reports/donations", windowQuery(window));
}

export function fetchExpenseReport(window?: ReportWindow): Promise<ExpenseReport> {
  return apiGet<ExpenseReport>("/financial-reports/expenses", windowQuery(window));
}

export function fetchBudgetReport(window?: ReportWindow): Promise<BudgetReport> {
  return apiGet<BudgetReport>("/financial-reports/budget", windowQuery(window));
}

export function fetchSalaryReport(window?: ReportWindow): Promise<SalaryReport> {
  return apiGet<SalaryReport>("/financial-reports/salary", windowQuery(window));
}

export { fetchFundsSummary, fetchFundsWithBalances, type FundsSummary, type FundWithBalance } from "./donationFundsService";

