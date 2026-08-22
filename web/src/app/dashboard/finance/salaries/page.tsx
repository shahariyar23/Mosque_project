import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { SalariesView } from "@/components/finance/salaries/salaries-view";
import { RequirePermission } from "@/components/finance/ui/permission-gate";

export const metadata: Metadata = {
  title: "Salaries · Noor Mosque Management",
  description: "Imam and staff salaries, prepared by one person and approved by another.",
};

/**
 * Two kinds of person open this page. A treasurer holding `salary.view` sees the whole payroll; an
 * imam holding only `salary.viewOwn` sees their own pay and nothing else. Both permissions are
 * listed here because the page itself decides which of the two it is, and the API decides which
 * records actually belong to them.
 */
export default function SalariesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Salaries"
        subtitle="What the imam, the muezzin and the teaching and cleaning staff are paid. A salary is prepared, approved by somebody other than the person who prepared it, and only then paid."
        crumbs={[{ label: "Finance", href: "/dashboard/finance" }, { label: "Salaries" }]}
      />
      <RequirePermission anyOf={["salary.view", "salary.viewOwn"]} area="Salaries">
        <SalariesView />
      </RequirePermission>
    </div>
  );
}
