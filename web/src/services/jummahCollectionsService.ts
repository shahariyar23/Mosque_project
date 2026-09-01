import { apiGet, apiList, apiPatch, apiPost, type ListResult } from "./apiClient";

export type JummahCollectionStatus = "completed" | "voided";

export type JummahCollectionFundRef = {
  id: string;
  name: string;
  slug: string;
};

export type JummahCollectionScheduleRef = {
  id: string;
  khutbahTime: string;
  prayerTime: string;
  imam: string | null;
};

export type JummahCollectionCreatorRef = {
  id: string;
  fullName: string;
  email: string;
};

export type JummahCollection = {
  id: string;
  date: string; // YYYY-MM-DD
  amount: string;
  currency: string;
  status: JummahCollectionStatus;
  reference: string | null;
  notes: string | null;
  isPublic: boolean;
  fund: JummahCollectionFundRef;
  schedule: JummahCollectionScheduleRef | null;
  createdBy: JummahCollectionCreatorRef;
  createdAt: string;
  updatedAt: string;
};

export type JummahCollectionQuery = {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  fundId?: string;
  scheduleId?: string;
  status?: JummahCollectionStatus;
  isPublic?: boolean;
};

export type CreateJummahCollectionInput = {
  date: string; // YYYY-MM-DD (must be a Friday)
  fundId: string;
  amount: string;
  currency?: string;
  scheduleId?: string | null;
  reference?: string | null;
  notes?: string | null;
  isPublic?: boolean;
};

export type UpdateJummahCollectionInput = {
  date?: string;
  fundId?: string;
  amount?: string;
  currency?: string;
  scheduleId?: string | null;
  status?: JummahCollectionStatus;
  reference?: string | null;
  notes?: string | null;
  isPublic?: boolean;
};

/**
 * Lists historical Jummah collections with server-side pagination and filters.
 * Requires `jumuah_collection.view`, `prayer.view`, `donation.view`, or `finance.view`.
 */
export function fetchJummahCollections(
  query: JummahCollectionQuery = {},
): Promise<ListResult<JummahCollection>> {
  return apiList<JummahCollection>("/jummah/collections", {
    page: query.page,
    limit: query.limit,
    from: query.from,
    to: query.to,
    fundId: query.fundId,
    scheduleId: query.scheduleId,
    status: query.status,
    isPublic: query.isPublic,
  });
}

/**
 * Fetches a single collection by its UUID.
 */
export function fetchJummahCollection(id: string): Promise<JummahCollection> {
  return apiGet<JummahCollection>(`/jummah/collections/${id}`);
}

/**
 * Records a new Friday collection for the active mosque.
 * Requires `jumuah_collection.record`, `donation.record`, or `jumuah.manage`.
 */
export function createJummahCollection(
  input: CreateJummahCollectionInput,
): Promise<JummahCollection> {
  return apiPost<JummahCollection>("/jummah/collections", input);
}

/**
 * Corrects details of an existing collection or marks it as voided.
 * Requires `jumuah_collection.manage`, `jumuah_collection.void`, `donation.manage`, or `finance.manage`.
 */
export function updateJummahCollection(
  id: string,
  input: UpdateJummahCollectionInput,
): Promise<JummahCollection> {
  return apiPatch<JummahCollection>(`/jummah/collections/${id}`, input);
}
