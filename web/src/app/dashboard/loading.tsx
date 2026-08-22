import { PrayerStripSkeleton, StatStripSkeleton } from "@/components/ui/skeletons";
import { TableSkeleton } from "@/components/finance/ui/skeleton";

export default function OverviewLoading() {
  return (
    <div className="space-y-4">
      <StatStripSkeleton />
      <PrayerStripSkeleton />
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <TableSkeleton rows={4} columns={4} label="Loading upcoming events" />
        </div>
        <TableSkeleton rows={3} columns={2} label="Loading the community breakdown" />
      </div>
    </div>
  );
}
