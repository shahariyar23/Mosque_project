import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { EventsView } from "@/components/mosque/events/events-view";
import { RequirePermission } from "@/components/finance/ui/permission-gate";

export const metadata: Metadata = {
  title: "Events · Noor Mosque Management",
  description: "Mosque programmes and community events, with registrations and capacity.",
};

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const { action } = await searchParams;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Events"
        subtitle="Plan and manage mosque programs and community events."
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Events" }]}
      />
      <RequirePermission anyOf={["event.view"]} area="Events">
        <EventsView openCreateOnMount={action === "create"} />
      </RequirePermission>
    </div>
  );
}
