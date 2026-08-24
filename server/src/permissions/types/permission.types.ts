import { Role } from '@prisma/client';

import {
  BASE_PERMISSIONS,
  PERMISSION_GROUPS,
  PLATFORM_ONLY,
  type Permission,
  type PermissionGroupKey,
} from '../../common/constants/permissions';
import { effectivePermissions } from '../../common/constants/roles';

/**
 * The registry, indexed for reading.
 *
 * Nothing here is a second source of truth. Every field below is derived from `PERMISSION_GROUPS` and
 * `ROLE_PERMISSIONS`, and the derivation runs once at module load rather than per request — the
 * permission model is compile-time data, so an endpoint that reports it should not be doing work.
 *
 * The point of indexing it at all is that a registry is the wrong shape to read: a client needs to know
 * which group a permission belongs to and which roles carry it, and computing that by scanning 20
 * groups and 7 roles on every request would be silly.
 */

/** One permission, described. */
export interface PermissionDetail {
  /** The permission itself, in `resource.action` form. Its identifier. */
  id: Permission;
  /** The registry group it is declared in. */
  group: PermissionGroupKey;
  /** `donation`, from `donation.record`. */
  resource: string;
  /** `record`, from `donation.record`. */
  action: string;
  /** Held by every active account, whatever their role. */
  isBase: boolean;
  /** Withheld from `mosque_admin`: it belongs to whoever runs the platform, not a mosque. */
  isPlatformOnly: boolean;
  /** The roles that resolve to this permission without any individual grant. */
  roles: Role[];
}

const GROUP_KEYS = Object.keys(PERMISSION_GROUPS) as PermissionGroupKey[];

/** Registry order, which groups related permissions together and is worth preserving in a response. */
const ORDERED: { permission: Permission; group: PermissionGroupKey }[] = GROUP_KEYS.flatMap(
  (group) => {
    const permissions: readonly Permission[] = PERMISSION_GROUPS[group];
    return permissions.map((permission) => ({ permission, group }));
  },
);

/**
 * What a role resolves to on its own — no individual grants, no denies, account active.
 *
 * Computed with `effectivePermissions` rather than by reading `ROLE_PERMISSIONS` directly, so what
 * these endpoints report is exactly what the guard will allow. Re-deriving it here would be a second
 * implementation of the resolver, free to drift from the one that makes the decision.
 */
const ROLE_GRANTS: ReadonlyMap<Role, Permission[]> = new Map(
  Object.values(Role).map((role) => [
    role,
    effectivePermissions({ role, permissions: [], deniedPermissions: [], isActive: true }),
  ]),
);

export function grantedByRole(role: Role): Permission[] {
  return ROLE_GRANTS.get(role) ?? [];
}

export const PERMISSION_DETAILS: readonly PermissionDetail[] = ORDERED.map(
  ({ permission, group }) => {
    const separator = permission.indexOf('.');

    return {
      id: permission,
      group,
      resource: permission.slice(0, separator),
      action: permission.slice(separator + 1),
      isBase: BASE_PERMISSIONS.includes(permission),
      isPlatformOnly: PLATFORM_ONLY.includes(permission),
      roles: Object.values(Role).filter((role) => grantedByRole(role).includes(permission)),
    };
  },
);

const BY_ID: ReadonlyMap<string, PermissionDetail> = new Map(
  PERMISSION_DETAILS.map((detail) => [detail.id, detail]),
);

/** The described permission, or `undefined` for anything not in the registry. */
export function permissionDetail(id: string): PermissionDetail | undefined {
  return BY_ID.get(id);
}

/** The group names, in registry order, for a client that renders the list in sections. */
export const PERMISSION_GROUP_KEYS: readonly PermissionGroupKey[] = GROUP_KEYS;
