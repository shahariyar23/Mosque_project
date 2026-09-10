"use client";

import { useLanguage } from "@/components/language-provider";
import { Moon, BookOpen, HeartHandshake, Heart, Users, Compass, Sparkles, ShieldCheck } from "lucide-react";
import { type PublicValue } from "@/services/publicHomeService";

interface AboutValuesProps {
  values?: PublicValue[];
  loading?: boolean;
}

const ICON_MAP: Record<string, any> = {
  Moon,
  BookOpen,
  HeartHandshake,
  Heart,
  Users,
  Compass,
  Sparkles,
  ShieldCheck,
};

export function AboutValues({ values = [], loading = false }: AboutValuesProps) {
  const { language } = useLanguage();
  const bn = language === "bn";

  if (!loading && values.length === 0) {
    return null;
  }

  const defaultValues = [
    {
      num: "01",
      iconName: "Moon",
      titleEn: "Faith & Devotion",
      titleBn: "ঈমান ও ইবাদত",
      subtitleEn: "Tawheed, prayer & spiritual purification",
      subtitleBn: "তাওহিদ, নিয়মিত নামাজ ও আত্মশুদ্ধি",
      descEn: "We anchor everything in sincere worship of the One Creator, upholding the five daily prayers, congregational Jumu'ah, and the remembrance of Allah that brings true tranquility to the heart.",
      descBn: "আমাদের সকল কাজের কেন্দ্রবিন্দু হলো একমাত্র আল্লাহর সন্তুষ্টি অর্জন। দৈনিক পাঁচ ওয়াক্ত নামাজ কায়েম, জুমার জামাত এবং যিকির-আজকারের মাধ্যমে অন্তরের স্থায়ী প্রশান্তি লাভ করা।",
    },
    {
      num: "02",
      iconName: "BookOpen",
      titleEn: "Knowledge & Wisdom",
      titleBn: "ইলম ও প্রজ্ঞা",
      subtitleEn: "Quran, Sunnah & lifelong learning",
      subtitleBn: "কুরআন, সুন্নাহ ও ধারাবাহিক জ্ঞানচর্চা",
      descEn: "Knowledge is the vital light that guides righteous action. We provide accessible Islamic education for all generations—from foundational Quranic reading and Tajweed to adult fiqh and family ethics.",
      descBn: "জ্ঞান হলো সেই পবিত্র আলো যা সঠিক পথের দিশা দেয়। শিশুকাল থেকে প্রবীণ বয়স পর্যন্ত শুদ্ধ কুরআন তেলাওয়াত, হাদিসের আদর্শ ও পারিবারিক মূল্যবোধের ধারাবাহিক শিক্ষা নিশ্চিত করা।",
    },
    {
      num: "03",
      iconName: "HeartHandshake",
      titleEn: "Service & Compassion",
      titleBn: "খিদমত ও মানবসেবা",
      subtitleEn: "Charity, welfare & community solidarity",
      subtitleBn: "দান, মানবিক সাহায্য ও পারস্পরিক ভ্রাতৃত্ব",
      descEn: "Faith proves itself through mercy to mankind. We champion continuous food support, transparent zakat distribution, bereavement assistance, and standing side-by-side with vulnerable neighbors.",
      descBn: "প্রকৃত ঈমানের প্রকাশ ঘটে সৃষ্টির সেবায়। অভাবগ্রস্তদের খাদ্য সহায়তা, স্বচ্ছ জাকাত বণ্টন, জানাজা ও বিপদের মুহূর্তে সকলের পাশে দাঁড়িয়ে সামাজিক ভ্রাতৃত্বের উজ্জ্বল দৃষ্টান্ত গড়ে তোলা।",
    },
  ];

  const displayItems = values.length > 0
    ? values.map((v) => ({
        num: v.num,
        iconName: v.icon || "Moon",
        titleEn: v.title,
        titleBn: v.title,
        subtitleEn: v.subtitle || "Core Value",
        subtitleBn: v.subtitle || "মূল স্তম্ভ",
        descEn: v.description,
        descBn: v.description,
      }))
    : defaultValues;

  return (
    <section className="py-20 sm:py-28 bg-[#faf8f5] text-[#17211d] border-b border-[#eae6db] overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 xs:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-12 sm:pb-16 border-b border-[#e2decb]">
          <div>
            <div className="inline-flex items-center gap-2 text-[#0d4d3b] text-xs xs:text-sm font-bold tracking-[0.2em] uppercase">
              <span className="text-[#c79a45]">✦</span>
              <span>{bn ? "আমাদের মূল বিশ্বাস ও স্তম্ভ" : "PILLARS OF OUR FAITH"}</span>
            </div>
            <h2 className="mt-3 text-3xl xs:text-4xl sm:text-5xl font-serif font-bold text-[#0e2a22]">
              {bn ? "যে নীতিতে আমরা অবিচল" : "What We Believe & Live By"}
            </h2>
          </div>
          <p className="max-w-md text-xs xs:text-sm sm:text-base text-[#69726d] leading-relaxed">
            {bn
              ? "এই অপরিবর্তনীয় মূলনীতির ওপর প্রতিষ্ঠিত আমাদের প্রতিটি উদ্যোগ, প্রাতিষ্ঠানিক সেবা এবং প্রাত্যহিক পথচলা।"
              : "These enduring pillars shape every prayer, program, class, and charitable initiative we steward in the service of Allah."}
          </p>
        </div>

        {/* 3-Column Editorial Layout */}
        <div className="mt-12 sm:mt-16 grid gap-10 md:grid-cols-3">
          {displayItems.map((item) => {
            const Icon = ICON_MAP[item.iconName] || Moon;

            return (
              <div
                key={item.num}
                className="group relative flex flex-col justify-between pt-8 pb-10 px-6 sm:px-8 rounded-3xl bg-white border border-[#e8e4d9] transition-all duration-300 hover:border-[#c79a45] hover:shadow-xl hover:-translate-y-1"
              >
                {/* Decorative Top Accent Bar */}
                <div className="absolute top-0 left-8 right-8 h-1 bg-[#0d4d3b]/10 group-hover:bg-[#c79a45] transition-colors rounded-t-full" />

                <div>
                  {/* Big Editorial Number & Icon Header */}
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-4xl sm:text-5xl font-bold text-[#c79a45]/40 group-hover:text-[#c79a45] transition-colors">
                      {item.num}
                    </span>
                    <div className="w-12 h-12 rounded-2xl bg-[#0d4d3b]/5 group-hover:bg-[#0d4d3b] text-[#0d4d3b] group-hover:text-white transition-all duration-300 flex items-center justify-center">
                      <Icon className="w-6 h-6" strokeWidth={1.75} />
                    </div>
                  </div>

                  {/* Title & Subtitle */}
                  <h3 className="mt-6 text-xl sm:text-2xl font-serif font-bold text-[#0e2a22] group-hover:text-[#0d4d3b] transition-colors">
                    {bn ? item.titleBn : item.titleEn}
                  </h3>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[#c79a45]">
                    {bn ? item.subtitleBn : item.subtitleEn}
                  </p>

                  {/* Description */}
                  <p className="mt-4 text-xs xs:text-sm text-[#5d6a64] leading-relaxed">
                    {bn ? item.descBn : item.descEn}
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t border-[#f0ede4] flex items-center gap-2 text-xs font-semibold text-[#0d4d3b] group-hover:text-[#c79a45] transition-colors">
                  <span>✦</span>
                  <span className="uppercase tracking-widest">{bn ? "অনড় অঙ্গীকার" : "SACRED VALUE"}</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
