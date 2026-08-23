import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { ReportsView } from "@/components/mosque/reports/reports-view";
import { RequirePermission } from "@/components/finance/ui/permission-gate";

export const metadata: Metadata = {
  title: "Reports · Noor Mosque Management",
  description: "The mosque's reporting hub — every report across community, finance, operations and governance.",
};

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ action?: string }> }) {
  const { action } = await searchParams;
  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        subtitle="The year at a glance and the catalogue of reports the mosque produces — from the monthly financial summary to the annual trustees' report."
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Reports" }]}
      />
      <RequirePermission anyOf={["report.view"]} area="Reports">
        <ReportsView openGenerateOnMount={action === "add"} />
      </RequirePermission>
    </div>
  );
}
