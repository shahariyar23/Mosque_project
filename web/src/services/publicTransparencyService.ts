/**
 * Public Financial Transparency Service.
 *
 * Exposes unauthenticated, read-only transparency figures for public website visitors.
 * Connects to `/api/v1/public/mosques/:slug/*`.
 * Never exposes private donor accounts, emails, phone numbers, or internal user references.
 */

import { apiGet, type ListResult } from "./apiClient";

export type PublicFundProgress = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  targetAmount: string | null;
  collectedAmount: string;
  remainingAmount: string | null;
  progressPercentage: number | null;
  currency: string;
  startDate: string | null;
  endDate: string | null;
};

export type PublicTransparencySummary = {
  mosqueName: string;
  mosqueSlug: string;
  currency: string;
  totalTargetAmount: string;
  totalCollectedAmount: string;
  totalRemainingAmount: string;
  overallProgressPercentage: number;
  funds: PublicFundProgress[];
};

export type PublicJummahCollection = {
  id: string;
  date: string; // YYYY-MM-DD
  amount: string;
  currency: string;
  fundName: string;
  fundSlug: string;
  notes: string | null;
};

export type PublicJummahCollectionQuery = {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  fundSlug?: string;
};

export type PublicJummahCollectionListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PublicJummahCollectionListResult = {
  data: PublicJummahCollection[];
  meta: PublicJummahCollectionListMeta;
};

/** Default public mosque slug used for the primary website tenant. */
export const DEFAULT_PUBLIC_MOSQUE_SLUG = "noor-community-mosque";

/**
 * Retrieves all publicly visible funds for a mosque with verified server-side calculated progress metrics.
 */
export async function fetchPublicFunds(
  mosqueSlug: string = DEFAULT_PUBLIC_MOSQUE_SLUG,
): Promise<PublicFundProgress[]> {
  const result = await apiGet<PublicFundProgress[]>(
    `/public/mosques/${encodeURIComponent(mosqueSlug)}/funds`,
  );
  return result ?? [];
}

/**
 * Retrieves a single public fund by its URL slug with progress and collection statistics.
 */
export function fetchPublicFundBySlug(
  mosqueSlug: string,
  fundSlug: string,
): Promise<PublicFundProgress> {
  return apiGet<PublicFundProgress>(
    `/public/mosques/${encodeURIComponent(mosqueSlug)}/funds/${encodeURIComponent(fundSlug)}`,
  );
}

/**
 * Returns whole-mosque aggregated public transparency metrics across all published funds.
 */
export function fetchPublicTransparencySummary(
  mosqueSlug: string = DEFAULT_PUBLIC_MOSQUE_SLUG,
): Promise<PublicTransparencySummary> {
  return apiGet<PublicTransparencySummary>(
    `/public/mosques/${encodeURIComponent(mosqueSlug)}/summary`,
  );
}

/**
 * Retrieves public Jummah collection history for a mosque.
 * Strips all internal IDs, donor data, user records, and private metadata.
 */
export async function fetchPublicJummahCollections(
  mosqueSlug: string = DEFAULT_PUBLIC_MOSQUE_SLUG,
  query: PublicJummahCollectionQuery = {},
): Promise<{ rows: PublicJummahCollection[]; meta: PublicJummahCollectionListMeta }> {
  // Directly query the public endpoint
  const result = await apiGet<{
    data?: PublicJummahCollection[];
    rows?: PublicJummahCollection[];
    meta?: PublicJummahCollectionListMeta;
  }>(`/public/mosques/${encodeURIComponent(mosqueSlug)}/jummah-collections`, {
    page: query.page,
    limit: query.limit,
    from: query.from,
    to: query.to,
    fundSlug: query.fundSlug,
  });

  const rows = result?.data || result?.rows || (Array.isArray(result) ? result : []);
  const meta = result?.meta || {
    page: query.page || 1,
    limit: query.limit || 20,
    total: rows.length,
    totalPages: 1,
  };

  return { rows, meta };
}
