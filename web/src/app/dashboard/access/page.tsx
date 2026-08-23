import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { AccessView } from "@/components/mosque/access/access-view";
import { RequirePermission } from "@/components/finance/ui/permission-gate";

export const metadata: Metadata = {
  title: "Roles & Access · Noor Mosque Management",
  description: "How access is decided — the role catalogue, permission coverage by area, and the committee posts.",
};

export default function AccessPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Roles & Access"
        subtitle="How the platform decides what each account can do — the seven roles, the permissions each carries area by area, and the committee posts the mosque uses."
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Roles & Access" }]}
      />
      <RequirePermission anyOf={["permission.assign"]} area="Roles & Access">
        <AccessView />
      </RequirePermission>
    </div>
  );
}
