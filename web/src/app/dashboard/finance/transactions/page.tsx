import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { TransactionsView } from "@/components/finance/transactions/transactions-view";
import { RequirePermission } from "@/components/finance/ui/permission-gate";

export const metadata: Metadata = {
  title: "Transactions · Noor Mosque Management",
  description: "The full ledger of money in, money out and transfers between funds.",
};

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        subtitle="Every entry in the ledger, whoever recorded it. An entry is never edited or deleted: a mistake is voided with a reason and recorded again, so the trail stays readable years later."
        crumbs={[{ label: "Finance", href: "/dashboard/finance" }, { label: "Transactions" }]}
      />
      <RequirePermission anyOf={["transaction.view"]} area="Transactions">
        <TransactionsView />
      </RequirePermission>
    </div>
  );
}
