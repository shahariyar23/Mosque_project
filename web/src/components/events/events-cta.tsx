"use client";

import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import { Sparkles, Calendar, Heart, Mail } from "lucide-react";

export function EventsCta() {
  const { language } = useLanguage();
  const bn = language === "bn";

  return (
    <section className="relative py-16 sm:py-24 bg-[#051c15] text-white overflow-hidden rounded-3xl border border-[#c79a45]/30 mx-4 xs:mx-6 lg:mx-8 my-12 sm:my-16">
      {/* Decorative Texture */}
      <div
        className="absolute inset-0 opacity-10 bg-repeat pointer-events-none"
        style={{
          backgroundImage: "url('/textures/islamic-geometric.svg')",
          backgroundSize: "240px 240px",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center flex flex-col items-center">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#c79a45]/40 bg-[#072a20]/80 text-[#e0be79] text-xs font-semibold tracking-[0.2em] uppercase">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{bn ? "কমিউনিটি অংশীদারিত্ব" : "COMMUNITY FELLOWSHIP"}</span>
        </div>

        {/* Heading */}
        <h2 className="mt-4 text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[#f5f1e6] leading-tight">
          {bn ? (
            <>
              আমাদের পরবর্তী আয়োজনে <br />
              <span className="text-[#e0be79] italic font-normal">আপনিও অংশ নিন</span>
            </>
          ) : (
            <>
              Propose, Volunteer or <br />
              <span className="text-[#e0be79] italic font-normal">Host a Sacred Gathering</span>
            </>
          )}
        </h2>

        {/* Description */}
        <p className="mt-3 text-xs xs:text-sm sm:text-base text-white/80 max-w-xl leading-relaxed">
          {bn
            ? "আপনি কি কোনো দ্বীনি সেমিনার আয়োজন করতে চান, কিংবা তরুণ ও শিশুদের জন্য নতুন কোনো গঠনমূলক উদ্যোগের প্রস্তাব দিতে চান? আমাদের দরবার সর্বদা উন্মুক্ত।"
            : "Have an idea for a community workshop, educational circle, or youth mentorship session? Our mosque administration welcomes collaborative initiatives."}
        </p>

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto">
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#c79a45] text-[#051c15] font-semibold text-sm hover:bg-[#d8ab54] transition shadow-md active:scale-95 min-h-[48px]"
          >
            <Mail className="w-4 h-4" />
            <span>{bn ? "প্রশাসনকে লিখুন" : "Contact Mosque Office"}</span>
          </Link>

          <Link
            href="/donations"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-white/25 bg-white/10 hover:bg-white/15 text-white font-medium text-sm transition active:scale-95 min-h-[48px]"
          >
            <Heart className="w-4 h-4 text-[#e0be79]" />
            <span>{bn ? "অনুদান দিয়ে সহায়তা করুন" : "Sponsor an Event"}</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

