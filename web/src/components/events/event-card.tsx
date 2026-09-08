"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import {
  formatEventDayNumber,
  formatEventMonthShort,
  formatEventWeekday,
  formatEventTime,
  type MosqueEvent,
} from "@/components/events/event-data";
import { Clock, MapPin, ArrowRight, Users } from "lucide-react";

export function EventCard({ event }: { event: MosqueEvent }) {
  const { language } = useLanguage();
  const bn = language === "bn";

  const title = bn ? event.bnTitle : event.title;
  const description = bn ? event.bnDescription : event.description;
  const location = bn ? (event.bnLocation || event.location) : event.location;

  const isFull = event.capacity && event.registered && event.registered >= event.capacity;

  return (
    <article className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-[#e5e1d3] bg-white shadow-sm transition-all duration-300 hover:border-[#c79a45]/60 hover:shadow-xl hover:-translate-y-1">
      <div>
        {/* Card Image Banner */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#072a20]">
          <Image
            src={event.image}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Floating Date Badge (Top-Left) */}
          <div className="absolute top-3.5 left-3.5 z-10 flex flex-col items-center justify-center min-w-[50px] px-2.5 py-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-white/25 text-white shadow-md">
            <span className="text-[10px] font-bold text-[#e0be79] uppercase tracking-wider">
              {formatEventMonthShort(event.date, language)}
            </span>
            <span className="text-xl font-serif font-bold leading-tight">
              {formatEventDayNumber(event.date, language)}
            </span>
            <span className="text-[9px] text-white/80 font-medium tracking-tight uppercase">
              {formatEventWeekday(event.date, language)}
            </span>
          </div>

          {/* Category Pill (Top-Right) */}
          <div className="absolute top-3.5 right-3.5 z-10">
            <span className="px-2.5 py-1 rounded-full bg-[#072a20]/90 border border-[#c79a45]/50 text-[#e0be79] text-[10px] font-bold tracking-wider uppercase backdrop-blur-md">
              {bn && event.category === "Education" ? "শিক্ষা" :
               bn && event.category === "Worship" ? "ইবাদত" :
               bn && event.category === "Quran" ? "কুরআন" :
               bn && event.category === "Youth" ? "যুব" :
               bn && event.category === "Charity" ? "দান" :
               bn && event.category === "Community" ? "কমিউনিটি" : event.category}
            </span>
          </div>

          {/* Registration status badge (Bottom-Left overlay) */}
          <div className="absolute bottom-3 left-3 z-10">
            {isFull ? (
              <span className="px-2 py-0.5 rounded bg-red-600/90 text-white text-[10px] font-semibold">
                {bn ? "আসন পূর্ণ" : "Event Full"}
              </span>
            ) : event.registrationRequired ? (
              <span className="px-2 py-0.5 rounded bg-[#c79a45]/90 text-[#072a20] text-[10px] font-bold flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{bn ? "নিবন্ধন আবশ্যক" : "Registration Required"}</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-emerald-700/90 text-white text-[10px] font-medium">
                {bn ? "উন্মুক্ত সমাবেশ" : "Open Attendance"}
              </span>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6">
          {/* Title */}
          <h3 className="font-serif text-lg sm:text-xl font-bold text-[#0e2a22] leading-snug group-hover:text-[#0d4d3b] transition-colors line-clamp-2">
            <Link href={`/events/${event.slug}`} className="focus:outline-none">
              {title}
            </Link>
          </h3>

          {/* Time & Location */}
          <div className="mt-3 space-y-1.5 text-xs text-[#52605a]">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-[#c79a45] shrink-0" />
              <span>{formatEventTime(event.startTime, language)} - {formatEventTime(event.endTime, language)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-[#c79a45] shrink-0" />
              <span className="line-clamp-1">{location}</span>
            </div>
          </div>

          {/* Description Snippet */}
          <p className="mt-3 text-xs xs:text-sm text-[#69726d] leading-relaxed line-clamp-2">
            {description}
          </p>
        </div>
      </div>

      {/* Footer / CTA Row */}
      <div className="px-5 sm:px-6 pb-5 pt-3 border-t border-[#f0ede4]">
        <Link
          href={`/events/${event.slug}`}
          className="w-full inline-flex items-center justify-between py-2.5 px-4 rounded-xl bg-[#faf8f4] hover:bg-[#0d4d3b] text-[#0d4d3b] hover:text-white font-semibold text-xs sm:text-sm transition-all duration-200 border border-[#e5e1d3] hover:border-[#0d4d3b] min-h-[44px]"
        >
          <span>{bn ? "বিস্তারিত বিবরণ" : "View Details"}</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </article>
  );
}

