import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { GalleryView } from "@/components/mosque/gallery/gallery-view";
import { RequirePermission } from "@/components/finance/ui/permission-gate";

export const metadata: Metadata = {
  title: "Gallery · Noor Mosque Management",
  description: "The mosque's photo and video library, grouped into albums across the year.",
};

export default async function GalleryPage({ searchParams }: { searchParams: Promise<{ action?: string }> }) {
  const { action } = await searchParams;
  return (
    <div className="space-y-5">
      <PageHeader
        title="Gallery"
        subtitle="Photos and videos from across the mosque's year — the Eids, Ramadan, the madrasah and community life."
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Gallery" }]}
      />
      <RequirePermission anyOf={["gallery.view"]} area="Gallery">
        <GalleryView openUploadOnMount={action === "add"} />
      </RequirePermission>
    </div>
  );
}
