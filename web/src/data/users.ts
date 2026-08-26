import type { AdminUser } from "@/lib/mosque/types";
import { siteConfig } from "@/config/site";

/**
 * The back-office directory — every account that can sign in to run the mosque.
 *
 * These are `AdminUser` rows, which *are* `SessionUser`s with contact and activity fields added, so a
 * row drops straight into `effectivePermissions()` with no mapping. The seven people the role switcher
 * previews (`lib/demo-profiles.ts`) appear here unchanged — same ids, roles, positions and the one
 * granted `donation.record` — so the directory and the switcher never disagree about who is who.
 *
 * Ordinary members are deliberately absent: a member has no `dashboard.view` and belongs in the
 * Members register and their own account area, not in a directory of people with back-office access.
 * Kept here as static data behind a future `GET /users`; nothing writes to a server.
 *
 * The mix is chosen to exercise the model, not to pad a list:
 *  - USR-004 holds `donation.record` on top of the secretary role — the "secretary who takes cash".
 *  - USR-010 has `gallery.manage` denied — a role permission carved back out for one person.
 *  - USR-011 is granted the class and article permissions the secretary role does not carry.
 *  - USR-009 is suspended, so they resolve to no permissions at all.
 *  - USR-013 was invited but has never signed in.
 */

const MOSQUE = { id: "MSQ-001", name: siteConfig.fullName };

export const adminUsers: AdminUser[] = [
  {
    id: "USR-001",
    name: "Sultan Mahmud",
    email: "sultan.mahmud@noormosque.org",
    phone: "+880 1711-204596",
    mosqueId: MOSQUE.id,
    mosqueName: MOSQUE.name,
    role: "super_admin",
    positions: [],
    permissions: [],
    deniedPermissions: [],
    isActive: true,
    joinedAt: "2024-01-05",
    lastActiveAt: "2026-08-23",
  },
  {
    id: "USR-002",
    name: "Mahbubur Rahman",
    email: "mahbub.rahman@noormosque.org",
    phone: "+880 1712-668421",
    mosqueId: MOSQUE.id,
    mosqueName: MOSQUE.name,
    // Deputy to the President. The authority is the role; "Vice President" is the post he is called by.
    role: "mosque_admin",
    positions: ["vice_president"],
    permissions: [],
    deniedPermissions: [],
    isActive: true,
    memberId: "MEM-005",
    joinedAt: "2024-02-10",
    lastActiveAt: "2026-08-23",
  },
  {
    id: "USR-003",
    name: "Hafiz Mizanur Rahman",
    email: "mizanur.rahman@noormosque.org",
    phone: "+880 1713-889054",
    mosqueId: MOSQUE.id,
    mosqueName: MOSQUE.name,
    role: "mosque_admin",
    positions: ["president"],
    permissions: [],
    deniedPermissions: [],
    isActive: true,
    memberId: "MEM-014",
    joinedAt: "2024-01-20",
    lastActiveAt: "2026-08-22",
  },
  {
    id: "USR-004",
    name: "Shahed Alam",
    email: "shahed.alam@noormosque.org",
    phone: "+880 1714-889201",
    mosqueId: MOSQUE.id,
    mosqueName: MOSQUE.name,
    role: "secretary",
    positions: ["general_secretary"],
    // No finance by role; this mosque's secretary collects at the door, so he is granted exactly that.
    permissions: ["donation.record"],
    deniedPermissions: [],
    isActive: true,
    memberId: "MEM-021",
    joinedAt: "2024-03-15",
    lastActiveAt: "2026-08-23",
  },
  {
    id: "USR-005",
    name: "Rafiqul Islam",
    email: "rafiqul.islam@noormosque.org",
    phone: "+880 1713-668190",
    mosqueId: MOSQUE.id,
    mosqueName: MOSQUE.name,
    role: "treasurer",
    positions: ["treasurer"],
    permissions: [],
    deniedPermissions: [],
    isActive: true,
    memberId: "MEM-008",
    joinedAt: "2024-02-01",
    lastActiveAt: "2026-08-23",
  },
  {
    id: "USR-006",
    name: "Jamil Hossain",
    email: "jamil.hossain@noormosque.org",
    phone: "+880 1715-330967",
    mosqueId: MOSQUE.id,
    mosqueName: MOSQUE.name,
    role: "cashier",
    positions: ["cashier"],
    permissions: [],
    deniedPermissions: [],
    isActive: true,
    memberId: "MEM-032",
    joinedAt: "2024-05-12",
    lastActiveAt: "2026-08-22",
  },
  {
    id: "USR-007",
    name: "Imam Abdul Karim",
    email: "imam.karim@noormosque.org",
    phone: "+880 1716-451028",
    mosqueId: MOSQUE.id,
    mosqueName: MOSQUE.name,
    role: "imam",
    positions: ["imam", "khatib"],
    permissions: [],
    deniedPermissions: [],
    isActive: true,
    staffId: "STF-001",
    joinedAt: "2024-01-20",
    lastActiveAt: "2026-08-23",
  },
  {
    id: "USR-009",
    name: "Kamrul Hasan",
    email: "kamrul.hasan@noormosque.org",
    phone: "+880 1717-513806",
    mosqueId: MOSQUE.id,
    mosqueName: MOSQUE.name,
    role: "treasurer",
    positions: ["treasurer"],
    permissions: [],
    deniedPermissions: [],
    // Former treasurer, account suspended — resolves to no permissions, not even the base row.
    isActive: false,
    joinedAt: "2024-02-01",
    lastActiveAt: "2026-06-30",
  },
  {
    id: "USR-010",
    name: "Sadia Karim",
    email: "sadia.karim@noormosque.org",
    phone: "+880 1818-227503",
    mosqueId: MOSQUE.id,
    mosqueName: MOSQUE.name,
    role: "secretary",
    positions: ["assistant_secretary"],
    permissions: [],
    // The gallery is run by someone else here, so the secretary role's `gallery.manage` is taken back.
    deniedPermissions: ["gallery.manage"],
    isActive: true,
    memberId: "MEM-017",
    joinedAt: "2025-01-08",
    lastActiveAt: "2026-08-21",
  },
  {
    id: "USR-011",
    name: "Yusuf Aziz",
    email: "yusuf.aziz@noormosque.org",
    phone: "+880 1719-604182",
    mosqueId: MOSQUE.id,
    mosqueName: MOSQUE.name,
    role: "secretary",
    positions: ["education_coordinator"],
    // Runs the weekend madrasah, so he is granted the class and article permissions the role omits.
    permissions: ["class.view", "class.manage", "article.view", "article.manage"],
    deniedPermissions: [],
    isActive: true,
    memberId: "MEM-026",
    joinedAt: "2024-09-14",
    lastActiveAt: "2026-08-22",
  },
  {
    id: "USR-012",
    name: "Bilal Uddin",
    email: "bilal.uddin@noormosque.org",
    phone: "+880 1720-118472",
    mosqueId: MOSQUE.id,
    mosqueName: MOSQUE.name,
    role: "imam",
    positions: ["muazzin"],
    permissions: [],
    deniedPermissions: [],
    isActive: true,
    staffId: "STF-002",
    joinedAt: "2024-06-03",
    lastActiveAt: "2026-08-23",
  },
  {
    id: "USR-013",
    name: "Rumana Haque",
    email: "rumana.haque@noormosque.org",
    phone: "+880 1821-556738",
    mosqueId: MOSQUE.id,
    mosqueName: MOSQUE.name,
    role: "secretary",
    positions: ["volunteer_coordinator"],
    permissions: [],
    deniedPermissions: [],
    isActive: true,
    memberId: "MEM-039",
    joinedAt: "2026-08-20",
    // Invited but has not signed in yet.
    lastActiveAt: "",
  },
];

export function userById(id: string): AdminUser | undefined {
  return adminUsers.find((user) => user.id === id);
}

const adminRoles = new Set(["super_admin", "mosque_admin"]);

export const userStats = {
  total: adminUsers.length,
  active: adminUsers.filter((user) => user.isActive).length,
  suspended: adminUsers.filter((user) => !user.isActive).length,
  admins: adminUsers.filter((user) => adminRoles.has(user.role)).length,
  rolesInUse: new Set(adminUsers.map((user) => user.role)).size,
  neverSignedIn: adminUsers.filter((user) => user.lastActiveAt === "").length,
};
