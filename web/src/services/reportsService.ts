/**
 * `GET /reports/*` — read-only summaries of records other modules own.
 *
 * Seven GETs, no writes, and no report table behind any of them. Every figure is computed from the users,
 * volunteers, donations, expenses, budgets and salary records that already exist.
 *
 * **Every route needs two permissions, and that is the whole point of this module.** `report.view` gets a
 * caller to the reports; the second grant is the *subject*. `report.view` alone is not an entitlement to the
 * mosque's money or its member directory: the shipped role map gives an `imam` `report.view` and gives them
 * neither `finance.view` nor `user.view` nor `volunteer.view`. So a reports screen must gate each panel on
 * **both** — `can("report.view") && can("user.view")` — and not fetch the ones it cannot show.
 *
 * **`/reports/donations`, `/reports/expenses` and `/reports/finance` return the same objects as the matching
 * `/financial-reports/*` routes; only the grant differs.** `/financial-reports/*` requires `finance.view`,
 * which is held by people already trusted with payroll, while `/reports/donations` requires
 * `donation.view` — so a fundraising volunteer can read donation figures without being handed the payroll
 * grant. Pick the route by which permission the caller actually holds, and never call both for one panel.
 *
 * **Two kinds of figure appear here and confusing them produces a wrong number in a meeting.** A *headcount*
 * (`total`, `active`, `byRole`) answers "how many are there" and **ignores `from`/`to` entirely**; a *flow*
 * figure (`joined`) answers "how many arrived during the window". A window control must therefore be labelled
 * as affecting the joined/flow figures, not the totals beside them.
 *
 * All amounts are exact decimal `string`s. Nothing here is parsed or summed in the browser.
 */

import { apiGet } from "./apiClient";
import type {
  DonationReport,
  ExpenseReport,
  FinancialSummary,
  ReportRange,
  ReportWindow,
} from "./financialReportsService";
import type { VolunteerStatus } from "./enums";
import type { Role } from "../lib/permissions";

/** How many people hold one role. **Zero-count roles are omitted, not zero-filled** — a chart must not assume every role appears. */
export type ReportRoleCount = {
  role: Role;
  /** Headcount now. Ignores the window. */
  count: number;
};

/** How many volunteers are in one state. Only states actually present appear. */
export type ReportVolunteerStatusCount = {
  status: VolunteerStatus;
  count: number;
};

/**
 * The people report. `report.view` **and** `user.view`.
 *
 * Soft-deleted users are excluded from every figure — a deleted record is retained so the rows referencing it
 * still resolve, not so it can be counted as a member.
 *
 * **No names, emails or phone numbers are returned**, deliberately: a report that listed the directory would
 * be a directory. A screen wanting the people themselves reads `/users`, under `user.view`.
 */
export type UserReport = {
  range: ReportRange;
  /** Headcount now, excluding deleted records. Ignores the window. */
  total: number;
  /** Of that headcount, how many can still sign in. */
  active: number;
  /** `total` less `active`. Deactivated, not deleted. */
  inactive: number;
  /** How many of them volunteer. A volunteer is a user, so this is a subset of `total`. */
  volunteers: number;
  /** Users created inside the window. Equals `total` when no window was given. */
  joined: number;
  /** Sums to `total`. */
  byRole: ReportRoleCount[];
};

/**
 * The volunteer report. `report.view` **and** `volunteer.view`.
 *
 * A volunteer record carries no mosque of its own — it hangs off a user, and the user carries the mosque — so a
 * volunteer whose user has been deleted drops out of every figure here.
 */
export type VolunteerReport = {
  range: ReportRange;
  /** Volunteers now. Ignores the window. */
  total: number;
  /** Joined inside the window. Equals `total` when no window was given. */
  joined: number;
  /** Sums to `total`. */
  byStatus: ReportVolunteerStatusCount[];
};

/**
 * The events report — present, and deliberately empty of figures.
 *
 * **There is no events table in this schema yet**, so `tracked` is `false` and every figure is `null`. Zeroes
 * are not returned in their place, because `0` asserts "this mosque ran no events" — a claim about the mosque,
 * when the truth is a claim about the software.
 *
 * A view must therefore branch on `tracked` and show a notice, never render `null` as `0` or `—` beside real
 * figures. When an `Event` model lands, `tracked` becomes `true` and the numbers fill in with no other change.
 */
export type EventReport = {
  range: ReportRange;
  /** `false` means every figure below is `null`. */
  tracked: boolean;
  /** Events inside the window. `null` while untracked. */
  total: number | null;
  /** Events still to come. `null` while untracked. */
  upcoming: number | null;
  /** Registrations taken. `null` while untracked. */
  registrations: number | null;
};

/** The people block of the combined summary. */
export type ReportUserSummary = {
  total: number;
  active: number;
  volunteers: number;
  /** Joined inside the window. */
  joined: number;
};

/** The volunteer block of the combined summary. */
export type ReportVolunteerSummary = {
  total: number;
  /** Currently available, rather than inactive or on leave. */
  active: number;
  joined: number;
};

/**
 * Everything the caller is entitled to see, in one response. `report.view`.
 *
 * **Each block is `null` unless the caller holds that subject's permission, and an omitted block is never
 * queried** — this is not a filter over a full result. So `null` means "not shown to you", never "zero": a
 * card rendering `finance: null` as `৳0.00` would be inventing a figure. Show an access note instead.
 *
 * A caller holding only `report.view` gets the range and an untracked events block, which is the correct
 * answer rather than an error.
 */
export type ReportSummary = {
  range: ReportRange;
  /** `null` unless the caller holds `user.view`. */
  users: ReportUserSummary | null;
  /** `null` unless the caller holds `volunteer.view`. */
  volunteers: ReportVolunteerSummary | null;
  /** `null` unless the caller holds `finance.view`. The same object `/financial-reports/summary` returns. */
  finance: FinancialSummary | null;
  /** Always present, always untracked for now. See {@link EventReport}. */
  events: EventReport;
};

/**
 * Builds the query.
 *
 * Every route here reuses `FinancialReportQueryDto`, which declares `from` and `to` and **nothing else** — no
 * `page`, no `search`, no `mosqueId`. With `forbidNonWhitelisted: true` on globally, any other key is a 400.
 */
function windowQuery(window: ReportWindow = {}) {
  return { from: window.from, to: window.to };
}

/** `report.view`. Blocks the caller cannot see come back `null`, not zero. */
export function fetchReportSummary(window?: ReportWindow): Promise<ReportSummary> {
  return apiGet<ReportSummary>("/reports/summary", windowQuery(window));
}

/** `report.view` **and** `user.view`. */
export function fetchUserReport(window?: ReportWindow): Promise<UserReport> {
  return apiGet<UserReport>("/reports/users", windowQuery(window));
}

/**
 * `report.view` **and** `donation.view`.
 *
 * Identical figures to `/financial-reports/donations`, which needs `finance.view` instead. Headline counts
 * `completed` donations only; the status breakdown shows what was left out.
 */
export function fetchDonationsReport(window?: ReportWindow): Promise<DonationReport> {
  return apiGet<DonationReport>("/reports/donations", windowQuery(window));
}

/**
 * `report.view` **and** `expense.view` — the read grant, kept separate from `expense.manage` so someone can
 * see what was spent without being trusted to record it. Headline counts `paid` expenses only.
 */
export function fetchExpensesReport(window?: ReportWindow): Promise<ExpenseReport> {
  return apiGet<ExpenseReport>("/reports/expenses", windowQuery(window));
}

/**
 * `report.view` **and** `event.view`.
 *
 * Answers `200` with `tracked: false` and every figure `null` — it is guarded and documented now so a client
 * written against it keeps working when the model lands.
 */
export function fetchEventsReport(window?: ReportWindow): Promise<EventReport> {
  return apiGet<EventReport>("/reports/events", windowQuery(window));
}

/** `report.view` **and** `volunteer.view`. */
export function fetchVolunteersReport(window?: ReportWindow): Promise<VolunteerReport> {
  return apiGet<VolunteerReport>("/reports/volunteers", windowQuery(window));
}

/**
 * `report.view` **and** `finance.view`.
 *
 * Four aggregates in one transaction, so the figures describe a single moment rather than four. Totals count
 * money that actually moved: `completed` donations, `paid` expenses, `paid` salaries, `active` budgets.
 * `netBalance` goes negative when more went out than came in — report it, do not clamp it.
 */
export function fetchFinanceReport(window?: ReportWindow): Promise<FinancialSummary> {
  return apiGet<FinancialSummary>("/reports/finance", windowQuery(window));
}
