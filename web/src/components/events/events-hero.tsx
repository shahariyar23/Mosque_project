"use client";

import { useLanguage } from "@/components/language-provider";
import { siteConfig } from "@/config/site";
import { Calendar, Sparkles } from "lucide-react";

export function EventsHero() {
  const { language } = useLanguage();
  const bn = language === "bn";

  return (
    <section className="relative overflow-hidden bg-[#072a20] text-white pt-32 sm:pt-36 pb-12 sm:pb-16 px-4 xs:px-6 lg:px-8 border-b border-[#c79a45]/20">
      {/* Subtle Ambient Background Texture */}
      <div
        className="absolute inset-0 opacity-10 bg-repeat pointer-events-none"
        style={{
          backgroundImage: "url('/textures/islamic-geometric.svg')",
          backgroundSize: "260px 260px",
        }}
        aria-hidden="true"
      />

      {/* Decorative Glow Elements */}
      <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-[#0d4d3b] filter blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute top-1/2 -right-24 w-72 h-72 rounded-full bg-[#c79a45]/20 filter blur-3xl opacity-40 pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="max-w-3xl">
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#c79a45]/40 bg-[#041d16]/70 text-[#e0be79] text-xs font-semibold tracking-[0.18em] uppercase shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {bn
                ? `${siteConfig.fullNameBn} · ${siteConfig.cityBn}`
                : `${siteConfig.fullName} · ${siteConfig.city}`}
            </span>
          </div>

          {/* Headline */}
          <h1 className="mt-4 text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-[#f5f1e6] leading-tight tracking-tight">
            {bn ? (
              <>
                আসন্ন অনুষ্ঠান ও <br />
                <span className="text-[#e0be79] italic font-normal">দ্বীনি সমাবেশ</span>
              </>
            ) : (
              <>
                Events & Sacred <br />
                <span className="text-[#e0be79] italic font-normal">Community Gatherings</span>
              </>
            )}
          </h1>

          {/* Compact Subheading - Doesn't push events down */}
          <p className="mt-3 sm:mt-4 text-sm xs:text-base text-white/80 leading-relaxed font-light max-w-2xl">
            {bn
              ? "নামাজ, কুরআন তাফসির, তরুণদের সমাবেশ ও মানবসেবামূলক কার্যক্রমে আমাদের সঙ্গে যোগ দিন। সবার জন্য উন্মুক্ত।"
              : "Discover upcoming halaqahs, Quran circles, youth forums, and community initiatives designed for worship and fellowship."}
          </p>
        </div>
      </div>
    </section>
  );
}

