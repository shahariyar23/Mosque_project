"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import { 
  formatEventDate, 
  formatEventTime, 
  formatEventDayNumber, 
  formatEventMonthShort, 
  formatEventWeekday, 
  type MosqueEvent 
} from "@/components/events/event-data";
import { Clock, MapPin, Sparkles, ArrowRight, CalendarPlus, Users } from "lucide-react";

export function FeaturedEventCard({ event }: { event: MosqueEvent }) {
  const { language } = useLanguage();
  const bn = language === "bn";

  const title = bn ? event.bnTitle : event.title;
  const description = bn ? event.bnDescription : event.description;
  const location = bn ? (event.bnLocation || event.location) : event.location;
  const address = bn ? (event.bnAddress || event.address) : event.address;

  // Google calendar link with timezone safety
  const startDateTime = `${event.date.replaceAll("-", "")}T${event.startTime.replace(":", "")}00`;
  const endDateTime = `${event.date.replaceAll("-", "")}T${event.endTime.replace(":", "")}00`;
  const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startDateTime}/${endDateTime}&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(event.address)}`;

  const isFull = event.capacity && event.registered && event.registered >= event.capacity;

  return (
    <section aria-labelledby="featured-event-heading" className="w-full">
      <div className="relative overflow-hidden rounded-3xl border border-[#c79a45]/40 bg-white shadow-xl">
        <div className="grid lg:grid-cols-12 items-stretch">
          
          {/* Photography Side (5 cols on lg) */}
          <div className="relative lg:col-span-5 min-h-[260px] xs:min-h-[300px] sm:min-h-[360px] bg-[#072a20] overflow-hidden">
            <Image
              src={event.image}
              alt={title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 42vw"
              className="object-cover object-center filter brightness-[0.9] hover:scale-105 transition-transform duration-700 ease-out"
            />
            {/* Dark gradient overlay for legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-black/60" />

            {/* Top Badge: Featured Banner */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#072a20]/90 border border-[#c79a45]/60 text-[#e0be79] text-xs font-bold tracking-wider uppercase backdrop-blur-md shadow-md">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{bn ? "প্রধান আকর্ষণ · আসন্ন অনুষ্ঠান" : "FEATURED NEXT EVENT"}</span>
            </div>

            {/* Mobile / Inset Date Badge for quick scanning */}
            <div className="absolute bottom-4 left-4 z-10 flex items-center gap-3 p-3 rounded-2xl bg-black/75 backdrop-blur-md border border-white/20 text-white">
              <div className="text-center min-w-[50px] border-r border-white/20 pr-3">
                <span className="block text-[10px] font-bold text-[#e0be79] uppercase tracking-widest">
                  {formatEventMonthShort(event.date, language)}
                </span>
                <span className="block text-2xl font-serif font-bold text-white leading-none mt-0.5">
                  {formatEventDayNumber(event.date, language)}
                </span>
              </div>
              <div className="text-xs">
                <span className="font-semibold block text-white/90">
                  {formatEventWeekday(event.date, language)}
                </span>
                <span className="text-white/70">
                  {formatEventTime(event.startTime, language)}
                </span>
              </div>
            </div>
          </div>

          {/* Content Side (7 cols on lg) */}
          <div className="lg:col-span-7 p-6 xs:p-8 sm:p-10 flex flex-col justify-between bg-gradient-to-br from-white via-[#faf8f4] to-[#f4f0e6]">
            <div>
              {/* Category & Registration Status Row */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#eae6dc]">
                <span className="px-3 py-1 rounded-full bg-[#0d4d3b]/10 text-[#0d4d3b] text-xs font-bold tracking-wider uppercase">
                  {bn && event.category === "Education" ? "শিক্ষা" :
                   bn && event.category === "Worship" ? "ইবাদত" :
                   bn && event.category === "Quran" ? "কুরআন" :
                   bn && event.category === "Youth" ? "যুব" :
                   bn && event.category === "Charity" ? "দান" :
                   bn && event.category === "Community" ? "কমিউনিটি" : event.category}
                </span>

                {isFull ? (
                  <span className="px-2.5 py-1 rounded-md bg-red-100 text-red-700 text-xs font-semibold">
                    {bn ? "আসন পূর্ণ" : "Event Full"}
                  </span>
                ) : event.registrationRequired ? (
                  <span className="px-2.5 py-1 rounded-md bg-[#c79a45]/20 text-[#0e2a22] text-xs font-semibold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#c79a45]" />
                    <span>{bn ? "নিবন্ধন প্রয়োজন" : "Registration Required"}</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-[#0d4d3b] text-xs font-semibold">
                    {bn ? "সবার জন্য উন্মুক্ত" : "Free · Open to All"}
                  </span>
                )}
              </div>

              {/* Title */}
              <h2 id="featured-event-heading" className="mt-4 text-2xl xs:text-3xl sm:text-4xl font-serif font-bold text-[#0e2a22] leading-tight">
                {title}
              </h2>

              {/* Short narrative description */}
              <p className="mt-3 text-sm xs:text-base text-[#52605a] leading-relaxed line-clamp-3">
                {description}
              </p>

              {/* Key Details Grid (Date, Time, Location) */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-2xl bg-white border border-[#e5e1d3] shadow-sm">
                <div className="flex items-center gap-3 text-xs sm:text-sm text-[#2f3d37]">
                  <div className="w-8 h-8 rounded-lg bg-[#0d4d3b]/10 text-[#0d4d3b] flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#718079] uppercase font-bold block">
                      {bn ? "তারিখ ও সময়" : "When"}
                    </span>
                    <span className="font-semibold text-[#0e2a22]">
                      {formatEventDate(event.date, language, { weekday: "short", month: "short", day: "numeric" })} · {formatEventTime(event.startTime, language)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs sm:text-sm text-[#2f3d37]">
                  <div className="w-8 h-8 rounded-lg bg-[#c79a45]/15 text-[#c79a45] flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#718079] uppercase font-bold block">
                      {bn ? "অনুষ্ঠানের স্থান" : "Where"}
                    </span>
                    <span className="font-semibold text-[#0e2a22] line-clamp-1">
                      {location}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons (Touch targets >= 44px) */}
            <div className="mt-8 pt-6 border-t border-[#eae6dc] flex flex-col xs:flex-row items-stretch xs:items-center gap-3">
              <Link
                href={`/events/${event.slug}`}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#0d4d3b] text-white font-semibold text-sm transition-all duration-200 hover:bg-[#072a20] active:scale-[0.98] shadow-md min-h-[48px]"
              >
                <span>{bn ? "বিস্তারিত দেখুন" : "View Event Details"}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <a
                href={calendarUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-[#cfc9b8] bg-white hover:bg-[#faf7f0] text-[#0d4d3b] font-medium text-sm transition-all duration-200 hover:border-[#c79a45] active:scale-[0.98] min-h-[48px]"
              >
                <CalendarPlus className="w-4 h-4 text-[#c79a45]" />
                <span>{bn ? "ক্যালেন্ডার" : "Add to Calendar"}</span>
              </a>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}

