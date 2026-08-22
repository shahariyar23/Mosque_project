import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { PrayerTimesView } from "@/components/mosque/prayer/prayer-times-view";
import { RequirePermission } from "@/components/finance/ui/permission-gate";

export const metadata: Metadata = {
  title: "Prayer Times · Noor Mosque Management",
  description: "Today's adhan and iqamah times, the weekly schedule and how the times are calculated.",
};

export default function PrayerTimesPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Prayer Times"
        subtitle="Manage today's prayer schedule and upcoming prayer times."
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Prayer Times" }]}
      />
      <RequirePermission anyOf={["prayer.view"]} area="Prayer Times">
        <PrayerTimesView />
      </RequirePermission>
    </div>
  );
}
