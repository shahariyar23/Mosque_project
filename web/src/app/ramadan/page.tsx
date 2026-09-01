import type { Metadata } from "next";
import { PublicRamadanPage } from "@/components/ramadan/ramadan-page";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Ramadan Timetable & Fasting Schedule · Noor Community Mosque",
  description:
    "Daily Ramadan Sehri (Imsak) and Iftar timetable, Suhoor, Taraweeh congregation times, and fasting calendar for Dhaka.",
};

export default function Ramadan() {
  return (
    <main>
      <SiteHeader />
      <PublicRamadanPage />
      <SiteFooter />
    </main>
  );
}

