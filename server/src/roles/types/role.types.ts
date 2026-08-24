import { Role } from '@prisma/client';

import { PLATFORM_ONLY, type Permission } from '../../common/constants/permissions';
import { grantedByRole } from '../../permissions/types/permission.types';

/**
 * The roles, described.
 *
 * The set is the Prisma `Role` enum and nothing else. Roles are not rows: they are named in the schema,
 * in the role map, and in `@Roles()` decorators, so adding one is a migration and a code change rather
 * than an insert. That is deliberate — a role invented at runtime would resolve to the base permission
 * set and quietly grant nobody anything.
 *
 * Note there is no `president`. The President is a `Position`, not a role, and the authority to sign
 * something off is `workflow.approve` — carried by whoever actually holds it. Positions are display
 * only and grant nothing.
 *
 * The labels and descriptions mirror `roleLabels` and `roleDescriptions` in
 * `web/src/lib/permissions.ts`, so a screen that reads them from the API and one that ships them in the
 * bundle say the same thing.
 */
export interface RoleDetail {
  id: Role;
  /** For display: `Mosque Admin`, not `mosque_admin`. */
  name: string;
  description: string;
  /** Everything the role resolves to, base permissions included. Sorted. */
  permissions: Permission[];
  permissionCount: number;
  /** Holds at least one platform-only permission, so it reaches beyond a single mosque. */
  isPlatformRole: boolean;
}

const LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  mosque_admin: 'Mosque Admin',
  secretary: 'Secretary',
  treasurer: 'Treasurer',
  cashier: 'Cashier',
  imam: 'Imam',
  member: 'Member',
};

const DESCRIPTIONS: Record<Role, string> = {
  super_admin: 'Full access across every mosque, including platform settings.',
  mosque_admin: 'Full access for this mosque. Approves expenses, salaries and content.',
  secretary: 'Community, events and governance. Reviews submissions; holds no finance access.',
  treasurer: 'Owns the finance module — funds, salaries, reports. Prepares payments for approval.',
  cashier: 'Collects donations and monthly contributions, issues receipts. Cannot verify or void.',
  imam: 'Prayer and Islamic content. Sees only their own salary record.',
  member: 'No dashboard access. Their own history lives in the account area.',
};

/**
 * Enum order, which runs most privileged to least and is the order these read best in.
 *
 * The permission list is copied before sorting: `grantedByRole` hands back the shared index, and
 * sorting it in place would reorder the array the resolver's own cache is holding.
 */
export const ROLE_DETAILS: readonly RoleDetail[] = Object.values(Role).map((role) => {
  const permissions = [...grantedByRole(role)].sort();

  return {
    id: role,
    name: LABELS[role],
    description: DESCRIPTIONS[role],
    permissions,
    permissionCount: permissions.length,
    isPlatformRole: permissions.some((permission) => PLATFORM_ONLY.includes(permission)),
  };
});

const BY_ID: ReadonlyMap<string, RoleDetail> = new Map(
  ROLE_DETAILS.map((detail) => [detail.id, detail]),
);

/** The described role, or `undefined` for anything that is not one of the seven. */
export function roleDetail(id: string): RoleDetail | undefined {
  return BY_ID.get(id);
}

/**
 * Whether the role carries platform authority.
 *
 * Derived from the role map rather than from a list of role names, so a platform permission granted to
 * another role later is picked up here without anyone remembering to update this function.
 *
 * Read deliberately from the role, not from a user row: a *suspended* super admin resolves to no
 * permissions at all, and treating them as unprotected would let a mosque admin demote the platform
 * owner by suspending them first.
 */
export function isPlatformRole(role: Role): boolean {
  return BY_ID.get(role)?.isPlatformRole ?? false;
}

/** The role names, for validation messages and Swagger examples. */
export const ROLE_IDS: readonly string[] = Object.values(Role);
