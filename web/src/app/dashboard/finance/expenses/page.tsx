import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { ExpensesView } from "@/components/finance/expenses/expenses-view";
import { RequirePermission } from "@/components/finance/ui/permission-gate";

export const metadata: Metadata = {
  title: "Expenses · Noor Mosque Management",
  description: "Mosque spending, from the person who submits it to the person who approves it.",
};

export default function ExpensesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        subtitle="Utilities, repairs, supplies and everything else the mosque pays for. Spending is submitted by one person and approved by another, and the larger the amount the harder that rule is enforced."
        crumbs={[{ label: "Finance", href: "/dashboard/finance" }, { label: "Expenses" }]}
      />
      <RequirePermission anyOf={["expense.view"]} area="Expenses">
        <ExpensesView />
      </RequirePermission>
    </div>
  );
}
