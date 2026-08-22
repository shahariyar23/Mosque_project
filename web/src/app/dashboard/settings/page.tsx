import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { SettingsView } from "@/components/mosque/settings/settings-view";
import { RequirePermission } from "@/components/finance/ui/permission-gate";

export const metadata: Metadata = {
  title: "Settings · Noor Mosque Management",
  description: "General, notification, prayer, security and appearance settings for the mosque dashboard.",
};

export default function SettingsPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        subtitle="Manage mosque administration and dashboard preferences."
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Profile", href: "/dashboard/mosque" },
          { label: "Settings" },
        ]}
      />
      <RequirePermission anyOf={["settings.view"]} area="Settings">
        <SettingsView />
      </RequirePermission>
    </div>
  );
}
