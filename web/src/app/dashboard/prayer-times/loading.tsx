import { PrayerStripSkeleton } from "@/components/ui/skeletons";
import { TableSkeleton } from "@/components/finance/ui/skeleton";

export default function PrayerTimesLoading() {
  return (
    <div className="space-y-4">
      <PrayerStripSkeleton />
      <TableSkeleton rows={6} columns={5} label="Loading today's prayer times" />
      <TableSkeleton rows={7} columns={7} label="Loading the weekly schedule" />
    </div>
  );
}
