/**
 * `/donation-campaigns` — the individual fundraising appeals.
 *
 * A **fund** is the standing category ("Masjid Construction"); a **campaign** is one appeal that collects into
 * it ("Build the New Mosque Roof, by December"). That is why a campaign requires a target and both dates while
 * a fund does not: an appeal without a goal or a deadline is not an appeal.
 *
 * **There is no `raised` or `progress` on a campaign.** Money received is reported by
 * `/financial-reports/donations`; a progress bar must be built from that, or not shown. Nothing here publishes
 * a figure nobody reconciled, and the frontend must not add one up itself.
 *
 * **Publishing needs a second permission.** `campaign.manage` drafts and edits; putting an appeal in front of
 * the public — `isPublic: true`, or any `status` other than `draft` — additionally needs `campaign.publish`,
 * and the check runs *before* the write, so a caller without it gets a 403 and no change. Withdrawing is not
 * gated: back to `draft`, or `isPublic: false`, needs only `campaign.manage`, because nobody should have to
 * wait for a second person to take a bad appeal down. So the form's publish controls are disabled without
 * `campaign.publish` while its unpublish controls are not.
 */

import { apiDelete, apiGet, apiList, apiPatch, apiPost } from "./apiClient";
import type { ListResult } from "./apiClient";
import type { CampaignStatus } from "./enums";

/** The server's default `limit` on this list. */
export const DEFAULT_CAMPAIGN_PAGE_SIZE = 20;

/** Just enough of the fund to name it. The whole record is at `/donation-funds/:id`. */
export type CampaignFundRef = {
  id: string;
  name: string;
  slug: string;
};

/**
 * One campaign.
 *
 * `startDate` and `endDate` are calendar days (`YYYY-MM-DD`), not timestamps — an appeal that opens on the 1st
 * must not read as the 31st west of Greenwich. Do not put them through `new Date()` for display.
 *
 * `fund` is `null` for an appeal filed under no fund, which is allowed. `imageUrl` is a URL or reference only;
 * no image bytes are stored, so a broken link is a broken link and the card needs a fallback.
 */
export type Campaign = {
  id: string;
  title: string;
  /** Unique within the mosque, stable once issued — a public page may link to it. */
  slug: string;
  description: string | null;
  status: CampaignStatus;
  /** Decimal string, e.g. `"1500000.00"`. What the appeal asks for, never what has come in. */
  targetAmount: string;
  /** `YYYY-MM-DD`. */
  startDate: string;
  /** `YYYY-MM-DD`. */
  endDate: string;
  imageUrl: string | null;
  /** Whether the public website may show it. */
  isPublic: boolean;
  /** The fund it collects into, or `null` when it is filed under none. */
  fund: CampaignFundRef | null;
  createdAt: string;
  updatedAt: string;
};

/** What a delete reports back. The `slug` is free again afterwards. */
export type DeletedCampaign = {
  id: string;
  title: string;
  slug: string;
};

/**
 * The filters this list accepts, and only these.
 *
 * A `fundId` from another mosque returns an empty page rather than a 403. No `from`/`to`: a campaign already
 * carries its own window, so date filtering is done on the rows.
 */
export type CampaignQuery = {
  page?: number;
  /** Capped at 100. Defaults to 20. */
  limit?: number;
  /** Title, slug and description. Trimmed to 120 characters. */
  search?: string;
  status?: CampaignStatus;
  /** Narrow to campaigns collecting into one fund. */
  fundId?: string;
};

/**
 * Creating a campaign. `title`, `targetAmount`, `startDate` and `endDate` are all required.
 *
 * `status` defaults to `"draft"` and `isPublic` to `false`, so a new appeal is never live merely because it
 * was created — sending anything else needs `campaign.publish`.
 *
 * `slug` is derived from the title when omitted, which is the normal case. `fundId` must be a fund of the
 * caller's own mosque; omit it for a standalone appeal. An `endDate` before `startDate` is a 400.
 */
export type CreateCampaignInput = {
  /** 2–200 characters. */
  title: string;
  /** Lowercase words joined by single hyphens, ≤ 80 characters. Derived from `title` when omitted. */
  slug?: string;
  /** ≤ 5000 characters. */
  description?: string | null;
  /** A fund of the caller's own mosque. `null` or omitted for a standalone appeal. */
  fundId?: string | null;
  /** Decimal string, required. Never a float. */
  targetAmount: string;
  /** `YYYY-MM-DD`. */
  startDate: string;
  /** `YYYY-MM-DD`. Must not fall before `startDate`. */
  endDate: string;
  /** Defaults to `"draft"`. Anything else requires `campaign.publish`. */
  status?: CampaignStatus;
  /** An `http(s)` URL, ≤ 500 characters. */
  imageUrl?: string | null;
  /** Defaults to `false`. Setting it `true` requires `campaign.publish`. */
  isPublic?: boolean;
};

/**
 * Editing a campaign. Every field optional, each keeping the three-way meaning: absent leaves the column,
 * `null` clears it, a value sets it.
 *
 * `targetAmount`, `startDate` and `endDate` are required *columns* — they may be changed but not cleared, so
 * sending `null` for one of them is a field-level 400 rather than a no-op.
 *
 * `slug` omitted is left exactly as it was: renaming a campaign does not re-derive it, because a shared link
 * may already point at the old one.
 */
export type UpdateCampaignInput = {
  title?: string;
  slug?: string;
  description?: string | null;
  /** `null` detaches the campaign from its fund. */
  fundId?: string | null;
  /** May be corrected, not cleared. */
  targetAmount?: string;
  startDate?: string;
  /** Checked against the stored `startDate` when only one end of the window is sent. */
  endDate?: string;
  /** Away from `"draft"` requires `campaign.publish`; back to it does not. */
  status?: CampaignStatus;
  imageUrl?: string | null;
  /** `true` requires `campaign.publish`; `false` does not. */
  isPublic?: boolean;
};

/** A page of campaigns. `campaign.view`. */
export function fetchCampaigns(query: CampaignQuery = {}): Promise<ListResult<Campaign>> {
  return apiList<Campaign>("/donation-campaigns", {
    page: query.page,
    limit: query.limit,
    search: query.search,
    status: query.status,
    fundId: query.fundId,
  });
}

export function fetchCampaign(id: string): Promise<Campaign> {
  return apiGet<Campaign>(`/donation-campaigns/${id}`);
}

/**
 * `campaign.manage`, plus `campaign.publish` when `status` or `isPublic` would make it live.
 *
 * A `fundId` belonging to another mosque is a `400`; a slug already used in this mosque is a `409`.
 */
export function createCampaign(input: CreateCampaignInput): Promise<Campaign> {
  return apiPost<Campaign>("/donation-campaigns", input);
}

/** `campaign.manage`, plus `campaign.publish` when publishing. */
export function updateCampaign(id: string, input: UpdateCampaignInput): Promise<Campaign> {
  return apiPatch<Campaign>(`/donation-campaigns/${id}`, input);
}

/**
 * Deletes a campaign nothing points at. `campaign.manage`, answers `200`.
 *
 * **`409` once any donation has been recorded against it** — archive it instead. Deleting twice is a `404`.
 * Because no endpoint reports a campaign's donation count, the table cannot know in advance whether a delete
 * will succeed: offer *Archive* as the primary action and let the 409 message stand if someone tries anyway.
 */
export function deleteCampaign(id: string): Promise<void> {
  return apiDelete(`/donation-campaigns/${id}`);
}

/**
 * Stops the appeal without losing the record, reversibly. `campaign.manage` only.
 *
 * The right action for any campaign that has been live, and the one the backend names in its own delete
 * documentation.
 */
export function archiveCampaign(id: string): Promise<Campaign> {
  return apiPatch<Campaign>(`/donation-campaigns/${id}`, { status: "archived" });
}
