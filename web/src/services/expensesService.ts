/**
 * `/expenses` — money the mosque has spent, or is about to.
 *
 * **Nothing here pays anything.** No account is debited, no budget line drawn down, no approval requested.
 * `status: "paid"` is somebody recording that the money went out. UI wording that implies a transfer ("Pay",
 * "Process", "Release funds") would be false.
 *
 * **`category` is free text, not an enum.** One mosque's chart of accounts is "Utilities / Salaries /
 * Maintenance"; another separates the generator from the water pump. So the category control is a text input
 * (or a combo box built from the categories already returned by the list) — never a hard-coded `<select>`.
 *
 * **`DELETE` only works on a `pending` expense.** Once it is `approved`, `paid` or `cancelled` it is a
 * financial record and the delete answers `409`; the way to withdraw it is `PATCH { status: "cancelled" }`,
 * which leaves the figure and the date where an auditor can see them. So the row's delete action is offered
 * only while `status === "pending"`, and *Cancel* is offered otherwise.
 *
 * `amount` is a decimal **string** paired with `currency`, in and out. Nothing here parses it and nothing
 * here sums it — the totals a screen shows come from `/financial-reports/expenses`.
 *
 * `expense.view` to read, `expense.manage` to create, correct and delete.
 */

import { apiDelete, apiGet, apiList, apiPatch, apiPost } from "./apiClient";
import type { ListResult } from "./apiClient";
import type { ExpenseStatus, PaymentMethod } from "./enums";

/** The server's default `limit` on this list. */
export const DEFAULT_EXPENSE_PAGE_SIZE = 20;

/**
 * Just enough of the person who booked the expense to name them.
 *
 * Not their user record: an expense list is not an entitlement to read someone's email or phone.
 */
export type ExpenseAuthorRef = {
  id: string;
  fullName: string;
};

/**
 * One expense.
 *
 * `expenseDate` is a calendar day (`YYYY-MM-DD`), not a timestamp — it is the day the payment is booked to,
 * and the minute a bill was paid is not something anyone reconciles. Do not put it through `new Date()` for
 * display.
 *
 * `createdBy` is taken from the access token when the row is written and is never reassigned, which is what
 * makes it worth showing. `notes` is internal.
 *
 * There is no `budgetRemaining`, `monthToDate` or `runningTotal`: an expense reports itself.
 */
export type Expense = {
  id: string;
  /** The mosque's own words, e.g. `"Utilities"`. Free text. */
  category: string;
  description: string;
  /** Decimal string, e.g. `"4500.00"`. Never parse it. */
  amount: string;
  /** ISO 4217, as stored on the row when it was written. */
  currency: string;
  paymentMethod: PaymentMethod;
  status: ExpenseStatus;
  /** `YYYY-MM-DD`, the day the money was spent. */
  expenseDate: string;
  /** An invoice number, a cheque number, a bank reference. Not unique. */
  reference: string | null;
  /** Internal. */
  notes: string | null;
  createdBy: ExpenseAuthorRef;
  createdAt: string;
  updatedAt: string;
};

/**
 * What a delete reports back — the last chance anyone has to see what the row said, which is why the figure
 * is included. "Expense deleted" without the amount is not a confirmation anybody can check.
 */
export type DeletedExpense = {
  id: string;
  category: string;
  description: string;
  amount: string;
  currency: string;
};

/**
 * The filters this list accepts, and only these.
 *
 * `search` covers category, description and reference. **Notes are not searched.**
 *
 * `category` is an *exact, case-sensitive* match on the stored value — for grouping a list whose spelling the
 * caller already knows. Use `search` for a looser match.
 *
 * `from`/`to` filter on `expenseDate`, not `createdAt`: that is the question a treasurer reconciling August
 * actually asks. Both ends are inclusive and either may be given alone.
 */
export type ExpenseQuery = {
  page?: number;
  /** Capped at 100. Defaults to 20. */
  limit?: number;
  /** Category, description and reference. Trimmed to 120 characters. */
  search?: string;
  status?: ExpenseStatus;
  /** Exact, case-sensitive. */
  category?: string;
  /** `YYYY-MM-DD`, inclusive, on `expenseDate`. */
  from?: string;
  /** `YYYY-MM-DD`, inclusive, on `expenseDate`. */
  to?: string;
};

/**
 * Recording an expense. `category`, `description`, `amount`, `paymentMethod` and `expenseDate` are required.
 *
 * `description` is required because an expense nobody can explain is not a record. `status` defaults to
 * `"pending"`; `"approved"` and `"paid"` record decisions somebody has already made — no workflow runs behind
 * them.
 *
 * There is no `createdById`: who entered the payment comes from the token. Sending one is a 400.
 */
export type CreateExpenseInput = {
  /** 2–120 characters, free text. */
  category: string;
  /** 2–500 characters. */
  description: string;
  /** Decimal string greater than zero. A refund is not expressible here. */
  amount: string;
  /** ISO 4217, 3 letters. Defaults to the mosque's currency and is then stored on the row. */
  currency?: string;
  /** Recorded, not processed. */
  paymentMethod: PaymentMethod;
  /** `YYYY-MM-DD`, the day the money was spent. */
  expenseDate: string;
  /** Defaults to `"pending"`. */
  status?: ExpenseStatus;
  /** ≤ 120 characters. */
  reference?: string | null;
  /** ≤ 2000 characters. Internal. */
  notes?: string | null;
};

/**
 * Correcting an expense. Every field optional.
 *
 * Only `reference` and `notes` are nullable. The rest are required columns: they may be *changed* but not
 * cleared, so sending `null` for one of them is a field-level 400, not a no-op.
 *
 * `status: "cancelled"` is how an approved or paid expense is withdrawn — this is what the restricted DELETE
 * leaves to the PATCH.
 */
export type UpdateExpenseInput = {
  category?: string;
  description?: string;
  /** Decimal string greater than zero. May be corrected, not cleared. */
  amount?: string;
  currency?: string;
  paymentMethod?: PaymentMethod;
  expenseDate?: string;
  status?: ExpenseStatus;
  reference?: string | null;
  notes?: string | null;
};

/** A page of expenses. `expense.view`. */
export function fetchExpenses(query: ExpenseQuery = {}): Promise<ListResult<Expense>> {
  return apiList<Expense>("/expenses", {
    page: query.page,
    limit: query.limit,
    search: query.search,
    status: query.status,
    category: query.category,
    from: query.from,
    to: query.to,
  });
}

export function fetchExpense(id: string): Promise<Expense> {
  return apiGet<Expense>(`/expenses/${id}`);
}

/** `expense.manage`. */
export function createExpense(input: CreateExpenseInput): Promise<Expense> {
  return apiPost<Expense>("/expenses", input);
}

/** `expense.manage`. */
export function updateExpense(id: string, input: UpdateExpenseInput): Promise<Expense> {
  return apiPatch<Expense>(`/expenses/${id}`, input);
}

/**
 * Removes a **pending** expense. `expense.manage`, answers `200`.
 *
 * `409` if it is `approved`, `paid` or `cancelled` — cancel it instead. Deleting twice is a `404`. Because
 * `status` is on the row, the UI can tell in advance which action to offer.
 */
export function deleteExpense(id: string): Promise<void> {
  return apiDelete(`/expenses/${id}`);
}

/**
 * Withdraws an expense that has a history, without removing the record. `expense.manage`.
 *
 * The right action for anything past `pending`, and the one the backend names in its own delete documentation.
 */
export function cancelExpense(id: string): Promise<Expense> {
  return apiPatch<Expense>(`/expenses/${id}`, { status: "cancelled" });
}
