"use client";

import { usePublicAboutData } from "@/hooks/use-public-about-data";
import { AboutHero } from "@/components/about/about-hero";
import { AboutStory } from "@/components/about/about-story";
import { AboutMilestones } from "@/components/about/about-milestones";
import { AboutMissionVision } from "@/components/about/about-mission-vision";
import { AboutValues } from "@/components/about/about-values";
import { AboutArchitecture } from "@/components/about/about-architecture";
import { AboutFacilities } from "@/components/about/about-facilities";
import { AboutLeadership } from "@/components/about/about-leadership";
import { AboutImpact } from "@/components/about/about-impact";
import { AboutEducation } from "@/components/about/about-education";
import { AboutServices } from "@/components/about/about-services";
import { AboutGallery } from "@/components/about/about-gallery";
import { AboutCta } from "@/components/about/about-cta";
import { AboutContact } from "@/components/about/about-contact";

export function AboutContent() {
  const { data, loading } = usePublicAboutData();

  return (
    <>
      {/* 01. Cinematic Hero */}
      <AboutHero mosque={data.mosque} loading={loading} />

      {/* 02. Our Story & Humble Beginnings */}
      <AboutStory mosque={data.mosque} loading={loading} />

      {/* 03. History & Milestones Timeline */}
      <AboutMilestones milestones={data.milestones} loading={loading} />

      {/* 04. Mission & Vision */}
      <AboutMissionVision mosque={data.mosque} loading={loading} />

      {/* 05. What We Believe (3 Pillars) */}
      <AboutValues values={data.values} loading={loading} />

      {/* 06. Our Mosque & Architecture Showcase */}
      <AboutArchitecture gallery={data.gallery} loading={loading} />

      {/* 07. Facilities & Amenities */}
      <AboutFacilities facilities={data.facilities} loading={loading} />

      {/* 08. Leadership & Imams */}
      <AboutLeadership leadership={data.leadership} loading={loading} />

      {/* 09. Community Impact */}
      <AboutImpact stats={data.stats} mosque={data.mosque} loading={loading} />

      {/* 10. Islamic Education & Maktab */}
      <AboutEducation services={data.services} loading={loading} />

      {/* 11. Community Services & Relief */}
      <AboutServices services={data.services} loading={loading} />

      {/* 12. Life at Noor / Gallery */}
      <AboutGallery gallery={data.gallery} loading={loading} />

      {/* 13. Final Get Involved Call-to-Action */}
      <AboutCta />

      {/* 14. Verified Physical Address & Contact Information */}
      <AboutContact mosque={data.mosque} loading={loading} />
    </>
  );
}

