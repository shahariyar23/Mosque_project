import { SiteHeader } from "@/components/site-header";
import { HeroSection } from "@/components/hero-section";
import { PrayerTimesSection } from "@/components/prayer-times-section";
import { AboutSection } from "@/components/about-section";
import { ServicesEventsSection } from "@/components/services-events-section";
import { DonationFooterSection } from "@/components/donation-footer-section";
import { SiteFooter } from "@/components/site-footer";

import { QuickLinks } from "@/components/home/QuickLinks";

const prayers = [
  ["Fajr", "4:38 AM", "Passed"],
  ["Sunrise", "5:55 AM", ""],
  ["Dhuhr", "12:16 PM", "Passed"],
  ["Asr", "4:35 PM", "Next"],
  ["Maghrib", "6:31 PM", ""],
  ["Isha", "7:48 PM", ""],
];
const services = [
  [
    "◐",
    "Daily Prayer",
    "Five daily congregational prayers in a calm, welcoming space.",
  ],
  [
    "◫",
    "Quran Classes",
    "Meaningful Quran learning for every age and ability.",
  ],
  [
    "⌂",
    "Nikah Services",
    "Guidance for one of life’s most important beginnings.",
  ],
  ["♡", "Community Care", "Practical support for our neighbours and families."],
];
const events = [
  [
    "21",
    "WEEKLY TAFSIR",
    "Reflections from the Quran",
    "Every Friday · 7:30 PM",
  ],
  ["24", "YOUTH", "Faith & Friendship Circle", "Saturday · 4:00 PM"],
  ["28", "EDUCATION", "Quran Hifz Programme", "Tuesday · 6:00 PM"],
];
export default function Home() {
  return (
    <main>
      <SiteHeader />
      <HeroSection />
      <PrayerTimesSection />
      <QuickLinks />
      <AboutSection />

      <ServicesEventsSection />

      <DonationFooterSection />
      <SiteFooter />
    </main>
  );
}
