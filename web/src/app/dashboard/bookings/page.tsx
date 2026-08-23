import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { BookingsView } from "@/components/mosque/bookings/bookings-view";
import { RequirePermission } from "@/components/finance/ui/permission-gate";

export const metadata: Metadata = {
  title: "Bookings · Noor Mosque Management",
  description: "Requests the community has made against the mosque's services, and their status.",
};

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const { action } = await searchParams;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bookings"
        subtitle="Track and manage requests made against the mosque's services."
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Bookings" }]}
      />
      <RequirePermission anyOf={["booking.view"]} area="Bookings">
        <BookingsView openAddOnMount={action === "add"} />
      </RequirePermission>
    </div>
  );
}
