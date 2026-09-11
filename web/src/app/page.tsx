import { SiteHeader } from "@/components/site-header";
import { HeroSection } from "@/components/hero-section";
import { QuickLinks } from "@/components/home/QuickLinks";
import { AnnouncementsSection } from "@/components/announcements-section";
import { PrayerTimesSection } from "@/components/prayer-times-section";
import { AboutSection } from "@/components/about-section";
import { ServicesEventsSection } from "@/components/services-events-section";
import { HowNoorWorks } from "@/components/home/HowNoorWorks";
import { SiteFooter } from "@/components/site-footer";

export default function Home() {
  return (
    <main>
      <SiteHeader />
      <HeroSection />
      <QuickLinks />
      <AnnouncementsSection />
      <PrayerTimesSection />
      <AboutSection />
      <ServicesEventsSection />
      <HowNoorWorks />
      <SiteFooter />
    </main>
  );
}
