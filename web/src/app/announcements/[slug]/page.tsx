import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AnnouncementDetailView } from "@/components/announcement-detail-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: "Announcement Details | Noor Community Mosque",
    description: "Read official announcements and community updates from Noor Community Mosque.",
    openGraph: {
      title: "Announcement Details | Noor Community Mosque",
      description: "Official community notices and updates from Noor Community Mosque.",
      url: `/announcements/${slug}`,
      siteName: "Noor Community Mosque",
    },
  };
}

export default async function AnnouncementDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <main className="min-h-screen bg-[#040e0b] flex flex-col selection:bg-[#dca74e] selection:text-[#040e0b]">
      <SiteHeader />
      <AnnouncementDetailView idOrSlug={slug} />
      <SiteFooter />
    </main>
  );
}
