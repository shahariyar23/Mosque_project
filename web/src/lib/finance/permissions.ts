// Frontend permission model for the finance module.
//
// The UI is built around permissions, not role names, so the backend can hand back a
// permission list later and nothing here has to change. These checks are for UX only —
// the Express API will do the real enforcement.

export type Role =
  | "super_admin"
  | "mosque_admin"
  | "president"
  | "secretary"
  | "treasurer"
  | "cashier"
  | "imam"
  | "member";

export type Permission =
  | "finance.view"
  | "finance.manage"
  | "transaction.view"
  | "transaction.create"
  | "transaction.update"
  | "transaction.delete"
  | "donation.view"
  | "donation.create"
  | "donation.update"
  | "donation.view.self"
  | "contribution.view"
  | "contribution.record"
  | "contribution.manage"
  | "contribution.view.self"
  | "fund.view"
  | "fund.manage"
  | "expense.view"
  | "expense.create"
  | "expense.approve"
  | "salary.view"
  | "salary.manage"
  | "salary.approve"
  | "salary.view.self"
  | "receipt.view"
  | "receipt.generate"
  | "receipt.view.self"
  | "report.view"
  | "report.export"
  | "admin.view";

export const allPermissions: Permission[] = [
  "finance.view",
  "finance.manage",
  "transaction.view",
  "transaction.create",
  "transaction.update",
  "transaction.delete",
  "donation.view",
  "donation.create",
  "donation.update",
  "donation.view.self",
  "contribution.view",
  "contribution.record",
  "contribution.manage",
  "contribution.view.self",
  "fund.view",
  "fund.manage",
  "expense.view",
  "expense.create",
  "expense.approve",
  "salary.view",
  "salary.manage",
  "salary.approve",
  "salary.view.self",
  "receipt.view",
  "receipt.generate",
  "receipt.view.self",
  "report.view",
  "report.export",
  "admin.view",
];

export const rolePermissions: Record<Role, Permission[]> = {
  // Spread rather than share the array — every other role owns its own list, and a caller that
  // sorted or pushed onto one admin's permissions would otherwise mutate the other admin's too.
  super_admin: [...allPermissions],
  mosque_admin: [...allPermissions],
  president: [
    "finance.view",
    "transaction.view",
    "donation.view",
    "contribution.view",
    "fund.view",
    "expense.view",
    "expense.approve",
    "salary.view",
    "salary.approve",
    "receipt.view",
    "report.view",
    "report.export",
  ],
  secretary: [
    "finance.view",
    "transaction.view",
    "transaction.create",
    "donation.view",
    "donation.create",
    "contribution.view",
    "contribution.record",
    "contribution.manage",
    "fund.view",
    "expense.view",
    "expense.create",
    "receipt.view",
    "receipt.generate",
    "report.view",
  ],
  treasurer: [
    "finance.view",
    "finance.manage",
    "transaction.view",
    "transaction.create",
    "transaction.update",
    "transaction.delete",
    "donation.view",
    "donation.create",
    "donation.update",
    "contribution.view",
    "contribution.record",
    "contribution.manage",
    "fund.view",
    "fund.manage",
    "expense.view",
    "expense.create",
    "expense.approve",
    "salary.view",
    "salary.manage",
    "salary.approve",
    "receipt.view",
    "receipt.generate",
    "report.view",
    "report.export",
  ],
  cashier: [
    "finance.view",
    "transaction.view",
    "transaction.create",
    "donation.view",
    "donation.create",
    "contribution.view",
    "contribution.record",
    "receipt.view",
    "receipt.generate",
  ],
  imam: ["salary.view.self", "receipt.view.self"],
  member: ["contribution.view.self", "donation.view.self", "receipt.view.self"],
};

export const roleLabels: Record<Role, string> = {
  super_admin: "Super Admin",
  mosque_admin: "Mosque Admin",
  president: "President",
  secretary: "Secretary",
  treasurer: "Treasurer",
  cashier: "Cashier",
  imam: "Imam",
  member: "Member",
};

export const roleDescriptions: Record<Role, string> = {
  super_admin: "Full access across every mosque and every finance area.",
  mosque_admin: "Full finance access for this mosque.",
  president: "Reviews and approves financial activity, sees funds and reports.",
  secretary: "Records income and expenses, manages contribution plans.",
  treasurer: "Manages funds, salaries, approvals and financial reporting.",
  cashier: "Collects donations and monthly contributions, issues receipts.",
  imam: "Sees only their own salary record and payment history.",
  member: "Sees only their own contributions, donations and receipts.",
};

export type FinanceUser = {
  id: string;
  name: string;
  role: Role;
  /** Set when the signed-in person is also a contributing member. */
  memberId?: string;
  /** Set when the signed-in person is on the mosque payroll. */
  staffId?: string;
  mosqueName: string;
};

/** Demo identities used by the role switcher until real auth is connected. */
export const demoUsers: Record<Role, FinanceUser> = {
  super_admin: { id: "USR-001", name: "Sultan Mahmud", role: "super_admin", mosqueName: "Noor Community Mosque" },
  mosque_admin: { id: "USR-002", name: "Nasir Uddin", role: "mosque_admin", mosqueName: "Noor Community Mosque" },
  president: { id: "USR-003", name: "Hafiz Mizanur Rahman", role: "president", mosqueName: "Noor Community Mosque" },
  secretary: { id: "USR-004", name: "Shahed Alam", role: "secretary", mosqueName: "Noor Community Mosque" },
  treasurer: { id: "USR-005", name: "Rafiqul Islam", role: "treasurer", mosqueName: "Noor Community Mosque" },
  cashier: { id: "USR-006", name: "Jamil Hossain", role: "cashier", mosqueName: "Noor Community Mosque" },
  imam: { id: "USR-007", name: "Imam Abdul Karim", role: "imam", staffId: "STF-001", mosqueName: "Noor Community Mosque" },
  member: {
    id: "USR-008",
    name: "Abdullah Rahman",
    role: "member",
    memberId: "MEM-001",
    mosqueName: "Noor Community Mosque",
  },
};

export function permissionsForRole(role: Role): Permission[] {
  return rolePermissions[role] ?? [];
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
 * Data visibility for a finance area:
 * "all"  — every record in the mosque
 * "self" — only records belonging to the signed-in person
 * "none" — the area should not be shown at all
 */
export type DataScope = "all" | "self" | "none";

export function scopeFor(granted: Permission[], all: Permission, self: Permission): DataScope {
  if (granted.includes(all)) return "all";
  if (granted.includes(self)) return "self";
  return "none";
}
