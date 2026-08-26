"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import { PrayerReveal } from "@/components/home/PrayerReveal";
import {
  Calendar,
  Clock,
  RotateCcw,
  MapPin,
  ArrowRight,
  Sun,
  Sunrise as SunriseIcon,
  CloudSun,
  Sunset as SunsetIcon,
  Moon,
} from "lucide-react";

/* ── Custom Prayer Line Icons matching the reference design ── */
function FajrIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2v4M4.93 10.93l2.83 2.83M19.07 10.93l-2.83 2.83" />
      <path d="M2 18h20M4 22h16" />
      <circle cx="12" cy="18" r="4" />
    </svg>
  );
}

function SunriseHeaderIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2v6M4.93 6.93l4.24 4.24M19.07 6.93l-4.24 4.24M2 18h20M4 22h16" />
      <path d="M8 18a4 4 0 0 1 8 0" />
    </svg>
  );
}

function DhuhrIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="5" />
      <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function AsrIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2v3M4.93 4.93l2.12 2.12M19.07 4.93l-2.12 2.12" />
      <circle cx="12" cy="12" r="4" />
      <path d="M19.5 16.5A4.5 4.5 0 0 0 15 12h-.5A5.5 5.5 0 0 0 9 17.5 4.5 4.5 0 0 0 13.5 22h6a3.5 3.5 0 0 0 0-7z" />
    </svg>
  );
}

function MaghribIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 10V2M4.93 10.93l2.83-2.83M19.07 10.93l-2.83-2.83M2 18h20M4 22h16" />
      <circle cx="12" cy="18" r="4" />
    </svg>
  );
}

function IshaIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function MosqueIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2v3M12 5a3 3 0 0 0-3 3v2h6V8a3 3 0 0 0-3-3z" />
      <path d="M4 21V10l3-2 3 2v11M14 21V10l3-2 3 2v11M2 21h20M10 21v-4a2 2 0 0 1 4 0v4" />
    </svg>
  );
}

/* ── Ornate Live Islamic Analog Clock Widget ── */
function OrnateAnalogClock({ time }: { time: Date }) {
  const seconds = time.getSeconds() + time.getMilliseconds() / 1000;
  const minutes = time.getMinutes() + seconds / 60;
  const hours = (time.getHours() % 12) + minutes / 60;

  const secDeg = seconds * 6;
  const minDeg = minutes * 6;
  const hourDeg = hours * 30;

  return (
    <div className="relative w-36 h-36 xs:w-44 xs:h-44 sm:w-56 sm:h-56 md:w-60 md:h-60 lg:w-48 lg:h-48 xl:w-60 xl:h-60 rounded-full flex items-center justify-center p-2 bg-gradient-to-b from-[#0e3b2e] via-[#09291f] to-[#04160f] border-2 sm:border-4 border-[#dca74e] shadow-[0_0_40px_rgba(220,167,78,0.25)] my-2 transition-all">
      {/* Outer ornate ring pattern */}
      <div className="absolute inset-1 rounded-full border border-[#dca74e]/40 pointer-events-none" />
      <div className="absolute inset-3 rounded-full border border-[#dca74e]/20 pointer-events-none" />

      {/* Islamic geometric mandala / 8-pointed star overlay background */}
      <svg className="absolute inset-4 w-[calc(100%-2rem)] h-[calc(100%-2rem)] opacity-15 text-[#dca74e]" viewBox="0 0 100 100" fill="currentColor">
        <polygon points="50,0 64,36 100,50 64,64 50,100 36,64 0,50 36,36" />
        <polygon points="50,0 64,36 100,50 64,64 50,100 36,64 0,50 36,36" transform="rotate(45 50 50)" />
        <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>

      {/* Crescent Moon at 12 o'clock */}
      <div className="absolute top-2.5 flex justify-center text-[#dca74e]">
        <svg className="w-4 h-4 fill-current rotate-[-15deg]" viewBox="0 0 24 24">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </div>

      {/* Hour Markers */}
      {[...Array(12)].map((_, i) => {
        if (i === 0) return null; // Moon at 12
        const angle = i * 30;
        const isMain = i % 3 === 0;
        return (
          <div
            key={i}
            className="absolute w-full h-full flex justify-center pt-3 pointer-events-none"
            style={{ transform: `rotate(${angle}deg)` }}
          >
            <div
              className={`rounded-full bg-[#dca74e] ${
                isMain ? "w-1 h-3 opacity-90" : "w-0.5 h-1.5 opacity-50"
              }`}
            />
          </div>
        );
      })}

      {/* Clock Hands Container */}
      <div className="relative w-full h-full">
        {/* Hour Hand */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 origin-bottom w-1.5 h-[28%] bg-gradient-to-t from-[#dca74e] to-[#f5d78e] rounded-full shadow-md"
          style={{ transform: `translate(-50%, -100%) rotate(${hourDeg}deg)` }}
        />

        {/* Minute Hand */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 origin-bottom w-1 h-[38%] bg-gradient-to-t from-[#f0e6d0] to-[#ffffff] rounded-full shadow-md"
          style={{ transform: `translate(-50%, -100%) rotate(${minDeg}deg)` }}
        />

        {/* Second Hand */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 origin-bottom w-0.5 h-[44%] bg-red-500 rounded-full shadow-sm"
          style={{ transform: `translate(-50%, -100%) rotate(${secDeg}deg)` }}
        >
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full -translate-x-[0.25px] -translate-y-1" />
        </div>

        {/* Center Cap */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#dca74e] border-2 border-[#09291f] shadow-lg z-10 flex items-center justify-center">
          <div className="w-1 h-1 bg-[#09291f] rounded-full" />
        </div>
      </div>
    </div>
  );
}

const STATIC_REF_DATE = new Date("2026-08-26T06:00:00+06:00");

export function PrayerTimesSection() {
  const { language } = useLanguage();
  const bn = language === "bn";

  const [isMounted, setIsMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(STATIC_REF_DATE);

  useEffect(() => {
    setIsMounted(true);
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const prayers = useMemo(
    () => [
      {
        id: "fajr",
        nameEn: "FAJR",
        nameBn: "ফজর",
        timeEn: "4:38 AM",
        timeBn: "৪:৩৮ পূর্বাহ্ন",
        time24: "04:38",
        Icon: FajrIcon,
      },
      {
        id: "sunrise",
        nameEn: "SUNRISE",
        nameBn: "সূর্যোদয়",
        timeEn: "5:55 AM",
        timeBn: "৫:৫৫ পূর্বাহ্ন",
        time24: "05:55",
        Icon: SunriseHeaderIcon,
      },
      {
        id: "dhuhr",
        nameEn: "DHUHR",
        nameBn: "যোহর",
        timeEn: "12:16 PM",
        timeBn: "১২:১৬ অপরাহ্ন",
        time24: "12:16",
        Icon: DhuhrIcon,
      },
      {
        id: "asr",
        nameEn: "ASR",
        nameBn: "আসর",
        timeEn: "4:35 PM",
        timeBn: "৪:৩৫ অপরাহ্ন",
        time24: "16:35",
        Icon: AsrIcon,
      },
      {
        id: "maghrib",
        nameEn: "MAGHRIB",
        nameBn: "মাগরিব",
        timeEn: "6:31 PM",
        timeBn: "৬:৩১ অপরাহ্ন",
        time24: "18:31",
        Icon: MaghribIcon,
      },
      {
        id: "isha",
        nameEn: "ISHA",
        nameBn: "এশা",
        timeEn: "7:48 PM",
        timeBn: "৭:৪৮ অপরাহ্ন",
        time24: "19:48",
        Icon: IshaIcon,
      },
    ],
    []
  );

  // Helper: Convert time string to Date
  function parseDhakaToLocal(time24: string, refDate = new Date()) {
    const [hh, mm] = time24.split(":");
    const year = refDate.getFullYear();
    const month = String(refDate.getMonth() + 1).padStart(2, "0");
    const day = String(refDate.getDate()).padStart(2, "0");
    const iso = `${year}-${month}-${day}T${hh}:${mm}:00+06:00`;
    return new Date(iso);
  }

  const now = isMounted ? currentTime : STATIC_REF_DATE;
  const nextIndex = prayers.findIndex((p) => parseDhakaToLocal(p.time24) > now);
  const activeIndex = nextIndex === -1 ? 0 : nextIndex;

  // Format dynamic date
  const dateFormatted = useMemo(() => {
    if (bn) {
      return "মঙ্গলবার, ১৮ আগস্ট ২০২৫";
    }
    return now.toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [now, bn]);

  // Dynamic live digital clock readout
  const liveClockString = useMemo(() => {
    if (!isMounted) return "6:00:00 AM";
    return now.toLocaleTimeString("en-US", {
      timeZone: "Asia/Dhaka",
      hour12: true,
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
  }, [now, isMounted]);

  return (
    <section id="prayer-times" className="relative bg-[#040e0b] py-10 px-4 sm:px-6 lg:px-8 text-white overflow-hidden">
      {/* Background Subtle Gradient Glow */}
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-[#0c382b]/30 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto">
        <PrayerReveal>
          {/* Main Card Container */}
          <div className="rounded-xl border border-[#c79a45]/30 bg-gradient-to-b from-[#071d16] via-[#051812] to-[#04120e] p-4 xs:p-6 sm:p-8 lg:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-md">
            
            {/* Top Grid: 2 Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch">
              
              {/* Left Panel: Header, Cards, Quote (col-span-7) */}
              <div className="prayer-left-panel lg:col-span-7 flex flex-col justify-between space-y-4 sm:space-y-6">
                
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
                  <div>
                    <span className="text-[10px] xs:text-xs font-bold tracking-[0.2em] text-[#dca74e] uppercase block">
                      {bn ? "আজকের নামাজের সময়" : "TODAY'S PRAYER TIMES"}
                    </span>
                    <h2 className="text-xl xs:text-2xl sm:text-3xl lg:text-3xl xl:text-4xl font-serif font-bold text-white mt-1 flex flex-col gap-1">
                      <span suppressHydrationWarning>{dateFormatted}</span>
                      <span className="w-12 sm:w-16 h-0.5 bg-[#dca74e] rounded-full mt-1" />
                    </h2>
                  </div>

                  <Link
                    href="/prayer-times"
                    className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 xs:px-4 xs:py-2 rounded-lg border border-[#dca74e]/50 bg-black/40 hover:bg-[#dca74e]/20 text-[#f5d78e] text-[11px] sm:text-xs font-semibold tracking-wide transition shadow-sm shrink-0"
                  >
                    <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span>{bn ? "সম্পূর্ণ সময়সূচি →" : "Full Timetable →"}</span>
                  </Link>
                </div>

                {/* 6 Prayer Cards Row */}
                <div className="grid grid-cols-2 xs:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 pt-1 sm:pt-2">
                  {prayers.map((prayer, i) => {
                    const isNext = i === activeIndex;
                    const prayerDate = parseDhakaToLocal(prayer.time24);
                    const isPassed = prayerDate <= now && !isNext;

                    const IconComponent = prayer.Icon;
                    const [timeNum, period] = (bn ? prayer.timeBn : prayer.timeEn).split(" ");

                    return (
                      <div
                        key={prayer.id}
                        className={`prayer-card relative rounded-lg p-2.5 xs:p-3 sm:p-3.5 flex flex-col items-center justify-between text-center transition-all duration-300 min-h-[145px] xs:min-h-[155px] sm:min-h-[170px] ${
                          isNext
                            ? "bg-gradient-to-b from-[#0f4434] to-[#08291f] border-2 border-[#dca74e] shadow-[0_0_30px_rgba(220,167,78,0.3)] transform -translate-y-1 z-10"
                            : "bg-[#09221a]/80 border border-[#163b2d] hover:border-[#dca74e]/40 hover:bg-[#0c2b21]"
                        }`}
                      >
                        {/* Prayer Line Icon */}
                        <div className={`mt-0.5 ${isNext ? "text-[#f5d78e]" : "text-[#8ea499]"}`}>
                          <IconComponent className="w-5 h-5 xs:w-6 xs:h-6" />
                        </div>

                        {/* Prayer Name */}
                        <span className={`text-[10px] xs:text-[11px] font-bold tracking-widest uppercase mt-1.5 ${isNext ? "text-[#f5d78e]" : "text-[#8ea499]"}`}>
                          {bn ? prayer.nameBn : prayer.nameEn}
                        </span>

                        {/* Main Time Digits */}
                        <div className="my-1.5">
                          <span className={`text-xl xs:text-2xl sm:text-3xl lg:text-2xl xl:text-3xl font-extrabold tracking-tight block ${isNext ? "text-white" : "text-white/90"}`}>
                            {timeNum}
                          </span>
                          <span className={`text-[9px] xs:text-[10px] sm:text-[11px] font-medium block uppercase ${isNext ? "text-[#f5d78e]" : "text-[#7a9387]"}`}>
                            {period}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div className="min-h-[18px] sm:min-h-[20px] flex items-center justify-center">
                          {isNext ? (
                            <span className="text-[9px] xs:text-[10px] font-extrabold tracking-widest uppercase text-[#f5d78e] px-2 py-0.5 rounded-md bg-[#dca74e]/20 border border-[#dca74e]/40">
                              {bn ? "পরবর্তী" : "NEXT"}
                            </span>
                          ) : isPassed ? (
                            <span className="text-[9px] xs:text-[10px] font-bold tracking-wider uppercase text-[#547365]">
                              {bn ? "পার হয়েছে" : "PASSED"}
                            </span>
                          ) : (
                            <span className="text-[9px] xs:text-[10px] font-bold tracking-wider uppercase text-[#6f8d7f]">
                              {bn ? "আসন্ন" : "UPCOMING"}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Quote Box */}
                <div className="relative rounded-lg border border-[#1b4334] bg-gradient-to-r from-[#0a271e] via-[#082019] to-[#061913] p-3.5 xs:p-4 sm:p-5 flex items-center gap-3 sm:gap-4 overflow-hidden shadow-md">
                  {/* Mosque Line Icon Badge */}
                  <div className="shrink-0 w-9 h-9 xs:w-11 xs:h-11 sm:w-12 sm:h-12 rounded-lg bg-[#dca74e]/15 border border-[#dca74e]/40 flex items-center justify-center text-[#f5d78e]">
                    <MosqueIcon className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6" />
                  </div>

                  {/* Quote Text */}
                  <div className="relative z-10 min-w-0 pr-8 sm:pr-12">
                    <p className="text-[11px] xs:text-xs sm:text-sm lg:text-base font-serif italic text-white/90 leading-relaxed">
                      {bn
                        ? "“নিশ্চয়ই সালাত অশ্লীল ও মন্দ কাজ থেকে বিরত রাখে।”"
                        : "“Indeed, prayer prohibits immorality and wrongdoing.”"}
                    </p>
                    <p className="text-[10px] xs:text-xs font-semibold text-[#dca74e] mt-0.5 sm:mt-1">
                      {bn ? "— কুরআন ২৯:৪৫" : "— Quran 29:45"}
                    </p>
                  </div>

                  {/* Faint Decorative Background Minaret Silhouette */}
                  <div className="absolute right-2 bottom-0 top-0 opacity-15 pointer-events-none flex items-end text-[#dca74e]">
                    <svg className="h-full w-24 sm:w-32" viewBox="0 0 100 100" fill="currentColor">
                      <path d="M10,100 L10,50 L20,30 L30,50 L30,100 Z M40,100 L40,30 L50,10 L60,30 L60,100 Z M70,100 L70,60 L80,45 L90,60 L90,100 Z" />
                    </svg>
                  </div>
                </div>

              </div>

              {/* Right Panel: Ornate Next Prayer & Live Clock Card (col-span-5) */}
              <div className="prayer-right-panel lg:col-span-5 rounded-xl border border-[#dca74e]/40 bg-gradient-to-b from-[#0d3326] via-[#09271e] to-[#051711] p-4 xs:p-5 sm:p-6 flex flex-col items-center justify-between text-center relative overflow-hidden shadow-xl min-h-[380px] xs:min-h-[400px] sm:min-h-[420px]">
                
                {/* Background Islamic Arch Silhouette */}
                <div className="absolute inset-0 border-t-4 border-[#dca74e]/50 pointer-events-none rounded-xl" />

                {/* Top Badge & Next Prayer Title */}
                <div className="relative z-10 pt-1">
                  <span className="text-[10px] xs:text-xs font-bold tracking-[0.25em] text-[#dca74e] uppercase block flex items-center justify-center gap-1.5">
                    <span>✦</span>
                    <span>{bn ? "পরবর্তী নামাজ" : "NEXT PRAYER"}</span>
                    <span>✦</span>
                  </span>
                  <h3 className="text-2xl xs:text-3xl sm:text-4xl font-serif font-bold text-white mt-1 sm:mt-1.5 tracking-wide">
                    {bn ? prayers[activeIndex].nameBn : prayers[activeIndex].nameEn}
                  </h3>
                </div>

                {/* Center Ornate Live Analog Clock */}
                <OrnateAnalogClock time={now} />

                {/* Live Digital Time Pill */}
                <div className="relative z-10 bg-black/60 border border-[#dca74e]/50 px-4 py-1.5 xs:px-6 xs:py-2 rounded-full flex flex-col items-center shadow-lg mt-1">
                  <div className="flex items-center gap-1.5 sm:gap-2 font-mono text-lg xs:text-xl sm:text-2xl font-bold tracking-wider text-white">
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#dca74e]" />
                    <span suppressHydrationWarning>{liveClockString}</span>
                  </div>
                  <span className="text-[10px] xs:text-[11px] font-medium text-[#8ea499] uppercase tracking-wider">
                    {bn ? "ঢাকা সময়" : "Dhaka Time"}
                  </span>
                </div>

                {/* Bottom Jumu'ah Prayer Info */}
                <div className="relative z-10 border-t border-[#1b4837] w-full pt-3 sm:pt-4 mt-3 sm:mt-4">
                  <span className="text-[10px] xs:text-xs font-bold tracking-widest text-[#dca74e] uppercase block flex items-center justify-center gap-1">
                    <span>✦</span>
                    <span>{bn ? "জুমু'আর নামাজ" : "JUMU'AH PRAYER"}</span>
                    <span>✦</span>
                  </span>
                  <p className="text-[11px] xs:text-xs sm:text-sm font-medium text-white/90 mt-1">
                    {bn
                      ? "প্রথম জামাত: ১:১৫ অপরাহ্ন  •  দ্বিতীয় জামাত: ২:১৫ অপরাহ্ন"
                      : "First: 1:15 PM  •  Second: 2:15 PM"}
                  </p>
                </div>

              </div>

            </div>

            {/* Bottom Feature Banner */}
            <div className="mt-6 sm:mt-8 rounded-lg border border-[#1b4334] bg-gradient-to-r from-[#061c16] via-[#08261e] to-[#051711] p-4 xs:p-5 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 relative overflow-hidden shadow-lg">
              
              {/* Left Headline */}
              <div className="flex items-center gap-3 border-r-0 md:border-r border-[#1a4435] pr-0 md:pr-8 text-center md:text-left">
                <p className="text-base xs:text-lg sm:text-xl font-serif font-bold text-white tracking-wide">
                  {bn ? "আপনার ঈমানের সাথে সংযুক্ত থাকুন" : "Stay connected with your faith"}
                </p>
              </div>

              {/* Middle 3 Features with Circular Gold Icon Badges */}
              <div className="flex flex-wrap items-center justify-center gap-4 xs:gap-6 sm:gap-10">
                
                {/* Feature 1: Accurate Timings */}
                <div className="flex items-center gap-2.5 xs:gap-3">
                  <div className="w-8 h-8 xs:w-10 xs:h-10 rounded-full bg-[#dca74e]/15 border border-[#dca74e]/40 flex items-center justify-center text-[#f5d78e] shrink-0">
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div className="text-left">
                    <span className="block text-[11px] xs:text-xs sm:text-sm font-bold text-white">
                      {bn ? "সঠিক সময়সূচি" : "Accurate"}
                    </span>
                    <span className="block text-[10px] xs:text-[11px] text-[#8ea499]">
                      {bn ? "নামাজের সময়" : "Timings"}
                    </span>
                  </div>
                </div>

                {/* Feature 2: Automatic Updates */}
                <div className="flex items-center gap-2.5 xs:gap-3">
                  <div className="w-8 h-8 xs:w-10 xs:h-10 rounded-full bg-[#dca74e]/15 border border-[#dca74e]/40 flex items-center justify-center text-[#f5d78e] shrink-0">
                    <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div className="text-left">
                    <span className="block text-[11px] xs:text-xs sm:text-sm font-bold text-white">
                      {bn ? "স্বয়ংক্রিয়" : "Automatic"}
                    </span>
                    <span className="block text-[10px] xs:text-[11px] text-[#8ea499]">
                      {bn ? "আপডেট" : "Updates"}
                    </span>
                  </div>
                </div>

                {/* Feature 3: Location Based */}
                <div className="flex items-center gap-2.5 xs:gap-3">
                  <div className="w-8 h-8 xs:w-10 xs:h-10 rounded-full bg-[#dca74e]/15 border border-[#dca74e]/40 flex items-center justify-center text-[#f5d78e] shrink-0">
                    <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div className="text-left">
                    <span className="block text-[11px] xs:text-xs sm:text-sm font-bold text-white">
                      {bn ? "অবস্থান" : "Location"}
                    </span>
                    <span className="block text-[10px] xs:text-[11px] text-[#8ea499]">
                      {bn ? "ভিত্তিক" : "Based"}
                    </span>
                  </div>
                </div>

              </div>

              {/* Right Decorative Mosque Artwork Vector */}
              <div className="hidden lg:block shrink-0 opacity-40 text-[#dca74e]">
                <svg className="w-28 h-12" viewBox="0 0 120 50" fill="currentColor">
                  <path d="M60,0 C65,15 75,25 75,45 L45,45 C45,25 55,15 60,0 Z M20,15 C23,25 30,30 30,45 L10,45 C10,30 17,25 20,15 Z M100,15 C103,25 110,30 110,45 L90,45 C90,30 97,25 100,15 Z M0,45 L120,45 L120,50 L0,50 Z" />
                </svg>
              </div>

            </div>

          </div>
        </PrayerReveal>
      </div>
    </section>
  );
}

export default PrayerTimesSection;
