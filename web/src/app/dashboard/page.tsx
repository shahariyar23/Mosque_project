import type { Metadata } from "next";
import { RequirePermission } from "@/components/finance/ui/permission-gate";
import { DashboardOverview } from "@/components/mosque/overview/overview-view";

export const metadata: Metadata = {
  title: "Overview · Noor Mosque Management",
  description: "Accounts, finances, prayer times and approvals at a glance.",
};

/**
 * `/dashboard` — a thin server shell around the client overview.
 *
 * This page used to render the whole landing page on the server from `@/data/*`, with the viewer's
 * identity taken from `getSession()` — a hard-coded demo profile. It cannot do that any more: the figures
 * come from `GET /dashboard/overview`, which needs the access token, and that token lives only in React
 * memory on the client. So the shell keeps the metadata and the permission gate, and everything that
 * needs the session or the API moved into `DashboardOverview`.
 *
 * The gate is duplicated with intent. `dashboard-gate.tsx` already refuses the whole `/dashboard` subtree
 * without `dashboard.view`, but stating it here keeps the requirement next to the page that has it, and
 * neither is the security boundary — the route's own guard is.
 *
 * `/dashboard` needs its own `page.tsx`: the sibling `[...rest]` catch-all is a *required* catch-all, so it
 * matches `/dashboard/anything` and not `/dashboard` itself.
 */
export default function OverviewPage() {
  return (
    <RequirePermission
      anyOf={["dashboard.view"]}
      area="the dashboard overview"
      description="This page summarises accounts, finances and prayer times across the mosque. Ask an administrator if you need access to it."
    >
      <DashboardOverview />
    </RequirePermission>
  );
}
