import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { CommitteeView } from "@/components/mosque/committee/committee-view";
import { RequirePermission } from "@/components/finance/ui/permission-gate";

export const metadata: Metadata = {
  title: "Committee & Leadership · Noor Mosque Management",
  description: "Manage mosque executives, committee members, and spiritual leadership.",
};

export default function CommitteePage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Committee & Leadership"
        subtitle="Manage mosque executives, committee members, and spiritual leadership displayed on the public About page."
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Committee" }]}
      />
      <RequirePermission anyOf={["mosque.view", "user.view"]} area="Committee">
        <CommitteeView />
      </RequirePermission>
    </div>
  );
}

