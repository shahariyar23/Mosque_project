import type { Prisma } from '@prisma/client';

/**
 * The approval vocabulary, and the columns a request is read back through.
 *
 * `ApprovalRequest` carries a generic `entity`/`entityId` pair rather than a nullable foreign key per
 * reviewable table, which is what lets one table serve expenses, salary, donations and whatever comes
 * later without knowing any of their schemas. The cost of that generality is that the database cannot
 * police either half, so the two closed tuples below do it here instead — for the same reason
 * `AUDIT_ACTIONS` is a tuple rather than `string`. A misspelt `expence` would create a row that no
 * reviewer's filter ever matches and that nothing would ever resolve, which is worse than a 400.
 *
 * Adding a reviewable kind is therefore a one-line code change, and a reviewable one.
 */

/**
 * The kinds of thing that can be put up for review.
 *
 * Each name matches the first half of a permission — `expense.manage`, `salary.manage` — so the entity
 * a request names and the authority needed to carry it out read the same way.
 *
 * `event` has no table yet. It is listed because the brief names events among the operations this
 * system is meant to cover, and because the reference is unenforced anyway: nothing here joins to the
 * target, so a kind can be accepted before the module that owns it exists. Nothing *writes* one until
 * that module does.
 */
export const APPROVAL_ENTITIES = [
  'expense',
  'salary',
  'donation',
  'budget',
  'event',
  'user',
] as const;

export type ApprovalEntity = (typeof APPROVAL_ENTITIES)[number];

/**
 * What is being proposed.
 *
 * Deliberately the small set of verbs that actually need a second pair of eyes. `view` is absent
 * because reading needs no approval, and a request to read would be a request nobody could act on.
 */
export const APPROVAL_ACTIONS = ['create', 'update', 'delete', 'pay', 'void'] as const;

export type ApprovalAction = (typeof APPROVAL_ACTIONS)[number];

/**
 * The columns a request is read through.
 *
 * `mosqueId` is present, as in `AUDIT_LOG_SELECT` and for the same reason: a holder of
 * `platform.manage` reads this queue across mosques, and without it two rows from two mosques could
 * not be told apart. For everyone else it is a constant.
 *
 * Both user references are narrowed to an id and a name. A review queue has to say who asked and who
 * decided; it does not have to say what their email address, phone number or role is, and a queue that
 * did would hand a directory to anyone holding `workflow.review`.
 */
export const APPROVAL_SELECT = {
  id: true,
  mosqueId: true,
  entity: true,
  entityId: true,
  action: true,
  status: true,
  reason: true,
  comment: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
  requestedBy: { select: { id: true, fullName: true } },
  reviewedBy: { select: { id: true, fullName: true } },
} satisfies Prisma.ApprovalRequestSelect;

export type SelectedApproval = Prisma.ApprovalRequestGetPayload<{
  select: typeof APPROVAL_SELECT;
}>;

export const DEFAULT_APPROVAL_PAGE_SIZE = 20;
