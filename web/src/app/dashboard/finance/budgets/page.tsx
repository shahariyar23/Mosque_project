import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { BudgetsView } from "@/components/finance/budgets/budgets-view";
import { RequirePermission } from "@/components/finance/ui/permission-gate";

export const metadata: Metadata = {
  title: "Budgets · Noor Mosque Management",
  description: "Set and track spending limits for various mosque activities.",
};

export default function BudgetsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Budgets"
        subtitle="Set spending intentions and compare them against actual expenditure."
        crumbs={[{ label: "Finance", href: "/dashboard/finance" }, { label: "Budgets" }]}
      />
      <RequirePermission anyOf={["budget.view"]} area="Budgets">
        <BudgetsView />
      </RequirePermission>
    </div>
  );
}
