import type { Metadata } from "next";
import { EventsPage } from "@/components/events/events-page";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Events & Programs | Noor Community Mosque",
  description:
    "Explore upcoming events, Quran halaqahs, Islamic classes, and community gatherings at Noor Community Mosque in Dhaka, Bangladesh.",
  openGraph: {
    title: "Events & Programs | Noor Community Mosque",
    description:
      "Join us for prayer, sacred learning, youth circles, and community welfare initiatives.",
    url: "/events",
    siteName: "Noor Community Mosque",
    images: [
      {
        url: "/alim-L7J4ytEFRCg-unsplash.jpg",
        width: 1200,
        height: 630,
        alt: "Events at Noor Community Mosque",
      },
    ],
    locale: "en_US",
    type: "website",
  },
};

export default function Events() {
  return (
    <main className="min-h-screen bg-[#f8f6ef] flex flex-col selection:bg-[#c79a45] selection:text-white">
      <SiteHeader />
      <EventsPage />
      <SiteFooter />
    </main>
  );
}
