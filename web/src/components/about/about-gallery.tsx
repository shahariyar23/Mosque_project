"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import { Images, ArrowRight } from "lucide-react";
import { type PublicGalleryItem } from "@/services/publicHomeService";

interface AboutGalleryProps {
  gallery?: PublicGalleryItem[];
  loading?: boolean;
}

export function AboutGallery({ gallery = [], loading = false }: AboutGalleryProps) {
  const { language } = useLanguage();
  const bn = language === "bn";

  const defaultItems = [
    {
      src: "/arshan-latheef-fnq9X0fjGqc-unsplash.jpg",
      altEn: "Mosque minaret rising gracefully into the serene sky",
      altBn: "আকাশে মাথা উঁচু করে দাঁড়িয়ে থাকা নূর মসজিদের মিনার",
      tagEn: "Architecture",
      tagBn: "স্থাপত্যকলা",
      className: "sm:col-span-2 sm:row-span-2 aspect-[4/3] sm:aspect-auto",
    },
    {
      src: "/ekrem-osmanoglu--scqJ82Z55s-unsplash.jpg",
      altEn: "Intricate geometric patterns decorating the grand central dome",
      altBn: "কেন্দ্রীয় গম্বুজের অপরূপ ইসলামি জ্যামিতিক নকশা",
      tagEn: "Sacred Craft",
      tagBn: "নৈপুণ্য",
      className: "aspect-square",
    },
    {
      src: "/nourhan-sabek-6npKzC58MUE-unsplash.jpg",
      altEn: "Sunlight streaming through traditional mosque archways",
      altBn: "মসজিদের খিলানের মধ্য দিয়ে ছড়িয়ে পড়া স্নিগ্ধ আলো",
      tagEn: "Sanctuary",
      tagBn: "প্রশান্তি",
      className: "aspect-square",
    },
    {
      src: "/alim-L7J4ytEFRCg-unsplash.jpg",
      altEn: "Scholarly guidance and spiritual contemplation at the mosque",
      altBn: "মসজিদে উলামায়ে কেরামের সাহচর্য ও আত্মিক আলোচনা",
      tagEn: "Fellowship",
      tagBn: "দ্বীনি সাহচর্য",
      className: "aspect-square",
    },
    {
      src: "/fmaily praying.jpg",
      altEn: "Congregational worship bringing families together",
      altBn: "নামাজের কাতারে পরিবারের গভীর সম্প্রীতি ও আনুগত্য",
      tagEn: "Devotion",
      tagBn: "ইবাদত",
      className: "aspect-square",
    },
    {
      src: "/pexels-qaarif-14793742.jpg",
      altEn: "Serene colonnade perspective inside the prayer courtyard",
      altBn: "মসজিদ চত্বরের খিলানযুক্ত মনোরম করিডোর",
      tagEn: "Atmosphere",
      tagBn: "পরিবেশ",
      className: "sm:col-span-2 aspect-[16/9] sm:aspect-[2/1]",
    },
  ];

  const gridClasses = [
    "sm:col-span-2 sm:row-span-2 aspect-[4/3] sm:aspect-auto",
    "aspect-square",
    "aspect-square",
    "aspect-square",
    "aspect-square",
    "sm:col-span-2 aspect-[16/9] sm:aspect-[2/1]",
  ];

  const displayItems = gallery.length > 0
    ? gallery.slice(0, 6).map((g, i) => ({
        src: g.imageUrl,
        altEn: g.altText || g.title || "Life at Noor Mosque",
        altBn: g.altText || g.title || "নূর মসজিদ জীবন ও পরিবেশ",
        tagEn: g.category || "Sanctuary",
        tagBn: g.category || "প্রশান্তি",
        className: gridClasses[i % gridClasses.length],
      }))
    : defaultItems;

  return (
    <section className="py-20 sm:py-28 bg-[#faf8f5] text-[#17211d] border-b border-[#eae6db] overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 xs:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 sm:mb-16">
          <div>
            <div className="inline-flex items-center gap-2 text-[#0d4d3b] text-xs xs:text-sm font-bold tracking-[0.2em] uppercase">
              <Images className="w-4 h-4 text-[#c79a45]" />
              <span>{bn ? "ফটোগ্রাফি ও স্থিরচিত্র" : "LIFE AT NOOR"}</span>
            </div>
            <h2 className="mt-3 text-3xl xs:text-4xl sm:text-5xl font-serif font-bold text-[#0e2a22]">
              {bn ? "আমাদের প্রতিদিনের প্রতিচ্ছবি" : "Moments of Peace & Fellowship"}
            </h2>
          </div>

          <Link
            href="/gallery"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[#0d4d3b] text-[#0d4d3b] hover:bg-[#0d4d3b] hover:text-white font-semibold text-sm transition-all duration-200 self-start md:self-auto"
          >
            <span>{bn ? "সম্পূর্ণ গ্যালারি দেখুন" : "View Full Gallery"}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Editorial Asymmetric Photo Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {displayItems.map((item, index) => (
            <div
              key={index}
              className={`relative overflow-hidden rounded-2xl bg-[#092c21] group border border-[#e5e1d3] ${item.className}`}
            >
              <Image
                src={item.src}
                alt={bn ? item.altBn : item.altEn}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />
              
              {/* Overlay Tag */}
              <div className="absolute bottom-3.5 left-3.5 right-3.5 flex items-center justify-between text-white">
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md bg-black/50 backdrop-blur-sm border border-white/15">
                  {bn ? item.tagBn : item.tagEn}
                </span>
                <span className="text-xs text-white/70 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {bn ? "নূর মসজিদ" : "Noor Mosque"}
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
