/**
 * `/donation-funds` — the standing purposes a donation can be directed to.
 *
 * A fund is a **category**, not a balance. There is no `raised`, `balance` or `donationCount` on the row, and
 * that is deliberate: money received is reported by `/financial-reports/donations`, so nothing here can publish
 * a figure nobody reconciled. `targetAmount` is a *goal*.
 *
 * **Nothing in this API enumerates fund names.** "Zakat", "Sadaqah", "Masjid Construction" are rows a mosque
 * creates — the set differs between mosques — so the UI must read the list rather than offer a fixed one.
 *
 * `fund.view` to read, `fund.manage` to create, update and delete.
 *
 * **Deleting is the exception, not the rule.** A fund with campaigns answers `409`; the intended way to retire
 * one that has been used is `PATCH { status: "archived" }`, which loses nothing and can be undone. So the
 * table's primary action is *Archive*, and delete is only offered when `campaignCount === 0`.
 */

import { apiDelete, apiGet, apiList, apiPatch, apiPost } from "./apiClient";
import type { ListResult } from "./apiClient";
import type { FundStatus } from "./enums";

/** The server's default `limit` on this list. */
export const DEFAULT_FUND_PAGE_SIZE = 20;

/**
 * One fund.
 *
 * `slug` is unique within the mosque and stable once issued — a public page may link to it, which is why
 * renaming the fund does not re-derive it.
 *
 * `startDate`/`endDate` are calendar days (`YYYY-MM-DD`), not timestamps, so a fund that opens on the 1st does
 * not read as the 31st west of Greenwich. Do not put them through `new Date()` for display.
 *
 * `campaignCount` is a row count, not money. It is also what makes a delete refuse.
 */
export type DonationFund = {
  id: string;
  name: string;
  /** Unique within the mosque. Two mosques may each have a `zakat`. */
  slug: string;
  description: string | null;
  status: FundStatus;
  /** Decimal string, or `null` for an open-ended fund. A goal, not a total raised. */
  targetAmount: string | null;
  /** `YYYY-MM-DD` or `null`. */
  startDate: string | null;
  /** `YYYY-MM-DD` or `null`. */
  endDate: string | null;
  /** Whether the public website may show this fund. */
  isPublic: boolean;
  /** How many campaigns collect into it. Deleting is refused while this is above zero. */
  campaignCount: number;
  createdAt: string;
  updatedAt: string;
};

/** What a delete reports back. `slug` is free again afterwards — a new fund may take it. */
export type DeletedDonationFund = {
  id: string;
  name: string;
  slug: string;
};

export type DonationFundQuery = {
  page?: number;
  /** Capped at 100. Defaults to 20. */
  limit?: number;
  /** Name, slug and description. Trimmed to 120 characters. */
  search?: string;
  status?: FundStatus;
};

/**
 * `name` is the only required field.
 *
 * `slug` is derived from the name when omitted, which is the normal case. `isPublic` defaults to **false** — a
 * new fund stays in the back office until someone says otherwise, so a form that wants it public must say so.
 *
 * `targetAmount` omitted means open-ended, which is normal for Zakat and for a general fund. An `endDate`
 * before `startDate` is a 400.
 */
export type CreateDonationFundInput = {
  /** 2–160 characters. */
  name: string;
  /** Lowercase words joined by single hyphens, ≤ 64 characters. Derived from `name` when omitted. */
  slug?: string;
  /** ≤ 2000 characters. */
  description?: string | null;
  /** Defaults to `"active"`. */
  status?: FundStatus;
  /** Decimal string, zero or more. Omit for an open-ended fund. */
  targetAmount?: string | null;
  /** `YYYY-MM-DD`. */
  startDate?: string | null;
  /** `YYYY-MM-DD`. Must not fall before `startDate`. */
  endDate?: string | null;
  /** Defaults to `false`. */
  isPublic?: boolean;
};

/**
 * Every field optional, each keeping the three-way meaning: absent leaves the column, `null` clears it, a value
 * sets it.
 *
 * `slug` omitted is left exactly as it was — renaming a fund does **not** re-derive the slug, because a public
 * page may already link to it.
 *
 * `status: "inactive"` stops the fund being offered; `"archived"` retires it. Both are reversible and neither
 * loses anything, which is why they exist alongside DELETE.
 */
export type UpdateDonationFundInput = {
  name?: string;
  slug?: string;
  description?: string | null;
  status?: FundStatus;
  targetAmount?: string | null;
  startDate?: string | null;
  /** Checked against the stored `startDate` when only one end of the window is sent. */
  endDate?: string | null;
  isPublic?: boolean;
};

/** A page of funds. `fund.view`. */
export function fetchDonationFunds(
  query: DonationFundQuery = {},
): Promise<ListResult<DonationFund>> {
  return apiList<DonationFund>("/donation-funds", {
    page: query.page,
    limit: query.limit,
    search: query.search,
    status: query.status,
  });
}

export function fetchDonationFund(id: string): Promise<DonationFund> {
  return apiGet<DonationFund>(`/donation-funds/${id}`);
}

/** `fund.manage`. A slug already used in this mosque is a `409`. */
export function createDonationFund(input: CreateDonationFundInput): Promise<DonationFund> {
  return apiPost<DonationFund>("/donation-funds", input);
}

/** `fund.manage`. */
export function updateDonationFund(
  id: string,
  input: UpdateDonationFundInput,
): Promise<DonationFund> {
  return apiPatch<DonationFund>(`/donation-funds/${id}`, input);
}

/**
 * Deletes a fund nothing points at. `fund.manage`, answers `200`.
 *
 * **`409` while the fund still has campaigns** — archive it instead. Deleting twice is a `404`. Only offer this
 * when `campaignCount === 0`, and let the 409 message stand as the explanation if it happens anyway.
 */
export function deleteDonationFund(id: string): Promise<void> {
  return apiDelete(`/donation-funds/${id}`);
}

/** Retires a fund that has been in use, reversibly. `fund.manage`. The right action for most funds. */
export function archiveDonationFund(id: string): Promise<DonationFund> {
  return apiPatch<DonationFund>(`/donation-funds/${id}`, { status: "archived" });
}
