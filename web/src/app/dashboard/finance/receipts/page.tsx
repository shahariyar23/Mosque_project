import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { ReceiptsView } from "@/components/finance/receipts/receipts-view";
import { RequirePermission } from "@/components/finance/ui/permission-gate";

export const metadata: Metadata = {
  title: "Receipts · Noor Mosque Management",
  description: "The donor's copy: printed money receipts for everything the mosque received.",
};

/**
 * As with salaries, a member holding only `receipt.viewOwn` opens the same route and gets their own
 * receipts. Which ones are theirs is settled by the API, never by this page.
 */
export default function ReceiptsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Receipts"
        subtitle="The copy the giver keeps. A receipt is issued when a payment is verified, carries its own number, and is never altered afterwards: a wrong one is voided and a fresh number is issued."
        crumbs={[{ label: "Finance", href: "/dashboard/finance" }, { label: "Receipts" }]}
      />
      <RequirePermission anyOf={["receipt.view", "receipt.viewOwn"]} area="Receipts">
        <ReceiptsView />
      </RequirePermission>
    </div>
  );
}
