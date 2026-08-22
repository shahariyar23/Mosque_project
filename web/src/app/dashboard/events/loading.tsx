import { EventGridSkeleton, StatStripSkeleton } from "@/components/ui/skeletons";

export default function EventsLoading() {
  return (
    <div className="space-y-4">
      <StatStripSkeleton />
      <EventGridSkeleton count={6} />
    </div>
  );
}
