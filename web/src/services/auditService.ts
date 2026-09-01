/**
 * `GET /admin/audit-logs` — who did what, and when.
 *
 * **The path is `/admin/audit-logs`, not `/audit`.** That is the controller's own prefix and the only place
 * these live.
 *
 * **Read-only, by design.** There is no `POST`, no `PATCH` and no `DELETE` — a log that can be edited is not
 * a log. So this module exports two reads and nothing else, and the audit screen renders no write controls
 * at all: not a disabled delete button, none.
 *
 * Both routes require `audit.view`, which is a platform permission — `super_admin` and `mosque_admin` hold
 * it, and neither the secretary nor the treasurer does.
 *
 * One naming trap in the query: the filters are `entity` and `userId`, while the fields they filter on come
 * back as `resource` and `actorId`. The backend maps them; a request sending `resource=user` is a 400,
 * because `forbidNonWhitelisted` rejects a key the DTO does not declare.
 */

import { apiGet, apiList } from "./apiClient";
import type { ListResult } from "./apiClient";

/** Every action recorded, in the order the backend declares them. */
export const AUDIT_ACTIONS = [
  "USER_CREATED",
  "USER_UPDATED",
  "USER_STATUS_CHANGED",
  "USER_DELETED",
  "ROLE_ASSIGNED",
  "POSITIONS_ASSIGNED",
  "PERMISSION_CHANGED",
  "PASSWORD_CHANGED",
  "PASSWORD_RESET",
  "LOGIN_SUCCESS",
  "LOGIN_FAILED",
  "APPROVAL_REQUESTED",
  "APPROVAL_APPROVED",
  "APPROVAL_REJECTED",
  "FUND_CREATED",
  "FUND_UPDATED",
  "TRANSACTION_CREATED",
  "TRANSACTION_UPDATED",
  "TRANSACTION_VOIDED",
  "DONATION_RECORDED",
  "RECEIPT_ISSUED",
  "RECEIPT_VOIDED",
  "IFTAR_SPONSORSHIP_CREATED",
  "IFTAR_SPONSORSHIP_UPDATED",
  "IFTAR_SPONSORSHIP_DELETED",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** What kinds of thing are audited. */
export const AUDIT_RESOURCES = [
  "user",
  "auth",
  "approval",
  "transaction",
  "fund",
  "expense",
  "salary",
  "donation",
  "receipt",
  "iftar_sponsorship",
] as const;
export type AuditResource = (typeof AUDIT_RESOURCES)[number];

export const auditResourceLabels: Record<AuditResource, string> = {
  user: "User accounts",
  auth: "Authentication",
  approval: "Approvals",
  transaction: "Transactions",
  fund: "Donation funds",
  expense: "Expenses",
  salary: "Salaries",
  donation: "Donations",
  receipt: "Receipts",
  iftar_sponsorship: "Iftar sponsorship",
};

/** Readable labels for the filter dropdown. A `Record` so a new action cannot be added without one. */
export const auditActionLabels: Record<AuditAction, string> = {
  USER_CREATED: "User created",
  USER_UPDATED: "User updated",
  USER_STATUS_CHANGED: "Status changed",
  USER_DELETED: "User deleted",
  ROLE_ASSIGNED: "Role assigned",
  POSITIONS_ASSIGNED: "Positions assigned",
  PERMISSION_CHANGED: "Permissions changed",
  PASSWORD_CHANGED: "Password changed",
  PASSWORD_RESET: "Password reset",
  LOGIN_SUCCESS: "Sign-in",
  LOGIN_FAILED: "Failed sign-in",
  APPROVAL_REQUESTED: "Approval requested",
  APPROVAL_APPROVED: "Approval granted",
  APPROVAL_REJECTED: "Approval rejected",
  FUND_CREATED: "Fund created",
  FUND_UPDATED: "Fund updated",
  TRANSACTION_CREATED: "Transaction created",
  TRANSACTION_UPDATED: "Transaction updated",
  TRANSACTION_VOIDED: "Transaction voided",
  DONATION_RECORDED: "Donation recorded",
  RECEIPT_ISSUED: "Receipt issued",
  RECEIPT_VOIDED: "Receipt voided",
  IFTAR_SPONSORSHIP_CREATED: "Iftar sponsorship created",
  IFTAR_SPONSORSHIP_UPDATED: "Iftar sponsorship updated",
  IFTAR_SPONSORSHIP_DELETED: "Iftar sponsorship deleted",
};

/**
 * One entry.
 *
 * `actorId` is `null` for an action with no signed-in actor — a failed sign-in is the obvious one, where the
 * whole point is that nobody was authenticated. `actorName` is still populated in that case, from what was
 * submitted, which is why the two are separate fields rather than one optional relation.
 *
 * `changes` is a free-shaped record: what it holds depends on the action, so it is `unknown` per key rather
 * than `any`. A caller that wants to display it must narrow each value first.
 */
export type AuditLog = {
  id: string;
  mosqueId: string;
  action: AuditAction;
  resource: AuditResource;
  /** The id of the thing acted on. `null` when the action has no single subject. */
  resourceId: string | null;
  actorId: string | null;
  actorName: string;
  actorRole: string | null;
  changes: Record<string, unknown> | null;
  note: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

/**
 * The filters the backend accepts, and only those.
 *
 * No `search`: there is no free-text filter on this table. No `sortBy` either — no list endpoint in this API
 * takes one, so the order is the server's (newest first) and the table must not offer column sorting.
 */
export type AuditLogQuery = {
  page?: number;
  /** Capped at 100 by the backend. */
  limit?: number;
  action?: AuditAction;
  /** Filters the `resource` column, despite the name. */
  entity?: AuditResource;
  /** Filters the `actorId` column. Must be a UUID. */
  userId?: string;
  /** Inclusive, `YYYY-MM-DD`. */
  from?: string;
  /** Inclusive, `YYYY-MM-DD`. */
  to?: string;
};

/** A page of entries, newest first. `audit.view`. */
export function fetchAuditLogs(query: AuditLogQuery = {}): Promise<ListResult<AuditLog>> {
  return apiList<AuditLog>("/admin/audit-logs", {
    page: query.page,
    limit: query.limit,
    action: query.action,
    entity: query.entity,
    userId: query.userId,
    from: query.from,
    to: query.to,
  });
}

export function fetchAuditLog(id: string): Promise<AuditLog> {
  return apiGet<AuditLog>(`/admin/audit-logs/${id}`);
}
