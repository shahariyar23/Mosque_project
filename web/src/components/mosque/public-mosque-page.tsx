"use client";

import { useEffect } from "react";
import { SiteHeader } from "@/components/site-header";
import { HeroSection } from "@/components/hero-section";
import { QuickLinks } from "@/components/home/QuickLinks";
import { AnnouncementsSection } from "@/components/announcements-section";
import { PrayerTimesSection } from "@/components/prayer-times-section";
import { AboutSection } from "@/components/about-section";
import { ServicesEventsSection } from "@/components/services-events-section";
import { HowNoorWorks } from "@/components/home/HowNoorWorks";
import { SiteFooter } from "@/components/site-footer";
import { useMosqueBranding } from "@/components/mosque-branding-provider";

export function PublicMosquePage({ slug }: { slug: string }) {
  const { setActiveSlug } = useMosqueBranding();

  useEffect(() => {
    if (slug) {
      setActiveSlug(slug);
    }
  }, [slug, setActiveSlug]);

  return (
    <main>
      <SiteHeader />
      <HeroSection />
      <QuickLinks />
      <AnnouncementsSection customSlug={slug} />
      <PrayerTimesSection />
      <AboutSection />
      <ServicesEventsSection />
      <HowNoorWorks />
      <SiteFooter />
    </main>
  );
}

