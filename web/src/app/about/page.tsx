import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { AboutContent } from "@/components/about/about-content";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "About Us | Noor Community Mosque",
  description:
    "Explore Noor Community Mosque—a sanctuary of worship, authentic Islamic education, and compassionate community service in Dhaka, Bangladesh.",
  openGraph: {
    title: "About Noor Community Mosque",
    description:
      "A sacred place of worship, learning, and brotherhood. Discover our story, facilities, educational programs, and community initiatives.",
    url: "/about",
    siteName: "Noor Community Mosque",
    images: [
      {
        url: "/golden-mosque-with-minarets-at-sunset.jpg",
        width: 1200,
        height: 630,
        alt: "Noor Community Mosque at sunset",
      },
    ],
    locale: "en_US",
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#f8f6ef] text-[#17211d] flex flex-col selection:bg-[#c79a45] selection:text-white">
      {/* Site Navigation Header */}
      <SiteHeader />

      {/* Backend-driven About Sections */}
      <AboutContent />

      {/* Newsletter & Global Footer */}
      <SiteFooter />
    </main>
  );
}
