/**
 * `GET /roles` — the seven roles and what each one grants.
 *
 * **Read-only, and unpaginated.** There is no `POST /roles`: the roles are a fixed part of the platform,
 * defined in `server/src/common/constants/roles.ts`, and assigning one to a person is
 * `PATCH /users/:id/role` in `userService`. The list envelope carries `meta: { total }` and no paging
 * numbers, because seven rows is the whole answer.
 *
 * Every route requires `user.view`. That is the permission that lets someone see who is in the mosque, and
 * a role list is unreadable without it.
 *
 * This is the server's own view of the registry, which makes it the thing to render in the access screens —
 * `web/src/lib/permissions.ts` is a mirror kept for deciding what to *show*, and a mirror can drift.
 */

import { apiGet, apiList } from "./apiClient";
import type { PermissionDetail } from "./permissionsService";
import type { Role } from "@/lib/permissions";

/**
 * One role.
 *
 * `permissions` is typed `string[]` rather than the frontend `Permission` union on purpose: the server
 * registry is the authority, and if it grows a permission this mirror has not caught up with, the honest
 * type is the one that does not claim otherwise.
 */
export type RoleDetail = {
  id: Role;
  name: string;
  description: string;
  permissions: string[];
  permissionCount: number;
  /** True for `super_admin` — held across every mosque, not granted by a mosque admin. */
  isPlatformRole: boolean;
};

/** All seven, in registry order. `user.view`. */
export async function fetchRoles(): Promise<RoleDetail[]> {
  const { rows } = await apiList<RoleDetail>("/roles");
  return rows;
}

export function fetchRole(id: Role): Promise<RoleDetail> {
  return apiGet<RoleDetail>(`/roles/${id}`);
}

/**
 * What the role resolves to, as full permission objects — the same shape `GET /permissions` returns, not
 * the bare strings on `RoleDetail.permissions`. Base permissions are included, because the role does in
 * fact grant them.
 */
export async function fetchRolePermissions(id: Role): Promise<PermissionDetail[]> {
  const { rows } = await apiList<PermissionDetail>(`/roles/${id}/permissions`);
  return rows;
}
