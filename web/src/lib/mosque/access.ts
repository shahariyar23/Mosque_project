import { PERMISSION_GROUPS, type Permission } from "@/lib/permissions";

/**
 * Presentation helpers for the access modules (Users, Roles & Access).
 *
 * The permission registry in `lib/permissions.ts` is the authority; this file only decides how to
 * *show* it. Two views need the same two things — a readable name for each registry group, and a way
 * to fold a flat permission list back into those groups in registry order — so they live here once
 * rather than being written twice and drifting.
 */

export type PermissionGroupKey = keyof typeof PERMISSION_GROUPS;

/** Human labels for the registry's module groups. Order below follows the registry itself. */
export const permissionGroupLabels: Record<PermissionGroupKey, string> = {
  base: "General",
  dashboard: "Dashboard",
  platform: "Platform",
  mosque: "Mosque settings",
  access: "Users & access",
  prayer: "Prayer & Jumu'ah",
  events: "Events",
  services: "Services & bookings",
  announcements: "Announcements",
  content: "Content",
  donations: "Donations",
  finance: "Finance",
  contributions: "Contributions",
  payroll: "Payroll",
  reports: "Reports",
  governance: "Governance",
  communication: "Communication",
  media: "Media",
  workflow: "Workflow",
};

/** The registry's groups in declaration order, each with its key, label and full permission list. */
export const permissionGroups: Array<{
  key: PermissionGroupKey;
  label: string;
  permissions: Permission[];
}> = (Object.keys(PERMISSION_GROUPS) as PermissionGroupKey[]).map((key) => ({
  key,
  label: permissionGroupLabels[key],
  permissions: [...PERMISSION_GROUPS[key]] as Permission[],
}));

/**
 * Folds a flat permission list into the registry groups, dropping the groups the person has none of.
 * Used by the Users drawer to show an effective set the way the registry is organised, and by the
 * Roles matrix to count coverage per area.
 */
export function groupPermissions(
  granted: Permission[],
): Array<{ key: PermissionGroupKey; label: string; items: Permission[] }> {
  const set = new Set(granted);
  return permissionGroups
    .map((group) => ({
      key: group.key,
      label: group.label,
      items: group.permissions.filter((permission) => set.has(permission)),
    }))
    .filter((group) => group.items.length > 0);
}
