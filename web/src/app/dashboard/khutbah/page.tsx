import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { KhutbahView } from "@/components/mosque/khutbah/khutbah-view";
import { RequirePermission } from "@/components/finance/ui/permission-gate";

export const metadata: Metadata = {
  title: "Khutbah · Noor Mosque Management",
  description: "The Friday khutbah archive — delivered sermons, the upcoming schedule and drafts in preparation.",
};

export default async function KhutbahPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const { action } = await searchParams;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Khutbah"
        subtitle="The Friday sermons — delivered, scheduled and in preparation."
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Khutbah" }]}
      />
      <RequirePermission anyOf={["khutbah.view"]} area="Khutbah">
        <KhutbahView openAddOnMount={action === "add"} />
      </RequirePermission>
    </div>
  );
}
