import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { AboutHero } from "@/components/about/about-hero";
import { AboutStory } from "@/components/about/about-story";
import { AboutMilestones } from "@/components/about/about-milestones";
import { AboutMissionVision } from "@/components/about/about-mission-vision";
import { AboutValues } from "@/components/about/about-values";
import { AboutArchitecture } from "@/components/about/about-architecture";
import { AboutFacilities } from "@/components/about/about-facilities";
import { AboutImpact } from "@/components/about/about-impact";
import { AboutEducation } from "@/components/about/about-education";
import { AboutServices } from "@/components/about/about-services";
import { AboutGallery } from "@/components/about/about-gallery";
import { AboutCta } from "@/components/about/about-cta";
import { AboutContact } from "@/components/about/about-contact";
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

      {/* 01. Cinematic Hero */}
      <AboutHero />

      {/* 02. Our Story & Humble Beginnings */}
      <AboutStory />

      {/* 03. History & Milestones Timeline */}
      <AboutMilestones />

      {/* 04. Mission & Vision */}
      <AboutMissionVision />

      {/* 05. What We Believe (3 Pillars) */}
      <AboutValues />

      {/* 06. Our Mosque & Architecture Showcase (Replacing 3D placeholder) */}
      <AboutArchitecture />

      {/* 07. Facilities & Amenities */}
      <AboutFacilities />

      {/* 08. Community Impact */}
      <AboutImpact />

      {/* 09. Islamic Education & Maktab */}
      <AboutEducation />

      {/* 10. Community Services & Relief */}
      <AboutServices />

      {/* 11. Life at Noor / Gallery */}
      <AboutGallery />

      {/* 12. Final Get Involved Call-to-Action */}
      <AboutCta />

      {/* 13. Verified Physical Address & Contact Information */}
      <AboutContact />

      {/* 14. Newsletter & Global Footer */}
      <SiteFooter />
    </main>
  );
}
