"use client";

import { useLanguage } from "@/components/language-provider";
import { usePublicHomeData } from "@/hooks/use-public-home-data";
import { ShieldCheck } from "lucide-react";
import { type PublicCommunityStats, type PublicMosqueInfo } from "@/services/publicHomeService";

interface AboutImpactProps {
  stats?: PublicCommunityStats | null;
  mosque?: PublicMosqueInfo | null;
  loading?: boolean;
}

export function AboutImpact({ stats: propStats, mosque: propMosque, loading: propLoading }: AboutImpactProps) {
  const { language } = useLanguage();
  const bn = language === "bn";
  const { data: homeData, loading: homeLoading } = usePublicHomeData();

  const mosque = propMosque !== undefined ? propMosque : homeData.mosque;
  const stats = propStats !== undefined ? propStats : homeData.stats;

  // Calculate actual years serving based on verified establishedYear (1987)
  const currentYear = new Date().getFullYear();
  const establishedYear = mosque?.establishedYear ?? 1987;
  const yearsServing = Math.max(1, currentYear - establishedYear);

  const activeServices = stats?.activeServices ?? 0;
  const members = stats?.members ?? 0;
  const activeVolunteers = stats?.activeVolunteers ?? 0;

  return (
    <section className="py-20 sm:py-28 bg-[#07261d] text-white overflow-hidden relative">
      {/* Decorative Texture */}
      <div
        className="absolute inset-0 opacity-5 bg-repeat pointer-events-none"
        style={{
          backgroundImage: "url('/textures/islamic-geometric.svg')",
          backgroundSize: "240px 240px",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 xs:px-6 lg:px-8">
        
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-14 sm:mb-18">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#c79a45]/40 bg-[#041d16]/60 text-[#e0be79] text-xs font-semibold tracking-[0.2em] uppercase">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{bn ? "আমাদের প্রভাব ও অবদান" : "COMMUNITY IMPACT"}</span>
          </div>
          <h2 className="mt-4 text-3xl xs:text-4xl sm:text-5xl font-serif font-bold text-[#f5f1e6] leading-tight">
            {bn ? "বিশ্বস্ত সেবায় নিবেদিত এক গৌরবময় ধারা" : "Decades of Devotion, Trust & Service"}
          </h2>
          <p className="mt-4 text-sm xs:text-base text-white/70 leading-relaxed max-w-2xl mx-auto">
            {bn
              ? "মহান আল্লাহর রহমতে শত শত পরিবারের ভালোবাসা ও সমর্থনে নূর মসজিদ দ্বীন ও সমাজের সেবায় প্রতিনিয়ত কাজ করে যাচ্ছে।"
              : "By the grace of Allah and the enduring support of our congregation, Noor Mosque remains a cornerstone for spiritual growth and charitable relief."}
          </p>
        </div>

        {/* Impact Cards Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* 1. Years Serving */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#0b382b]/80 border border-[#c79a45]/30 flex flex-col justify-between shadow-xl backdrop-blur-sm">
            <div>
              <span className="text-4xl sm:text-5xl font-serif font-bold text-[#e0be79]">
                {bn ? `${yearsServing}+` : `${yearsServing}+`}
              </span>
              <h3 className="mt-2 text-base font-serif font-bold text-white">
                {bn ? "বছরের আন্তরিক সেবা" : "Years of Community Service"}
              </h3>
              <p className="mt-2 text-xs text-white/70 leading-relaxed">
                {bn
                  ? `১৯৮৭ সাল থেকে অত্র এলাকার মুসলমানদের নামাজের নির্ভরযোগ্য ঠিকানা।`
                  : `Faithfully serving worshippers in Dhaka since founding in ${establishedYear}.`}
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 text-[11px] font-medium text-[#e0be79] uppercase tracking-wider">
              {bn ? `প্রতিষ্ঠিত ${establishedYear}` : `ESTABLISHED ${establishedYear}`}
            </div>
          </div>

          {/* 2. Daily Congregations */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#083125]/80 border border-white/15 flex flex-col justify-between shadow-xl backdrop-blur-sm">
            <div>
              <span className="text-4xl sm:text-5xl font-serif font-bold text-white">
                5 / 7
              </span>
              <h3 className="mt-2 text-base font-serif font-bold text-white">
                {bn ? "দৈনিক পাঁচ ওয়াক্ত জামাত" : "Daily Congregations"}
              </h3>
              <p className="mt-2 text-xs text-white/70 leading-relaxed">
                {bn
                  ? "প্রতিদিন ফজরের শুরু থেকে এশার শেষ পর্যন্ত নিয়মিত জামাত ও জিকির।"
                  : "Unbroken daily congregational prayers and sacred gatherings 365 days a year."}
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 text-[11px] font-medium text-[#e0be79] uppercase tracking-wider">
              {bn ? "পাঁচ ওয়াক্ত সালাত" : "5 DAILY PRAYERS"}
            </div>
          </div>

          {/* 3. Community Programs / Active Services */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#0b382b]/80 border border-[#c79a45]/30 flex flex-col justify-between shadow-xl backdrop-blur-sm">
            <div>
              <span className="text-4xl sm:text-5xl font-serif font-bold text-[#e0be79]">
                {activeServices > 0 ? `${activeServices}+` : "25+"}
              </span>
              <h3 className="mt-2 text-base font-serif font-bold text-white">
                {bn ? "দ্বীনি ও সামাজিক সেবা" : "Active Programs & Services"}
              </h3>
              <p className="mt-2 text-xs text-white/70 leading-relaxed">
                {bn
                  ? "কুরআন শিক্ষা, খাদ্য বিতরণ, জানাজা সহায়তা ও সার্বিক সমাজকল্যাণ।"
                  : "From Quran academy and youth maktab to food drives, Nikah and bereavement support."}
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 text-[11px] font-medium text-[#e0be79] uppercase tracking-wider">
              {bn ? "সক্রিয় সেবা কার্যক্রম" : "COMMUNITY SERVICES"}
            </div>
          </div>

          {/* 4. Inclusive Fellowship / Volunteers */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#083125]/80 border border-white/15 flex flex-col justify-between shadow-xl backdrop-blur-sm">
            <div>
              <span className="text-4xl sm:text-5xl font-serif font-bold text-white">
                {activeVolunteers > 0 ? `${activeVolunteers}+` : (members > 0 ? `${members}+` : "1,000+")}
              </span>
              <h3 className="mt-2 text-base font-serif font-bold text-white">
                {bn ? (activeVolunteers > 0 ? "নিবেদিতপ্রাণ সেবক" : "মুসলিম পরিবারের মিলনমেলা") : (activeVolunteers > 0 ? "Dedicated Volunteers" : "Families & Worshippers")}
              </h3>
              <p className="mt-2 text-xs text-white/70 leading-relaxed">
                {bn
                  ? "প্রতিটি জুমুআ ও সামাজিক উদ্যোগে আন্তরিক সহযোগিতায় নিবেদিত।"
                  : "Active community volunteers and worshippers united in service and faith."}
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 text-[11px] font-medium text-[#e0be79] uppercase tracking-wider">
              {bn ? "ঐক্য ও ভ্রাতৃত্ব" : "COMMUNITY FELLOWSHIP"}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
