import { Prisma } from '@prisma/client';

/**
 * The shapes the donation-funds module shares between its service, controller, DTOs and tests.
 *
 * `DONATION_FUND_SELECT` is the single definition of what a fund is over HTTP. Two omissions in it are
 * deliberate. `mosqueId` is not returned: a caller can only ever read their own mosque's funds, so
 * echoing its id adds an internal identifier to every row in exchange for nothing. And nothing here
 * reads a donation, a total or a balance — a fund is a category, and the money that references it
 * arrives in a later part.
 *
 * `_count.campaigns` is structural rather than financial: it is how the list can say "3 campaigns" and
 * how a delete knows the fund is still in use. It counts rows in a category table, not currency.
 *
 * There is no status vocabulary written out here. `FundStatus` is a real Prisma enum, so the enum from
 * the client is the one source and a hand-written copy could only drift from it.
 */

/** Columns a donation-fund endpoint may return. */
export const DONATION_FUND_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  status: true,
  targetAmount: true,
  startDate: true,
  endDate: true,
  isPublic: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { campaigns: true } },
} satisfies Prisma.DonationFundSelect;

/** What Prisma hands back for `DONATION_FUND_SELECT`, derived so the two cannot drift apart. */
export type SelectedDonationFund = Prisma.DonationFundGetPayload<{
  select: typeof DONATION_FUND_SELECT;
}>;

/** Rows per page when the caller does not ask. Capped by `MAX_PAGE_SIZE` from common/pagination. */
export const DEFAULT_FUND_PAGE_SIZE = 20;
