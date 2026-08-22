import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { RecurringView } from "@/components/finance/recurring/recurring-view";
import { RequirePermission } from "@/components/finance/ui/permission-gate";

export const metadata: Metadata = {
  title: "Recurring contributions · Noor Mosque Management",
  description: "Standing arrangements members have set up to give on a schedule.",
};

export default function RecurringPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Recurring contributions"
        subtitle="Standing arrangements members have set up to give on a schedule. An arrangement is a promise, not money in the bank, so nothing on this page counts as income until the payment is actually recorded."
        crumbs={[{ label: "Finance", href: "/dashboard/finance" }, { label: "Recurring" }]}
      />
      <RequirePermission anyOf={["contribution.manage"]} area="Recurring contributions">
        <RecurringView />
      </RequirePermission>
    </div>
  );
}
