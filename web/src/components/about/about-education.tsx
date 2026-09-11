"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import { BookOpen, Check, ArrowRight } from "lucide-react";
import { type PublicService } from "@/services/publicHomeService";

interface AboutEducationProps {
  services?: PublicService[];
  loading?: boolean;
}

export function AboutEducation({ services = [], loading = false }: AboutEducationProps) {
  const { language } = useLanguage();
  const bn = language === "bn";

  const educationServices = services.filter(
    (s) => s.category?.toLowerCase() === "education"
  );

  const defaultPrograms = [
    {
      titleEn: "Quran Reading & Tajweed for Children",
      titleBn: "শিশুদের সহিহ কুরআন ও তাজবিদ শিক্ষা",
      descEn: "Daily morning and evening sessions teaching foundational Arabic phonetics, correct articulation, and recitation.",
      descBn: "সকাল ও সন্ধ্যার শিফটে সহিহ হরফ উচ্চারণ, মাখরাজ ও নিয়মিত তেলাওয়াত অনুশীলনের মক্তব ক্লাস।",
    },
    {
      titleEn: "Tahfeez-ul-Quran (Memorization Program)",
      titleBn: "হিফজুল কুরআন বিভাগ",
      descEn: "Structured, supervised memorization program guided by qualified Huffaz with individual student pacing.",
      descBn: "অভিজ্ঞ হাফেজ শিক্ষকদের নিবিড় তত্ত্বাবধানে পূর্ণাঙ্গ কুরআন মুখস্থকরণের ধারাবাহিক ও সুশৃঙ্খল পাঠদান।",
    },
    {
      titleEn: "Adult Fiqh & Arabic Comprehension",
      titleBn: "বয়স্কদের দ্বীনি ইলম ও আরবি ভাষা শিক্ষা",
      descEn: "Weekend study circles covering practical daily jurisprudence (taharah, salah, zakat) and fundamental Quranic vocabulary.",
      descBn: "দৈনন্দিন জীবনের জরুরি মাসআলা-মাসায়েল, নামাজ শিক্ষা ও সহজ আরবি বোঝাপড়ায় সান্ধ্যকালীন পাঠচক্র।",
    },
    {
      titleEn: "Weekly Tafseer & Hadith Halaqahs",
      titleBn: "সাপ্তাহিক তাফসির ও সিরাত মজলিস",
      descEn: "Open community halaqahs examining the timeless lessons of the Holy Quran and the noble Sunnah of the Prophet ﷺ.",
      descBn: "জুমার নামাজের পর ও ছুটির দিনে আয়োজিত উন্মুক্ত তাফসির মাহফিল ও রাসুলুল্লাহ ﷺ-এর জীবনচরিত আলোচনা।",
    },
  ];

  const displayPrograms = educationServices.length > 0
    ? educationServices.map((s) => ({
        titleEn: s.name,
        titleBn: s.name,
        descEn: s.description || s.summary || "Authentic Islamic education and learning program.",
        descBn: s.description || s.summary || "বিশুদ্ধ ইসলামি শিক্ষা ও চরিত্র গঠনের নির্ভরযোগ্য আয়োজন।",
      }))
    : defaultPrograms;

  return (
    <section className="py-20 sm:py-28 bg-[#fbf9f4] text-[#17211d] border-b border-[#eae6db] overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 xs:px-6 lg:px-8">
        <div className="grid gap-12 lg:gap-16 lg:grid-cols-12 items-center">
          
          {/* Left Column: Educational Content */}
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 text-[#0d4d3b] text-xs xs:text-sm font-bold tracking-[0.2em] uppercase">
              <BookOpen className="w-4 h-4 text-[#c79a45]" />
              <span>{bn ? "ইসলামিক শিক্ষা ও মক্তব" : "ISLAMIC EDUCATION"}</span>
            </div>

            <h2 className="mt-3 text-3xl xs:text-4xl sm:text-5xl font-serif font-bold text-[#0e2a22] leading-tight">
              {bn ? (
                <>
                  জ্ঞান অন্বেষণ ও <br />
                  <span className="text-[#c79a45] italic font-normal">আদর্শ প্রজন্ম গড়ার প্রত্যয়</span>
                </>
              ) : (
                <>
                  Illuminating Minds, <br />
                  <span className="text-[#c79a45] italic font-normal">Nurturing Righteous Character</span>
                </>
              )}
            </h2>

            <p className="mt-4 text-sm xs:text-base text-[#69726d] leading-relaxed">
              {bn
                ? "রাসুলুল্লাহ ﷺ বলেছেন: 'তোমাদের মধ্যে সর্বোত্তম ব্যক্তি সে, যে নিজে কুরআন শেখে এবং অপরকে শেখায়।' এই হাদিসের আলোকে নূর মসজিদ সব বয়সের শিক্ষার্থীদের জন্য মানসম্মত দ্বীনি শিক্ষার সুযোগ সৃষ্টি করেছে।"
                : "The Prophet ﷺ said: 'The best of you are those who learn the Quran and teach it.' Guided by this sacred principle, our educational initiatives instill faith, humility, and classical Islamic understanding in learners of all ages."}
            </p>

            {/* Program Items List */}
            <div className="mt-8 space-y-4">
              {displayPrograms.map((prog, i) => (
                <div
                  key={i}
                  className="p-4 sm:p-5 rounded-2xl bg-white border border-[#e8e4d9] hover:border-[#c79a45] transition duration-200 shadow-sm flex items-start gap-3.5"
                >
                  <div className="w-6 h-6 rounded-full bg-[#0d4d3b]/10 text-[#0d4d3b] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <div>
                    <h3 className="font-serif text-base font-bold text-[#0e2a22]">
                      {bn ? prog.titleBn : prog.titleEn}
                    </h3>
                    <p className="mt-1 text-xs xs:text-sm text-[#5d6a64] leading-relaxed">
                      {bn ? prog.descBn : prog.descEn}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-8">
              <Link
                href="/services"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#0d4d3b] text-white font-semibold text-sm hover:bg-[#09382b] transition shadow-md active:scale-95"
              >
                <span>{bn ? "সকল শিক্ষা কার্যক্রম দেখুন" : "Explore All Programs"}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Right Column: Imagery Showcase (Classroom & Students) */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none space-y-5">
              {/* Primary Image: Classroom */}
              <div className="relative aspect-[16/10] w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl border border-[#c79a45]/30 bg-[#0d2a21]">
                <Image
                  src="/classroom.jpg"
                  alt={bn ? "নূর মসজিদের ইসলামিক ক্লাসরুম" : "Islamic education classroom at Noor Mosque"}
                  fill
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <span className="absolute bottom-3 left-4 text-xs font-semibold text-white/90">
                  {bn ? "আধুনিক ক্লাসরুম পরিবেশ" : "Equipped Study Classrooms"}
                </span>
              </div>

              {/* Secondary Inset Image: Children studying Quran */}
              <div className="relative aspect-[16/11] w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl border border-[#c79a45]/30 bg-[#0d2a21]">
                <Image
                  src="/Children studying Quran.jpg"
                  alt={bn ? "শিশুরা মনোযোগ সহকারে কুরআন শিক্ষা গ্রহণ করছে" : "Children studying Quran at Noor Community Mosque"}
                  fill
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <span className="absolute bottom-3 left-4 text-xs font-semibold text-white/90">
                  {bn ? "শিশুদের সহিহ কুরআন পাঠ" : "Early Childhood Quranic Studies"}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
