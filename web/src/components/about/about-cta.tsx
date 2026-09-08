"use client";

import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import { Clock, Calendar, Heart, Mail, Sparkles } from "lucide-react";

export function AboutCta() {
  const { language } = useLanguage();
  const bn = language === "bn";

  return (
    <section className="relative py-20 sm:py-28 bg-[#041a13] text-white overflow-hidden">
      {/* Background Decorative Pattern */}
      <div
        className="absolute inset-0 opacity-10 bg-repeat pointer-events-none"
        style={{
          backgroundImage: "url('/textures/islamic-geometric.svg')",
          backgroundSize: "280px 280px",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-5xl px-4 xs:px-6 lg:px-8 text-center flex flex-col items-center">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#c79a45]/40 bg-[#072a20]/80 text-[#e0be79] text-xs font-semibold tracking-[0.2em] uppercase">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{bn ? "আমাদের সঙ্গে যুক্ত থাকুন" : "BE PART OF NOOR"}</span>
        </div>

        {/* Heading */}
        <h2 className="mt-5 text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-[#f5f1e6] leading-tight max-w-3xl">
          {bn ? (
            <>
              আসুন, আল্লাহর ঘরে <br />
              <span className="text-[#e0be79] italic font-normal">একত্রে সমবেত হই</span>
            </>
          ) : (
            <>
              Join Our Growing <br />
              <span className="text-[#e0be79] italic font-normal">Sanctuary of Faith</span>
            </>
          )}
        </h2>

        {/* Supporting description */}
        <p className="mt-4 text-sm xs:text-base sm:text-lg text-white/80 max-w-2xl leading-relaxed">
          {bn
            ? "নামাজে শরিক হওয়া, দ্বীনি জ্ঞান অর্জন, মানবসেবায় অংশ নেওয়া কিংবা কেবলই আত্মিক শান্তির খোঁজে—নূর মসজিদে আপনার পদচারণা সাদরে প্রত্যাশিত।"
            : "Whether you come for daily prayer, seek sacred knowledge, wish to support charitable causes, or simply want a quiet place of solace—there is always a place for you at Noor."}
        </p>

        {/* 4 Action Buttons with confirmed routes */}
        <div className="mt-10 grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 gap-3.5 w-full max-w-4xl">
          <Link
            href="/prayer-times"
            className="p-4 rounded-2xl bg-[#c79a45] text-[#0b241c] font-semibold text-xs sm:text-sm flex flex-col items-center justify-center gap-2 hover:bg-[#d8ab54] transition shadow-lg active:scale-95 min-h-[52px]"
          >
            <Clock className="w-5 h-5" />
            <span>{bn ? "নামাজের সময়" : "Prayer Times"}</span>
          </Link>

          <Link
            href="/events"
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-xs sm:text-sm flex flex-col items-center justify-center gap-2 transition active:scale-95 min-h-[52px]"
          >
            <Calendar className="w-5 h-5 text-[#e0be79]" />
            <span>{bn ? "আসন্ন অনুষ্ঠান" : "Upcoming Events"}</span>
          </Link>

          <Link
            href="/donations"
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-xs sm:text-sm flex flex-col items-center justify-center gap-2 transition active:scale-95 min-h-[52px]"
          >
            <Heart className="w-5 h-5 text-[#e0be79]" />
            <span>{bn ? "দান ও সাদাকাহ" : "Support & Donate"}</span>
          </Link>

          <a
            href="#contact"
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-xs sm:text-sm flex flex-col items-center justify-center gap-2 transition active:scale-95 min-h-[52px]"
          >
            <Mail className="w-5 h-5 text-[#e0be79]" />
            <span>{bn ? "যোগাযোগ করুন" : "Get In Touch"}</span>
          </a>
        </div>
      </div>
    </section>
  );
}

