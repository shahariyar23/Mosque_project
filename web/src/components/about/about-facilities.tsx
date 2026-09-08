"use client";

import { useLanguage } from "@/components/language-provider";
import { 
  Building2, 
  Users, 
  Droplets, 
  GraduationCap, 
  UtensilsCrossed, 
  HeartHandshake 
} from "lucide-react";

export function AboutFacilities() {
  const { language } = useLanguage();
  const bn = language === "bn";

  const facilities = [
    {
      icon: Building2,
      nameEn: "Main Prayer Sanctuary",
      nameBn: "মূল জামাত কক্ষ (প্রধান হল)",
      descEn: "Expansive carpeted hall with central Qiblah mihrab, climate control, and clear audio system for daily and Jumu'ah congregations.",
      descBn: "শীতাতপ নিয়ন্ত্রিত ও পরিষ্কার গালিচাবিশিষ্ট সুবিশাল নামাজ হল—দৈনিক পাঁচ ওয়াক্ত ও জুমার বৃহৎ জামাতের জন্য সুসজ্জিত।",
    },
    {
      icon: Users,
      nameEn: "Dedicated Women's Gallery",
      nameBn: "মহিলাদের পৃথক ইবাদতকক্ষ",
      descEn: "Private, dedicated space with separate entrance, audio relay, wudu facilities, and comfortable accommodations for sisters and families.",
      descBn: "মা-বোনদের জন্য সম্পূর্ণ পর্দানশীন স্বতন্ত্র প্রবেশপথ, অডিও সম্প্রচার এবং সংলগ্ন আলাদা ওজুখানার সুবিধা।",
    },
    {
      icon: Droplets,
      nameEn: "Modern Wudu & Ablution Center",
      nameBn: "আধুনিক ওজুখানা ও পবিত্রতার স্থান",
      descEn: "Hygienic, continuous-flow seated wudu stations, hot water supply in winter, and accessible restrooms.",
      descBn: "পর্যাপ্ত ট্যাপবিশিষ্ট পরিষ্কার ও আরামদায়ক বসার ওজুখানা, শীতকালে উষ্ণ পানি এবং পরিচ্ছন্ন শৌচাগার সুবিধা।",
    },
    {
      icon: GraduationCap,
      nameEn: "Islamic Classrooms & Maktab",
      nameBn: "ইসলামিক শ্রেণিকক্ষ ও মক্তব",
      descEn: "Dedicated study rooms equipped for Quran memorization, Arabic language learning, and weekend children's classes.",
      descBn: "শিশুদের সহিহ কুরআন শিক্ষা, তাজবিদ অনুশীলন এবং সাপ্তাহিক দ্বীনি পাঠদানের জন্য আধুনিক ক্লাসরুম।",
    },
    {
      icon: UtensilsCrossed,
      nameEn: "Community Hall & Welfare Kitchen",
      nameBn: "কমিউনিটি হল ও রমজান কিচেন",
      descEn: "Multi-purpose community hall hosting Ramadan community iftars, Islamic lectures, educational workshops, and charity sorting.",
      descBn: "মাহে রমজানের গণ-ইফতার, দ্বীনি সেমিনার ও সমাজের দুঃস্থ মানুষের জন্য খাদ্য সামগ্রী প্রস্তুত ও বিতরণ কেন্দ্র।",
    },
    {
      icon: HeartHandshake,
      nameEn: "Family Counseling & Nikah Room",
      nameBn: "পরামর্শ কেন্দ্র ও নিকাহ কক্ষ",
      descEn: "Confidential room for spiritual guidance, marital counseling, bereavement support, and solemnization of marriage ceremonies.",
      descBn: "পারিবারিক সমস্যার ইসলামিক সমাধান, আত্মিক কাউন্সেলিং এবং সম্মানজনক বিবাহ (নিকাহ) নিবন্ধনের পবিত্র পরিবেশ।",
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-[#fdfbf7] text-[#17211d] border-b border-[#eae6db] overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 xs:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 text-[#0d4d3b] text-xs xs:text-sm font-bold tracking-[0.2em] uppercase">
            <span className="text-[#c79a45]">✦</span>
            <span>{bn ? "মসজিদ প্রাঙ্গণ ও সেবাসমূহ" : "MOSQUE AMENITIES"}</span>
          </div>
          <h2 className="mt-3 text-3xl xs:text-4xl sm:text-5xl font-serif font-bold text-[#0e2a22]">
            {bn ? "মুসুল্লিদের সুবিধার্থে আমাদের আয়োজন" : "Thoughtfully Designed Facilities"}
          </h2>
          <p className="mt-4 text-sm xs:text-base text-[#69726d] leading-relaxed">
            {bn
              ? "ইবাদতের একাগ্রতা ও সামাজিক প্রয়োজনের কথা বিবেচনা করে প্রতিটি সুবিধা সর্বোচ্চ পবিত্রতা ও পরিচ্ছন্নতার সাথে পরিচালিত হয়।"
              : "Every facility at Noor Mosque has been developed with care to support worshippers, learners, and families in their spiritual journey."}
          </p>
        </div>

        {/* Facilities Grid */}
        <div className="mt-12 sm:mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {facilities.map((fac, idx) => {
            const Icon = fac.icon;

            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-white border border-[#e5e1d3] shadow-sm hover:border-[#c79a45] hover:shadow-md transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="w-11 h-11 rounded-xl bg-[#0d4d3b]/10 text-[#0d4d3b] flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif text-lg font-bold text-[#0e2a22]">
                    {bn ? fac.nameBn : fac.nameEn}
                  </h3>
                  <p className="mt-2 text-xs xs:text-sm text-[#5d6a64] leading-relaxed">
                    {bn ? fac.descBn : fac.descEn}
                  </p>
                </div>

                <div className="mt-6 pt-3 border-t border-[#f0ede4] flex items-center justify-between text-[11px] text-[#0d4d3b] font-semibold uppercase tracking-wider">
                  <span>{bn ? "উন্মুক্ত ও প্রস্তুত" : "Accessible"}</span>
                  <span className="text-[#c79a45]">✦</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

