import {
  apiDelete,
  apiGet,
  apiList,
  apiPatch,
  apiPost,
} from "./apiClient";
import type {
  Announcement,
  AnnouncementAudience,
  AnnouncementCategory,
  AnnouncementChannel,
  AnnouncementDraft,
  AnnouncementStatus,
} from "@/lib/mosque/types";

export interface AnnouncementQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
  audience?: string;
  pinned?: boolean;
  isPinned?: boolean;
}

export interface AnnouncementStats {
  total: number;
  published: number;
  scheduled: number;
  pinned: number;
}

export interface CreateAnnouncementInput {
  title: string;
  message?: string;
  content?: string;
  summary?: string;
  category?: AnnouncementCategory;
  audience?: AnnouncementAudience;
  status?: AnnouncementStatus;
  channels?: AnnouncementChannel[];
  pinned?: boolean;
  isPinned?: boolean;
  publishedAt?: string;
  scheduledAt?: string;
  expiresAt?: string;
  author?: string;
}

export interface UpdateAnnouncementInput {
  title?: string;
  message?: string;
  content?: string;
  summary?: string;
  category?: AnnouncementCategory;
  audience?: AnnouncementAudience;
  status?: AnnouncementStatus;
  channels?: AnnouncementChannel[];
  pinned?: boolean;
  isPinned?: boolean;
  publishedAt?: string;
  scheduledAt?: string;
  expiresAt?: string;
  author?: string;
}

/**
 * Fetch paginated announcements for admin dashboard
 */
export async function fetchAnnouncements(query: AnnouncementQuery = {}) {
  return apiList<Announcement>("/announcements", {
    page: query.page,
    limit: query.limit,
    search: query.search || undefined,
    category: query.category && query.category !== "all" ? query.category : undefined,
    status: query.status && query.status !== "all" ? query.status : undefined,
    audience: query.audience && query.audience !== "all" ? query.audience : undefined,
    pinned: query.pinned,
    isPinned: query.isPinned,
  });
}

/**
 * Fetch announcement statistics
 */
export async function fetchAnnouncementStats(): Promise<AnnouncementStats> {
  return apiGet<AnnouncementStats>("/announcements/stats");
}

/**
 * Fetch a single announcement by ID
 */
export async function fetchAnnouncementById(id: string): Promise<Announcement> {
  return apiGet<Announcement>(`/announcements/${id}`);
}

/**
 * Create a new announcement
 */
export async function createAnnouncement(input: CreateAnnouncementInput): Promise<Announcement> {
  return apiPost<Announcement>("/announcements", input);
}

/**
 * Update an announcement
 */
export async function updateAnnouncement(
  id: string,
  input: UpdateAnnouncementInput,
): Promise<Announcement> {
  return apiPatch<Announcement>(`/announcements/${id}`, input);
}

/**
 * Publish an announcement
 */
export async function publishAnnouncement(id: string): Promise<Announcement> {
  return apiPost<Announcement>(`/announcements/${id}/publish`);
}

/**
 * Archive an announcement
 */
export async function archiveAnnouncement(id: string): Promise<Announcement> {
  return apiPost<Announcement>(`/announcements/${id}/archive`);
}

/**
 * Toggle or set pinned status
 */
export async function togglePinAnnouncement(id: string, pinned?: boolean): Promise<Announcement> {
  return apiPost<Announcement>(`/announcements/${id}/pin`, { pinned });
}

/**
 * Delete an announcement
 */
export async function deleteAnnouncement(id: string): Promise<void> {
  return apiDelete(`/announcements/${id}`);
}

/**
 * Fetch public published announcements
 */
export async function fetchPublicAnnouncements(
  slug: string,
  query: { limit?: number; category?: string } = {},
): Promise<{ data: Announcement[]; total: number }> {
  return apiGet<{ data: Announcement[]; total: number }>(
    `/public/mosques/${slug}/announcements`,
    query,
  );
}
