"use client";

import { useLanguage } from "@/components/language-provider";
import { Clock, BookOpen, CalendarDays, Heart, Megaphone, HandCoins, GraduationCap, Users } from "lucide-react";

const features = [
  { icon: Clock, labelEn: "Prayer Times", labelBn: "নামাজের সময়", href: "/prayer-times" },
  { icon: BookOpen, labelEn: "Quran", labelBn: "কুরআন", href: "/quran" },
  { icon: CalendarDays, labelEn: "Events", labelBn: "অনুষ্ঠান", href: "/events" },
  { icon: Users, labelEn: "Services", labelBn: "সেবা", href: "/services" },
  { icon: Megaphone, labelEn: "Announcements", labelBn: "ঘোষণা", href: "/announcements" },
  { icon: HandCoins, labelEn: "Donations", labelBn: "দান", href: "/donations" },
  { icon: GraduationCap, labelEn: "Classes", labelBn: "ক্লাস", href: "/services" },
  { icon: Heart, labelEn: "Community", labelBn: "সম্প্রদায়", href: "/about" },
];

export function FeaturesSection() {
  const { language } = useLanguage();
  const bn = language === "bn";

  return (
    <section className="bg-[#FAF8F5] px-4 py-12 sm:py-16 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-8 sm:mb-12">
          <span className="text-xs font-bold tracking-[0.2em] text-[#c79a45] uppercase">
            {bn ? "ফিচার" : "FEATURES"}
          </span>
          <h2
            className="mt-2 text-2xl sm:text-3xl font-serif font-bold text-[#0F2E26]"
            style={{ fontFamily: "var(--font-heading-en), 'Playfair Display', serif" }}
          >
            {bn ? "নূরে কী কী আছে" : "What Can You Do"}
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {features.map(({ icon: Icon, labelEn, labelBn, href }) => (
            <a
              key={labelEn}
              href={href}
              className="group flex items-center gap-3 rounded-lg border border-[#e5e0d5] bg-white p-4 transition-all hover:border-[#c79a45] hover:shadow-sm"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0d4d3b]/5 text-[#0d4d3b] transition-colors group-hover:bg-[#0d4d3b] group-hover:text-white">
                <Icon className="w-5 h-5" strokeWidth={1.5} />
              </span>
              <span className="text-sm font-medium text-[#1e2e28]">{bn ? labelBn : labelEn}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
