import type { SessionUser } from "@/lib/permissions";

/**
 * Demo identities for the role switcher, and the cookie that selects one.
 *
 * Split out from `session.ts` on purpose: that module imports `next/headers` and is server-only,
 * while the switcher in the header is a client component and needs the cookie name and the labels.
 * Everything here is plain data, safe in either environment.
 *
 * All of it is scaffolding. When auth lands, this file is deleted and `getSession()` starts calling
 * the API instead.
 */

/** Name of the demo cookie. Replaced by the real session cookie later. */
export const DEMO_PROFILE_COOKIE = "noor-demo-profile";

const MOSQUE = { id: "MSQ-001", name: "Noor Community Mosque" };

/**
 * These are *profiles*, not roles, because the cases the spec introduces are not expressible as a
 * role name on its own:
 *
 *  - `president` is a position and grants nothing, so the President is a `mosque_admin` who happens
 *    to hold that post (spec 0001 AC-11, spec 0005 "On the President").
 *  - a mosque whose secretary also takes cash grants that one person `donation.record` through the
 *    `permissions` array instead of widening the role.
 *  - a suspended account resolves false for every permission, base ones included (AC-2).
 *
 * Having each of those on the switcher is what lets someone verify the model by clicking rather
 * than by reading it.
 */
export type ProfileKey =
  | "super_admin"
  | "president"
  | "secretary"
  | "treasurer"
  | "treasurer_suspended"
  | "cashier"
  | "imam"
  | "member";

export const demoProfiles: Record<ProfileKey, SessionUser> = {
  super_admin: {
    id: "USR-001",
    name: "Sultan Mahmud",
    mosqueId: MOSQUE.id,
    mosqueName: MOSQUE.name,
    role: "super_admin",
    positions: [],
    permissions: [],
    deniedPermissions: [],
    isActive: true,
  },
  president: {
    id: "USR-003",
    name: "Hafiz Mizanur Rahman",
    mosqueId: MOSQUE.id,
    mosqueName: MOSQUE.name,
    // The President's authority comes from the role, not the post. The post is what he is called.
    role: "mosque_admin",
    positions: ["president"],
    permissions: [],
    deniedPermissions: [],
    isActive: true,
    memberId: "MEM-014",
  },
  secretary: {
    id: "USR-004",
    name: "Shahed Alam",
    mosqueId: MOSQUE.id,
    mosqueName: MOSQUE.name,
    role: "secretary",
    positions: ["general_secretary"],
    // A secretary holds no finance access by role. This mosque's secretary collects at the door, so
    // he is granted exactly that one permission — the mechanism the spec built for this.
    permissions: ["donation.record"],
    deniedPermissions: [],
    isActive: true,
    memberId: "MEM-021",
  },
  treasurer: {
    id: "USR-005",
    name: "Rafiqul Islam",
    mosqueId: MOSQUE.id,
    mosqueName: MOSQUE.name,
    role: "treasurer",
    positions: ["treasurer"],
    permissions: [],
    deniedPermissions: [],
    isActive: true,
    memberId: "MEM-008",
  },
  treasurer_suspended: {
    id: "USR-009",
    name: "Kamrul Hasan",
    mosqueId: MOSQUE.id,
    mosqueName: MOSQUE.name,
    role: "treasurer",
    positions: ["treasurer"],
    permissions: [],
    deniedPermissions: [],
    // Resolves to zero permissions, so even `account.view` is gone. On the switcher so the
    // deactivation path is visible rather than theoretical.
    isActive: false,
  },
  cashier: {
    id: "USR-006",
    name: "Jamil Hossain",
    mosqueId: MOSQUE.id,
    mosqueName: MOSQUE.name,
    role: "cashier",
    positions: ["cashier"],
    permissions: [],
    deniedPermissions: [],
    isActive: true,
    memberId: "MEM-032",
  },
  imam: {
    id: "USR-007",
    name: "Imam Abdul Karim",
    mosqueId: MOSQUE.id,
    mosqueName: MOSQUE.name,
    role: "imam",
    positions: ["imam", "khatib"],
    permissions: [],
    deniedPermissions: [],
    isActive: true,
    staffId: "STF-001",
  },
  member: {
    id: "USR-008",
    name: "Abdullah Rahman",
    mosqueId: MOSQUE.id,
    mosqueName: MOSQUE.name,
    role: "member",
    positions: ["member"],
    permissions: [],
    deniedPermissions: [],
    isActive: true,
    memberId: "MEM-001",
  },
};

/** Switcher labels. The role is shown separately, so these describe the *situation*. */
export const profileLabels: Record<ProfileKey, { name: string; note: string }> = {
  super_admin: { name: "Super Admin", note: "Every permission, including platform settings" },
  president: { name: "President", note: "Mosque Admin role, president position — the post grants nothing" },
  secretary: { name: "Secretary", note: "No finance by role, granted donation.record as an exception" },
  treasurer: { name: "Treasurer", note: "Owns finance. Prepares payments, cannot approve them" },
  treasurer_suspended: { name: "Treasurer (suspended)", note: "isActive false — resolves to no permissions at all" },
  cashier: { name: "Cashier", note: "Records and receipts only. No verify, no void" },
  imam: { name: "Imam", note: "Own salary record only, no other finance" },
  member: { name: "Member", note: "No dashboard.view — belongs in the account area" },
};

export const profileKeys = Object.keys(demoProfiles) as ProfileKey[];

/** Who the switcher starts on. The treasurer sees the most of the finance module. */
export const DEFAULT_PROFILE: ProfileKey = "treasurer";

export function isProfileKey(value: string | undefined): value is ProfileKey {
  return value !== undefined && value in demoProfiles;
}
