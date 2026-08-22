import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { JumuahView } from "@/components/mosque/jumuah/jumuah-view";
import { RequirePermission } from "@/components/finance/ui/permission-gate";

export const metadata: Metadata = {
  title: "Jumu'ah · Noor Mosque Management",
  description: "Friday prayer schedules, khutbahs and attendance for both jama'ats.",
};

export default function JumuahPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Jumu'ah"
        subtitle="Manage Friday prayer schedules, khutbahs and attendance."
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Prayer Times", href: "/dashboard/prayer-times" },
          { label: "Jumu'ah" },
        ]}
      />
      <RequirePermission anyOf={["jumuah.manage"]} area="Jumu'ah">
        <JumuahView />
      </RequirePermission>
    </div>
  );
}
