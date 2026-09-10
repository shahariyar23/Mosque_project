"use client";

import Image from "next/image";
import { useLanguage } from "@/components/language-provider";
import { Sparkles, Compass, Sun } from "lucide-react";
import { type PublicGalleryItem } from "@/services/publicHomeService";

interface AboutArchitectureProps {
  gallery?: PublicGalleryItem[];
  loading?: boolean;
}

export function AboutArchitecture({ gallery = [], loading = false }: AboutArchitectureProps) {
  const { language } = useLanguage();
  const bn = language === "bn";

  const architecturalFeatures = [
    {
      icon: Compass,
      titleEn: "Precise Qiblah Orientation",
      titleBn: "নিখুঁত কিবলামুখী নকশা",
      descEn: "Designed precisely facing the Ka'bah with uninterrupted prayer lines (Saff) designed to accommodate worshippers comfortably.",
      descBn: "পবিত্র কাবার অভিমুখে সুনির্দিষ্টভাবে নির্মিত—যেখানে প্রতিটি কাতার সোজা ও আরামদায়কভাবে ইবাদত সম্পন্ন করার জন্য পরিকল্পিত।",
    },
    {
      icon: Sun,
      titleEn: "Natural Light & Acoustic Dome",
      titleBn: "প্রাকৃতিক আলো ও সুউচ্চ গম্বুজ",
      descEn: "High-vaulted ceilings and expansive archways amplify natural illumination and deliver clear natural acoustics for Quranic recitation.",
      descBn: "উঁচু খিলান ও কেন্দ্রীয় গম্বুজের চমৎকার প্রতিফলন—যা কুরআন তিলাওয়াত ও ইমামের খুতবাকে দূর-দূরান্তে স্পষ্ট ও হৃদয়স্পর্শী করে তোলে।",
    },
    {
      icon: Sparkles,
      titleEn: "Ornate Chandelier & Calligraphy",
      titleBn: "ঝাড়বাতি ও ক্যালিগ্রাফির শিল্পকর্ম",
      descEn: "Gilded chandeliers and hand-finished Islamic geometric patterns create an atmosphere of reverence, warmth, and contemplation.",
      descBn: "স্বর্ণাভ সুদৃশ্য ঝাড়বাতি এবং দেয়ালে অঙ্কিত ধ্রুপদী আরবি ক্যালিগ্রাফি মসজিদের ভেতরে সৃষ্টি করেছে এক অনন্য আত্মিক ভাবগাম্ভীর্য।",
    },
  ];

  // Find architecture image from backend gallery if available
  const archPhoto = gallery.find(
    (g) => g.category?.toLowerCase() === "architecture"
  );
  const heroImageSrc = archPhoto?.imageUrl || "/grand-golden-chandelier-in-ornate-mosque-interior.jpg";
  const heroImageAlt = archPhoto?.altText || (bn ? "নূর মসজিদের মূল প্রার্থনা হলের সোনালী ঝাড়বাতি ও খিলান" : "Grand golden chandelier in ornate mosque interior at Noor Community Mosque");

  return (
    <section className="relative py-20 sm:py-28 bg-[#041610] text-white overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#0d4d3b]/40 filter blur-[120px] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 xs:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#c79a45]/40 bg-[#072a20]/80 text-[#e0be79] text-xs font-semibold tracking-[0.2em] uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{bn ? "আমাদের মসজিদ ও স্থাপত্য" : "OUR SANCTUARY ARCHITECTURE"}</span>
          </div>
          <h2 className="mt-4 text-3xl xs:text-4xl sm:text-5xl font-serif font-bold text-[#f5f1e6] leading-tight">
            {bn ? "ঐতিহ্যবাহী সৌন্দর্য ও আধ্যাত্মিক প্রশান্তি" : "A Sanctuary Built for Reverence & Contemplation"}
          </h2>
          <p className="mt-4 text-sm xs:text-base text-white/70 leading-relaxed max-w-2xl mx-auto">
            {bn
              ? "নূর মসজিদের স্থাপত্যকলা ইসলামি সোনালি যুগের ঐতিহ্যবাহী কারুকাজ ও আধুনিক স্থায়িত্বের অপূর্ব সংমিশ্রণ।"
              : "Blending traditional Islamic architectural elegance with modern spaciousness, every corner of Noor Mosque is designed to turn hearts toward tranquility."}
          </p>
        </div>

        {/* Hero Architectural Image Showcase */}
        <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] rounded-3xl overflow-hidden border border-[#c79a45]/30 shadow-2xl bg-[#08261e]">
          <Image
            src={heroImageSrc}
            alt={heroImageAlt}
            fill
            sizes="(max-width: 1280px) 100vw, 1280px"
            className="object-cover object-center filter brightness-[0.9] hover:scale-105 transition-transform duration-700 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#041610] via-transparent to-black/20" />
          
          {/* Floating Architectural Badge */}
          <div className="absolute bottom-5 left-5 right-5 sm:left-8 sm:right-auto max-w-md p-4 sm:p-5 rounded-2xl bg-[#051a13]/85 backdrop-blur-md border border-[#c79a45]/40 text-white shadow-xl">
            <span className="text-[10px] font-bold text-[#e0be79] tracking-[0.2em] uppercase block">
              {bn ? "মূল প্রার্থনা হল" : "MAIN PRAYER SANCTUARY"}
            </span>
            <p className="mt-1 font-serif text-base sm:text-lg font-semibold text-white">
              {bn ? "সুউচ্চ গম্বুজ ও আলোকোজ্জ্বল ঝাড়বাতি" : "The Ornate Chandelier & Acoustic Grand Dome"}
            </p>
            <p className="mt-1 text-xs text-white/75 leading-relaxed">
              {bn
                ? "এখানে একসাথে সহস্রাধিক মুসল্লি পরম একাগ্রতায় নামাজ আদায় ও কুরআন তিলাওয়াত করতে পারেন।"
                : "Designed to inspire deep focus, humility, and collective peace during five daily congregational prayers and Friday Jumu'ah."}
            </p>
          </div>
        </div>

        {/* 3 Architectural Features Columns */}
        <div className="mt-12 sm:mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {architecturalFeatures.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className="p-6 rounded-2xl bg-[#082c21]/60 border border-white/10 hover:border-[#c79a45]/50 transition duration-300 backdrop-blur-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-[#c79a45]/20 text-[#e0be79] flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-serif text-lg font-bold text-white">
                  {bn ? f.titleBn : f.titleEn}
                </h3>
                <p className="mt-2 text-xs xs:text-sm text-white/70 leading-relaxed">
                  {bn ? f.descBn : f.descEn}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
