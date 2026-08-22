import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { ReportsView } from "@/components/finance/reports/reports-view";
import { RequirePermission } from "@/components/finance/ui/permission-gate";

export const metadata: Metadata = {
  title: "Financial reports · Noor Mosque Management",
  description: "Statements, fund balances and the reports the committee reads each month.",
};

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial reports"
        subtitle="What the committee reads at the monthly meeting and what a donor is entitled to ask for. Every figure is built from the ledger when you ask for it, so the same report for the same period always reads the same."
        crumbs={[{ label: "Finance", href: "/dashboard/finance" }, { label: "Financial Reports" }]}
      />
      <RequirePermission anyOf={["report.view"]} area="Financial reports">
        <ReportsView />
      </RequirePermission>
    </div>
  );
}
