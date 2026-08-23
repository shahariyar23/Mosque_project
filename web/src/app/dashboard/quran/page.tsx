import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { QuranView } from "@/components/mosque/quran/quran-view";
import { RequirePermission } from "@/components/finance/ui/permission-gate";

export const metadata: Metadata = {
  title: "Quran · Noor Mosque Management",
  description: "The mosque's Quran study library — recitations, tafsir, memorisation plans and study guides.",
};

export default async function QuranPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const { action } = await searchParams;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Quran"
        subtitle="Recitations, tafsir and memorisation resources the mosque publishes to the community."
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Quran" }]}
      />
      <RequirePermission anyOf={["quran.view"]} area="Quran">
        <QuranView openAddOnMount={action === "add"} />
      </RequirePermission>
    </div>
  );
}
