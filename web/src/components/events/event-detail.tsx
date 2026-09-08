"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import {
  formatEventDate,
  formatEventTime,
  type MosqueEvent,
} from "@/components/events/event-data";
import { Clock, MapPin, CalendarPlus, Users, ArrowLeft, Share2, Check } from "lucide-react";
import { useState } from "react";

export function EventDetail({ event }: { event: MosqueEvent }) {
  const { language } = useLanguage();
  const bn = language === "bn";
  const [copied, setCopied] = useState(false);

  const title = bn ? event.bnTitle : event.title;
  const description = bn ? event.bnDescription : event.description;
  const location = bn ? (event.bnLocation || event.location) : event.location;
  const address = bn ? (event.bnAddress || event.address) : event.address;

  const dateLabel = formatEventDate(event.date, language, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const startDateTime = `${event.date.replaceAll("-", "")}T${event.startTime.replace(":", "")}00`;
  const endDateTime = `${event.date.replaceAll("-", "")}T${event.endTime.replace(":", "")}00`;
  const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startDateTime}/${endDateTime}&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(event.address)}`;

  const isFull = event.capacity && event.registered && event.registered >= event.capacity;

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-8">
      {/* Back to Events button */}
      <div>
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#0d4d3b] hover:text-[#c79a45] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{bn ? "সকল অনুষ্ঠানে ফিরে যান" : "Back to all events"}</span>
        </Link>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.2fr_.8fr] items-start">
        {/* Main Article Side */}
        <article className="space-y-6">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl border border-[#c79a45]/30 bg-[#072a20] shadow-xl">
            <Image
              src={event.image}
              alt={title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4">
              <span className="px-3 py-1 rounded-full bg-[#072a20]/90 border border-[#c79a45]/50 text-[#e0be79] text-xs font-bold tracking-wider uppercase backdrop-blur-md">
                {event.category}
              </span>
            </div>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#e5e1d3] shadow-sm space-y-4">
            <div className="inline-flex items-center gap-2 text-[#0d4d3b] text-xs font-bold tracking-[0.2em] uppercase">
              <span className="text-[#c79a45]">✦</span>
              <span>{bn ? "অনুষ্ঠানের বিস্তারিত বিবরণ" : "EVENT OVERVIEW"}</span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-[#0e2a22]">
              {title}
            </h2>

            <p className="text-sm sm:text-base text-[#52605a] leading-relaxed whitespace-pre-line">
              {description}
            </p>
          </div>
        </article>

        {/* Aside Details Card */}
        <aside className="sticky top-28 p-6 sm:p-8 rounded-3xl bg-white border border-[#e5e1d3] shadow-lg space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#eae6dc]">
            <span className="text-xs font-bold text-[#0d4d3b] uppercase tracking-wider">
              {bn ? "অনুষ্ঠানের তথ্য" : "KEY INFORMATION"}
            </span>

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 text-xs text-[#718079] hover:text-[#0d4d3b] transition"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600 font-semibold">{bn ? "লিংক কপি হয়েছে" : "Copied"}</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{bn ? "শেয়ার করুন" : "Share"}</span>
                </>
              )}
            </button>
          </div>

          <dl className="space-y-4 text-xs sm:text-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#0d4d3b]/10 text-[#0d4d3b] flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <dt className="font-bold text-[#0e2a22]">{bn ? "তারিখ ও সময়" : "Date & Time"}</dt>
                <dd className="text-[#52605a] mt-0.5">{dateLabel}</dd>
                <dd className="text-[#52605a] font-medium">
                  {formatEventTime(event.startTime, language)} – {formatEventTime(event.endTime, language)}
                </dd>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#c79a45]/15 text-[#c79a45] flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <dt className="font-bold text-[#0e2a22]">{bn ? "স্থান ও ঠিকানা" : "Venue Location"}</dt>
                <dd className="text-[#52605a] mt-0.5 font-medium">{location}</dd>
                <dd className="text-[#718079] text-xs mt-0.5">{address}</dd>
              </div>
            </div>

            {event.capacity && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#0d4d3b]/10 text-[#0d4d3b] flex items-center justify-center shrink-0 mt-0.5">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <dt className="font-bold text-[#0e2a22]">{bn ? "ধারণক্ষমতা" : "Capacity & Attendance"}</dt>
                  <dd className="text-[#52605a] mt-0.5">
                    {bn
                      ? `${event.registered || 0} / ${event.capacity} জন নিবন্ধিত`
                      : `${event.registered || 0} of ${event.capacity} spots filled`}
                  </dd>
                </div>
              </div>
            )}
          </dl>

          {/* Registration / Status CTA */}
          <div className="pt-4 border-t border-[#eae6dc] space-y-3">
            {isFull ? (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-center text-red-700 text-xs sm:text-sm font-semibold">
                {bn ? "এই অনুষ্ঠানের সকল আসন পূর্ণ হয়ে গেছে।" : "Registration is full for this event."}
              </div>
            ) : event.registrationRequired ? (
              <Link
                href="/contact"
                className="w-full inline-flex items-center justify-center py-3.5 px-5 rounded-xl bg-[#0d4d3b] hover:bg-[#072a20] text-white font-semibold text-sm transition shadow-md min-h-[48px]"
              >
                {bn ? "এখনই নিবন্ধন করুন" : "Register Now"}
              </Link>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center text-[#0d4d3b] text-xs sm:text-sm font-semibold">
                {bn ? "উন্মুক্ত সমাবেশ — নিবন্ধনের প্রয়োজন নেই" : "Free attendance — No registration needed"}
              </div>
            )}

            <a
              href={calendarUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl border border-[#d2ccc0] bg-white hover:bg-[#faf8f4] text-[#0d4d3b] font-semibold text-xs sm:text-sm transition min-h-[44px]"
            >
              <CalendarPlus className="w-4 h-4 text-[#c79a45]" />
              <span>{bn ? "গুগল ক্যালেন্ডারে যোগ করুন" : "Add to Google Calendar"}</span>
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}
