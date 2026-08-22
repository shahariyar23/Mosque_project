import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { DonationsView } from "@/components/finance/donations/donations-view";
import { RequirePermission } from "@/components/finance/ui/permission-gate";

export const metadata: Metadata = {
  title: "Donations · Noor Mosque Management",
  description: "Sadaqah, zakat, fitrah and general giving, from recording to verification.",
};

export default function DonationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Donations"
        subtitle="Sadaqah, zakat, fitrah and general giving. One person records a donation and somebody else verifies it, and the receipt is issued at verification, not before."
        crumbs={[{ label: "Finance", href: "/dashboard/finance" }, { label: "Donations" }]}
      />
      <RequirePermission anyOf={["donation.view"]} area="Donations">
        <DonationsView />
      </RequirePermission>
    </div>
  );
}
