import { StatStripSkeleton } from "@/components/ui/skeletons";
import { TableSkeleton } from "@/components/finance/ui/skeleton";

export default function MembersLoading() {
  return (
    <div className="space-y-4">
      <StatStripSkeleton />
      <TableSkeleton rows={8} columns={7} label="Loading the member register" />
    </div>
  );
}
