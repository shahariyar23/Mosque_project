/**
 * `GET /permissions` — the permission registry, as the server holds it.
 *
 * **Read-only and unpaginated**, like `/roles`: a permission is not a record anyone creates, it is part of
 * the platform. Granting one to a person is `PATCH /users/:id/permissions` in `userService`.
 *
 * Both routes require `user.view`.
 *
 * The list envelope carries `meta: { total, groups }`. The group names are not returned by this module —
 * they are derived from the rows by `permissionGroups` below, which gives the same set because the list is
 * unpaginated, and avoids reaching past `apiList` into the envelope's `meta` for one array of strings.
 */

import { apiGet, apiList } from "./apiClient";
import type { Role } from "@/lib/permissions";

/**
 * One permission.
 *
 * `id` is the `resource.action` string that guards a route — `"user.view"`, `"finance.manage"`. It is typed
 * `string` rather than the frontend `Permission` union because the server registry is the authority; see
 * the note in `rolesService`.
 */
export type PermissionDetail = {
  id: string;
  /** The module it belongs to, used to section the access screen. */
  group: string;
  resource: string;
  action: string;
  /** Granted to every signed-in person, whatever their role — so never worth listing as an exception. */
  isBase: boolean;
  /** Held by `super_admin` alone. A mosque admin cannot grant these. */
  isPlatformOnly: boolean;
  /** Every role whose resolved set includes this permission. */
  roles: Role[];
};

/** The whole registry, in group order. `user.view`. */
export async function fetchPermissions(): Promise<PermissionDetail[]> {
  const { rows } = await apiList<PermissionDetail>("/permissions");
  return rows;
}

export function fetchPermission(id: string): Promise<PermissionDetail> {
  return apiGet<PermissionDetail>(`/permissions/${id}`);
}

/**
 * The distinct group names, in the order they first appear.
 *
 * `Set` preserves insertion order, so this keeps the registry's own grouping rather than sorting it
 * alphabetically — the server lists them module by module for a reason, and a sorted list would put
 * `access` above `dashboard` and scatter the finance groups.
 */
export function permissionGroups(permissions: PermissionDetail[]): string[] {
  return [...new Set(permissions.map((permission) => permission.group))];
}
