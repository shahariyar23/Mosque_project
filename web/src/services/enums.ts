/**
 * The enums the API sends back, mirrored from `server/prisma/schema.prisma`.
 *
 * One file rather than a copy inside each service, because several of these cross module boundaries: a
 * `PaymentMethod` appears on a donation *and* in the donation report, a `DonationStatus` on a donation and
 * in every status breakdown. Two copies would eventually disagree.
 *
 * Each is a `const` array with the type derived from it, so the values are available for a `<select>` and
 * the type cannot drift from them. **The order is the order in the schema**, which is the order Postgres
 * stores and the API returns.
 *
 * `Role` and `Position` are *not* here. They already exist in `web/src/lib/permissions.ts`, which is the
 * frontend mirror of the server's permission registry; a second copy is exactly the drift this file exists
 * to prevent. Import them from there.
 */

/** Whether an account may sign in. Distinct from `deletedAt` — see `userService`. */
export const USER_STATUSES = ["active", "inactive"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/** Recorded when a member volunteers it, and never inferred. */
export const USER_GENDERS = ["male", "female"] as const;
export type UserGender = (typeof USER_GENDERS)[number];

export const VOLUNTEER_STATUSES = ["active", "inactive", "on_leave"] as const;
export type VolunteerStatus = (typeof VOLUNTEER_STATUSES)[number];

export const FUND_STATUSES = ["active", "inactive", "completed", "archived"] as const;
export type FundStatus = (typeof FUND_STATUSES)[number];

export const CAMPAIGN_STATUSES = ["draft", "active", "completed", "cancelled", "archived"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const PAYMENT_METHODS = ["cash", "bank_transfer", "card", "online", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Only `completed` money is counted in a total. A `pending` donation is a promise. */
export const DONATION_STATUSES = ["pending", "completed", "failed", "cancelled"] as const;
export type DonationStatus = (typeof DONATION_STATUSES)[number];

/** `pending` → `approved` → `paid`. Only `paid` has left the account. */
export const EXPENSE_STATUSES = ["pending", "approved", "paid", "cancelled"] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

/** Only an `active` budget governs anything; a `draft` is a proposal. */
export const BUDGET_STATUSES = ["draft", "active", "closed", "cancelled"] as const;
export type BudgetStatus = (typeof BUDGET_STATUSES)[number];

export const SALARY_STATUSES = ["pending", "paid", "cancelled"] as const;
export type SalaryStatus = (typeof SALARY_STATUSES)[number];

export const APPROVAL_STATUSES = ["pending", "approved", "rejected", "cancelled"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

/**
 * Human labels for the statuses a filter or a badge shows.
 *
 * Kept beside the values so a new enum member cannot be added without a label — `Record` makes an omission
 * a compile error. Only the multi-word ones actually need translating; the rest are capitalised for the
 * same treatment across a row of chips.
 */
export const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: "Cash",
  bank_transfer: "Bank transfer",
  card: "Card",
  online: "Online",
  other: "Other",
};

export const volunteerStatusLabels: Record<VolunteerStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  on_leave: "On leave",
};
