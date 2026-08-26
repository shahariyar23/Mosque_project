/**
 * `/users` — the people in the mosque.
 *
 * "A member is a user" in this backend: there is no separate members table and no `/members` route, so the
 * members screen reads this same list. `GET /users` needs `user.view`; writes need `user.manage`.
 *
 * **Three things about the write routes are not guessable and are the usual source of a 400.**
 *
 * `PATCH /users/:id` updates the profile *only*. It rejects `role`, `permissions`, `status`, `password` and
 * `mosqueId` outright — `forbidNonWhitelisted: true` means an undeclared field is a 400 rather than
 * something the server ignores — because each of those has its own route with its own permission. A role
 * change is `role.assign`, not `user.manage`, and that distinction only holds if the routes stay separate.
 *
 * `PATCH /users/:id/positions` and `/permissions` **replace** the arrays they are given. Sending one
 * position does not add it; it makes it the only one. So a caller building either payload must send the
 * whole intended list.
 *
 * `DELETE /users/:id` is a **soft delete** answering `200`, not `204`. The row stays, `deletedAt` is set, and
 * it is only visible again through `?deleted=true`, which requires `user.viewDeleted` — a platform
 * permission a mosque admin does not hold. Sent by someone without it, the filter is ignored rather than
 * refused, so the UI must not offer the toggle unless the permission is present: it would look broken.
 *
 * No password or hash is in any response on this module. `USER_SELECT` on the server picks the columns, and
 * neither `passwordHash` nor any token field is among them.
 */

import { apiDelete, apiGet, apiList, apiPatch, apiPost } from "./apiClient";
import type { ListResult } from "./apiClient";
import type { UserGender, UserStatus } from "./enums";
import type { AdminUser } from "@/lib/mosque/types";
import { allPermissions, positionLabels } from "@/lib/permissions";
import type { Permission, Position, Role } from "@/lib/permissions";

/**
 * One person, exactly as `UserResponseDto` declares them.
 *
 * `isActive` and `status` are the same fact in two shapes and the backend sends both. `deletedAt` is only
 * present on a soft-deleted row, which is why it is the one optional field.
 *
 * `permissions` and `deniedPermissions` are `string[]`, not the frontend `Permission` union: the server
 * registry is the authority, and typing them as the mirror's union would claim a guarantee this side cannot
 * make. `positions` and `role` *are* narrowed, because those are Prisma enums with a fixed set of values
 * that the mirror reproduces exactly.
 */
export type User = {
  id: string;
  mosqueId: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: Role;
  positions: Position[];
  /** Granted on top of the role. */
  permissions: string[];
  /** Removed after everything else. Deny always wins. */
  deniedPermissions: string[];
  isActive: boolean;
  status: UserStatus;
  /** `YYYY-MM-DD`. */
  dateOfBirth: string | null;
  gender: string | null;
  city: string | null;
  avatarUrl: string | null;
  newsletter: boolean;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Set only on a soft-deleted row. */
  deletedAt?: string | null;
};

/** All `DELETE /users/:id` returns — the id and when it happened. */
export type DeletedUser = {
  id: string;
  deletedAt: string;
};

/**
 * The filters `UserQueryDto` declares, and nothing else.
 *
 * No `sortBy` or `sortDir`: no list endpoint in this API accepts one, so the order is the server's and a
 * paginated table must not offer interactive column sort — sorting one page of many silently misleads.
 */
export type UserQuery = {
  page?: number;
  /** Capped at 100. Defaults to 20 on the server, not 10. */
  limit?: number;
  /** Free text over name, email and phone. Trimmed to 120 characters. */
  search?: string;
  status?: UserStatus;
  role?: Role;
  position?: Position;
  /** Soft-deleted rows only. Silently ignored without `user.viewDeleted`. */
  deleted?: boolean;
};

/**
 * A new account.
 *
 * `mosqueId` is required and is the caller's own mosque — read it from the session rather than a form field.
 * `phone` must be E.164 (`+8801…`) and a duplicate email or phone is a `409`, which the form should show
 * against the field rather than as a page-level failure.
 */
export type CreateUserInput = {
  mosqueId: string;
  /** 2–160 characters. */
  fullName: string;
  email: string;
  /** 8–128 characters. Sent once, never returned. */
  password: string;
  /** E.164, e.g. `+8801711223344`. */
  phone?: string | null;
  status?: UserStatus;
  /** `YYYY-MM-DD`. */
  dateOfBirth?: string | null;
  gender?: UserGender | null;
  city?: string | null;
  /** Absolute URL, at most 500 characters. */
  avatarUrl?: string | null;
  newsletter?: boolean;
};

/**
 * Profile fields only — the create shape without `mosqueId`, `password` and `status`.
 *
 * Written out rather than derived with `Omit<Partial<…>>` so that what may be sent is readable here, which
 * is the whole point given that sending anything else is a 400. `PATCH /users/:id` also accepts
 * `profile.manageOwn`, which is how someone edits their own details without holding `user.manage`.
 */
export type UpdateUserInput = {
  fullName?: string;
  email?: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: UserGender | null;
  city?: string | null;
  avatarUrl?: string | null;
  newsletter?: boolean;
};

/** A page of people. `user.view`. */
export function fetchUsers(query: UserQuery = {}): Promise<ListResult<User>> {
  return apiList<User>("/users", {
    page: query.page,
    limit: query.limit,
    search: query.search,
    status: query.status,
    role: query.role,
    position: query.position,
    deleted: query.deleted,
  });
}

export function fetchUser(id: string): Promise<User> {
  return apiGet<User>(`/users/${id}`);
}

/** `user.manage`. `409` on a duplicate email or phone. */
export function createUser(input: CreateUserInput): Promise<User> {
  return apiPost<User>("/users", input);
}

/** Profile fields only. `user.manage`, or `profile.manageOwn` for one's own record. */
export function updateUser(id: string, input: UpdateUserInput): Promise<User> {
  return apiPatch<User>(`/users/${id}`, input);
}

/** `user.manage`. Deactivating blocks sign-in and resolves every permission false, base ones included. */
export function updateUserStatus(id: string, status: UserStatus): Promise<User> {
  return apiPatch<User>(`/users/${id}/status`, { status });
}

/** `role.assign` — deliberately not `user.manage`. */
export function updateUserRole(id: string, role: Role): Promise<User> {
  return apiPatch<User>(`/users/${id}/role`, { role });
}

/**
 * Replaces the whole list. `position.assign`.
 *
 * Positions grant nothing — a President is a position, and whoever approves is whoever holds
 * `workflow.approve`. This is a label, not access.
 */
export function updateUserPositions(id: string, positions: Position[]): Promise<User> {
  return apiPatch<User>(`/users/${id}/positions`, { positions });
}

/**
 * Replaces whichever array is sent. `permission.assign`.
 *
 * Both are optional and independent: sending only `permissions` leaves the denials untouched. Every value
 * must exist in the server registry, so send strings that came from `/permissions`.
 */
export function updateUserPermissions(
  id: string,
  input: { permissions?: string[]; deniedPermissions?: string[] },
): Promise<User> {
  return apiPatch<User>(`/users/${id}/permissions`, input);
}

/**
 * Soft delete. `user.manage`.
 *
 * Answers `200` with the id and timestamp; nothing needs them, so this resolves to `void`. To block sign-in
 * without removing the person, patch `status: "inactive"` instead.
 */
export function deleteUser(id: string): Promise<void> {
  return apiDelete(`/users/${id}`);
}

/* ------------------------------------------------------------------ *
 * API shape → the shape the existing screens render.
 * ------------------------------------------------------------------ */

/** The 15 positions, as a set, for filtering an incoming array without a cast. */
const KNOWN_POSITIONS = new Set<string>(Object.keys(positionLabels));
const KNOWN_PERMISSIONS = new Set<string>(allPermissions);

/**
 * Narrows a list of strings from the API to the ones this build knows.
 *
 * A cast would be shorter and would also be a claim — that every string the server sent is a member of the
 * union — which nothing here can check. Filtering makes the claim true. An unknown value can only come from
 * a server registry ahead of this mirror, and dropping it affects what a screen *shows*: the backend is
 * still the one enforcing it.
 */
function knownPermissions(values: string[] | undefined): Permission[] {
  return (values ?? []).filter((value): value is Permission => KNOWN_PERMISSIONS.has(value));
}

function knownPositions(values: Position[] | undefined): Position[] {
  return (values ?? []).filter((value) => KNOWN_POSITIONS.has(value));
}

/**
 * `User` → `AdminUser`, the type the user and member screens already render.
 *
 * `mosqueName` is a parameter because the response does not carry one — every row belongs to the caller's
 * own mosque, so the name is on the session and passing it beats hard-coding a mosque's name into a
 * service. `joinedAt` and `lastActiveAt` are cut to `YYYY-MM-DD` because that is what the table columns
 * show; `createdAt` and `lastLoginAt` are still carried through in full for anything that needs the time.
 */
export function mapBackendUserToAdminUser(user: User, mosqueName = ""): AdminUser {
  return {
    id: user.id,
    name: user.fullName?.trim() || user.email || "Unnamed User",
    email: user.email,
    phone: user.phone || "—",
    mosqueId: user.mosqueId,
    mosqueName,
    role: user.role,
    positions: knownPositions(user.positions),
    permissions: knownPermissions(user.permissions),
    deniedPermissions: knownPermissions(user.deniedPermissions),
    isActive: typeof user.isActive === "boolean" ? user.isActive : user.status === "active",
    joinedAt: user.createdAt ? user.createdAt.slice(0, 10) : "",
    lastActiveAt: user.lastLoginAt ? user.lastLoginAt.slice(0, 10) : "",
    fullName: user.fullName,
    status: user.status,
    dateOfBirth: user.dateOfBirth,
    gender: user.gender,
    city: user.city,
    avatarUrl: user.avatarUrl,
    newsletter: user.newsletter,
    emailVerifiedAt: user.emailVerifiedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    deletedAt: user.deletedAt,
  };
}
