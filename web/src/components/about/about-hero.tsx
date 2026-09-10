"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, Clock } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { type PublicMosqueInfo } from "@/services/publicHomeService";

interface AboutHeroProps {
  mosque?: PublicMosqueInfo | null;
  loading?: boolean;
}

export function AboutHero({ mosque, loading = false }: AboutHeroProps) {
  const { language } = useLanguage();
  const bn = language === "bn";

  const mosqueName = mosque?.name || (bn ? "নূর কমিউনিটি মসজিদ" : "Noor Community Mosque");
  const headline = bn ? (
    <>
      ইবাদত, জ্ঞান ও <br />
      <span className="text-[#e0be79] italic">ভ্রাতৃত্বের</span> একটি পবিত্র অঙ্গন
    </>
  ) : (
    <>
      A Place of Worship, <br />
      <span className="text-[#e0be79] italic font-normal">Knowledge</span> & Community
    </>
  );

  const defaultDescription = bn
    ? "নূর কমিউনিটি মসজিদ শুধু একটি ইবাদতখানা নয়—এটি আত্মশুদ্ধি, কুরআন শিক্ষা, পারস্পরিক সেবা এবং প্রতিটি বিশ্বাসী অন্তরের জন্য একটি প্রশান্তির ঠিকানা।"
    : "Noor Community Mosque is a sanctuary for spiritual devotion, Islamic scholarship, community welfare, and lifelong brotherhood—welcoming all seekers of truth and peace.";

  const description = (!bn && mosque?.description) ? mosque.description : defaultDescription;

  return (
    <section className="relative min-h-[640px] xs:min-h-[700px] sm:min-h-[760px] lg:min-h-[820px] flex items-center justify-center overflow-hidden bg-[#041510] text-white pt-28 pb-16 px-4 xs:px-6 lg:px-8">
      {/* Background Image with priority loading */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/golden-mosque-with-minarets-at-sunset.jpg"
          alt={bn ? `${mosqueName} এর সূর্যাস্তের মনোরম দৃশ্য` : `${mosqueName} with golden minarets at sunset`}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center filter brightness-[0.75]"
        />
        {/* Cinematic Multi-stop Dark Emerald Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#051a13] via-[#072a20]/80 to-[#041610]/70" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#051a13]/60 to-[#041510]/95" />
      </div>

      {/* Decorative Subtle Top Border Ornament */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c79a45] to-transparent opacity-40 z-10" />

      {/* Hero Content Container */}
      <div className="relative z-10 mx-auto max-w-5xl text-center flex flex-col items-center">
        {/* Eyebrow with Islamic Star Accents */}
        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-[#c79a45]/40 bg-[#072a20]/80 backdrop-blur-sm text-[#e0be79] text-xs xs:text-sm font-semibold tracking-[0.2em] uppercase shadow-lg">
          <span className="text-[10px]">✦</span>
          <span>{bn ? "আমাদের সম্পর্কে জানুন" : `ABOUT ${mosque?.name ? mosque.name.toUpperCase() : "NOOR MOSQUE"}`}</span>
          <span className="text-[10px]">✦</span>
        </div>

        {/* Main Editorial Headline */}
        <h1 className="mt-5 xs:mt-6 text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-[#f8f5ee] leading-[1.15] tracking-tight max-w-4xl drop-shadow-sm">
          {headline}
        </h1>

        {/* Supporting Narrative */}
        <p className="mt-4 xs:mt-5 max-w-2xl text-sm xs:text-base sm:text-lg text-white/80 leading-relaxed font-light">
          {description}
        </p>

        {/* Dual CTA Actions (Touch-friendly, min 44px targets) */}
        <div className="mt-8 xs:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 xs:gap-4 w-full sm:w-auto">
          <a
            href="#our-story"
            className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-[#c79a45] text-[#0d2a21] font-semibold text-sm sm:text-base transition-all duration-200 hover:bg-[#d8ab54] hover:shadow-[0_0_25px_rgba(199,154,69,0.4)] active:scale-[0.98] min-h-[48px]"
          >
            <span>{bn ? "আমাদের ইতিহাস ও গল্প" : "Explore Our Story"}</span>
            <ArrowDown className="w-4 h-4" />
          </a>

          <Link
            href="/prayer-times"
            className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl border border-white/25 bg-white/10 hover:bg-white/15 text-white font-medium text-sm sm:text-base backdrop-blur-sm transition-all duration-200 hover:border-[#c79a45]/60 active:scale-[0.98] min-h-[48px]"
          >
            <Clock className="w-4 h-4 text-[#e0be79]" />
            <span>{bn ? "নামাজের সময়সূচি" : "View Prayer Times"}</span>
          </Link>
        </div>

        {/* Subtle Bottom Scroll Hint */}
        <div className="mt-12 xs:mt-16 text-white/40 flex flex-col items-center gap-1.5 text-[11px] font-medium tracking-widest uppercase">
          <span>{bn ? "নিচে স্ক্রল করুন" : "SCROLL TO DISCOVER"}</span>
          <span className="w-4 h-7 rounded-full border border-white/30 flex items-start justify-center p-1">
            <span className="w-1 h-1.5 bg-[#c79a45] rounded-full animate-bounce" />
          </span>
        </div>
      </div>
    </section>
  );
}
