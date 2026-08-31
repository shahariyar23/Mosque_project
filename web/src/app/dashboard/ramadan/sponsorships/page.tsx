import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { IftarSponsorshipView } from "@/components/mosque/ramadan/iftar-sponsorship-view";
import { RequirePermission } from "@/components/finance/ui/permission-gate";

export const metadata: Metadata = {
  title: "Iftar Sponsorship · Noor Mosque Management",
  description: "Coordinate daily community Iftar hosts, sponsor pledges, and meal capacity for Ramadan.",
};

export default function IftarSponsorshipPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Iftar Sponsorship"
        subtitle="Coordinate daily community Iftar hosts, sponsor pledges, and meal capacity."
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Ramadan", href: "/dashboard/ramadan" },
          { label: "Iftar Sponsorship" },
        ]}
      />
      <RequirePermission anyOf={["prayer.view", "ramadan.manage"]} area="Iftar Sponsorship">
        <IftarSponsorshipView />
      </RequirePermission>
    </div>
  );
}

