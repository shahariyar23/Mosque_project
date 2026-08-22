import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { MosqueProfileView } from "@/components/mosque/profile/mosque-profile-view";
import { RequirePermission } from "@/components/finance/ui/permission-gate";

export const metadata: Metadata = {
  title: "Mosque Profile · Noor Mosque Management",
  description: "The mosque's public information, location, contact details and committee.",
};

export default function MosqueProfilePage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Mosque Profile"
        subtitle="Manage your mosque's public information and identity."
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Mosque Profile" }]}
      />
      <RequirePermission anyOf={["mosque.view"]} area="Mosque Profile">
        <MosqueProfileView />
      </RequirePermission>
    </div>
  );
}
