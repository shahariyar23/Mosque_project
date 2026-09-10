"use client";

import Image from "next/image";
import { useLanguage } from "@/components/language-provider";
import { type PublicLeadership } from "@/services/publicHomeService";
import { ShieldCheck, User } from "lucide-react";

interface AboutLeadershipProps {
  leadership?: PublicLeadership[];
  loading?: boolean;
}

export function AboutLeadership({ leadership = [], loading = false }: AboutLeadershipProps) {
  const { language } = useLanguage();
  const bn = language === "bn";

  if (!loading && leadership.length === 0) {
    return null;
  }

  return (
    <section className="py-20 sm:py-28 bg-[#faf8f5] text-[#17211d] border-b border-[#eae6db] overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 xs:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-18">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#c79a45]/40 bg-white/80 text-[#0d4d3b] text-xs font-semibold tracking-[0.2em] uppercase shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-[#c79a45]" />
            <span>{bn ? "ইমাম ও পরিচালনা পর্ষদ" : "OUR LEADERSHIP & SCHOLARS"}</span>
          </div>
          <h2 className="mt-4 text-3xl xs:text-4xl sm:text-5xl font-serif font-bold text-[#0e2a22] leading-tight">
            {bn ? "যোগ্য অভিভাবকত্ব ও আমানতদারি" : "Guiding Faith, Serving the Community"}
          </h2>
          <p className="mt-4 text-sm xs:text-base text-[#69726d] leading-relaxed">
            {bn
              ? "দ্বীনি দিকনির্দেশনা, স্বচ্ছ ব্যবস্থাপনা ও প্রাতিষ্ঠানিক কল্যাণে নিবেদিত আমাদের পরিচালনা দল।"
              : "Meet the dedicated scholars and committee members serving our congregation with sincere devotion and integrity."}
          </p>
        </div>

        {/* Leadership Cards Grid */}
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="p-6 rounded-3xl bg-white border border-[#eae6db] shadow-sm animate-pulse flex flex-col items-center text-center"
              >
                <div className="w-24 h-24 rounded-full bg-slate-200 mb-4" />
                <div className="h-5 w-32 bg-slate-200 rounded mb-2" />
                <div className="h-4 w-24 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {leadership.map((leader) => {
              const primaryPosition = leader.positions?.[0] || leader.role;

              return (
                <div
                  key={leader.id}
                  className="group p-6 rounded-3xl bg-white border border-[#e8e4d9] shadow-sm hover:border-[#c79a45] hover:shadow-lg transition-all duration-300 flex flex-col items-center text-center"
                >
                  {/* Avatar Container */}
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden mb-4 border-2 border-[#c79a45]/40 bg-[#0d4d3b]/10 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                    {leader.avatarUrl ? (
                      <Image
                        src={leader.avatarUrl}
                        alt={leader.fullName}
                        fill
                        sizes="112px"
                        className="object-cover object-center"
                      />
                    ) : (
                      <User className="w-12 h-12 text-[#0d4d3b]/60" />
                    )}
                  </div>

                  {/* Name */}
                  <h3 className="font-serif text-lg font-bold text-[#0e2a22] group-hover:text-[#0d4d3b] transition-colors">
                    {leader.fullName}
                  </h3>

                  {/* Position Badge */}
                  <span className="mt-1.5 inline-block text-xs font-semibold text-[#c79a45] tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-[#fbf9f4] border border-[#e8e4d9]">
                    {primaryPosition}
                  </span>

                  {/* Additional positions if multiple */}
                  {leader.positions && leader.positions.length > 1 && (
                    <div className="mt-2 text-[11px] text-[#69726d]">
                      {leader.positions.slice(1).join(" • ")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>
    </section>
  );
}

