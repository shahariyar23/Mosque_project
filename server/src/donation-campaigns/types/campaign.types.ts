import { Prisma } from '@prisma/client';

/**
 * The shapes the donation-campaigns module shares between its service, controller, DTOs and tests.
 *
 * `CAMPAIGN_SELECT` is the single definition of what a campaign is over HTTP. What it leaves out matters
 * as much as what it includes.
 *
 * `mosqueId` is not returned: a caller can only ever read their own mosque's campaigns, so echoing its id
 * adds an internal identifier to every row for nothing.
 *
 * Nothing here reads a donation, a total raised, or a progress percentage. A campaign in this part is an
 * *appeal* — a title, a target and a window — and the money that answers it arrives in Part 20. A
 * `raised` field would have to be computed from donations, which is exactly the accounting this part is
 * told not to introduce.
 *
 * The nested `fund` is name and slug only. A campaign response says which fund it collects into, because
 * that is information a reader needs; it does not carry the fund's own target, dates or visibility, which
 * would be a second copy of a record the caller can read directly and would drift from it.
 */

/** Columns a campaign endpoint may return. */
export const CAMPAIGN_SELECT = {
  id: true,
  title: true,
  slug: true,
  description: true,
  status: true,
  targetAmount: true,
  startDate: true,
  endDate: true,
  imageUrl: true,
  isPublic: true,
  createdAt: true,
  updatedAt: true,
  fund: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.CampaignSelect;

/** What Prisma hands back for `CAMPAIGN_SELECT`, derived so the two cannot drift apart. */
export type SelectedCampaign = Prisma.CampaignGetPayload<{ select: typeof CAMPAIGN_SELECT }>;

/** Rows per page when the caller does not ask. Capped by `MAX_PAGE_SIZE` from common/pagination. */
export const DEFAULT_CAMPAIGN_PAGE_SIZE = 20;
