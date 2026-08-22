import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { FinanceOverviewView } from "@/components/finance/overview/overview-view";
import { RequirePermission } from "@/components/finance/ui/permission-gate";

export const metadata: Metadata = {
  title: "Finance · Noor Mosque Management",
  description: "What the mosque received, what it spent and what each fund is holding.",
};

/**
 * Finance overview. The layout above already resolved the session once and gated `dashboard.view`,
 * so the page only names the permission this area needs and lets the gate answer.
 */
export default function FinanceOverviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance overview"
        subtitle="Where the mosque's money came from this month, where it went, and what is left in each fund. Every figure is a sum of recorded entries, so nothing here can be typed over."
        crumbs={[{ label: "Finance" }, { label: "Overview" }]}
      />
      <RequirePermission anyOf={["finance.view"]} area="Finance">
        <FinanceOverviewView />
      </RequirePermission>
    </div>
  );
}
