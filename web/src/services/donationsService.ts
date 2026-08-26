/**
 * `/donations` — money the mosque has received, or has been promised.
 *
 * **No payment is taken anywhere in this application.** `paymentMethod: "online"` records that money arrived
 * through a gateway; it does not make it happen. A donation set to `completed` is somebody asserting the money
 * is in, not the system confirming it. Any UI wording that implies otherwise ("Pay now", "Process payment")
 * would be false.
 *
 * **There is no `DELETE`.** A donation entered in error is corrected with a `PATCH`, or withdrawn with
 * `status: "cancelled"` — the row stays either way, because a financial record that can vanish is one nobody
 * can audit. So the donations table gets a *Cancel* action, not a delete, and it goes through a confirmation.
 *
 * **There is no `from`/`to` filter on this list**, unlike expenses, budgets, salaries and every report. A
 * donation date range has to be read from `GET /financial-reports/donations` instead — see
 * `financialReportsService`. Offering a date picker here would produce a 400 on the first use.
 *
 * `amount` is a decimal **string** in and out, always paired with `currency`. Nothing in this module or its
 * screens parses it. Totals come from the reports module; there is no `raised` or `runningTotal` on a row,
 * deliberately, because a figure published here would be one nobody had reconciled.
 *
 * Permissions: `donation.record` to create, `donation.manage` to correct, and either `donation.view` or
 * `donation.viewOwn` to read. Which donations a caller sees is decided by that permission, never by a
 * parameter — there is no `userId` filter, because it would be a way to ask for somebody else's giving history.
 */

import { apiGet, apiList, apiPatch, apiPost } from "./apiClient";
import type { ListResult } from "./apiClient";
import type { DonationStatus, PaymentMethod } from "./enums";

/** The server's default `limit` on this list. Sent explicitly so the page size is visible in the request. */
export const DEFAULT_DONATION_PAGE_SIZE = 20;

/**
 * Just enough of the donor to name them — **not** their user record.
 *
 * Their email, phone and role are readable at `/users/:id` by someone entitled to read them; a donation list
 * is not that entitlement, so the response carries an id and a name and nothing else. A donor column must not
 * try to show contact details it does not have.
 */
export type DonationDonorRef = {
  id: string;
  fullName: string;
};

/** Just enough of the fund to name it. The whole record is at `/donation-funds/:id`. */
export type DonationFundRef = {
  id: string;
  name: string;
  slug: string;
};

/** Just enough of the campaign to name it. The whole record is at `/donation-campaigns/:id`. */
export type DonationCampaignRef = {
  id: string;
  title: string;
  slug: string;
};

/**
 * One donation.
 *
 * **`donor` and `donorName` are different facts.** `donor` is the giver's account, when they have one;
 * `donorName` is the name a receipt is made out to when they do not. Both `null` is an anonymous gift — the
 * Friday collection box — which is a legitimate third case, not missing data. So the donor column reads
 * `donor?.fullName ?? donorName ?? "Anonymous"`, and "Anonymous" is the truth rather than a placeholder.
 *
 * `donatedAt` is when the money was given; `createdAt` is when the row was written. A cash collection entered
 * on Monday was given on Friday, so a table sorted or grouped by date wants `donatedAt`.
 *
 * `notes` is internal and is not part of a receipt. `mosqueId` is absent by design — a caller can only ever
 * read their own mosque's donations.
 */
export type Donation = {
  id: string;
  /** Decimal string, e.g. `"500.00"`. Never parse it. */
  amount: string;
  /** ISO 4217, as stored on the row when it was written. */
  currency: string;
  paymentMethod: PaymentMethod;
  status: DonationStatus;
  /** When the money was given, ISO 8601. Not when the row was written. */
  donatedAt: string;
  /** The giver's account, or `null` for an anonymous or unregistered donor. */
  donor: DonationDonorRef | null;
  /** The name on the receipt when there is no account behind the gift. */
  donorName: string | null;
  donorEmail: string | null;
  /** Always present — every donation has a stated purpose. */
  fund: DonationFundRef;
  /** The appeal this answered, or `null` when it was given straight to the fund. */
  campaign: DonationCampaignRef | null;
  /** The mosque's own handle: a bank reference, a receipt book number, a gateway id. Not unique. */
  reference: string | null;
  /** Internal. Not part of a receipt. */
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * The filters this list accepts, and only these.
 *
 * `search` covers donor name, donor email and reference. **Notes are not searched** — they are internal, and a
 * search that reached them would turn every remark into a lookup key.
 *
 * A `fundId` or `campaignId` from another mosque returns an empty page rather than a 403, which tells the
 * caller nothing either way. No `from`/`to`; no `userId`; no `sortBy`.
 */
export type DonationQuery = {
  page?: number;
  /** Capped at 100. Defaults to 20. */
  limit?: number;
  /** Donor name, donor email and reference. Trimmed to 120 characters. */
  search?: string;
  status?: DonationStatus;
  paymentMethod?: PaymentMethod;
  fundId?: string;
  campaignId?: string;
};

/**
 * Recording a donation. `fundId`, `amount` and `paymentMethod` are required.
 *
 * `fundId` is required because a donation whose purpose the mosque cannot state is not something this endpoint
 * will record — so the form's fund select cannot have an empty option.
 *
 * **The donor, three legitimate shapes:** a registered giver is `userId` and their name comes off their
 * account; someone with no account is `donorName`, plus `donorEmail` if a receipt is going out; an anonymous
 * gift is neither. A form should offer that as an explicit choice rather than leaving the fields blank by
 * accident.
 *
 * `campaignId` must be a campaign that collects into `fundId` — mismatched, it is a 400, so a campaign select
 * should be filtered by the chosen fund.
 *
 * `status` defaults to `"pending"`. Set `"completed"` only when the money is actually in: that is the state a
 * later report counts.
 */
export type CreateDonationInput = {
  /** A fund of the caller's own mosque. Required. */
  fundId: string;
  /** Must collect into `fundId`. */
  campaignId?: string | null;
  /** The donor's account, when they have one. A user of the caller's own mosque. */
  userId?: string | null;
  /** 2–160 characters. For a donor with no account. */
  donorName?: string | null;
  /** ≤ 160 characters. Where a receipt would be sent. */
  donorEmail?: string | null;
  /** Decimal string greater than zero, e.g. `"500.00"`. A donation of nothing is a mistake, not an event. */
  amount: string;
  /** ISO 4217, 3 letters. Defaults to the mosque's configured currency and is then stored on the row. */
  currency?: string;
  /** Recorded, not processed. */
  paymentMethod: PaymentMethod;
  /** Defaults to `"pending"`. */
  status?: DonationStatus;
  /** When the money was given, ISO 8601. Defaults to now. A bare date is read as midnight UTC. */
  donatedAt?: string;
  /** ≤ 120 characters. */
  reference?: string | null;
  /** ≤ 2000 characters. Internal. */
  notes?: string | null;
};

/**
 * Correcting a donation. Every field optional.
 *
 * **`undefined` and `null` differ.** Omitting a field leaves the column; sending `null` clears a nullable one
 * (`campaignId: null` detaches the appeal, `userId: null` makes the gift anonymous). The four required
 * columns — `fundId`, `amount`, `currency`, `paymentMethod`, plus `status` and `donatedAt` — may be *changed*
 * but not cleared: sending `null` for one of those is a field-level 400, not a no-op.
 *
 * `mosqueId` is absent, so moving a donation to another mosque is not expressible.
 */
export type UpdateDonationInput = {
  fundId?: string;
  /** `null` detaches the campaign. */
  campaignId?: string | null;
  /** `null` makes the donation anonymous. */
  userId?: string | null;
  donorName?: string | null;
  donorEmail?: string | null;
  /** Decimal string greater than zero. May be corrected, not cleared. */
  amount?: string;
  currency?: string;
  paymentMethod?: PaymentMethod;
  /** `"cancelled"` is how a donation is withdrawn — this is what the absent DELETE is for. */
  status?: DonationStatus;
  donatedAt?: string;
  reference?: string | null;
  notes?: string | null;
};

/** A page of donations. `donation.view`, or `donation.viewOwn` for one's own giving. */
export function fetchDonations(query: DonationQuery = {}): Promise<ListResult<Donation>> {
  return apiList<Donation>("/donations", {
    page: query.page,
    limit: query.limit,
    search: query.search,
    status: query.status,
    paymentMethod: query.paymentMethod,
    fundId: query.fundId,
    campaignId: query.campaignId,
  });
}

export function fetchDonation(id: string): Promise<Donation> {
  return apiGet<Donation>(`/donations/${id}`);
}

/** `donation.record`. An unknown or foreign `fundId`, `campaignId` or `userId` is a `400`. */
export function createDonation(input: CreateDonationInput): Promise<Donation> {
  return apiPost<Donation>("/donations", input);
}

/** `donation.manage`. */
export function updateDonation(id: string, input: UpdateDonationInput): Promise<Donation> {
  return apiPatch<Donation>(`/donations/${id}`, input);
}

/**
 * Withdraws a donation without removing the record. `donation.manage`.
 *
 * This is the stand-in for the delete that deliberately does not exist. A cancelled donation stops counting
 * towards any report and stays visible in the ledger, which is the point.
 */
export function cancelDonation(id: string): Promise<Donation> {
  return apiPatch<Donation>(`/donations/${id}`, { status: "cancelled" });
}
