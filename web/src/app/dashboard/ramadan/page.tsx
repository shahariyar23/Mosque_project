import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { RamadanView } from "@/components/mosque/ramadan/ramadan-view";
import { RequirePermission } from "@/components/finance/ui/permission-gate";

export const metadata: Metadata = {
  title: "Ramadan · Noor Mosque Management",
  description: "Ramadan calendar, daily fasting schedules, Sehri, Iftar and Taraweeh times.",
};

export default function RamadanPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Ramadan Calendar"
        subtitle="Manage daily fasting schedules, Sehri (Suhoor), Iftar and Taraweeh prayer times."
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Prayer Times", href: "/dashboard/prayer-times" },
          { label: "Ramadan" },
        ]}
      />
      <RequirePermission anyOf={["prayer.view", "ramadan.manage"]} area="Ramadan">
        <RamadanView />
      </RequirePermission>
    </div>
  );
}

