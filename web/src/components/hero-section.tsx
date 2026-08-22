"use client";

import { useLanguage } from "@/components/language-provider";

export function HeroSection() {
  const { language } = useLanguage();
  const bangla = language === "bn";
  const copy = bangla
    ? {
        eyebrow: "আমাদের মসজিদে স্বাগতম",
        faith: "ঈমান।",
        knowledge: "জ্ঞান।",
        community: "সম্প্রদায়।",
        description: "ইবাদত, শিক্ষা ও সম্প্রদায়ের মিলনস্থল।",
        prayer: "নামাজের সময় দেখুন",
        donate: "এখনই দান করুন",
        date: "১৮ আগস্ট ২০২৬",
        day: "মঙ্গলবার",
        hijri: "০৪ সফর ১৪৪৮",
        location: "ঢাকা, বাংলাদেশ",
        local: "স্থানীয় নামাজের সময়",
      }
    : {
        eyebrow: "WELCOME TO OUR MOSQUE",
        faith: "Faith.",
        knowledge: "Knowledge.",
        community: "Community.",
        description:
          "A place where worship, learning and community come together.",
        prayer: "View Prayer Times",
        donate: "Donate Now",
        date: "18 AUGUST 2026",
        day: "Tuesday",
        hijri: "04 SAFAR 1448",
        location: "DHAKA, BANGLADESH",
        local: "Local prayer times",
      };
  return (
    <section
      id="home"
      className="relative min-h-[730px] overflow-hidden bg-[#073a2d] text-white"
    >
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,33,25,.94),rgba(3,33,25,.55)),url('https://images.unsplash.com/photo-1564769625392-651b5f5f0b53?auto=format&fit=crop&w=1800&q=85')] bg-cover bg-center" />
      <div className="relative mx-auto flex min-h-[730px] max-w-7xl flex-col justify-center px-5 pb-20 pt-32 lg:px-8">
        <p className="mb-6 text-xs font-bold tracking-[.26em] text-[#e0be79]">
          {copy.eyebrow}
        </p>
        <h1 className="max-w-3xl text-5xl font-semibold leading-[1.06] sm:text-6xl lg:text-8xl">
          {copy.faith}
          <br />
          {copy.knowledge}
          <br />
          {copy.community}
        </h1>
        <p className="mt-7 max-w-xl text-base leading-7 text-white/75 sm:text-lg">
          {copy.description}
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <a
            href="#prayer-times"
            className="bg-[#c79a45] px-6 py-3.5 font-semibold text-[#153128]"
          >
            {copy.prayer}
          </a>
          <a
            href="#donations"
            className="border border-white/50 px-6 py-3.5 font-semibold"
          >
            {copy.donate}
          </a>
        </div>
        <div className="mt-16 flex max-w-xl flex-wrap gap-x-8 gap-y-4 border-t border-white/30 pt-5 text-sm">
          <span>
            <b className="block text-[#e0be79]">{copy.date}</b>
            {copy.day}
          </span>
          <span>
            <b className="block text-[#e0be79]">{copy.hijri}</b>
            <span className="arabic">صفر ١٤٤٨</span>
          </span>
          <span>
            <b className="block text-[#e0be79]">{copy.location}</b>
            {copy.local}
          </span>
        </div>
      </div>
    </section>
  );
}
