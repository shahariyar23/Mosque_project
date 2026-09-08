import { SiteHeader } from "@/components/site-header";
import { HeroSection } from "@/components/hero-section";
import { QuickLinks } from "@/components/home/QuickLinks";
import { PrayerTimesSection } from "@/components/prayer-times-section";
import { AboutSection } from "@/components/about-section";
import { ServicesEventsSection } from "@/components/services-events-section";
import { DonationFooterSection } from "@/components/donation-footer-section";
import { SiteFooter } from "@/components/site-footer";

export default function Home() {
  return (
    <main>
      <SiteHeader />
      <HeroSection />
      <QuickLinks />
      <PrayerTimesSection />
      <AboutSection />
      <ServicesEventsSection />
      <DonationFooterSection />
      <SiteFooter />
    </main>
  );
}
