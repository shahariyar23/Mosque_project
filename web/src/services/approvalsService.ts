/**
 * `/approvals` — something is proposed, and somebody with the authority accepts or declines it.
 *
 * **Two grants, and they belong to different people on purpose.** `workflow.review` gets a caller into the
 * queue and lets them raise a request; `workflow.approve` lets them decide one. The shipped role map draws the
 * line: a treasurer and a secretary hold `review` and not `approve` — "a treasurer prepares a payment and
 * someone else signs it off" — while `mosque_admin` holds both. A screen must therefore be able to show the
 * queue with every decision control disabled, because for a treasurer that is the normal state, not an error.
 *
 * **A requester cannot decide their own request.** Enforced server-side, and refused for a `mosque_admin` too:
 * only `super_admin` holds `workflow.selfApprove`. So the decision buttons on a row the current user raised are
 * disabled for almost everybody — see {@link canDecideApproval}, which is the check a view should use rather
 * than `can("workflow.approve")` alone.
 *
 * **Nothing here executes anything.** An approved request records that an operation was *permitted*; the module
 * that owns the target still performs it under its own permissions. Approving a `pay` request does not pay a
 * salary, and UI wording must not say it does.
 *
 * **The target row is a reference, not a join.** `entity` and `entityId` come back as stored, unexpanded — a
 * queue holding `workflow.review` is not an entitlement to read an expense. A row can show what kind of thing
 * is under review and link to the module that owns it; it cannot show the amount.
 *
 * **There is no update, no delete and no cancel route.** A decision moves the status once and there is no way
 * back. `cancelled` exists on the status enum but no endpoint sets it, so no control should offer it.
 */

import { apiGet, apiList, apiPost } from "./apiClient";
import type { ListResult } from "./apiClient";
import type { ApprovalStatus } from "./enums";

/** The server's default `limit` on this list. */
export const DEFAULT_APPROVAL_PAGE_SIZE = 20;

/**
 * The kinds of thing that can be put up for review.
 *
 * Not a Prisma enum — the column is a generic `VarChar` so one table can serve every module, and this closed
 * list is what the server validates against instead. That is why it lives here rather than in `enums.ts`.
 *
 * `event` is accepted although no events table exists yet: nothing joins to the target, so a kind can be
 * accepted before the module that owns it exists. Nothing writes one until it does, so a picker built from this
 * list will offer an option that never appears in the data.
 */
export const APPROVAL_ENTITIES = [
  "expense",
  "salary",
  "donation",
  "budget",
  "event",
  "user",
] as const;
export type ApprovalEntity = (typeof APPROVAL_ENTITIES)[number];

/**
 * What is being proposed.
 *
 * `view` is absent because reading needs no approval — a request to read would be one nobody could act on.
 */
export const APPROVAL_ACTIONS = ["create", "update", "delete", "pay", "void"] as const;
export type ApprovalAction = (typeof APPROVAL_ACTIONS)[number];

/** Human labels. `Record` makes an omission a compile error if the list above grows. */
export const approvalEntityLabels: Record<ApprovalEntity, string> = {
  expense: "Expense",
  salary: "Salary",
  donation: "Donation",
  budget: "Budget",
  event: "Event",
  user: "User",
};

export const approvalActionLabels: Record<ApprovalAction, string> = {
  create: "Create",
  update: "Update",
  delete: "Delete",
  pay: "Pay",
  void: "Void",
};

/**
 * Just enough of a person to name them in a queue.
 *
 * Not their user record: a reviewer needs to know who asked, not how to contact them. Holding
 * `workflow.review` is not `user.view`, so a queue must not try to show an email it does not have.
 */
export type ApprovalPersonRef = {
  id: string;
  fullName: string;
};

/**
 * One request for review.
 *
 * `reviewedBy`, `reviewedAt` and `comment` are **all** null while `pending` and **all** set together when
 * decided — a row with `status: "approved"` and no reviewer cannot exist, so a decided row can be rendered
 * without guarding each field separately.
 *
 * `mosqueId` is kept, unlike most responses, because a holder of `platform.manage` reads this queue across
 * mosques and otherwise could not tell two rows apart.
 */
export type ApprovalRequest = {
  id: string;
  mosqueId: string;
  /** What kind of thing is under review. */
  entity: ApprovalEntity;
  /** The row under review. A reference — nothing here resolves it. */
  entityId: string;
  action: ApprovalAction;
  /** Starts `pending` and moves exactly once. There is no path back. */
  status: ApprovalStatus;
  /** The requester's words, if anything was said. */
  reason: string | null;
  /** Taken from the access token when raised, never reassigned. */
  requestedBy: ApprovalPersonRef;
  /** Null while pending. */
  reviewedBy: ApprovalPersonRef | null;
  /** ISO timestamp. Null while pending. */
  reviewedAt: string | null;
  /** The reviewer's note. Null while pending. */
  comment: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * The filters this list accepts, and only these.
 *
 * **There is no `search`.** Nothing here holds text worth searching except `reason`, and the server does not
 * index it — so the queue is narrowed by `entity`, `status` and date, never by a text box.
 *
 * The rows come back **pending first, then newest first**, so the outstanding work is at the top without
 * asking for it. Nothing accepts a sort parameter, and re-sorting a page in the browser would reorder only the
 * rows already fetched.
 *
 * `from`/`to` filter on **when the request was raised**, not when it was decided — a queue is read by age.
 */
export type ApprovalQuery = {
  page?: number;
  /** Capped at 100. Defaults to 20. */
  limit?: number;
  /** Omit to list every request; `pending` is already first in the default ordering. */
  status?: ApprovalStatus;
  entity?: ApprovalEntity;
  /** One target row. ≤ 64 characters. Most useful with `entity` and `status: "pending"`. */
  entityId?: string;
  /** `YYYY-MM-DD`, inclusive, on when it was raised. */
  from?: string;
  /** `YYYY-MM-DD`, inclusive, on when it was raised. */
  to?: string;
};

/**
 * Raising a request. `entity`, `entityId` and `action` are required.
 *
 * There is no `mosqueId`, no `requestedById` and no `status`: the first two come from the token, and a caller
 * who could post `"approved"` would have approved their own request through the create route. Sending any of
 * them is a 400.
 */
export type CreateApprovalInput = {
  entity: ApprovalEntity;
  /** The row under review, 1–64 characters. Usually a UUID but not required to be one. */
  entityId: string;
  action: ApprovalAction;
  /** ≤ 2000 characters. Optional — an expense over the threshold often explains itself. */
  reason?: string;
};

/**
 * What a decision may carry: one optional note, and that is the whole body.
 *
 * The reviewer is the caller, the timestamp is now, and the status is whichever route was called. An empty
 * body is a complete, valid approval — so the confirm dialog's comment box must not be a required field.
 */
export type DecideApprovalInput = {
  /** ≤ 2000 characters. Strongly encouraged on a rejection, where it is the only record of why. */
  comment?: string;
};

/**
 * Whether this caller may decide this request — the check a decision control should be disabled on.
 *
 * `can("workflow.approve")` alone is not enough: the server also refuses a requester deciding their own
 * request unless they hold `workflow.selfApprove`, which only `super_admin` does. Checking it here keeps a
 * `mosque_admin` from being shown a live *Approve* button on their own row that answers 403.
 *
 * It is a UX check. The boundary is the server's.
 */
export function canDecideApproval(
  request: ApprovalRequest,
  currentUserId: string,
  can: (permission: string) => boolean,
): boolean {
  if (request.status !== "pending") return false;
  if (!can("workflow.approve")) return false;
  if (request.requestedBy.id !== currentUserId) return true;
  return can("workflow.selfApprove");
}

/**
 * A page of requests, pending first then newest first. `workflow.review`.
 *
 * Scoped to the caller's mosque; another mosque's requests are not in the result set at all, the one exception
 * being a holder of `platform.manage`.
 */
export function fetchApprovals(query: ApprovalQuery = {}): Promise<ListResult<ApprovalRequest>> {
  return apiList<ApprovalRequest>("/approvals", {
    page: query.page,
    limit: query.limit,
    status: query.status,
    entity: query.entity,
    entityId: query.entityId,
    from: query.from,
    to: query.to,
  });
}

/** `workflow.review`. Another mosque's request answers `404`, not `403` — a 403 would confirm it exists. */
export function fetchApproval(id: string): Promise<ApprovalRequest> {
  return apiGet<ApprovalRequest>(`/approvals/${id}`);
}

/**
 * Raises a request. `workflow.review`, answers `201`.
 *
 * A second pending request over the same entity, id and action is a **`409`** — two rows asking the same
 * question is how one invoice gets approved twice. That message is worth showing verbatim.
 */
export function createApproval(input: CreateApprovalInput): Promise<ApprovalRequest> {
  return apiPost<ApprovalRequest>("/approvals", input);
}

/**
 * Approves a request. `workflow.approve`, answers `200` (not `201`, despite being a POST).
 *
 * `403` if the caller raised it and lacks `workflow.selfApprove`; `409` if it was already decided — including
 * by losing the race to another reviewer, since the update is filtered on the pending state. Reload the list
 * on a 409 rather than retrying.
 *
 * **This does not perform the operation.** It records that it was permitted.
 */
export function approveApproval(
  id: string,
  input: DecideApprovalInput = {},
): Promise<ApprovalRequest> {
  return apiPost<ApprovalRequest>(`/approvals/${id}/approve`, input);
}

/**
 * Rejects a request. `workflow.approve`, answers `200`.
 *
 * Declining is the same authority as accepting — a reviewer who can only say yes is not a reviewer — and every
 * rule that applies to approving applies here. `comment` is not required, though this is the case where it
 * always ought to be given.
 */
export function rejectApproval(
  id: string,
  input: DecideApprovalInput = {},
): Promise<ApprovalRequest> {
  return apiPost<ApprovalRequest>(`/approvals/${id}/reject`, input);
}
