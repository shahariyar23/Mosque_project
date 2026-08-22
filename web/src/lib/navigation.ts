import type { Permission } from "@/lib/permissions";
import type { IconName } from "@/components/finance/ui/icon";

/**
 * The only description of the dashboard menu.
 *
 * Follows `docs/specs/0001-role-permission-architecture/0003-dashboard-shell.md`: each item names
 * the one permission it needs, filtering is a single pass, and a group left with no visible items
 * does not render its heading (AC-2). Adding a module means adding a row here and nothing else.
 *
 * Because `permission` is typed as `Permission`, an item naming a string outside the registry is a
 * compile error — which is how spec 0001 AC-14 is satisfied here rather than by a runtime test.
 *
 * A row may point at a route that does not exist yet. `app/dashboard/[...rest]/page.tsx` renders a
 * plain "not built yet" panel inside the shell, so the menu can be complete before the modules are
 * (spec 0003, build step 10).
 */
export type NavItem = {
  label: string;
  labelBn: string;
  href: string;
  icon: IconName;
  /** The staff permission this row needs. One permission per row, as the spec requires. */
  permission: Permission;
  /**
   * Extension to the spec's NavItem. Some finance pages have an own-scoped variant of the same
   * route — an imam holds `salary.viewOwn` and sees their own record on the page a treasurer opens
   * with `salary.view`. Rather than duplicate the row, the item stays visible for either permission
   * and the page resolves which query to run via `scopeFor()`.
   *
   * This is only for pages where the staff view and the own view are genuinely the same screen.
   * A member's own history is not that: it lives in `/account` (spec 0004, AC-10) and deliberately
   * has no row here at all.
   */
  ownPermission?: Permission;
  /** Label shown when the person qualifies through `ownPermission` alone. */
  ownLabel?: string;
  ownLabelBn?: string;
};

export type NavGroup = {
  heading: string;
  headingBn: string;
  items: NavItem[];
};

export const NAVIGATION: NavGroup[] = [
  {
    heading: "Overview",
    headingBn: "সারসংক্ষেপ",
    items: [
      { label: "Overview", labelBn: "সারসংক্ষেপ", href: "/dashboard", icon: "grid", permission: "dashboard.view" },
    ],
  },
  {
    heading: "Mosque",
    headingBn: "মসজিদ",
    items: [
      { label: "Profile", labelBn: "প্রোফাইল", href: "/dashboard/mosque", icon: "mosque", permission: "mosque.view" },
      { label: "Settings", labelBn: "সেটিংস", href: "/dashboard/settings", icon: "settings", permission: "settings.view" },
    ],
  },
  {
    heading: "Prayer",
    headingBn: "নামাজ",
    items: [
      { label: "Prayer Times", labelBn: "নামাজের সময়", href: "/dashboard/prayer-times", icon: "moon", permission: "prayer.view" },
      // Uses `jumuah.manage` deliberately: the page exists only to change something, and there is
      // no separate view permission for it.
      { label: "Jumu'ah", labelBn: "জুমআ", href: "/dashboard/jumuah", icon: "calendar", permission: "jumuah.manage" },
    ],
  },
  {
    heading: "Community",
    headingBn: "সম্প্রদায়",
    items: [
      { label: "Members", labelBn: "সদস্যবৃন্দ", href: "/dashboard/members", icon: "users", permission: "member.view" },
      { label: "Volunteers", labelBn: "স্বেচ্ছাসেবক", href: "/dashboard/volunteers", icon: "user", permission: "volunteer.view" },
    ],
  },
  {
    heading: "Events",
    headingBn: "অনুষ্ঠান",
    items: [
      { label: "Events", labelBn: "অনুষ্ঠান", href: "/dashboard/events", icon: "calendar", permission: "event.view" },
      { label: "Registrations", labelBn: "নিবন্ধন", href: "/dashboard/registrations", icon: "check-circle", permission: "event.update" },
    ],
  },
  {
    heading: "Services",
    headingBn: "সেবাসমূহ",
    items: [
      { label: "Services", labelBn: "সেবাসমূহ", href: "/dashboard/services", icon: "inbox", permission: "service.view" },
      { label: "Bookings", labelBn: "বুকিং", href: "/dashboard/bookings", icon: "clock", permission: "booking.view" },
    ],
  },
  {
    heading: "Islamic Content",
    headingBn: "ইসলামিক কনটেন্ট",
    items: [
      { label: "Quran", labelBn: "কুরআন", href: "/dashboard/quran", icon: "book", permission: "quran.view" },
      { label: "Khutbah", labelBn: "খুতবা", href: "/dashboard/khutbah", icon: "megaphone", permission: "khutbah.view" },
      { label: "Articles", labelBn: "প্রবন্ধ", href: "/dashboard/articles", icon: "file-text", permission: "article.view" },
      { label: "Classes", labelBn: "ক্লাস", href: "/dashboard/classes", icon: "users", permission: "class.view" },
    ],
  },
  {
    // The finance module. The spec's Finance group carried four rows; the ten below are the module
    // this branch builds, and Budgets is kept from the spec so its row is not silently dropped.
    heading: "Finance",
    headingBn: "আর্থিক",
    items: [
      { label: "Overview", labelBn: "সারসংক্ষেপ", href: "/dashboard/finance", icon: "gauge", permission: "finance.view" },
      { label: "Transactions", labelBn: "লেনদেন", href: "/dashboard/finance/transactions", icon: "list", permission: "transaction.view" },
      { label: "Donations", labelBn: "দান", href: "/dashboard/finance/donations", icon: "gift", permission: "donation.view" },
      { label: "Contributions", labelBn: "চাঁদা", href: "/dashboard/finance/contributions", icon: "repeat", permission: "contribution.view" },
      { label: "Funds", labelBn: "তহবিল", href: "/dashboard/finance/funds", icon: "vault", permission: "fund.view" },
      { label: "Expenses", labelBn: "ব্যয়", href: "/dashboard/finance/expenses", icon: "receipt-minus", permission: "expense.view" },
      {
        label: "Salaries",
        labelBn: "বেতন",
        href: "/dashboard/finance/salaries",
        icon: "badge",
        permission: "salary.view",
        ownPermission: "salary.viewOwn",
        ownLabel: "My Salary",
        ownLabelBn: "আমার বেতন",
      },
      { label: "Recurring", labelBn: "নিয়মিত", href: "/dashboard/finance/recurring", icon: "rotate", permission: "contribution.manage" },
      { label: "Receipts", labelBn: "রসিদ", href: "/dashboard/finance/receipts", icon: "receipt", permission: "receipt.view" },
      { label: "Financial Reports", labelBn: "আর্থিক প্রতিবেদন", href: "/dashboard/finance/reports", icon: "chart", permission: "report.view" },
      { label: "Budgets", labelBn: "বাজেট", href: "/dashboard/finance/budgets", icon: "scale", permission: "budget.manage" },
    ],
  },
  {
    heading: "Communication",
    headingBn: "যোগাযোগ",
    items: [
      { label: "Announcements", labelBn: "ঘোষণা", href: "/dashboard/announcements", icon: "megaphone", permission: "announcement.view" },
      { label: "Notifications", labelBn: "বিজ্ঞপ্তি", href: "/dashboard/notifications", icon: "alert", permission: "notification.send" },
    ],
  },
  {
    heading: "Media",
    headingBn: "মিডিয়া",
    items: [
      { label: "Gallery", labelBn: "গ্যালারি", href: "/dashboard/gallery", icon: "image", permission: "gallery.view" },
    ],
  },
  {
    heading: "Reports",
    headingBn: "প্রতিবেদন",
    items: [
      { label: "Reports", labelBn: "প্রতিবেদন", href: "/dashboard/reports", icon: "chart", permission: "report.view" },
    ],
  },
  {
    heading: "Administration",
    headingBn: "প্রশাসন",
    items: [
      { label: "Users", labelBn: "ব্যবহারকারী", href: "/dashboard/users", icon: "user", permission: "user.view" },
      { label: "Roles & Access", labelBn: "ভূমিকা ও অনুমতি", href: "/dashboard/access", icon: "shield", permission: "permission.assign" },
      { label: "Audit Log", labelBn: "অডিট লগ", href: "/dashboard/audit", icon: "lock", permission: "audit.view" },
    ],
  },
];

/** A nav item after filtering, with its label already resolved for the viewer's scope. */
export type ResolvedNavItem = {
  label: string;
  labelBn: string;
  href: string;
  icon: IconName;
  /** "own" when the person qualified through `ownPermission` alone. */
  scope: "all" | "own";
};

export type ResolvedNavGroup = { heading: string; headingBn: string; items: ResolvedNavItem[] };

/**
 * One pass, one rule: keep an item when the permission set holds its `permission` (or its
 * `ownPermission`), then drop any group left with no items. This is what makes a per-role menu
 * unnecessary — every role's sidebar falls out of the same array.
 */
export function filterNavigation(granted: Permission[]): ResolvedNavGroup[] {
  const groups: ResolvedNavGroup[] = [];

  for (const group of NAVIGATION) {
    const items: ResolvedNavItem[] = [];

    for (const item of group.items) {
      const staff = granted.includes(item.permission);
      const own = item.ownPermission ? granted.includes(item.ownPermission) : false;
      if (!staff && !own) continue;

      // Staff wins when someone holds both, so a treasurer sees "Salaries" rather than "My Salary".
      const useOwnLabel = !staff && own;
      items.push({
        label: useOwnLabel ? (item.ownLabel ?? item.label) : item.label,
        labelBn: useOwnLabel ? (item.ownLabelBn ?? item.labelBn) : item.labelBn,
        href: item.href,
        icon: item.icon,
        scope: useOwnLabel ? "own" : "all",
      });
    }

    if (items.length > 0) groups.push({ heading: group.heading, headingBn: group.headingBn, items });
  }

  return groups;
}

/** Every item in the array, flattened. Used for breadcrumb lookup. */
const allNavItems: NavItem[] = NAVIGATION.flatMap((group) => group.items);

/** The permission a route needs, or undefined when the path is not in the menu. */
export function permissionForPath(pathname: string): Permission | undefined {
  return allNavItems.find((item) => item.href === pathname)?.permission;
}

export type Crumb = { label: string; href: string };

/**
 * Breadcrumb trail for a dashboard path, built by matching each ancestor path against NAVIGATION
 * and falling back to a title-cased segment for routes the menu does not describe. Deriving it
 * here rather than keeping a second lookup table is what stops the two drifting apart.
 */
export function crumbsFor(pathname: string): Crumb[] {
  const segments = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  const crumbs: Crumb[] = [];
  let href = "";

  for (const segment of segments) {
    href += `/${segment}`;
    const match = allNavItems.find((item) => item.href === href);
    crumbs.push({
      label: match?.label ?? titleCase(segment),
      href,
    });
  }

  return crumbs;
}

function titleCase(segment: string): string {
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
