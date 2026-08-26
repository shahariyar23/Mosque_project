/**
 * `/salaries` — what the mosque pays its staff.
 *
 * **There is no staff or imam record anywhere in this system.** An imam is an ordinary user who has rows in this
 * table; so is a caretaker, so is a teacher. The employee picker is therefore a user picker — read `/users` for
 * it — and "staff" is not a filter that exists.
 *
 * **No payroll runs behind this.** Nothing computes tax, deducts anything, derives gross from net, or pays
 * anybody. `status: "paid"` records a decision made elsewhere. Wording like "Run payroll" or "Disburse" would
 * be false.
 *
 * **`payPeriod` and `paymentDate` are two different facts and a screen needs both.** `payPeriod` is the month
 * the pay is *for* (`YYYY-MM`); `paymentDate` is the day the money moved. August's salary paid on 3 September
 * is `{ payPeriod: "2026-08", paymentDate: "2026-09-03" }` — showing only one of them leaves a reader unable to
 * say whether a September payment settled August or September.
 *
 * **There is no `DELETE`.** A record is retired with `PATCH { status: "cancelled" }`, which keeps it readable
 * and stops the reports counting it. So the table gets *Cancel*, not delete.
 *
 * `salary.view` reads the whole payroll; `salary.viewOwn` reads only one's own. That narrowing happens in the
 * service, so the `userId` filter below cannot be used to read somebody else's pay. `salary.manage` to write.
 */

import { apiGet, apiList, apiPatch, apiPost } from "./apiClient";
import type { ListResult } from "./apiClient";
import type { SalaryStatus } from "./enums";

/** The server's default `limit` on this list. */
export const DEFAULT_SALARY_PAGE_SIZE = 20;

/**
 * `YYYY-MM`, month 01–12. The shape the server enforces.
 *
 * A fixed shape rather than free text, so `"2026-08"` and `"August 2026"` cannot both exist in the column and
 * be counted as two periods by a report that groups on it. Validate a period input against this before sending.
 */
export const PAY_PERIOD_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])$/;

/**
 * Just enough of the person being paid to name them.
 *
 * The reduction is the security boundary, not an economy: whoever may read the payroll can read a row about
 * every member of staff, and attaching each one's email, phone, role and account state would make `salary.view`
 * a back door into the user directory. A payroll table must not try to show contact details it does not have.
 */
export type SalaryEmployeeRef = {
  id: string;
  fullName: string;
};

/**
 * One salary record.
 *
 * `paymentDate` is a calendar day (`YYYY-MM-DD`), not a timestamp — nobody records the minute a salary was
 * handed over. Do not put it through `new Date()` for display.
 *
 * Only **`paid`** is counted by a financial report as money that left; `pending` is money owed.
 */
export type SalaryRecord = {
  id: string;
  /** Never reassigned after creation. */
  user: SalaryEmployeeRef;
  /** Decimal string, e.g. `"35000.00"`. Never parse it. */
  amount: string;
  /** ISO 4217, as stored on the row when it was written. */
  currency: string;
  /** `YYYY-MM` — the month the pay is *for*. */
  payPeriod: string;
  /** `YYYY-MM-DD` — the day the money moved. */
  paymentDate: string;
  status: SalaryStatus;
  /** Internal. */
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * The filters this list accepts, and only these.
 *
 * **There is no `search`.** Finding one person's records goes through `userId`, which means the employee filter
 * must be a picker over `/users` rather than a text box — a name typed here would be a 400.
 *
 * `from`/`to` filter on `paymentDate` (when money moved); `payPeriod` matches the month the pay was *for*, and
 * they differ. Both filters exist because both questions are asked. `to` must not fall before `from`.
 */
export type SalaryRecordQuery = {
  page?: number;
  /** Capped at 100. Defaults to 20. */
  limit?: number;
  /** One person's records. A `salary.viewOwn` caller stays narrowed to themselves whatever is sent. */
  userId?: string;
  status?: SalaryStatus;
  /** `YYYY-MM`, matched exactly. */
  payPeriod?: string;
  /** `YYYY-MM-DD`, inclusive, on `paymentDate`. */
  from?: string;
  /** `YYYY-MM-DD`, inclusive, on `paymentDate`. */
  to?: string;
};

/**
 * Recording pay. `userId`, `amount`, `payPeriod` and `paymentDate` are required.
 *
 * `userId` must be an existing, active user of the caller's own mosque — a foreign or unknown id is a 400.
 * `status` defaults to `"pending"`, which is money owed rather than money gone.
 */
export type CreateSalaryRecordInput = {
  /** A user of the caller's own mosque. There is no separate staff record. */
  userId: string;
  /** Decimal string greater than zero. The figure agreed; nothing deducts from it. */
  amount: string;
  /** ISO 4217, 3 letters. Defaults to the mosque's currency and is then stored on the row. */
  currency?: string;
  /** `YYYY-MM`, the month this pay is for. */
  payPeriod: string;
  /** `YYYY-MM-DD`, the day the money moved or is due to. */
  paymentDate: string;
  /** Defaults to `"pending"`. Only `"paid"` is counted by the reports. */
  status?: SalaryStatus;
  /** ≤ 2000 characters. Internal. */
  notes?: string | null;
};

/**
 * Amending a record. Every field optional.
 *
 * **`userId` is deliberately absent.** Reassigning it would turn one person's pay record into another's — the
 * amount, the period and the paid status would stay put while the name on them changed. A record raised against
 * the wrong user is *cancelled*, and a correct one created; the form must not offer an employee field on edit.
 *
 * `notes` is the only nullable column, so `null` clears it. Sending `null` for any of the others is a
 * field-level 400.
 */
export type UpdateSalaryRecordInput = {
  /** Decimal string greater than zero. */
  amount?: string;
  currency?: string;
  payPeriod?: string;
  paymentDate?: string;
  /** `"paid"` is what makes a report count it; `"cancelled"` retires it. */
  status?: SalaryStatus;
  /** `null` clears the note. */
  notes?: string | null;
};

/** A page of salary records. `salary.view`, or `salary.viewOwn` for one's own. */
export function fetchSalaryRecords(
  query: SalaryRecordQuery = {},
): Promise<ListResult<SalaryRecord>> {
  return apiList<SalaryRecord>("/salaries", {
    page: query.page,
    limit: query.limit,
    userId: query.userId,
    status: query.status,
    payPeriod: query.payPeriod,
    from: query.from,
    to: query.to,
  });
}

export function fetchSalaryRecord(id: string): Promise<SalaryRecord> {
  return apiGet<SalaryRecord>(`/salaries/${id}`);
}

/** `salary.manage`. An unknown, inactive or foreign `userId` is a `400`. */
export function createSalaryRecord(input: CreateSalaryRecordInput): Promise<SalaryRecord> {
  return apiPost<SalaryRecord>("/salaries", input);
}

/** `salary.manage`. */
export function updateSalaryRecord(
  id: string,
  input: UpdateSalaryRecordInput,
): Promise<SalaryRecord> {
  return apiPatch<SalaryRecord>(`/salaries/${id}`, input);
}

/**
 * Marks a record as paid. `salary.manage`.
 *
 * It records that the money went out; it does not send it. This is the state a financial report counts.
 */
export function markSalaryPaid(id: string): Promise<SalaryRecord> {
  return apiPatch<SalaryRecord>(`/salaries/${id}`, { status: "paid" });
}

/**
 * Retires a record without removing it. `salary.manage`.
 *
 * This is the stand-in for the DELETE that deliberately does not exist: the row stays readable and the reports
 * stop counting it, which is what an auditable payroll needs.
 */
export function cancelSalaryRecord(id: string): Promise<SalaryRecord> {
  return apiPatch<SalaryRecord>(`/salaries/${id}`, { status: "cancelled" });
}
