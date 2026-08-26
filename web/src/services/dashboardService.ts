/**
 * `GET /dashboard/overview` — one request for the landing page.
 *
 * The whole page is a single call, and the response is shaped by what the caller may see: each block is
 * `null` when they lack the permission that block needs. **`null` means "not shown to you", never zero.**
 * Rendering a `0` for a treasurer's figures because the viewer is an imam would be inventing a fact, and
 * the number that matters most on this page is money.
 *
 *  - `users`     → `user.view`
 *  - `finance`   → `finance.view`
 *  - `prayer`    → `prayer.view` (also best-effort: `null` when the upstream times are unavailable)
 *  - `jumuah`    → `prayer.view`
 *  - `approvals` → `workflow.review`
 *
 * `events` and `content` are the other case. They are always present and carry `tracked: false`, because
 * there are no event, article or khutbah tables in this schema — the numbers are `null` and the honest
 * rendering is "not tracked yet", not "0 upcoming events".
 *
 * The route itself requires `dashboard.view`, which a `member` does not hold.
 */

import { apiGet } from "./apiClient";
import type { FinancialSummary } from "./financialReportsService";
import type { Jumuah } from "./jumuahService";

/** The five daily prayers, `HH:mm` in the mosque's timezone. */
export type DashboardPrayerTimings = {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
};

export type DashboardPrayer = {
  /** `YYYY-MM-DD`. */
  date: string;
  /** IANA zone the times are expressed in — they are wall-clock, so this is needed to read them. */
  timezone: string;
  timings: DashboardPrayerTimings;
};

export type DashboardUsers = {
  total: number;
  active: number;
  volunteers: number;
};

/**
 * Declared, and not tracked.
 *
 * `tracked` is `false` and both counts are `null` in this schema. The flag exists so the page can say so
 * rather than guess: a `null` here is "there is no events table", which is a different fact from "no
 * upcoming events".
 */
export type DashboardEvents = {
  tracked: boolean;
  upcoming: number | null;
  registrations: number | null;
};

/** Same as `DashboardEvents` — no article or khutbah tables exist, so `tracked` is `false`. */
export type DashboardContent = {
  tracked: boolean;
  publishedArticles: number | null;
  publishedKhutbahs: number | null;
};

export type DashboardApprovals = {
  pending: number;
};

/**
 * The overview.
 *
 * Every nullable block is nullable for a permission reason, except `prayer`, which is also nullable because
 * the upstream prayer-time source is best-effort. Both cases render as a notice.
 */
export type DashboardOverview = {
  /** When the server computed this, ISO 8601. The figures describe that moment. */
  generatedAt: string;
  users: DashboardUsers | null;
  /** The same summary `/financial-reports/summary` returns — decimal strings throughout. */
  finance: FinancialSummary | null;
  prayer: DashboardPrayer | null;
  jumuah: Jumuah | null;
  events: DashboardEvents;
  content: DashboardContent;
  approvals: DashboardApprovals | null;
};

export function fetchDashboardOverview(): Promise<DashboardOverview> {
  return apiGet<DashboardOverview>("/dashboard/overview");
}
