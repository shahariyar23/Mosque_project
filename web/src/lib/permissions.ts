/**
 * Frontend mirror of the platform permission registry.
 *
 * The authority for this file is
 * `docs/specs/0001-role-permission-architecture/0001-identity-permission-model.md`,
 * and the runtime authority once the API lands is `server/auth/permissions.js`. This module exists
 * so the interface can decide what to show; it is never the security boundary. Every action gated
 * here is refused independently by the API (spec 0003, AC-8).
 *
 * Two rules from the spec shape everything below:
 *
 *  1. A person has exactly one `role`. Mixed duties are expressed with the `permissions` and
 *     `deniedPermissions` arrays on their record, never with a second role.
 *  2. A committee post lives in `positions` and grants nothing at all (AC-11). The President is a
 *     position; the person who approves is whoever holds `workflow.approve`.
 *
 * Permissions ending in `Own` answer "may this kind of person do this at all", never "does this
 * record belong to them". Ownership is a query concern and lives in the controller (spec 0004).
 */

/* -------------------------------------------------------------------------- *
 * Registry
 *
 * Grouped by module, `resource.action` throughout, exactly as the spec tables list them. The
 * `Permission` union is derived from this object rather than written out separately, so the type
 * and the registry cannot drift apart — which is what satisfies spec 0001 AC-14 ("every permission
 * named in the frontend navigation array exists in the registry") at compile time rather than by
 * test.
 *
 * Lines marked `EXT` are additions this finance module needs and the spec's registry does not yet
 * carry. They follow the spec's own naming conventions and are listed again in
 * `FINANCE_EXTENSIONS` below so the backend has an exact, reviewable set to add.
 * -------------------------------------------------------------------------- */
export const PERMISSION_GROUPS = {
  /** Granted to every signed-in person, whatever their role. */
  base: [
    "account.view",
    "profile.manageOwn",
    "notification.viewOwn",
    "prayer.view",
    "announcement.view",
    "event.view",
    "service.view",
    "quran.view",
    "gallery.view",
  ],
  dashboard: ["dashboard.view"],
  platform: ["platform.manage", "mosque.create", "audit.view"],
  mosque: ["mosque.view", "mosque.manage", "settings.view", "settings.manage"],
  access: [
    "user.view",
    "user.viewDeleted",
    "user.manage",
    "role.assign",
    "permission.assign",
    "position.assign",
    "member.view",
    "member.manage",
  ],
  prayer: ["prayer.manage", "jumuah.manage", "ramadan.manage"],
  events: ["event.create", "event.update", "event.delete", "event.publish", "event.registerSelf"],
  services: ["service.manage", "booking.view", "booking.manage", "booking.viewOwn", "booking.createOwn"],
  announcements: ["announcement.manage", "announcement.publish"],
  content: [
    "quran.manage",
    "khutbah.view",
    "khutbah.create",
    "khutbah.update",
    "khutbah.delete",
    "khutbah.publish",
    "article.view",
    "article.manage",
    "class.view",
    "class.manage",
  ],
  donations: ["donation.view", "donation.viewOwn", "donation.record", "donation.verify", "donation.manage"],
  finance: [
    "finance.view",
    "finance.manage",
    "expense.manage",
    "budget.manage",
    // EXT — reading a budget is split from changing it, the same way `expense.view` is split from
    // `expense.manage` below. The spec has no read-only budget grant and the finance screens need one.
    "budget.view",
    "transaction.view",
    "receipt.issue",
    // EXT — the spec's six finance permissions cannot express the read-only finance views this
    // module needs, restricted-fund accounting, or the void-instead-of-delete rule that spec 0005
    // AC-13 requires of every financial record.
    "expense.view",
    "transaction.record",
    "transaction.void",
    "fund.view",
    "fund.manage",
    "receipt.view",
    "receipt.viewOwn",
    // EXT — fundraising appeals inside a fund. Split from `fund.*` because drafting an appeal and
    // owning the fund structure money is accounted against are different jobs, and `publish` is
    // split from `manage` for the same reason it is on events and announcements.
    "campaign.view",
    "campaign.manage",
    "campaign.publish",
  ],
  // EXT — monthly member contributions have no home in the spec's registry yet.
  contributions: ["contribution.view", "contribution.viewOwn", "contribution.record", "contribution.manage"],
  // EXT — staff salaries likewise. `salary.viewOwn` is what lets an imam see their own record
  // without seeing anyone else's.
  payroll: ["salary.view", "salary.viewOwn", "salary.manage"],
  reports: [
    "report.view",
    "report.manage",
    // EXT — exporting is a distinct act from managing report definitions.
    "report.export",
  ],
  governance: ["meeting.manage", "document.manage", "volunteer.view", "volunteer.manage"],
  communication: ["notification.send"],
  media: ["gallery.manage"],
  workflow: ["workflow.review", "workflow.approve", "workflow.selfApprove"],
} as const;

export type Permission = (typeof PERMISSION_GROUPS)[keyof typeof PERMISSION_GROUPS][number];

/** Every permission in the registry, flattened. */
export const allPermissions: Permission[] = Object.values(PERMISSION_GROUPS).flat() as Permission[];

/**
 * The additions this module makes to the spec's registry, isolated so the backend can add exactly
 * these strings to `server/auth/permissions.js` and nothing else. Kept as a literal list rather
 * than computed, because its purpose is to be read and reviewed by a person.
 */
export const FINANCE_EXTENSIONS: Permission[] = [
  "expense.view",
  "transaction.record",
  "transaction.void",
  "fund.view",
  "fund.manage",
  "receipt.view",
  "receipt.viewOwn",
  "campaign.view",
  "campaign.manage",
  "campaign.publish",
  "contribution.view",
  "contribution.viewOwn",
  "contribution.record",
  "contribution.manage",
  "salary.view",
  "salary.viewOwn",
  "salary.manage",
  "report.export",
];

/** Granted to every signed-in person (spec 0001, base row). */
export const BASE_PERMISSIONS: Permission[] = [...PERMISSION_GROUPS.base];

/**
 * Held by `super_admin` alone. `mosque_admin` is the whole registry minus these three, which is why
 * it is computed below rather than typed out — a permission added later cannot be silently missed
 * (spec 0001, AC-3).
 */
export const PLATFORM_ONLY: Permission[] = ["platform.manage", "mosque.create", "user.viewDeleted", "workflow.selfApprove"];

/* -------------------------------------------------------------------------- *
 * Roles
 *
 * Seven roles, as the spec defines them. There is deliberately no `president` role: the President
 * is a position (see POSITIONS), and the approver is whoever holds `workflow.approve`. When the
 * President changes, someone reassigns a role and a position and no code changes.
 * -------------------------------------------------------------------------- */
export type Role = "super_admin" | "mosque_admin" | "secretary" | "treasurer" | "cashier" | "imam" | "member";

export const roles: Role[] = [
  "super_admin",
  "mosque_admin",
  "secretary",
  "treasurer",
  "cashier",
  "imam",
  "member",
];

/**
 * What each role *adds* to the base set. Everyone also gets `BASE_PERMISSIONS`, so nothing from the
 * base row is repeated here.
 */
export const rolePermissions: Record<Role, Permission[]> = {
  super_admin: [...allPermissions],

  // Computed, not hand-written — see PLATFORM_ONLY.
  mosque_admin: allPermissions.filter((permission) => !PLATFORM_ONLY.includes(permission)),

  // The spec excludes a secretary from all finance and all donations on purpose: they review, an
  // admin approves. A mosque whose secretary really does take money grants that one person
  // `donation.record` through their `permissions` array rather than widening the role.
  secretary: [
    "dashboard.view",
    "member.view",
    "member.manage",
    "user.view",
    "event.create",
    "event.update",
    "event.delete",
    "announcement.manage",
    "meeting.manage",
    "document.manage",
    "workflow.review",
    "report.view",
    "gallery.manage",
    "notification.send",
    "volunteer.view",
    "volunteer.manage",
    "booking.view",
    "booking.manage",
    "service.manage",
  ],

  // The finance owner. Holds `workflow.review` but not `workflow.approve`: a treasurer prepares a
  // payment and someone else signs it off (spec 0005, AC-6).
  treasurer: [
    "dashboard.view",
    "donation.view",
    "donation.record",
    "donation.verify",
    "donation.manage",
    "finance.view",
    "finance.manage",
    "expense.view",
    "expense.manage",
    "budget.view",
    "budget.manage",
    "transaction.view",
    "transaction.record",
    "transaction.void",
    "fund.view",
    "fund.manage",
    "campaign.view",
    "campaign.manage",
    "campaign.publish",
    "receipt.issue",
    "receipt.view",
    "contribution.view",
    "contribution.record",
    "contribution.manage",
    "salary.view",
    "salary.manage",
    "report.view",
    "report.manage",
    "report.export",
    "member.view",
    "workflow.review",
  ],

  // Collects money and issues receipts. No verify, no void, no manage — "a cashier has no delete
  // anywhere", and under spec 0005 AC-12 a cashier cannot verify what they themselves recorded.
  cashier: [
    "dashboard.view",
    "donation.view",
    "donation.record",
    "transaction.view",
    "receipt.issue",
    "receipt.view",
    "contribution.view",
    "contribution.record",
    "member.view",
  ],

  // Runs prayer and content. Sees no one else's money — the two `Own` grants are what let the imam
  // open their own salary record and its receipts, and nothing wider.
  imam: [
    "dashboard.view",
    "prayer.manage",
    "jumuah.manage",
    "ramadan.manage",
    "khutbah.view",
    "khutbah.create",
    "khutbah.update",
    "quran.manage",
    "article.view",
    "article.manage",
    "class.view",
    "class.manage",
    "member.view",
    "report.view",
    "salary.viewOwn",
    "receipt.viewOwn",
  ],

  // No `dashboard.view` on purpose. A member's own history lives in `/account` (spec 0004), which
  // is a separate area from this back office and is not part of the finance module.
  member: [
    "donation.viewOwn",
    "booking.viewOwn",
    "booking.createOwn",
    "event.registerSelf",
    "contribution.viewOwn",
    "receipt.viewOwn",
  ],
};

export const roleLabels: Record<Role, string> = {
  super_admin: "Super Admin",
  mosque_admin: "Mosque Admin",
  secretary: "Secretary",
  treasurer: "Treasurer",
  cashier: "Cashier",
  imam: "Imam",
  member: "Member",
};

export const roleDescriptions: Record<Role, string> = {
  super_admin: "Full access across every mosque, including platform settings.",
  mosque_admin: "Full access for this mosque. Approves expenses, salaries and content.",
  secretary: "Community, events and governance. Reviews submissions; holds no finance access.",
  treasurer: "Owns the finance module — funds, salaries, reports. Prepares payments for approval.",
  cashier: "Collects donations and monthly contributions, issues receipts. Cannot verify or void.",
  imam: "Prayer and Islamic content. Sees only their own salary record.",
  member: "No dashboard access. Their own history lives in the account area.",
};

/* -------------------------------------------------------------------------- *
 * Positions
 *
 * A fixed set of committee posts. These grant nothing — `positions` never affects the result of a
 * permission check (spec 0001, AC-11). They exist because a position is the label a person
 * recognises themselves by, so the interface shows it under their name.
 * -------------------------------------------------------------------------- */
export type Position =
  | "president"
  | "vice_president"
  | "general_secretary"
  | "assistant_secretary"
  | "treasurer"
  | "cashier"
  | "imam"
  | "muazzin"
  | "khatib"
  | "education_coordinator"
  | "event_coordinator"
  | "volunteer_coordinator"
  | "volunteer"
  | "caretaker"
  | "member";

/** English and Bangla labels, rendered through the existing language provider. */
export const positionLabels: Record<Position, { en: string; bn: string }> = {
  president: { en: "President", bn: "সভাপতি" },
  vice_president: { en: "Vice President", bn: "সহ-সভাপতি" },
  general_secretary: { en: "General Secretary", bn: "সাধারণ সম্পাদক" },
  assistant_secretary: { en: "Assistant Secretary", bn: "সহ-সম্পাদক" },
  treasurer: { en: "Treasurer", bn: "কোষাধ্যক্ষ" },
  cashier: { en: "Cashier", bn: "ক্যাশিয়ার" },
  imam: { en: "Imam", bn: "ইমাম" },
  muazzin: { en: "Muazzin", bn: "মুয়াজ্জিন" },
  khatib: { en: "Khatib", bn: "খতিব" },
  education_coordinator: { en: "Education Coordinator", bn: "শিক্ষা সমন্বয়কারী" },
  event_coordinator: { en: "Event Coordinator", bn: "অনুষ্ঠান সমন্বয়কারী" },
  volunteer_coordinator: { en: "Volunteer Coordinator", bn: "স্বেচ্ছাসেবক সমন্বয়কারী" },
  volunteer: { en: "Volunteer", bn: "স্বেচ্ছাসেবক" },
  caretaker: { en: "Caretaker", bn: "তত্ত্বাবধায়ক" },
  member: { en: "Member", bn: "সদস্য" },
};

/* -------------------------------------------------------------------------- *
 * The person
 * -------------------------------------------------------------------------- */
export type SessionUser = {
  id: string;
  name: string;
  mosqueId: string;
  mosqueName: string;
  role: Role;
  /** Committee posts. Display only — these never affect a permission check. */
  positions: Position[];
  /** Granted on top of the role. */
  permissions: Permission[];
  /** Removed after everything else. Deny always wins. */
  deniedPermissions: Permission[];
  isActive: boolean;
  /** Set when this person is also a contributing member. */
  memberId?: string;
  /** Set when this person is on the mosque payroll. */
  staffId?: string;
};

/* -------------------------------------------------------------------------- *
 * Resolution
 *
 * The one place an effective permission set is computed. Nothing else in the frontend may derive
 * one, and nothing anywhere may compare a role name to decide access.
 * -------------------------------------------------------------------------- */

/**
 * base + role + `permissions` − `deniedPermissions`, and nothing at all when the account is
 * inactive (spec 0001, AC-1, AC-2, AC-8).
 */
export function effectivePermissions(user: SessionUser): Permission[] {
  // AC-2: an inactive account resolves false for every permission, base ones included. Returning
  // early rather than filtering at the end makes that unmissable.
  if (!user.isActive) return [];

  const granted = new Set<Permission>([
    ...BASE_PERMISSIONS,
    ...(rolePermissions[user.role] ?? []),
    ...user.permissions,
  ]);

  // Deny beats grant beats role beats base, so this runs last.
  for (const permission of user.deniedPermissions) granted.delete(permission);

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
 * How much of an area a person may see:
 *   "all"  — every record in the mosque
 *   "own"  — only records belonging to them
 *   "none" — the area should not be shown
 *
 * This is a presentation helper, not an ownership check. It picks which query the page asks for;
 * the API decides which records are actually theirs.
 */
export type DataScope = "all" | "own" | "none";

export function scopeFor(granted: Permission[], all: Permission, own: Permission): DataScope {
  if (granted.includes(all)) return "all";
  if (granted.includes(own)) return "own";
  return "none";
}
