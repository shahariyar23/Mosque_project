import type { Permission } from "@/lib/finance/permissions";

export type NavItem = {
  label: string;
  href: string;
  icon: string;
  /** Item is shown when the user holds at least one of these. Empty means always visible. */
  anyOf?: Permission[];
  /** Replacement label for people who only see their own records. */
  selfLabel?: string;
  selfOnly?: Permission[];
  children?: NavItem[];
  comingSoon?: boolean;
};

/**
 * One shared dashboard for every role. Items disappear when the signed-in user holds none of
 * the listed permissions, so there is no separate cashier or member dashboard to maintain.
 */
export const dashboardNav: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: "grid" },
  { label: "Prayer", href: "/dashboard/prayer", icon: "moon", comingSoon: true },
  { label: "Community", href: "/dashboard/community", icon: "users", comingSoon: true },
  { label: "Events", href: "/dashboard/events", icon: "calendar", comingSoon: true },
  { label: "Islamic Content", href: "/dashboard/content", icon: "book", comingSoon: true },
  {
    label: "Finance",
    href: "/dashboard/finance",
    icon: "wallet",
    anyOf: [
      "finance.view",
      "transaction.view",
      "donation.view",
      "donation.view.self",
      "contribution.view",
      "contribution.view.self",
      "fund.view",
      "expense.view",
      "salary.view",
      "salary.view.self",
      "receipt.view",
      "receipt.view.self",
      "report.view",
    ],
    children: [
      { label: "Overview", href: "/dashboard/finance", icon: "gauge", anyOf: ["finance.view"] },
      { label: "Transactions", href: "/dashboard/finance/transactions", icon: "list", anyOf: ["transaction.view"] },
      {
        label: "Donations",
        href: "/dashboard/finance/donations",
        icon: "gift",
        anyOf: ["donation.view", "donation.view.self"],
        selfLabel: "My Donations",
        selfOnly: ["donation.view.self"],
      },
      {
        label: "Contributions",
        href: "/dashboard/finance/contributions",
        icon: "repeat",
        anyOf: ["contribution.view", "contribution.view.self"],
        selfLabel: "My Contributions",
        selfOnly: ["contribution.view.self"],
      },
      { label: "Funds", href: "/dashboard/finance/funds", icon: "vault", anyOf: ["fund.view"] },
      { label: "Expenses", href: "/dashboard/finance/expenses", icon: "receipt-minus", anyOf: ["expense.view"] },
      {
        label: "Salaries",
        href: "/dashboard/finance/salaries",
        icon: "badge",
        anyOf: ["salary.view", "salary.view.self"],
        selfLabel: "My Salary",
        selfOnly: ["salary.view.self"],
      },
      { label: "Recurring", href: "/dashboard/finance/recurring", icon: "rotate", anyOf: ["contribution.view"] },
      {
        label: "Receipts",
        href: "/dashboard/finance/receipts",
        icon: "receipt",
        anyOf: ["receipt.view", "receipt.view.self"],
        selfLabel: "My Receipts",
        selfOnly: ["receipt.view.self"],
      },
      { label: "Reports", href: "/dashboard/finance/reports", icon: "chart", anyOf: ["report.view"] },
    ],
  },
  { label: "Communication", href: "/dashboard/communication", icon: "megaphone", comingSoon: true },
  { label: "Media", href: "/dashboard/media", icon: "image", comingSoon: true },
  // Gated even though they are not built yet: a member who cannot open reports should not be
  // shown a greyed-out "Administration — Soon" and be left wondering what they are missing.
  { label: "Reports", href: "/dashboard/reports", icon: "chart", anyOf: ["report.view"], comingSoon: true },
  { label: "Administration", href: "/dashboard/administration", icon: "shield", anyOf: ["admin.view"], comingSoon: true },
];

/** Breadcrumb labels for finance routes, keyed by pathname. */
export const financeCrumbs: Record<string, string> = {
  "/dashboard/finance": "Finance",
  "/dashboard/finance/transactions": "Transactions",
  "/dashboard/finance/donations": "Donations",
  "/dashboard/finance/contributions": "Contributions",
  "/dashboard/finance/funds": "Funds",
  "/dashboard/finance/expenses": "Expenses",
  "/dashboard/finance/salaries": "Salaries",
  "/dashboard/finance/recurring": "Recurring",
  "/dashboard/finance/receipts": "Receipts",
  "/dashboard/finance/reports": "Reports",
};
