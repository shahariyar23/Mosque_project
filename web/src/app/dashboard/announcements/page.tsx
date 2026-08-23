import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { AnnouncementsView } from "@/components/mosque/announcements/announcements-view";
import { RequirePermission } from "@/components/finance/ui/permission-gate";

export const metadata: Metadata = {
  title: "Announcements · Noor Mosque Management",
  description: "The community noticeboard — pinned notices, scheduled posts and the announcement archive.",
};

export default async function AnnouncementsPage({ searchParams }: { searchParams: Promise<{ action?: string }> }) {
  const { action } = await searchParams;
  return (
    <div className="space-y-5">
      <PageHeader
        title="Announcements"
        subtitle="What the mosque is telling the community — across the website, the app, email and the noticeboard."
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Announcements" }]}
      />
      <RequirePermission anyOf={["announcement.view"]} area="Announcements">
        <AnnouncementsView openAddOnMount={action === "add"} />
      </RequirePermission>
    </div>
  );
}
