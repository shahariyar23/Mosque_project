import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { RegistrationsView } from "@/components/mosque/registrations/registrations-view";
import { RequirePermission } from "@/components/finance/ui/permission-gate";

export const metadata: Metadata = {
  title: "Registrations · Noor Mosque Management",
  description: "Manage registrations for mosque events and programmes.",
};

export default function RegistrationsPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Registrations"
        subtitle="Manage registrations for mosque events and programs."
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Events", href: "/dashboard/events" },
          { label: "Registrations" },
        ]}
      />
      <RequirePermission anyOf={["event.update"]} area="Registrations">
        <RegistrationsView />
      </RequirePermission>
    </div>
  );
}
