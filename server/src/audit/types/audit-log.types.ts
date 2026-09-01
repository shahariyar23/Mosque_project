import type { Prisma } from '@prisma/client';

/**
 * The audit trail's vocabulary and shape.
 *
 * `AuditLog` was already in the schema before this module existed, described there as append-only:
 * rows are written and read, never amended. Nothing wrote to it. This module is the writer and the
 * reader, and everything either of them needs to agree on is declared here.
 *
 * Two closed unions do the work that a free-text column cannot. `AuditAction` and `AuditResource` are
 * const tuples rather than `string`, so a caller that misspells `ROLE_ASSIGNED` fails to compile
 * instead of writing a row nobody will ever find again — the whole value of an audit log is that a
 * question asked six months later gets an answer, and that requires the vocabulary to be finite.
 * Adding an action is therefore a code change, which is also what makes it reviewable.
 *
 * They are also what the list filters validate against, so `?action=` and `?entity=` can only ever
 * name something a writer can actually produce.
 */

/**
 * Everything this API records.
 *
 * Only actions something in the codebase actually writes appear here. The brief's examples included
 * `ROLE_UPDATED`, `DONATION_CREATED` and `EXPENSE_CREATED`; the first cannot happen because a role is
 * a value in the Prisma enum rather than a row that can be edited, and the other two belong to
 * modules outside this part's scope. They are added when a writer for them is.
 *
 * `APPROVAL_CANCELLED` is absent for the same reason: the status exists on the model, but this part's
 * route list has no endpoint that sets it, so nothing can write that entry yet.
 */
export const AUDIT_ACTIONS = [
  'USER_CREATED',
  'USER_UPDATED',
  'USER_STATUS_CHANGED',
  'USER_DELETED',
  'ROLE_ASSIGNED',
  'POSITIONS_ASSIGNED',
  'PERMISSION_CHANGED',
  'PASSWORD_CHANGED',
  'PASSWORD_RESET',
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'APPROVAL_REQUESTED',
  'APPROVAL_APPROVED',
  'APPROVAL_REJECTED',
  'FUND_CREATED',
  'FUND_UPDATED',
  'FUND_BALANCE_ADJUSTED',
  'TRANSACTION_CREATED',
  'TRANSACTION_UPDATED',
  'TRANSACTION_VOIDED',
  'EXPENSE_CREATED',
  'EXPENSE_COMPLETED',
  'EXPENSE_REJECTED_INSUFFICIENT_FUNDS',
  'SALARY_CREATED',
  'SALARY_PAID',
  'SALARY_REJECTED_INSUFFICIENT_FUNDS',
  'FUND_TRANSFER_CREATED',
  'FUND_TRANSFER_COMPLETED',
  'FUND_TRANSFER_REJECTED_INSUFFICIENT_FUNDS',
  'DONATION_RECORDED',
  'RECEIPT_ISSUED',
  'RECEIPT_VOIDED',
  'IFTAR_SPONSORSHIP_CREATED',
  'IFTAR_SPONSORSHIP_UPDATED',
  'IFTAR_SPONSORSHIP_DELETED',
  'EVENT_CREATED',
  'EVENT_UPDATED',
  'EVENT_DELETED',
  'SERVICE_CREATED',
  'SERVICE_UPDATED',
  'SERVICE_DELETED',
  'BOOKING_CREATED',
  'BOOKING_UPDATED',
  'BOOKING_STATUS_CHANGED',
  'BOOKING_DELETED',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/**
 * The kind of thing an action concerned — the brief's `entity`, stored in the schema's `resource`
 * column and named `resource` there because it matches the first half of a permission.
 */
export const AUDIT_RESOURCES = [
  'user',
  'auth',
  'approval',
  'transaction',
  'fund',
  'expense',
  'salary',
  'fund_transfer',
  'donation',
  'receipt',
  'iftar_sponsorship',
  'event',
  'service',
  'booking',
] as const;

export type AuditResource = (typeof AUDIT_RESOURCES)[number];

/**
 * What changed, as field names and business values.
 *
 * Deliberately not `Prisma.InputJsonValue`: a caller should be handing over an object describing
 * fields, not a bare number or a string of JSON. `unknown` values rather than `string` because a
 * change is often an array — `positions`, `permissions` — or a small nested object.
 */
export type AuditChanges = Record<string, unknown>;

/**
 * One entry, as a writer describes it.
 *
 * `mosqueId` is the mosque the action *concerned*, which is not always the actor's own: a platform
 * administrator editing an account at another mosque produces a row that belongs in that mosque's
 * trail, where its own administrators can see it. Passing the actor's mosque instead would hide
 * cross-mosque administration from the only people it happened to.
 *
 * `actorName` is required and denormalised, as the schema intends: a log entry has to keep reading
 * correctly after the person is renamed, or deleted. Callers holding a full user row pass the real
 * name; callers holding only a token pass the email, which the token does carry.
 */
export interface AuditEntry {
  /** The mosque the action concerned — the *target's* mosque, not necessarily the actor's. */
  mosqueId: string;
  action: AuditAction;
  resource: AuditResource;
  /** The affected row, when the action concerns one. */
  resourceId?: string | null;
  /** Null for an action taken before sign-in, e.g. a failed login. */
  actorId?: string | null;
  /** How to name the actor in a list, months later. Never a token or a hash. */
  actorName: string;
  actorRole?: string | null;
  changes?: AuditChanges | null;
  /** Free text, e.g. why a request was refused. */
  note?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * The columns an audit entry is read back through.
 *
 * `mosqueId` is present, unlike every other module's projection, because this is the one list a
 * platform administrator reads across mosques: without it a row and the mosque it belongs to could
 * not be told apart. Everyone else is confined to their own mosque, for whom it is a constant.
 */
export const AUDIT_LOG_SELECT = {
  id: true,
  mosqueId: true,
  actorId: true,
  actorName: true,
  actorRole: true,
  action: true,
  resource: true,
  resourceId: true,
  changes: true,
  note: true,
  ipAddress: true,
  userAgent: true,
  createdAt: true,
} satisfies Prisma.AuditLogSelect;

export type SelectedAuditLog = Prisma.AuditLogGetPayload<{ select: typeof AUDIT_LOG_SELECT }>;

export const DEFAULT_AUDIT_LOG_PAGE_SIZE = 20;

/**
 * Field names that must never reach the `changes` column.
 *
 * The schema says the column never contains a password, token or secret, and every writer in this
 * repository honours that by naming fields explicitly. This pattern is the second line: an intention
 * documented in a comment survives exactly as long as everyone reads the comment, whereas a filter in
 * the write path holds even when a future caller passes an object it assembled from somewhere else.
 *
 * Matched as a substring so `passwordHash`, `newPassword`, `refreshTokenHash` and `resetToken` are all
 * caught by one rule. False positives are the intended trade: a redacted field is a small loss, a
 * logged credential is a breach.
 */
const SECRET_FIELD_PATTERN = /pass|token|secret|hash|credential|cookie|authorization|otp|apikey/i;

/** What a redacted field reads as. A marker, so a reader can tell redaction from absence. */
export const REDACTED = '[redacted]';

/** How deep `redactSecrets` will walk before it stops recursing and drops the value. */
const MAX_DEPTH = 4;

/**
 * `changes`, with anything that looks like a credential replaced by a marker.
 *
 * Recurses into plain objects and arrays, because a secret one level down is still a secret. Depth is
 * bounded so a cyclic or pathological object cannot turn an audit write into a stack overflow — an
 * audit entry is not the place to be clever.
 */
export function redactSecrets(changes: AuditChanges, depth = 0): AuditChanges {
  const safe: AuditChanges = {};

  for (const [key, value] of Object.entries(changes)) {
    safe[key] = SECRET_FIELD_PATTERN.test(key) ? REDACTED : redactValue(value, depth);
  }

  return safe;
}

function redactValue(value: unknown, depth: number): unknown {
  if (depth >= MAX_DEPTH || value === null || typeof value !== 'object') return value;

  if (Array.isArray(value)) return value.map((item) => redactValue(item, depth + 1));

  // A Date, a Decimal or anything else with its own prototype is left alone: walking it would produce
  // an object of internal fields rather than the value the writer meant to record.
  if (Object.getPrototypeOf(value) !== Object.prototype) return value;

  return redactSecrets(value as AuditChanges, depth + 1);
}

/**
 * `changes` with the fields that were never given dropped.
 *
 * A partial update reaches its service as a DTO where most properties are `undefined`, and the natural
 * way to record one is to name every field and let the absent ones fall away. Without this, `changes`
 * would list all of them and every entry would read as though the whole profile had been rewritten —
 * which is the opposite of what a trail is for. `null` is kept, because clearing a field *is* a change.
 */
export function definedChanges(changes: AuditChanges): AuditChanges {
  const given: AuditChanges = {};

  for (const [key, value] of Object.entries(changes)) {
    if (value !== undefined) given[key] = value;
  }

  return given;
}
