import { StatStripSkeleton } from "@/components/ui/skeletons";
import { ChartSkeleton } from "@/components/finance/ui/skeleton";

export default function JumuahLoading() {
  return (
    <div className="space-y-4">
      <StatStripSkeleton />
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ChartSkeleton />
        </div>
        <ChartSkeleton />
      </div>
    </div>
  );
}
