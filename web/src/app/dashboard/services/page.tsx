import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { ServicesView } from "@/components/mosque/services/services-view";
import { RequirePermission } from "@/components/finance/ui/permission-gate";

export const metadata: Metadata = {
  title: "Services · Noor Mosque Management",
  description: "The mosque's service catalogue — funerals, marriages, counselling, welfare and facility hire.",
};

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const { action } = await searchParams;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Services"
        subtitle="The services the mosque offers the community, and who coordinates each one."
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Services" }]}
      />
      <RequirePermission anyOf={["service.view"]} area="Services">
        <ServicesView openAddOnMount={action === "add"} />
      </RequirePermission>
    </div>
  );
}
