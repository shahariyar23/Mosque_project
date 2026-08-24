import { Prisma } from '@prisma/client';

/**
 * The shapes the users module shares between its service, controller, DTOs and tests.
 *
 * Two of them are load-bearing.
 *
 * `USER_SELECT` is the single definition of what a user *is* over HTTP. It names columns explicitly
 * rather than relying on a default read, so `passwordHash` is never fetched at all — a stronger
 * guarantee than deleting the key afterwards, because a new endpoint cannot forget to delete it. The
 * schema states the rule outright: no `select` in this codebase includes that column.
 *
 * The status vocabulary is mapped in one place. The schema has no status enum — it has `isActive`, a
 * boolean — so `active` / `inactive` is a presentation of that column for the HTTP surface and never
 * a second source of truth.
 */

/**
 * Columns a user endpoint may return.
 *
 * `passwordHash` is absent because it is a credential. `deletedAt` is absent because no endpoint
 * returns a soft-deleted user, so the column would always read null and only invite the assumption
 * that a deleted user might come back from one of these routes.
 */
export const USER_SELECT = {
  id: true,
  mosqueId: true,
  fullName: true,
  email: true,
  phone: true,
  role: true,
  positions: true,
  permissions: true,
  deniedPermissions: true,
  isActive: true,
  dateOfBirth: true,
  gender: true,
  city: true,
  avatarUrl: true,
  newsletter: true,
  emailVerifiedAt: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

/** What Prisma hands back for `USER_SELECT`, derived so the two cannot drift apart. */
export type SelectedUser = Prisma.UserGetPayload<{ select: typeof USER_SELECT }>;

/**
 * The status vocabulary the API accepts, mapped onto `User.isActive`.
 *
 * Deliberately not a Prisma enum: adding one would put the same fact in two columns. An inactive
 * account resolves to *no* permissions at all — see `effectivePermissions` in
 * `common/constants/roles.ts` — so this is a real access decision, not a label.
 */
export const USER_STATUSES = ['active', 'inactive'] as const;

export type UserStatus = (typeof USER_STATUSES)[number];

export function isActiveFor(status: UserStatus): boolean {
  return status === 'active';
}

/**
 * Values `gender` accepts, matching the signup form's own options (`web/src/components/signup`), which
 * submits lowercase or omits the field entirely. The column is `VarChar(8)`, so a longer value would
 * be a database error rather than a validation one.
 */
export const USER_GENDERS = ['male', 'female'] as const;

export type UserGender = (typeof USER_GENDERS)[number];

/** Rows per page when the caller does not ask. Capped by `MAX_PAGE_SIZE` from common/pagination. */
export const DEFAULT_USER_PAGE_SIZE = 20;
