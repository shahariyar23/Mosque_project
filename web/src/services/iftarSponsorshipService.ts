/**
 * `/iftar-sponsorships` — Community Iftar sponsorships for Ramadan days.
 *
 * Like `ramadan` and `jumuah`, this module communicates directly with `/api/v1/iftar-sponsorships`.
 */

import { apiDeleteRaw, apiGetRaw, apiPatchRaw, apiPostRaw } from "./apiClient";

export type IftarSponsorshipStatus = "pending" | "confirmed" | "completed" | "cancelled";

export type SponsorMember = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
};

export type IftarSponsorship = {
  id: string;
  year: number;
  date: string; // YYYY-MM-DD
  ramadanScheduleId: string | null;
  userId: string | null;
  member?: SponsorMember | null;
  sponsorName: string;
  sponsorPhone: string | null;
  sponsorEmail: string | null;
  numberOfServings: number | null;
  estimatedCost: string | null;
  currency: string;
  menuDetails: string | null;
  notes: string | null;
  status: IftarSponsorshipStatus;
  createdAt: string;
  updatedAt: string;
};

export type PaginatedIftarSponsorship = {
  rows: IftarSponsorship[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type IftarSponsorshipQuery = {
  year?: number;
  status?: IftarSponsorshipStatus;
  date?: string;
  search?: string;
  userId?: string;
  page?: number;
  pageSize?: number;
  all?: boolean;
};

export type CreateIftarSponsorshipInput = {
  year: number;
  date: string;
  ramadanScheduleId?: string | null;
  userId?: string | null;
  sponsorName: string;
  sponsorPhone?: string | null;
  sponsorEmail?: string | null;
  numberOfServings?: number | null;
  estimatedCost?: number | null;
  currency?: string;
  menuDetails?: string | null;
  notes?: string | null;
  status?: IftarSponsorshipStatus;
};

export type UpdateIftarSponsorshipInput = Partial<CreateIftarSponsorshipInput>;

/**
 * Fetch list of Iftar sponsorships.
 */
export async function fetchIftarSponsorships(
  query: IftarSponsorshipQuery = {}
): Promise<PaginatedIftarSponsorship> {
  const result = await apiGetRaw<PaginatedIftarSponsorship | IftarSponsorship[]>(
    "/iftar-sponsorships",
    query as Record<string, string | number | boolean | undefined>
  );

  if (Array.isArray(result)) {
    return {
      rows: result,
      total: result.length,
      page: 1,
      pageSize: result.length,
      pageCount: 1,
    };
  }

  return result;
}

/**
 * Fetch a single Iftar sponsorship by ID.
 */
export async function fetchIftarSponsorshipById(id: string): Promise<IftarSponsorship> {
  return apiGetRaw<IftarSponsorship>(`/iftar-sponsorships/${id}`);
}

/**
 * Create a new Iftar sponsorship entry.
 */
export async function createIftarSponsorship(
  input: CreateIftarSponsorshipInput
): Promise<IftarSponsorship> {
  return apiPostRaw<IftarSponsorship>("/iftar-sponsorships", input);
}

/**
 * Update an existing Iftar sponsorship entry.
 */
export async function updateIftarSponsorship(
  id: string,
  input: UpdateIftarSponsorshipInput
): Promise<IftarSponsorship> {
  return apiPatchRaw<IftarSponsorship>(`/iftar-sponsorships/${id}`, input);
}

/**
 * Delete an Iftar sponsorship entry.
 */
export async function deleteIftarSponsorship(id: string): Promise<IftarSponsorship> {
  return apiDeleteRaw<IftarSponsorship>(`/iftar-sponsorships/${id}`);
}

