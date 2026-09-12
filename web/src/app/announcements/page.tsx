import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AnnouncementsPage } from "@/components/announcements-page";

export const metadata: Metadata = {
  title: "Announcements & Notices | Noor Community Mosque",
  description:
    "Official community announcements, prayer timetable adjustments, religious programs, and urgent notices from Noor Community Mosque.",
  openGraph: {
    title: "Announcements & Notices | Noor Community Mosque",
    description:
      "Stay connected with daily congregation updates, seasonal Ramadan announcements, community programs, and notices.",
    url: "/announcements",
    siteName: "Noor Community Mosque",
    locale: "en_US",
    type: "website",
  },
};

export default function Announcements() {
  return (
    <main className="min-h-screen bg-[#040e0b] flex flex-col selection:bg-[#dca74e] selection:text-[#040e0b]">
      <SiteHeader />
      <AnnouncementsPage />
      <SiteFooter />
    </main>
  );
}
