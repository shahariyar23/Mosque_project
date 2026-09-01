/**
 * Notifications Service.
 *
 * Connects to `/api/v1/notifications` for user in-app notifications
 * and `/api/v1/notifications/broadcasts` for outgoing admin broadcasts.
 */

import { apiDelete, apiGet, apiGetRaw, apiList, apiPatch, apiPost, type ListResult } from "./apiClient";
import type {
  NotificationAudience,
  NotificationChannel,
  NotificationDraft,
  NotificationMessage,
  NotificationStatus,
} from "@/lib/mosque/types";

export type NotificationType =
  | "payment_success"
  | "receipt_ready"
  | "jummah_collection"
  | "expense_created"
  | "salary_paid"
  | "fund_transfer"
  | "approval_requested"
  | "approval_approved"
  | "approval_rejected"
  | "general";

export type InAppNotification = {
  id: string;
  mosqueId: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  category: string;
  resourceType: string | null;
  resourceId: string | null;
  actionUrl: string | null;
  isRead: boolean;
  readAt: string | null;
  metadata?: any;
  createdAt: string;
};

export type NotificationQuery = {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  category?: string;
  type?: NotificationType;
};

export type NotificationListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  unreadCount: number;
};

export type UnreadCountResult = {
  unreadCount: number;
};

export interface BroadcastQuery {
  page?: number;
  limit?: number;
  search?: string;
  channel?: string;
  status?: string;
  audience?: string;
}

export interface BroadcastStats {
  total: number;
  sent: number;
  delivered: number;
  openRate: number;
}

export interface CreateBroadcastInput {
  title: string;
  message: string;
  channel?: NotificationChannel;
  audience?: NotificationAudience;
  status?: NotificationStatus;
  scheduledAt?: string;
  sender?: string;
}

/**
 * Fetches paginated in-app notifications for current user.
 */
export async function fetchNotifications(
  query: NotificationQuery = {},
): Promise<{ rows: InAppNotification[]; meta: NotificationListMeta }> {
  const result = await apiGetRaw<{
    data?: InAppNotification[];
    rows?: InAppNotification[];
    meta?: Partial<NotificationListMeta>;
  }>("/notifications", {
    page: query.page,
    limit: query.limit,
    unreadOnly: query.unreadOnly,
    category: query.category,
    type: query.type,
  });

  const rows: InAppNotification[] = Array.isArray(result?.data)
    ? result.data
    : Array.isArray(result?.rows)
      ? result.rows
      : Array.isArray(result)
        ? result
        : [];

  const unreadFromRows = rows.filter((r) => !r.isRead).length;

  const meta: NotificationListMeta = {
    page: result?.meta?.page || query.page || 1,
    limit: result?.meta?.limit || query.limit || 20,
    total: result?.meta?.total ?? rows.length,
    totalPages: result?.meta?.totalPages ?? 1,
    unreadCount: result?.meta?.unreadCount ?? unreadFromRows,
  };

  return { rows, meta };
}

/**
 * Fetches only the count of unread notifications for the caller.
 */
export function fetchUnreadCount(): Promise<UnreadCountResult> {
  return apiGet<UnreadCountResult>("/notifications/unread-count");
}

/**
 * Marks a single notification as read.
 */
export function markNotificationRead(id: string): Promise<InAppNotification> {
  return apiPatch<InAppNotification>(`/notifications/${encodeURIComponent(id)}/read`, {});
}

/**
 * Marks all notifications for caller as read.
 */
export function markAllNotificationsRead(): Promise<UnreadCountResult> {
  return apiPost<UnreadCountResult>("/notifications/read-all", {});
}

/**
 * Deletes a notification belonging to caller.
 */
export async function deleteNotification(id: string): Promise<void> {
  await apiDelete(`/notifications/${encodeURIComponent(id)}`);
}

// ---------------------------------------------------------------------------
// Outgoing Broadcast Send Log (Admin Dashboard)
// ---------------------------------------------------------------------------

/**
 * Fetches paginated broadcast send log for admin dashboard.
 */
export async function fetchBroadcasts(query: BroadcastQuery = {}) {
  return apiList<NotificationMessage>("/notifications/broadcasts", {
    page: query.page,
    limit: query.limit,
    search: query.search || undefined,
    channel: query.channel && query.channel !== "all" ? query.channel : undefined,
    status: query.status && query.status !== "all" ? query.status : undefined,
    audience: query.audience && query.audience !== "all" ? query.audience : undefined,
  });
}

/**
 * Fetches aggregate broadcast metrics.
 */
export async function fetchBroadcastStats(): Promise<BroadcastStats> {
  return apiGet<BroadcastStats>("/notifications/broadcasts/stats");
}

/**
 * Creates a new broadcast message (Draft, Scheduled, or Sent).
 */
export async function createBroadcast(input: CreateBroadcastInput): Promise<NotificationMessage> {
  return apiPost<NotificationMessage>("/notifications/broadcasts", input);
}

/**
 * Pushes a draft or scheduled broadcast message immediately.
 */
export async function sendBroadcast(id: string): Promise<NotificationMessage> {
  return apiPost<NotificationMessage>(`/notifications/broadcasts/${encodeURIComponent(id)}/send`, {});
}

/**
 * Deletes a broadcast from the outbox log.
 */
export async function deleteBroadcast(id: string): Promise<void> {
  await apiDelete(`/notifications/broadcasts/${encodeURIComponent(id)}`);
}
