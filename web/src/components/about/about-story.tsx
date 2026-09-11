"use client";

import Image from "next/image";
import { useLanguage } from "@/components/language-provider";
import { Heart, Users, Sparkles } from "lucide-react";
import { type PublicMosqueInfo } from "@/services/publicHomeService";

interface AboutStoryProps {
  mosque?: PublicMosqueInfo | null;
  loading?: boolean;
}

export function AboutStory({ mosque, loading = false }: AboutStoryProps) {
  const { language } = useLanguage();
  const bn = language === "bn";

  // Split story into paragraphs if it exists
  const backendStoryParagraphs = mosque?.story
    ? mosque.story.split("\n\n").filter(Boolean)
    : [];

  return (
    <section id="our-story" className="relative py-16 xs:py-20 sm:py-24 bg-[#f8f6ef] text-[#17211d] overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 xs:px-6 lg:px-8">
        <div className="grid gap-10 lg:gap-16 lg:grid-cols-12 items-center">
          
          {/* Left Column: Editorial Photography with Subtle Gold Frame */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Outer Decorative Accent Frame */}
              <div className="absolute -inset-2.5 sm:-inset-3.5 rounded-2xl sm:rounded-3xl border border-[#c79a45]/30 bg-white/40 -rotate-1 pointer-events-none" />
              
              {/* Main Image Card */}
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl sm:rounded-2xl shadow-xl bg-[#0d2a21]">
                <Image
                  src="/comunity praying.jpg"
                  alt={bn ? "মসজিদে জামাতে নামাজ আদায় করছেন মুসল্লিগণ" : "Congregational prayer at Noor Community Mosque"}
                  fill
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-cover object-center transition duration-500 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#041510]/80 via-transparent to-transparent" />
                
                {/* Embedded Badge at Bottom of Image */}
                <div className="absolute bottom-4 left-4 right-4 p-3.5 sm:p-4 rounded-xl bg-black/60 backdrop-blur-md border border-white/15 text-white">
                  <div className="flex items-center gap-2 text-[#e0be79] text-xs font-semibold uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{bn ? "ঐক্যের বন্ধন" : "UNITED IN WORSHIP"}</span>
                  </div>
                  <p className="mt-1 text-xs text-white/90 leading-snug">
                    {bn
                      ? "প্রতিদিন পাঁচ ওয়াক্ত নামাজ ও জুমুআয় শত শত মুসল্লির মিলনমেলা।"
                      : "Gathering hundreds in congregation daily for prayer, contemplation, and peace."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Editorial Narrative & Pull Quote */}
          <div className="lg:col-span-7 flex flex-col items-start">
            {/* Section Eyebrow */}
            <div className="inline-flex items-center gap-2 text-[#0d4d3b] text-xs xs:text-sm font-bold tracking-[0.2em] uppercase">
              <span className="text-[#c79a45]">✦</span>
              <span>{bn ? "আমাদের গল্প ও আদর্শ" : "OUR STORY & PURPOSE"}</span>
            </div>

            {/* Editorial Heading */}
            <h2 className="mt-3 text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[#0e2a22] leading-tight">
              {bn ? (
                <>
                  একটি বিশ্বস্ত ইবাদতখানা, <br />
                  <span className="text-[#c79a45] italic font-normal">একটি প্রাণবন্ত সমাজ</span>
                </>
              ) : (
                <>
                  Rooted in Sincere Devotion, <br />
                  <span className="text-[#c79a45] italic font-normal">Nurturing Community</span>
                </>
              )}
            </h2>

            {/* Narrative Paragraphs */}
            <div className="mt-5 sm:mt-6 space-y-4 text-sm xs:text-base text-[#4a5852] leading-relaxed">
              {backendStoryParagraphs.length > 0 && !bn ? (
                backendStoryParagraphs.map((para, i) => (
                  <p key={i}>{para}</p>
                ))
              ) : (
                <>
                  <p>
                    {bn
                      ? "নূর কমিউনিটি মসজিদ প্রতিষ্ঠিত হয়েছে একটি সহজ ও মহৎ লক্ষ্য নিয়ে: মহান আল্লাহর সন্তুষ্টির উদ্দেশ্যে একটি পবিত্র ইবাদতগাহ গড়ে তোলা, যেখানে প্রতিটি মানুষ সমান সমাদরে সমবেত হতে পারে। প্রজন্মের পর প্রজন্ম ধরে এটি হয়ে উঠেছে আমাদের এলাকার এক নির্ভরযোগ্য আধ্যাত্মিক বাতিঘর।"
                      : "Noor Community Mosque was established with a clear and humble mission: to maintain a pure sanctuary for the worship of Allah, where every individual—young and old, resident and traveler—finds welcoming tranquility, compassionate counsel, and sacred learning."}
                  </p>
                  <p>
                    {bn
                      ? "পাঞ্জাগানা নামাজ থেকে শুরু করে জুমুআর পবিত্র জমায়েত, কুরআন পাঠচক্র, শিশুদের নৈতিক শিক্ষা এবং দুস্থদের সহযোগিতায় আমাদের কার্যক্রম সর্বদা সম্প্রসারিত। এখানে প্রতিটি বিশ্বাসী এক গভীর আত্মিক ও সামাজিক সম্প্রীতি অনুভব করেন।"
                      : "Beyond daily congregational prayers and Friday gatherings, Noor serves as a vibrant center for Islamic education, family counseling, charitable relief, and cultural dialogue. We believe a true mosque extends its warmth far beyond its walls into the everyday lives of the people it serves."}
                  </p>
                </>
              )}
            </div>

            {/* Pull Quote Box with Quranic / Hadith Inspiration */}
            <div className="mt-7 sm:mt-8 p-4 xs:p-5 sm:p-6 rounded-2xl bg-[#072a20] text-white border-l-4 border-[#c79a45] shadow-md w-full">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#c79a45]/20 flex items-center justify-center shrink-0 text-[#e0be79] mt-0.5">
                  <span className="font-serif text-lg leading-none">“</span>
                </div>
                <div>
                  <p className="font-serif text-sm sm:text-base italic text-[#f5f0e3] leading-relaxed">
                    {bn
                      ? "নিশ্চয় তারাই তো আল্লাহর মসজিদসমূহ আবাদ করবে যারা আল্লাহ ও শেষ দিবসে ঈমান আনে, নামাজ কায়েম করে এবং জাকাত প্রদান করে..."
                      : "The mosques of Allah shall be visited and maintained by such as believe in Allah and the Last Day, establish regular prayers, and practise regular charity..."}
                  </p>
                  <span className="mt-2 block text-xs font-semibold tracking-wider text-[#e0be79] uppercase">
                    {bn ? "— সূরা আত-তাওবাহ (৯:১৮)" : "— Surah At-Tawbah (9:18)"}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Pillars Grid */}
            <div className="mt-8 grid grid-cols-2 gap-4 w-full pt-6 border-t border-[#e2decb]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#0d4d3b]/10 text-[#0d4d3b] flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-xs font-bold uppercase text-[#0d4d3b] tracking-wider">
                    {bn ? "সর্বজনীন প্রবেশাধিকার" : "Inclusive Sanctuary"}
                  </span>
                  <span className="text-xs text-[#69726d]">
                    {bn ? "সকলের জন্য উন্মুক্ত" : "Welcoming all members"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#c79a45]/15 text-[#c79a45] flex items-center justify-center shrink-0">
                  <Heart className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-xs font-bold uppercase text-[#0d4d3b] tracking-wider">
                    {bn ? "মানবসেবা ও খিদমত" : "Charity & Welfare"}
                  </span>
                  <span className="text-xs text-[#69726d]">
                    {bn ? "অসহায়দের পাশে" : "Continuous community aid"}
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
