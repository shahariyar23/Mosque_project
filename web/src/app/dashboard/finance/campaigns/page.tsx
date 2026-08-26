import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { CampaignsView } from "@/components/finance/campaigns/campaigns-view";
import { RequirePermission } from "@/components/finance/ui/permission-gate";

export const metadata: Metadata = {
  title: "Fundraising Campaigns · Noor Mosque Management",
  description: "Fundraising appeals collecting towards specific mosque projects and funds.",
};

export default function CampaignsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Fundraising Campaigns"
        subtitle="Timed appeals collecting donations for specific mosque projects, construction, and charitable funds."
        crumbs={[{ label: "Finance", href: "/dashboard/finance" }, { label: "Campaigns" }]}
      />
      <RequirePermission anyOf={["campaign.view"]} area="Campaigns">
        <CampaignsView />
      </RequirePermission>
    </div>
  );
}
