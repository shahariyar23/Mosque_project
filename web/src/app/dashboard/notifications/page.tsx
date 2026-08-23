import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { NotificationsView } from "@/components/mosque/notifications/notifications-view";
import { RequirePermission } from "@/components/finance/ui/permission-gate";

export const metadata: Metadata = {
  title: "Notifications · Noor Mosque Management",
  description: "The send log — push, email, SMS and in-app messages to the community, with delivery figures.",
};

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ action?: string }> }) {
  const { action } = await searchParams;
  return (
    <div className="space-y-5">
      <PageHeader
        title="Notifications"
        subtitle="Reach a segment of the community by push, email, SMS or in-app — and see how far each message went."
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Notifications" }]}
      />
      <RequirePermission anyOf={["notification.send"]} area="Notifications">
        <NotificationsView openComposeOnMount={action === "add"} />
      </RequirePermission>
    </div>
  );
}
