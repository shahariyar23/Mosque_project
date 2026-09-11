import type { Metadata } from "next";
import { RequirePermission } from "@/components/finance/ui/permission-gate";
import { DashboardLanding } from "@/components/dashboard/dashboard-landing";

export const metadata: Metadata = {
  title: "Overview · Noor Mosque Management",
  description: "Accounts, finances, prayer times and approvals at a glance.",
};

export default function OverviewPage() {
  return (
    <RequirePermission
      anyOf={["dashboard.view"]}
      area="the dashboard overview"
      description="This page summarises accounts, finances and prayer times across the mosque. Ask an administrator if you need access to it."
    >
      <DashboardLanding />
    </RequirePermission>
  );
}
