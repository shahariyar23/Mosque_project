import { StatStripSkeleton } from "@/components/ui/skeletons";
import { TableSkeleton } from "@/components/finance/ui/skeleton";

export default function RegistrationsLoading() {
  return (
    <div className="space-y-4">
      {/* Five tiles here, matching the five figures the page reports. */}
      <StatStripSkeleton count={5} />
      <TableSkeleton rows={8} columns={7} label="Loading event registrations" />
    </div>
  );
}
