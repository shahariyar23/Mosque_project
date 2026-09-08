"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import { Heart, HandHeart, Users2, ShieldAlert } from "lucide-react";

export function AboutServices() {
  const { language } = useLanguage();
  const bn = language === "bn";

  const services = [
    {
      icon: HandHeart,
      titleEn: "Food Rations & Welfare Aid",
      titleBn: "খাদ্য সহায়তা ও ত্রাণ বিতরণ",
      descEn: "Regular emergency food packets, dry provisions, and monthly essentials distributed discretely to vulnerable neighborhood families.",
      descBn: "অভাবী ও কর্মহীন পরিবারগুলোর সম্মান বজায় রেখে নিয়মিত খাদ্যসামগ্রী ও প্রয়োজনীয় নিত্যপণ্য সরবরাহ।",
    },
    {
      icon: Heart,
      titleEn: "Transparent Zakat & Sadaqah Fund",
      titleBn: "স্বচ্ছ জাকাত ও সদকা ফান্ড",
      descEn: "100% policy-compliant Shariah fund directing your contributions straight into local medical emergencies, debt relief, and orphan support.",
      descBn: "শতভাগ শরিয়াহসম্মত ও স্বচ্ছ বণ্টন নীতিতে আপনার জাকাত সরাসরি দুস্থদের চিকিৎসা, ঋণমুক্তি ও এতিমদের কল্যাণে ব্যয়।",
    },
    {
      icon: Users2,
      titleEn: "Nikah Facilitation & Counseling",
      titleBn: "পারিবারিক কাউন্সেলিং ও নিকাহ",
      descEn: "Assisting couples with Islamic marriage solemnization, official certificate documentation, and pre-marital guidance.",
      descBn: "সুন্নতি তরিকায় বিবাহ সম্পাদন, নিকাহ সনদপত্র প্রদান এবং সুখী পারিবারিক জীবনের ইসলামি দিকনির্দেশনা।",
    },
    {
      icon: ShieldAlert,
      titleEn: "Janazah & Bereavement Support",
      titleBn: "জানাযা ও কাফন-দাফন সেবা",
      descEn: "Compassionate, round-the-clock guidance during loss—including ghusl assistance, shroud preparation, and janazah prayer organization.",
      descBn: "পরিবারে শোকের মুহূর্তে সার্বক্ষণিক পাশে থেকে গোসল, কাফন এবং যথাযোগ্য মর্যাদায় জানাজার নামাজ পরিচালনা।",
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-[#f5f2eb] text-[#17211d] border-b border-[#eae6db] overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 xs:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 text-[#0d4d3b] text-xs xs:text-sm font-bold tracking-[0.2em] uppercase">
            <span className="text-[#c79a45]">✦</span>
            <span>{bn ? "সামাজিক সেবা ও কল্যাণ" : "COMMUNITY WELFARE"}</span>
          </div>
          <h2 className="mt-3 text-3xl xs:text-4xl sm:text-5xl font-serif font-bold text-[#0e2a22] leading-tight">
            {bn ? "সহমর্মিতা ও মানুষের প্রয়োজনে পাশে থাকা" : "Compassion in Action: Serving Our Neighbors"}
          </h2>
          <p className="mt-4 text-sm xs:text-base text-[#69726d] leading-relaxed">
            {bn
              ? "মসজিদ কেবল নামাজের স্থান নয়, বরং সমাজের দুঃখ দূর করার এবং একে অপরের পাশে দাঁড়ানোর সবচেয়ে নির্ভরযোগ্য কেন্দ্র।"
              : "A mosque is at its finest when it extends healing, relief, and dignity to the widows, orphans, sick, and vulnerable in its community."}
          </p>
        </div>

        {/* Content Layout */}
        <div className="grid gap-10 lg:gap-14 lg:grid-cols-12 items-center">
          
          {/* Left Column: Human Service Photography */}
          <div className="lg:col-span-5 relative">
            <div className="relative aspect-[4/5] w-full rounded-3xl overflow-hidden shadow-xl border border-[#c79a45]/30 bg-[#072a20]">
              <Image
                src="/donation.jpg"
                alt={bn ? "নূর মসজিদের দান ও সামাজিক সেবা কার্যক্রম" : "Charity and community donation at Noor Mosque"}
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#041510]/85 via-transparent to-transparent" />
              
              <div className="absolute bottom-5 left-5 right-5 p-4 rounded-2xl bg-black/60 backdrop-blur-md border border-white/20 text-white">
                <span className="text-[10px] font-bold text-[#e0be79] uppercase tracking-widest block">
                  {bn ? "স্বচ্ছতা ও আমানতদারি" : "STEWARDSHIP & SINCERITY"}
                </span>
                <p className="mt-1 text-xs text-white/90 leading-snug">
                  {bn
                    ? "আপনার প্রতিটি অনুদান শরিয়া নির্দেশিত খাতে শতভাগ আমানতদারিতার সাথে পৌঁছানো হয়।"
                    : "Every contribution is accounted for with complete transparency and given to those in verified need."}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Service Highlights */}
          <div className="lg:col-span-7 grid gap-5 sm:grid-cols-2">
            {services.map((item, index) => {
              const Icon = item.icon;

              return (
                <div
                  key={index}
                  className="p-5 sm:p-6 rounded-2xl bg-white border border-[#e5e1d3] shadow-sm hover:border-[#c79a45] transition duration-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-[#0d4d3b]/10 text-[#0d4d3b] flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-serif text-lg font-bold text-[#0e2a22]">
                      {bn ? item.titleBn : item.titleEn}
                    </h3>
                    <p className="mt-2 text-xs xs:text-sm text-[#5d6a64] leading-relaxed">
                      {bn ? item.descBn : item.descEn}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[#f0ede4]">
                    <Link
                      href="/donations"
                      className="text-xs font-semibold text-[#0d4d3b] hover:text-[#c79a45] transition flex items-center gap-1"
                    >
                      <span>{bn ? "সহযোগিতা করুন →" : "Support this cause →"}</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
}

