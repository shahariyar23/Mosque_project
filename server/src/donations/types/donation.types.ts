import { Prisma } from '@prisma/client';

/**
 * The shapes the donations module shares between its service, controller, DTOs and tests.
 *
 * `DONATION_SELECT` is the single definition of what a donation is over HTTP, and what it leaves out is
 * deliberate.
 *
 * `mosqueId` is not returned. A caller can only ever read their own mosque's donations, so echoing the id
 * adds an internal identifier to every row for nothing.
 *
 * The donor is `id` and `fullName` only — never the email, phone, address or role on their account. A
 * treasurer reading the donation list needs to know who gave; they do not need the giver's contact details
 * delivered as a side effect, and a `select` that pulled the whole user would hand them over on every page.
 * `donorEmail` beside it is a different field: it belongs to *this donation*, entered by whoever recorded a
 * gift from someone with no account, and exists so a receipt has an address to go to.
 *
 * `fund` and `campaign` are name-and-slug references for the same reason the campaign response carries a
 * short fund reference: the full records are readable at their own endpoints, and copying their targets and
 * dates into every donation row would be a second version that drifts from the first.
 *
 * Nothing here is a total. There is no running balance on the fund, no amount raised on the campaign, and
 * no sum across the page — a donation row reports itself and nothing else.
 */

/** Columns a donation endpoint may return. */
export const DONATION_SELECT = {
  id: true,
  amount: true,
  currency: true,
  paymentMethod: true,
  status: true,
  donatedAt: true,
  donorName: true,
  donorEmail: true,
  reference: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  // Enough to name the donor, and no more. See the note above on why this is not the whole user.
  donor: { select: { id: true, fullName: true } },
  fund: { select: { id: true, name: true, slug: true } },
  campaign: { select: { id: true, title: true, slug: true } },
} satisfies Prisma.DonationSelect;

/** What Prisma hands back for `DONATION_SELECT`, derived so the two cannot drift apart. */
export type SelectedDonation = Prisma.DonationGetPayload<{ select: typeof DONATION_SELECT }>;

/** Rows per page when the caller does not ask. Capped by `MAX_PAGE_SIZE` from common/pagination. */
export const DEFAULT_DONATION_PAGE_SIZE = 20;
