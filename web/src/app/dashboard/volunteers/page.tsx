import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { VolunteersView } from "@/components/mosque/volunteers/volunteers-view";
import { RequirePermission } from "@/components/finance/ui/permission-gate";

export const metadata: Metadata = {
  title: "Volunteers · Noor Mosque Management",
  description: "Volunteer teams, availability, skills and service hours.",
};

export default async function VolunteersPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const { action } = await searchParams;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Volunteers"
        subtitle="Coordinate mosque volunteers and community service teams."
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Members", href: "/dashboard/members" },
          { label: "Volunteers" },
        ]}
      />
      <RequirePermission anyOf={["volunteer.view"]} area="Volunteers">
        <VolunteersView openAddOnMount={action === "add"} />
      </RequirePermission>
    </div>
  );
}
