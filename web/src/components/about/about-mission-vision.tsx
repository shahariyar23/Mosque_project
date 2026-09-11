"use client";

import { useLanguage } from "@/components/language-provider";
import { Compass, Eye, Sparkles } from "lucide-react";
import { type PublicMosqueInfo } from "@/services/publicHomeService";

interface AboutMissionVisionProps {
  mosque?: PublicMosqueInfo | null;
  loading?: boolean;
}

export function AboutMissionVision({ mosque, loading = false }: AboutMissionVisionProps) {
  const { language } = useLanguage();
  const bn = language === "bn";

  const missionText = (!bn && mosque?.mission)
    ? mosque.mission
    : bn
      ? "আমাদের লক্ষ্য হলো প্রতিটি মানুষকে আল্লাহর আনুগত্যে উৎসাহিত করা, বিশুদ্ধ কুরআন-সুন্নাহর শিক্ষা সর্বস্তরে ছড়িয়ে দেওয়া এবং অভাবী ও পীড়িত মানুষের পাশে কার্যকর সমাজসেবা নিয়ে দাঁড়ানো।"
      : "We are devoted to nurturing spiritual growth across generations, cultivating moral integrity, providing relief to those facing adversity, and serving as a model of civic responsibility and harmony.";

  const visionText = (!bn && mosque?.vision)
    ? mosque.vision
    : bn
      ? "আমরা স্বপ্ন দেখি এমন একটি ভবিষ্যৎ সমাজের—যেখানে আমাদের নতুন প্রজন্ম নৈতিক শিক্ষায় বলীয়ান হবে, পরিবারসমূহ প্রশান্তি ও সম্প্রীতিতে গড়ে উঠবে এবং সমাজ সেবায় ইসলামের সৌন্দর্য প্রতিভাত হবে।"
      : "We envision a vibrant future where our youth embrace their Islamic identity with pride and conviction, families thrive in spiritual harmony, and the timeless beauty of Islam enlightens the wider world.";

  return (
    <section className="relative py-20 sm:py-28 bg-[#072a20] text-white overflow-hidden">
      {/* Decorative Islamic Background Texture */}
      <div
        className="absolute inset-0 opacity-10 bg-repeat pointer-events-none"
        style={{
          backgroundImage: "url('/textures/islamic-geometric.svg')",
          backgroundSize: "280px 280px",
        }}
        aria-hidden="true"
      />

      {/* Radiant Green Ambient Glow */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#0d4d3b]/60 filter blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#c79a45]/20 filter blur-3xl pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 xs:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-[#c79a45]/40 bg-[#041d16]/60 text-[#e0be79] text-xs font-semibold tracking-[0.2em] uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{bn ? "আমাদের লক্ষ্য ও দর্শন" : "OUR CALLING & PURPOSE"}</span>
          </div>
          <h2 className="mt-4 text-3xl xs:text-4xl sm:text-5xl font-serif font-bold text-[#f5f1e6] leading-tight">
            {bn ? "উদ্দেশ্যমূলক সেবা ও দূরদর্শী দৃষ্টিভঙ্গি" : "Guided by Revelation, Dedicated to Humanity"}
          </h2>
        </div>

        {/* Asymmetric Editorial Grid */}
        <div className="grid gap-12 lg:gap-16 lg:grid-cols-12 items-stretch">
          
          {/* Mission Column (6 cols on lg) */}
          <div className="lg:col-span-6 flex flex-col justify-between p-8 sm:p-10 rounded-3xl bg-[#0a3528]/80 border border-[#c79a45]/30 shadow-2xl backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 text-[#c79a45]/10 group-hover:text-[#c79a45]/20 transition duration-500 pointer-events-none">
              <Compass className="w-32 h-32" />
            </div>

            <div>
              <div className="flex items-center gap-2.5 text-[#e0be79] text-xs sm:text-sm font-bold tracking-[0.18em] uppercase">
                <span className="w-2 h-2 rounded-full bg-[#e0be79]" />
                <span>{bn ? "আমাদের মিশন" : "OUR MISSION"}</span>
              </div>

              <h3 className="mt-4 text-2xl sm:text-3xl font-serif font-bold text-white leading-snug">
                {bn
                  ? "একটি পবিত্র, নিরাপদ ও অন্তর্ভুক্তিমূলক ইবাদত ও দ্বীনি শিক্ষার পরিবেশ সৃষ্টি করা।"
                  : "To foster an inspiring, tranquil, and compassionate sanctuary for authentic Islamic worship and lifelong learning."}
              </h3>

              <p className="mt-4 text-sm sm:text-base text-white/80 leading-relaxed font-light">
                {missionText}
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-3 text-xs text-[#e0be79] font-medium tracking-wide">
              <span>✦</span>
              <span>{bn ? "ইবাদত · শিক্ষা · মানবকল্যাণ" : "Worship · Guidance · Compassion"}</span>
            </div>
          </div>

          {/* Vision Column (6 cols on lg) */}
          <div className="lg:col-span-6 flex flex-col justify-between p-8 sm:p-10 rounded-3xl bg-[#082d22]/90 border border-white/15 shadow-2xl backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 text-white/5 group-hover:text-white/10 transition duration-500 pointer-events-none">
              <Eye className="w-32 h-32" />
            </div>

            <div>
              <div className="flex items-center gap-2.5 text-[#e0be79] text-xs sm:text-sm font-bold tracking-[0.18em] uppercase">
                <span className="w-2 h-2 rounded-full bg-[#c79a45]" />
                <span>{bn ? "আমাদের ভিশন" : "OUR VISION"}</span>
              </div>

              <h3 className="mt-4 text-2xl sm:text-3xl font-serif font-bold text-white leading-snug">
                {bn
                  ? "এমন এক আলোকিত সমাজ গঠন যেখানে ঈমান, প্রজ্ঞা ও সহমর্মিতা একত্রিত হয়।"
                  : "To be an enlightened community where deep faith, scholarly wisdom, and practical mercy flourish together."}
              </h3>

              <p className="mt-4 text-sm sm:text-base text-white/80 leading-relaxed font-light">
                {visionText}
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-3 text-xs text-[#e0be79] font-medium tracking-wide">
              <span>✦</span>
              <span>{bn ? "ভ্রাতৃত্ব · আদর্শ · আত্মশুদ্ধি" : "Excellence · Integrity · Faith"}</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
