/**
 * The permission registry — the runtime authority for authorisation.
 *
 * `web/src/lib/permissions.ts` is an intentional *mirror* of this file and says so at the top: it
 * exists so the interface can decide what to show, and it is never the security boundary. Every
 * action the frontend gates is refused independently here. The two files must stay in step, so this
 * one is written in the same order, with the same group names and the same strings, to make a diff
 * between them readable by eye.
 *
 * Naming is `resource.action` throughout. A permission ending in `Own` answers "may this kind of
 * person do this at all", never "does this record belong to them" — ownership is a query concern and
 * is enforced where the query is built, not here.
 */

export const PERMISSION_GROUPS = {
  /** Granted to every signed-in person, whatever their role. */
  base: [
    'account.view',
    'profile.manageOwn',
    'notification.viewOwn',
    'prayer.view',
    'announcement.view',
    'event.view',
    'service.view',
    'quran.view',
    'gallery.view',
    'facility.view',
  ],
  dashboard: ['dashboard.view'],
  platform: ['platform.manage', 'mosque.create', 'audit.view'],
  mosque: [
    'mosque.view',
    'mosque.manage',
    'settings.view',
    'settings.manage',
    'facility.create',
    'facility.update',
    'facility.delete',
  ],
  access: [
    'user.view',
    'user.manage',
    'role.assign',
    'permission.assign',
    'position.assign',
    'member.view',
    'member.manage',
  ],
  // `prayer.view` sits in `base`: everyone signed in may read the schedule, Jumu'ah and Ramadan
  // included, because that is what a mosque publishes. The three `.manage` strings are who may
  // change it. One per subject rather than a `.create`/`.update`/`.delete` set each — the group has
  // no route where deleting is a narrower authority than editing.
  prayer: ['prayer.manage', 'jumuah.manage', 'ramadan.manage'],
  events: ['event.create', 'event.update', 'event.delete', 'event.publish', 'event.registerSelf'],
  services: [
    'service.manage',
    'booking.view',
    'booking.manage',
    'booking.viewOwn',
    'booking.createOwn',
  ],
  announcements: ['announcement.manage', 'announcement.publish'],
  content: [
    'quran.manage',
    'khutbah.view',
    'khutbah.create',
    'khutbah.update',
    'khutbah.delete',
    'khutbah.publish',
    'article.view',
    'article.manage',
    'class.view',
    'class.manage',
  ],
  donations: [
    'donation.view',
    'donation.viewOwn',
    'donation.record',
    'donation.verify',
    'donation.manage',
  ],
  finance: [
    'finance.view',
    'finance.manage',
    'expense.manage',
    'budget.manage',
    'transaction.view',
    'receipt.issue',
    'expense.view',
    'transaction.record',
    'transaction.void',
    'fund.view',
    'fund.manage',
    'receipt.view',
    'receipt.viewOwn',
    // A campaign is a fundraising appeal inside a fund. It gets its own three rather than riding on
    // `fund.*` because the audience differs: a communications volunteer drafts and edits appeals
    // without ever being trusted with the fund structure money is accounted against.
    //
    // `campaign.publish` is separate from `campaign.manage` for the same reason `event.publish` and
    // `announcement.publish` are separate from their manage grants — writing an appeal and putting it
    // on the public website with a money target attached are different acts of authority.
    'campaign.view',
    'campaign.manage',
    'campaign.publish',
  ],
  contributions: [
    'contribution.view',
    'contribution.viewOwn',
    'contribution.record',
    'contribution.manage',
  ],
  payroll: ['salary.view', 'salary.viewOwn', 'salary.manage'],
  reports: ['report.view', 'report.manage', 'report.export'],
  governance: ['meeting.manage', 'document.manage', 'volunteer.view', 'volunteer.manage'],
  communication: ['notification.send'],
  media: ['gallery.manage'],
  workflow: ['workflow.review', 'workflow.approve', 'workflow.selfApprove'],
} as const;

/**
 * Derived from the registry rather than written out separately, so the type and the data cannot
 * drift apart. An unknown permission string is a compile error at every call site.
 */
export type Permission = (typeof PERMISSION_GROUPS)[keyof typeof PERMISSION_GROUPS][number];

export type PermissionGroupKey = keyof typeof PERMISSION_GROUPS;

/** Every permission in the registry, flattened. */
export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSION_GROUPS).flat();

const PERMISSION_SET: ReadonlySet<string> = new Set<string>(ALL_PERMISSIONS);

/**
 * Whether a string is a registry permission.
 *
 * Used when validating `permissions` / `deniedPermissions` on a write: those columns are string
 * arrays, so a typo would otherwise be stored happily and then silently never match.
 */
export function isPermission(value: string): value is Permission {
  return PERMISSION_SET.has(value);
}

/** Granted to every signed-in person. */
export const BASE_PERMISSIONS: Permission[] = [...PERMISSION_GROUPS.base];

/**
 * Held by `super_admin` alone. `mosque_admin` is the whole registry minus these three, computed
 * below rather than typed out — a permission added later cannot be silently missed.
 */
export const PLATFORM_ONLY: Permission[] = [
  'platform.manage',
  'mosque.create',
  'workflow.selfApprove',
];
