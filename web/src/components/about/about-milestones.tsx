"use client";

import { useLanguage } from "@/components/language-provider";
import { Milestone } from "lucide-react";
import { type PublicMilestone } from "@/services/publicHomeService";

interface AboutMilestonesProps {
  milestones?: PublicMilestone[];
  loading?: boolean;
}

export function AboutMilestones({ milestones = [], loading = false }: AboutMilestonesProps) {
  const { language } = useLanguage();
  const bn = language === "bn";

  if (!loading && milestones.length === 0) {
    return null;
  }

  // Fallback items if loading or empty in development
  const displayItems = milestones.length > 0
    ? milestones.map((m) => ({
        year: m.year,
        yearBn: m.year,
        titleEn: m.title,
        titleBn: m.title,
        descEn: m.description,
        descBn: m.description,
      }))
    : [
        {
          year: "1987",
          yearBn: "১৯৮৭",
          titleEn: "Foundation & Sacred Beginning",
          titleBn: "মসজিদের প্রতিষ্ঠা ও শুভ সূচনা",
          descEn: "Founded as a local neighborhood sanctuary by devoted community elders to establish regular daily prayers.",
          descBn: "এলাকার নিবেদিতপ্রাণ মুসল্লি ও প্রবীণদের আন্তরিক উদ্যোগে পাঁচ ওয়াক্ত জামাত কায়েমের লক্ষ্যে নূর মসজিদের শুভ ভিত্তিপ্রস্তর স্থাপিত হয়।",
        },
        {
          year: "2004",
          yearBn: "২০০৪",
          titleEn: "Islamic Maktab & Quran Academy",
          titleBn: "মক্তব ও কুরআন শিক্ষা কার্যক্রম",
          descEn: "Inaugurated dedicated morning and evening Quran memorization and Islamic foundational classes for neighborhood youth.",
          descBn: "শিশুকিশোরদের শুদ্ধ কুরআন তিলাওয়াত, তাজবিদ ও বুনিয়াদি দ্বীনি শিক্ষা দিতে নিয়মিত সকাল-সন্ধ্যার মক্তব ক্লাসের যাত্রা শুরু।",
        },
        {
          year: "2016",
          yearBn: "২০১৬",
          titleEn: "Sanctuary & Community Expansion",
          titleBn: "মসজিদ প্রাঙ্গণ ও আধুনিকায়ন",
          descEn: "Expanded the main prayer hall, added dedicated women's prayer facilities, and modernized ablution areas.",
          descBn: "মুসল্লিদের স্থান সংকুলান দূর করতে প্রধান হলরুম সম্প্রসারণ, আধুনিক ওজুখানা এবং মা-বোনদের জন্য সুপ্রশস্ত আলাদা নামাজের ব্যবস্থা সংযোজন।",
        },
        {
          year: "2024",
          yearBn: "২০২৪",
          titleEn: "Digital Prayer & Community Portal",
          titleBn: "ডিজিটাল সেবা ও স্বচ্ছতা পোর্টাল",
          descEn: "Introduced digital prayer timing displays, online event bookings, community welfare tracking, and financial transparency.",
          descBn: "লাইভ নামাজের সময়সূচি, অনলাইন দান অনুদান, জরুরি সাহায্য ফান্ড এবং সম্পূর্ণ স্বচ্ছ হিসাব ব্যবস্থাপনায় ডিজিটাল নূর পোর্টালের আত্মপ্রকাশ।",
        },
      ];

  return (
    <section className="relative py-16 xs:py-20 sm:py-24 bg-white text-[#17211d] border-y border-[#eae6db] overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 xs:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 text-[#0d4d3b] text-xs xs:text-sm font-bold tracking-[0.2em] uppercase">
            <Milestone className="w-4 h-4 text-[#c79a45]" />
            <span>{bn ? "ঐতিহাসিক মাইলফলক" : "OUR JOURNEY OVER THE YEARS"}</span>
          </div>
          <h2 className="mt-3 text-2xl xs:text-3xl sm:text-4xl font-serif font-bold text-[#0e2a22]">
            {bn ? "সেবা ও সমৃদ্ধির গৌরবময় ইতিহাস" : "A Heritage of Faith, Growth & Service"}
          </h2>
          <p className="mt-3 text-sm xs:text-base text-[#69726d] leading-relaxed">
            {bn
              ? "শুরু থেকে আজ পর্যন্ত প্রতিটি পদক্ষেপে আমাদের অগ্রাধিকার ছিল দ্বীন কায়েম, নৈতিক উন্নয়ন এবং সামাজিক ঐক্য।"
              : "Every chapter of our history reflects the steadfast dedication of our worshippers and supporters in serving the Creator and the community."}
          </p>
        </div>

        {/* Timeline Container */}
        <div className="mt-14 sm:mt-20 relative">
          {/* Vertical Connecting Line (Centered on Desktop, Left-aligned on Mobile) */}
          <div className="absolute top-4 bottom-4 left-4 sm:left-1/2 -ml-px w-0.5 bg-gradient-to-b from-[#c79a45] via-[#0d4d3b]/30 to-[#c79a45]/20" />

          {/* Timeline Milestones */}
          <div className="space-y-10 sm:space-y-14">
            {displayItems.map((item, index) => {
              const isEven = index % 2 === 0;

              return (
                <div
                  key={`${item.year}-${index}`}
                  className={`relative flex flex-col sm:flex-row items-start ${
                    isEven ? "sm:flex-row-reverse" : ""
                  } group`}
                >
                  {/* Content Column */}
                  <div className={`pl-12 sm:pl-0 sm:w-1/2 ${isEven ? "sm:pl-10 sm:text-left" : "sm:pr-10 sm:text-right"} w-full`}>
                    <div className="bg-[#fbf9f4] border border-[#e8e4d9] rounded-2xl p-5 sm:p-6 shadow-sm transition duration-300 hover:border-[#c79a45]/60 hover:shadow-md">
                      <div className={`flex items-center gap-2 ${isEven ? "" : "sm:justify-end"}`}>
                        <span className="font-serif text-2xl xs:text-3xl font-bold text-[#c79a45] tracking-tight">
                          {bn ? item.yearBn : item.year}
                        </span>
                        <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-[#0d4d3b]/10 text-[#0d4d3b]">
                          {bn ? "মাইলফলক" : "MILESTONE"}
                        </span>
                      </div>
                      <h3 className="mt-2 text-base xs:text-lg font-serif font-bold text-[#0e2a22]">
                        {bn ? item.titleBn : item.titleEn}
                      </h3>
                      <p className="mt-2 text-xs xs:text-sm text-[#5d6a64] leading-relaxed">
                        {bn ? item.descBn : item.descEn}
                      </p>
                    </div>
                  </div>

                  {/* Center Node / Dot */}
                  <div className="absolute left-4 sm:left-1/2 -translate-x-1/2 top-4 w-8 h-8 rounded-full bg-white border-2 border-[#c79a45] flex items-center justify-center shadow-md z-10 group-hover:scale-110 transition duration-300">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#0d4d3b]" />
                  </div>

                  {/* Empty Spacer Column for Desktop Alignment */}
                  <div className="hidden sm:block sm:w-1/2" />
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}
