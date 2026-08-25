import { Role } from '@prisma/client';
import { ALL_PERMISSIONS, BASE_PERMISSIONS, PLATFORM_ONLY, type Permission } from './permissions';

/**
 * What each role *adds* to the base set, and the one function that resolves an effective set.
 *
 * This mirrors `rolePermissions` and `effectivePermissions` in `web/src/lib/permissions.ts`. The
 * frontend copy decides what to render; this copy decides what is allowed. Nothing else in the
 * backend may derive a permission set, and nothing anywhere may compare a role name to decide
 * access — a role is an input to this function, never a shortcut around it.
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: [...ALL_PERMISSIONS],

  // Computed, not hand-written — see PLATFORM_ONLY.
  mosque_admin: ALL_PERMISSIONS.filter((permission) => !PLATFORM_ONLY.includes(permission)),

  // A secretary is excluded from all finance and all donations on purpose: they review, an admin
  // approves. A mosque whose secretary really does take money grants that one person
  // `donation.record` through their own `permissions` array rather than widening the role.
  secretary: [
    'dashboard.view',
    'member.view',
    'member.manage',
    'user.view',
    'event.create',
    'event.update',
    'event.delete',
    'announcement.manage',
    'meeting.manage',
    'document.manage',
    'workflow.review',
    'report.view',
    'gallery.manage',
    'notification.send',
    'volunteer.view',
    'volunteer.manage',
    'booking.view',
    'booking.manage',
    'service.manage',
    'facility.create',
    'facility.update',
    'facility.delete',
  ],

  // The finance owner. Holds `workflow.review` but not `workflow.approve`: a treasurer prepares a
  // payment and someone else signs it off.
  treasurer: [
    'dashboard.view',
    'donation.view',
    'donation.record',
    'donation.verify',
    'donation.manage',
    'finance.view',
    'finance.manage',
    'expense.view',
    'expense.manage',
    'budget.manage',
    'transaction.view',
    'transaction.record',
    'transaction.void',
    'fund.view',
    'fund.manage',
    'campaign.view',
    'campaign.manage',
    'campaign.publish',
    'receipt.issue',
    'receipt.view',
    'contribution.view',
    'contribution.record',
    'contribution.manage',
    'salary.view',
    'salary.manage',
    'report.view',
    'report.manage',
    'report.export',
    'member.view',
    'workflow.review',
  ],

  // Collects money and issues receipts. No verify, no void, no manage — a cashier has no delete
  // anywhere, and cannot verify what they themselves recorded.
  cashier: [
    'dashboard.view',
    'donation.view',
    'donation.record',
    'transaction.view',
    'receipt.issue',
    'receipt.view',
    'contribution.view',
    'contribution.record',
    'member.view',
  ],

  // Runs prayer and content. Sees no one else's money — the two `Own` grants are what let the imam
  // open their own salary record and its receipts, and nothing wider.
  imam: [
    'dashboard.view',
    'prayer.manage',
    'jumuah.manage',
    'ramadan.manage',
    'khutbah.view',
    'khutbah.create',
    'khutbah.update',
    'quran.manage',
    'article.view',
    'article.manage',
    'class.view',
    'class.manage',
    'member.view',
    'report.view',
    'salary.viewOwn',
    'receipt.viewOwn',
  ],

  // No `dashboard.view` on purpose. A member's own history lives in the account area, which is not
  // part of this back office.
  member: [
    'donation.viewOwn',
    'booking.viewOwn',
    'booking.createOwn',
    'event.registerSelf',
    'contribution.viewOwn',
    'receipt.viewOwn',
  ],
};

/** The subject a permission decision is made about. Deliberately the minimum needed to decide. */
export interface PermissionSubject {
  role: Role;
  /** Granted on top of the role. */
  permissions: string[];
  /** Removed after everything else. Deny always wins. */
  deniedPermissions: string[];
  isActive: boolean;
}

/**
 * base + role + `permissions` − `deniedPermissions`, and nothing at all when the account is inactive.
 *
 * The early return for an inactive account is load-bearing: it must resolve false for *every*
 * permission, base ones included, so disabling an account is a complete revocation rather than a
 * reduction. Filtering at the end would leave the base set behind.
 */
export function effectivePermissions(subject: PermissionSubject): Permission[] {
  if (!subject.isActive) return [];

  const granted = new Set<Permission>([
    ...BASE_PERMISSIONS,
    ...(ROLE_PERMISSIONS[subject.role] ?? []),
    // Stored as plain strings, so anything not in the registry is discarded rather than trusted.
    ...subject.permissions.filter((p): p is Permission =>
      ALL_PERMISSIONS.includes(p as Permission),
    ),
  ]);

  // Deny beats grant beats role beats base, so this runs last.
  for (const permission of subject.deniedPermissions) granted.delete(permission as Permission);

  return [...granted];
}

export function hasPermission(granted: Permission[], permission: Permission): boolean {
  return granted.includes(permission);
}

export function hasAnyPermission(granted: Permission[], permissions: Permission[]): boolean {
  return permissions.some((permission) => granted.includes(permission));
}

export function hasAllPermissions(granted: Permission[], permissions: Permission[]): boolean {
  return permissions.every((permission) => granted.includes(permission));
}

/**
 * How much of a resource a request may reach:
 *   "all"  — every record in the mosque
 *   "own"  — only records belonging to the requester
 *   "none" — refuse
 *
 * Unlike the frontend's version of this helper, this one *is* an access decision: the value it
 * returns picks the `where` clause a service builds, which is where ownership is actually enforced.
 */
export type DataScope = 'all' | 'own' | 'none';

export function scopeFor(granted: Permission[], all: Permission, own: Permission): DataScope {
  if (granted.includes(all)) return 'all';
  if (granted.includes(own)) return 'own';
  return 'none';
}
