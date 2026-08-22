import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { ContributionsView } from "@/components/finance/contributions/contributions-view";
import { RequirePermission } from "@/components/finance/ui/permission-gate";

export const metadata: Metadata = {
  title: "Contributions · Noor Mosque Management",
  description: "Monthly member contributions, who has paid and who is still outstanding.",
};

export default function ContributionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Monthly contributions"
        subtitle="What members pledge each month and who has paid. Outstanding is not a debt to chase publicly, so this page is for the committee, not for the notice board."
        crumbs={[{ label: "Finance", href: "/dashboard/finance" }, { label: "Contributions" }]}
      />
      <RequirePermission anyOf={["contribution.view"]} area="Contributions">
        <ContributionsView />
      </RequirePermission>
    </div>
  );
}
