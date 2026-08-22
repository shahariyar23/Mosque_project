import { StatStripSkeleton, TeamGridSkeleton } from "@/components/ui/skeletons";
import { TableSkeleton } from "@/components/finance/ui/skeleton";

export default function VolunteersLoading() {
  return (
    <div className="space-y-4">
      <StatStripSkeleton />
      <TeamGridSkeleton count={8} />
      <TableSkeleton rows={8} columns={7} label="Loading the volunteer roster" />
    </div>
  );
}
