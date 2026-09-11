import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { MosquesManagementView } from "@/components/mosque/admin/mosques-management-view";
import { RequirePermission } from "@/components/finance/ui/permission-gate";

export const metadata: Metadata = {
  title: "Platform Mosques · Noor Mosque Management",
  description: "Central multi-tenant administration of registered mosques, credentials, and tenant boundaries.",
};

export default function AdminMosquesPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Platform Administration"
        subtitle="Manage multiple tenant mosques, administrator accounts, system domains, and tenant isolation policies."
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Platform" },
          { label: "All Mosques" },
        ]}
      />
      <RequirePermission anyOf={["platform.manage", "mosque.create"]} area="Platform Administration">
        <MosquesManagementView />
      </RequirePermission>
    </div>
  );
}

