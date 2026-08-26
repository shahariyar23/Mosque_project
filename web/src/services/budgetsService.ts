/**
 * `/budgets` — what the mosque intends to spend on something over a period.
 *
 * **Nothing here restricts spending.** Creating a budget does not cap an expense, block one, or require
 * approval for one. It records an intention; `/financial-reports/budget` says afterwards whether it was kept.
 * So a budgets screen must not describe a figure as "available" or "remaining" on its own.
 *
 * **There is no `spent` or `remaining` on a budget row.** Those come from comparing this row with the expenses
 * booked against its category, which this module never reads. Any progress bar has to be built from
 * `/financial-reports/budget`, which puts the two side by side — and never by summing expenses in the browser.
 *
 * **`category` is free text and links to `Expense.category` by convention, not by constraint.** Budgeting for
 * "Generator fuel" before a litre has been bought is the normal case, so the category control is a text input
 * (or a combo box over categories already in use), never a fixed list. A typo produces a budget nothing is
 * ever matched against, which is worth a hint in the form.
 *
 * `amount` is a decimal **string** paired with `currency`, in and out, and nothing here parses it.
 *
 * `budget.view` to read, `budget.manage` to create, revise and delete.
 */

import { apiDelete, apiGet, apiList, apiPatch, apiPost } from "./apiClient";
import type { ListResult } from "./apiClient";
import type { BudgetStatus } from "./enums";

/** The server's default `limit` on this list. */
export const DEFAULT_BUDGET_PAGE_SIZE = 20;

/** Just enough of the person who set the budget to name them. Not their user record. */
export type BudgetAuthorRef = {
  id: string;
  fullName: string;
};

/**
 * One budget line.
 *
 * `periodStart`/`periodEnd` are calendar days (`YYYY-MM-DD`), both inclusive. A budget covers days, so do not
 * put them through `new Date()` for display.
 *
 * Only an **`active`** budget is counted when a report works out remaining budget — a `draft` is a proposal,
 * `closed` settles a period that is over, `cancelled` abandons the line while keeping the record. That makes
 * `status` the field a screen most needs to show, not decoration.
 *
 * `createdBy` is taken from the token when the row is written and never reassigned. `notes` is internal —
 * usually how the figure was arrived at.
 */
export type Budget = {
  id: string;
  /** What the line is called on the paper it came from, e.g. `"Q3 Utilities"`. */
  name: string;
  /** The spending category it governs. Matched against `Expense.category` by the reports. */
  category: string;
  /** Decimal string, e.g. `"50000.00"`. Never parse it. */
  amount: string;
  /** ISO 4217, as stored on the row when it was written. */
  currency: string;
  /** `YYYY-MM-DD`, first day covered, inclusive. */
  periodStart: string;
  /** `YYYY-MM-DD`, last day covered, inclusive. */
  periodEnd: string;
  /** Only `"active"` is in force. */
  status: BudgetStatus;
  /** Internal. */
  notes: string | null;
  createdBy: BudgetAuthorRef;
  createdAt: string;
  updatedAt: string;
};

/** What a delete reports back. The figure is included so the confirmation is checkable. */
export type DeletedBudget = {
  id: string;
  name: string;
  category: string;
  amount: string;
  currency: string;
};

/**
 * The filters this list accepts, and only these.
 *
 * `search` covers name and category. **Notes are not searched.** `category` is an *exact, case-sensitive*
 * match on the stored value.
 *
 * **`from`/`to` select budgets whose period *overlaps* the window, not budgets contained by it.** "Which
 * budgets cover August?" is the treasurer's question, and an annual budget covers August without either
 * endpoint falling in it. `from` alone means "still running on or after this day"; `to` alone means "had
 * already started by this day". A date picker here should be labelled as a period overlap, not a period range.
 */
export type BudgetQuery = {
  page?: number;
  /** Capped at 100. Defaults to 20. */
  limit?: number;
  /** Name and category. Trimmed to 120 characters. */
  search?: string;
  status?: BudgetStatus;
  /** Exact, case-sensitive. */
  category?: string;
  /** `YYYY-MM-DD`, inclusive. Budgets still running on or after this day. */
  from?: string;
  /** `YYYY-MM-DD`, inclusive. Budgets that had already started by this day. */
  to?: string;
};

/**
 * Setting a budget. `name`, `category`, `amount`, `periodStart` and `periodEnd` are required.
 *
 * `status` defaults to `"draft"`, so a new figure is not in force merely because it was entered — a form that
 * means it to count must send `"active"`.
 *
 * `periodStart` must not fall after `periodEnd`; a single-day period is allowed. That comparison happens in the
 * service, so it arrives as a plain 400 rather than a field error.
 */
export type CreateBudgetInput = {
  /** 2–160 characters. */
  name: string;
  /** 2–120 characters, free text. Need not already appear on any expense. */
  category: string;
  /** Decimal string greater than zero. A budget of nothing is not a plan. */
  amount: string;
  /** ISO 4217, 3 letters. Defaults to the mosque's currency and is then stored on the row. */
  currency?: string;
  /** `YYYY-MM-DD`, inclusive. */
  periodStart: string;
  /** `YYYY-MM-DD`, inclusive. Must not fall before `periodStart`. */
  periodEnd: string;
  /** Defaults to `"draft"`. Only `"active"` is counted by the reports. */
  status?: BudgetStatus;
  /** ≤ 2000 characters. Internal. */
  notes?: string | null;
};

/**
 * Revising a budget. Every field optional.
 *
 * `notes` is the only nullable column. The rest are required columns: they may be *changed* but not cleared, so
 * sending `null` for one is a field-level 400.
 *
 * Either end of the period may be moved alone; whichever is sent is compared against the *stored* value of the
 * other.
 */
export type UpdateBudgetInput = {
  name?: string;
  category?: string;
  /** Decimal string greater than zero. May be revised, not cleared. */
  amount?: string;
  currency?: string;
  periodStart?: string;
  periodEnd?: string;
  /** `"draft"` → `"active"` is what puts the figure in force. */
  status?: BudgetStatus;
  notes?: string | null;
};

/** A page of budgets. `budget.view`. */
export function fetchBudgets(query: BudgetQuery = {}): Promise<ListResult<Budget>> {
  return apiList<Budget>("/budgets", {
    page: query.page,
    limit: query.limit,
    search: query.search,
    status: query.status,
    category: query.category,
    from: query.from,
    to: query.to,
  });
}

export function fetchBudget(id: string): Promise<Budget> {
  return apiGet<Budget>(`/budgets/${id}`);
}

/** `budget.manage`. */
export function createBudget(input: CreateBudgetInput): Promise<Budget> {
  return apiPost<Budget>("/budgets", input);
}

/** `budget.manage`. */
export function updateBudget(id: string, input: UpdateBudgetInput): Promise<Budget> {
  return apiPatch<Budget>(`/budgets/${id}`, input);
}

/**
 * Deletes a budget in **any** state. `budget.manage`, answers `200`. Deleting twice is a `404`.
 *
 * This is the one financial delete with no `409`, and the backend gives the reason: an expense records money
 * that moved, so removing one erases a fact an auditor needs, while a budget records an intention and nothing
 * is reconciled against it. Every expense booked while it existed is untouched.
 *
 * A mosque that wants to keep the record of what it once planned should `PATCH` to `"cancelled"` instead, so
 * the confirm dialog is the right place to say so.
 */
export function deleteBudget(id: string): Promise<void> {
  return apiDelete(`/budgets/${id}`);
}

/** Abandons the line without losing the record of what was planned. `budget.manage`. */
export function cancelBudget(id: string): Promise<Budget> {
  return apiPatch<Budget>(`/budgets/${id}`, { status: "cancelled" });
}
