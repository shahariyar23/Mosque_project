import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { FundsView } from "@/components/finance/funds/funds-view";
import { RequirePermission } from "@/components/finance/ui/permission-gate";

export const metadata: Metadata = {
  title: "Funds · Noor Mosque Management",
  description: "Every fund the mosque holds, what it was collected for and what remains.",
};

export default function FundsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Funds"
        subtitle="A fund is a promise about what money may be spent on. Zakat and construction money are restricted and cannot quietly cover a general bill, which is why each fund is kept and reported separately."
        crumbs={[{ label: "Finance", href: "/dashboard/finance" }, { label: "Funds" }]}
      />
      <RequirePermission anyOf={["fund.view"]} area="Funds">
        <FundsView />
      </RequirePermission>
    </div>
  );
}
