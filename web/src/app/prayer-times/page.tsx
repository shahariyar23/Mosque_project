"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useLanguage } from "@/components/language-provider";
import { useMosqueBranding } from "@/components/mosque-branding-provider";
import { siteConfig } from "@/config/site";
import { usePublicPrayerTimes } from "@/hooks/use-public-prayer-times";
import { getTodayInTimezone } from "@/lib/mosque/format";
import {
  Clock,
  Calendar,
  Compass,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  Sparkles,
  Printer,
  MapPin,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Share2,
  Copy,
  Check,
  Users,
  ShieldCheck,
  BookOpen,
} from "lucide-react";

const TIMEZONE = "Asia/Dhaka";
const DAYS_EN = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
const DAYS_BN = ["শনি", "রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র"];

const ARABIC_NAMES: Record<string, string> = {
  fajr: "الفجر",
  sunrise: "الشروق",
  dhuhr: "الظهر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
};

const PRAYER_ICONS: Record<string, any> = {
  fajr: Sunrise,
  sunrise: Sun,
  dhuhr: Sun,
  asr: Sun,
  maghrib: Sunset,
  isha: Moon,
};

const PRAYER_VIRTUES: Record<string, { en: string; bn: string }> = {
  fajr: {
    en: "The two Sunnah rak'ahs before Fajr are more beloved to the Prophet ﷺ than the entire world.",
    bn: "ফজরের দুই রাকাত সুন্নত দুনিয়া ও তার মধ্যকার সবকিছুর চেয়ে উত্তম ও প্রিয়।",
  },
  sunrise: {
    en: "Marks the formal conclusion of Fajr time. Voluntary prayers are discouraged for ~15 minutes.",
    bn: "সূর্যোদয় ওয়াক্ত ফজরের সমাপ্তি নির্দেশ করে। সূর্য উদয়ের পরবর্তী ১৫ মিনিট নফল নামাজ মাকরূহ।",
  },
  dhuhr: {
    en: "The noon sanctuary prayer, offered when the sun descends past its midday zenith.",
    bn: "দুপুরের প্রধান জামাত, যা সূর্য মধ্য আকাশ থেকে পশ্চিমে ঢলে পড়ার পর আদায় করা হয়।",
  },
  asr: {
    en: "The 'Middle Prayer' (Salat al-Wusta) specifically emphasized in the Holy Quran (2:238).",
    bn: "পবিত্র কুরআনে (সূরা বাক্বারাহ ২:২৩৮) বিশেষভাবে তাকীদপ্রাপ্ত বরকতময় সালাতুল উসতা।",
  },
  maghrib: {
    en: "Commences promptly after sunset. Angels descend at dusk to record evening worship.",
    bn: "সূর্যাস্তের পরপরই সময় শুরু হয় এবং জামাত দ্রুত অনুষ্ঠিত হওয়া সুন্নত ও বরকতপূর্ণ।",
  },
  isha: {
    en: "The night congregation that illuminates the grave and rewards as if standing half the night.",
    bn: "রাত্রিকালীন জামাত—রাসূল ﷺ বলেছেন, এশার জামাতে অংশ নিলে অর্ধরাত নফল নামাজের সওয়াব মেলে।",
  },
};

function parseTimeToDate(time24: string, timezone: string, refDate: Date): Date {
  const [hh, mm] = time24.split(":").map(Number);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(refDate);

  const year = Number(parts.find((part) => part.type === "year")?.value || refDate.getFullYear());
  const month = Number(parts.find((part) => part.type === "month")?.value || refDate.getMonth() + 1);
  const day = Number(parts.find((part) => part.type === "day")?.value || refDate.getDate());
  const offsetMinutes = getTimezoneOffsetMinutes(timezone, refDate);
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absMinutes = Math.abs(offsetMinutes);
  const offsetHours = Math.floor(absMinutes / 60);
  const offsetRemainder = absMinutes % 60;
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00${sign}${String(offsetHours).padStart(2, "0")}:${String(offsetRemainder).padStart(2, "0")}`;
  return new Date(iso);
}

function getTimezoneOffsetMinutes(timezone: string, date: Date): number {
  const utc = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const local = new Date(date.toLocaleString("en-US", { timeZone: timezone }));
  return (local.getTime() - utc.getTime()) / 60000;
}

function formatCountdown(totalSeconds: number): { hours: string; minutes: string; seconds: string } {
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.max(totalSeconds % 60, 0)
    .toString()
    .padStart(2, "0");
  return { hours, minutes, seconds };
}

function getIqamahTime(prayerId: string, time24: string, isBn: boolean): string {
  if (!time24 || time24 === "--:--") return "--:--";
  const [hh, mm] = time24.split(":").map(Number);
  if (isNaN(hh) || isNaN(mm)) return "--:--";

  if (prayerId === "sunrise") {
    return isBn ? "জামাত প্রযোজ্য নয়" : "No congregation";
  }

  // Authentic standard offsets for Dhaka mosques
  let offsetMinutes = 15;
  if (prayerId === "fajr") offsetMinutes = 20;
  else if (prayerId === "dhuhr") offsetMinutes = 20;
  else if (prayerId === "asr") offsetMinutes = 15;
  else if (prayerId === "maghrib") offsetMinutes = 5;
  else if (prayerId === "isha") offsetMinutes = 20;

  const totalMin = hh * 60 + mm + offsetMinutes;
  const newHh = Math.floor(totalMin / 60) % 24;
  const newMm = totalMin % 60;

  const period = newHh >= 12 ? "PM" : "AM";
  const hour12 = newHh % 12 || 12;

  if (isBn) {
    const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
    const toBn = (n: number) =>
      String(n)
        .split("")
        .map((d) => bnDigits[Number(d)] ?? d)
        .join("");
    const bnPeriod = newHh >= 12 ? "অপরাহ্ন" : "পূর্বাহ্ন";
    return `${toBn(hour12)}:${toBn(newMm).padStart(2, "০")} ${bnPeriod}`;
  }

  return `${hour12}:${String(newMm).padStart(2, "0")} ${period}`;
}

function formatMonthLabel(date: Date, isBn: boolean): string {
  return new Intl.DateTimeFormat(isBn ? "bn-BD" : "en-GB", {
    timeZone: TIMEZONE,
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatLongDate(dateValue: string, isBn: boolean): string {
  return new Intl.DateTimeFormat(isBn ? "bn-BD" : "en-GB", {
    timeZone: TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateValue}T12:00:00+06:00`));
}

function getCalendarDays(year: number, month: number): Array<number | null> {
  const firstDay = new Date(year, month, 1).getDay();
  // Saturday = 0 in Bangladeshi week
  const saturdayOffset = (firstDay + 1) % 7;
  const dateCount = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: saturdayOffset + dateCount }, (_, index) =>
    index < saturdayOffset ? null : index - saturdayOffset + 1,
  );
}

export default function PrayerTimesPage() {
  const { language } = useLanguage();
  const isBn = language === "bn";
  const { branding } = useMosqueBranding();
  const today = getTodayInTimezone(TIMEZONE);

  const {
    prayers: livePrayers,
    jumuah,
    timezone,
    hijriDate,
    nextPrayerIndex,
    countdownSeconds,
    loading,
    error,
  } = usePublicPrayerTimes();

  const [selectedDate, setSelectedDate] = useState(today);
  const [monthAnchor, setMonthAnchor] = useState(() => new Date(`${today}T12:00:00+06:00`));
  const [now, setNow] = useState<Date>(new Date());
  const [copiedTime, setCopiedTime] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setSelectedDate(today);
    setMonthAnchor(new Date(`${today}T12:00:00+06:00`));
  }, [today]);

  const prayerList = useMemo(() => {
    if (!livePrayers.length) {
      return [
        { id: "fajr", name: isBn ? "ফজর" : "Fajr", time: "04:35 AM", time24: "04:35" },
        { id: "sunrise", name: isBn ? "সূর্যোদয়" : "Sunrise", time: "05:52 AM", time24: "05:52" },
        { id: "dhuhr", name: isBn ? "যোহর" : "Dhuhr", time: "12:05 PM", time24: "12:05" },
        { id: "asr", name: isBn ? "আসর" : "Asr", time: "04:22 PM", time24: "16:22" },
        { id: "maghrib", name: isBn ? "মাগরিব" : "Maghrib", time: "06:12 PM", time24: "18:12" },
        { id: "isha", name: isBn ? "এশা" : "Isha", time: "07:30 PM", time24: "19:30" },
      ];
    }

    return livePrayers.map((prayer) => ({
      id: prayer.id,
      name: isBn ? prayer.nameBn : prayer.nameEn,
      time: isBn ? prayer.timeBn : prayer.timeEn,
      time24: prayer.time24,
    }));
  }, [isBn, livePrayers]);

  const nextPrayer = useMemo(() => {
    if (!prayerList.length) return null;

    const schedule = prayerList
      .filter((prayer) => prayer.time24 && prayer.id !== "sunrise")
      .map((prayer) => ({
        ...prayer,
        date: parseTimeToDate(prayer.time24, timezone || TIMEZONE, now),
      }));

    if (!schedule.length) return null;
    let chosen = schedule.find((prayer) => prayer.date > now) ?? schedule[0];
    if (chosen.date <= now) {
      chosen = {
        ...chosen,
        date: new Date(chosen.date.getTime() + 24 * 60 * 60 * 1000),
      };
    }
    const remainingSeconds = Math.max(0, Math.floor((chosen.date.getTime() - now.getTime()) / 1000));
    return { ...chosen, remainingSeconds };
  }, [prayerList, now, timezone]);

  const activeIndex = nextPrayerIndex >= 0 && nextPrayerIndex < prayerList.length ? nextPrayerIndex : 0;
  const nextPrayerLabel = nextPrayer?.name ?? (isBn ? "ফজর" : "Fajr");
  const nextPrayerId = nextPrayer?.id ?? "fajr";
  const nextPrayerTime = nextPrayer?.time ?? "--:--";
  const nextPrayerIqamah = nextPrayer ? getIqamahTime(nextPrayer.id, nextPrayer.time24, isBn) : "--:--";
  const countdown = nextPrayer?.remainingSeconds ?? countdownSeconds ?? 0;
  const countdownParts = formatCountdown(countdown);

  const selectedMonthLabel = formatMonthLabel(monthAnchor, isBn);
  const selectedDayLabel = formatLongDate(selectedDate, isBn);
  const todayLabel = formatLongDate(today, isBn);

  const todayTimeText = new Intl.DateTimeFormat(isBn ? "bn-BD" : "en-US", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(now);

  const todayHijri = hijriDate || (isBn ? "১০ রবিউল আউয়াল ১৪৪৮ হিজরি" : "10 Rabi' al-Awwal 1448 AH");

  // Jumuah Schedule defaults if none configured
  const effectiveJumuah = jumuah.length > 0 ? jumuah : [
    {
      date: null,
      khutbahTime: isBn ? "১২:৪৫ অপরাহ্ন" : "12:45 PM",
      prayerTime: isBn ? "০১:১৫ অপরাহ্ন" : "01:15 PM",
      imam: isBn ? "মুফতি মাওলানা আব্দুল্লাহ" : "Mufti Maulana Abdullah",
      location: isBn ? "প্রধান জামাত হল" : "Main Prayer Sanctuary",
      notes: isBn ? "প্রথম জামাত · বাংলা বয়ান ও আরবি খুতবা" : "1st Congregation · Bengali Discourse & Arabic Khutbah",
    },
    {
      date: null,
      khutbahTime: isBn ? "০১:৪৫ অপরাহ্ন" : "01:45 PM",
      prayerTime: isBn ? "০২:১৫ অপরাহ্ন" : "02:15 PM",
      imam: isBn ? "শায়খ আহমদ উল্লাহ" : "Shaykh Ahmadullah",
      location: isBn ? "প্রধান জামাত হল ও প্রাঙ্গণ" : "Main Hall & Extended Courtyard",
      notes: isBn ? "দ্বিতীয় জামাত · মুসল্লিদের সুবিধার্থে" : "2nd Congregation · Expanded Overflow Session",
    },
  ];

  const resetToToday = () => {
    setSelectedDate(today);
    setMonthAnchor(new Date(`${today}T12:00:00+06:00`));
  };

  const changeMonth = (direction: number) => {
    const next = new Date(monthAnchor);
    next.setMonth(next.getMonth() + direction);
    setMonthAnchor(next);
    setSelectedDate(
      `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`,
    );
  };

  const copyPrayerTimes = () => {
    const text = prayerList
      .map((p) => `${p.name}: Adhan ${p.time} | Jamat ${getIqamahTime(p.id, p.time24, false)}`)
      .join("\n");
    navigator.clipboard?.writeText(
      `🕌 ${branding.name || siteConfig.name} - Prayer Times (${selectedDate})\n${text}\n📍 Dhaka, Bangladesh`,
    );
    setCopiedTime(true);
    setTimeout(() => setCopiedTime(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const monthDays = getCalendarDays(monthAnchor.getFullYear(), monthAnchor.getMonth());
  const weekDayLabels = isBn ? DAYS_BN : DAYS_EN;

  return (
    <div className="min-h-screen bg-[#f8f6ef] text-[#17211d] flex flex-col selection:bg-[#c79a45] selection:text-white">
      <SiteHeader />

      {/* 1. Islamic Hero Section */}
      <section className="relative overflow-hidden bg-[#072a20] text-white pt-32 sm:pt-36 pb-14 sm:pb-20 px-4 xs:px-6 lg:px-8 border-b border-[#c79a45]/25">
        {/* Subtle Ambient Islamic Texture */}
        <div
          className="absolute inset-0 opacity-10 bg-repeat pointer-events-none"
          style={{
            backgroundImage: "url('/textures/islamic-geometric.svg')",
            backgroundSize: "260px 260px",
          }}
          aria-hidden="true"
        />

        {/* Ambient Glow Orbs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#0d4d3b] filter blur-3xl opacity-50 pointer-events-none" />
        <div className="absolute top-1/2 -right-24 w-80 h-80 rounded-full bg-[#c79a45]/20 filter blur-3xl opacity-40 pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div className="max-w-3xl">
              {/* Eyebrow Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#c79a45]/40 bg-[#041d16]/70 text-[#e0be79] text-xs font-semibold tracking-[0.2em] uppercase shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {isBn
                    ? "দৈনিক ওয়াক্ত ও জামাতের সঠিক সময়সূচি"
                    : "PRAYER TIMES & DAILY CONGREGATIONS"}
                </span>
              </div>

              {/* Title */}
              <h1 className="mt-4 text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-[#f5f1e6] leading-tight tracking-tight">
                {isBn ? (
                  <>
                    নামাজের সময়সূচি ও <br />
                    <span className="text-[#e0be79] italic font-normal">জামাতের বিবরণ</span>
                  </>
                ) : (
                  <>
                    Sacred Timings & <br />
                    <span className="text-[#e0be79] italic font-normal">
                      Congregational Schedule
                    </span>
                  </>
                )}
              </h1>

              {/* Subtitle / Metadata Row */}
              <div className="mt-4 sm:mt-5 flex flex-wrap items-center gap-3 text-xs sm:text-sm text-white/80">
                <span className="font-medium text-white">{todayLabel}</span>
                <span className="text-[#c79a45]">✦</span>
                <span className="font-medium text-[#e0be79]">{todayHijri}</span>
                <span className="text-[#c79a45]">✦</span>
                <span className="inline-flex items-center gap-1.5 text-white/85">
                  <MapPin className="w-3.5 h-3.5 text-[#c79a45]" />
                  <span>Dhaka, Bangladesh</span>
                </span>
              </div>
            </div>

            {/* Live Ticker & Qibla Widget */}
            <div className="flex flex-wrap sm:flex-nowrap items-stretch gap-3">
              {/* Live Clock Card */}
              <div className="flex-1 sm:flex-initial p-4 sm:p-5 rounded-2xl bg-[#041d16]/85 border border-[#c79a45]/35 shadow-lg backdrop-blur-md min-w-[200px]">
                <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#e0be79]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    {isBn ? "লাইভ ঘড়ি" : "LIVE TIME"}
                  </span>
                  <span>BST</span>
                </div>
                <div className="mt-2 font-mono text-2xl sm:text-3xl font-bold tracking-wider text-white">
                  {todayTimeText}
                </div>
                <div className="mt-1 text-[11px] text-white/60">
                  {timezone || "Asia/Dhaka (UTC+6)"}
                </div>
              </div>

              {/* Qibla Direction Card */}
              <div className="flex-1 sm:flex-initial p-4 sm:p-5 rounded-2xl bg-[#041d16]/85 border border-[#c79a45]/35 shadow-lg backdrop-blur-md min-w-[170px]">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#e0be79]">
                  <Compass className="w-3.5 h-3.5" />
                  <span>{isBn ? "কিবলা দিক" : "QIBLA"}</span>
                </div>
                <div className="mt-2 font-serif text-2xl font-bold text-white">
                  274° <span className="text-sm font-sans font-medium text-[#e0be79]">WNW</span>
                </div>
                <div className="mt-1 text-[11px] text-white/60">
                  {isBn ? "পশ্চিম-উত্তর-পশ্চিম" : "West-Northwest"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl w-full px-4 xs:px-6 lg:px-8 py-10 sm:py-14 space-y-12 sm:space-y-16">
        
        {/* 2. Top Spotlight: Next Prayer Countdown Card */}
        <section aria-label="Next Prayer Spotlight" className="w-full">
          <div className="relative overflow-hidden rounded-3xl border border-[#c79a45]/50 bg-gradient-to-br from-[#06291f] via-[#093528] to-[#041a13] text-white p-6 sm:p-8 lg:p-10 shadow-2xl">
            {/* Background Arch Ornament */}
            <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-5 pointer-events-none flex items-center justify-end pr-10">
              <svg className="h-96 w-96 text-white" viewBox="0 0 100 100" fill="currentColor">
                <path d="M50 0 C22 0 0 22 0 50 L0 100 L100 100 L100 50 C100 22 78 0 50 0 Z" />
              </svg>
            </div>

            <div className="relative z-10 grid gap-8 lg:grid-cols-12 items-center">
              {/* Left Details */}
              <div className="lg:col-span-6 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c79a45]/20 border border-[#c79a45]/40 text-[#e0be79] text-xs font-bold tracking-[0.18em] uppercase">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{isBn ? "পরবর্তী আসন্ন নামাজ" : "NEXT UPCOMING PRAYER"}</span>
                </div>

                <div className="flex items-baseline gap-4">
                  <h2 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-white tracking-tight">
                    {nextPrayerLabel}
                  </h2>
                  <span className="font-serif text-3xl sm:text-4xl text-[#e0be79] font-normal opacity-90">
                    {ARABIC_NAMES[nextPrayerId] || ""}
                  </span>
                </div>

                <p className="text-sm sm:text-base text-white/80 font-light leading-relaxed max-w-lg">
                  {PRAYER_VIRTUES[nextPrayerId]
                    ? isBn
                      ? PRAYER_VIRTUES[nextPrayerId].bn
                      : PRAYER_VIRTUES[nextPrayerId].en
                    : isBn
                    ? "ওয়াক্তমতো নামাজ আদায় করুন এবং জামাতের সওয়াব গ্রহণ করুন।"
                    : "Establish prayer with devotion and gather with your community in congregation."}
                </p>

                {/* Timings Badges */}
                <div className="pt-2 flex flex-wrap items-center gap-4">
                  <div className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/15">
                    <span className="block text-[10px] uppercase font-bold tracking-widest text-[#e0be79]">
                      {isBn ? "ওয়াক্ত শুরু (আযান)" : "ADHAN (START)"}
                    </span>
                    <span className="text-lg sm:text-xl font-bold text-white">
                      {nextPrayerTime}
                    </span>
                  </div>

                  <div className="px-4 py-2.5 rounded-xl bg-[#c79a45]/20 border border-[#c79a45]/50">
                    <span className="block text-[10px] uppercase font-bold tracking-widest text-[#f5d590]">
                      {isBn ? "জামাত (ইকামত)" : "JAMAT (CONGREGATION)"}
                    </span>
                    <span className="text-lg sm:text-xl font-bold text-white">
                      {nextPrayerIqamah}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Countdown Display */}
              <div className="lg:col-span-6 flex flex-col items-center lg:items-end">
                <div className="w-full max-w-md p-6 sm:p-7 rounded-2xl bg-[#03150e]/80 border border-[#c79a45]/30 text-center shadow-inner">
                  <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#e0be79] mb-4">
                    {isBn ? "ওয়াক্ত হতে অবশিষ্ট সময়" : "COUNTDOWN TO NEXT PRAYER"}
                  </p>

                  {/* Digits Display */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 font-mono">
                    <div className="p-3 sm:p-4 rounded-xl bg-black/40 border border-white/10">
                      <span className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
                        {countdownParts.hours}
                      </span>
                      <span className="mt-1 block text-[10px] uppercase tracking-wider text-white/60">
                        {isBn ? "ঘণ্টা" : "HOURS"}
                      </span>
                    </div>

                    <div className="p-3 sm:p-4 rounded-xl bg-black/40 border border-white/10">
                      <span className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
                        {countdownParts.minutes}
                      </span>
                      <span className="mt-1 block text-[10px] uppercase tracking-wider text-white/60">
                        {isBn ? "মিনিট" : "MINS"}
                      </span>
                    </div>

                    <div className="p-3 sm:p-4 rounded-xl bg-black/40 border border-white/10">
                      <span className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#e0be79]">
                        {countdownParts.seconds}
                      </span>
                      <span className="mt-1 block text-[10px] uppercase tracking-wider text-white/60">
                        {isBn ? "সেকেন্ড" : "SECS"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-center gap-2 text-xs text-white/70">
                    <Clock className="w-3.5 h-3.5 text-[#c79a45]" />
                    <span>
                      {isBn
                        ? "মসজিদে পৌঁছানোর জন্য প্রস্তুত হোন"
                        : "Prepare for congregation at Noor Sanctuary"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Today's Full Schedule (5 Daily Prayers + Sunrise) */}
        <section aria-labelledby="daily-schedule-heading" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[#e5e1d3]">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-[#0d4d3b] uppercase">
                <Sun className="w-4 h-4 text-[#c79a45]" />
                <span>{isBn ? "দৈনিক পাঁচ ওয়াক্ত সালাত" : "OBLIGATORY PRAYERS"}</span>
              </div>
              <h2 id="daily-schedule-heading" className="mt-2 text-2xl xs:text-3xl sm:text-4xl font-serif font-bold text-[#0e2a22]">
                {isBn ? "আজকের পূর্ণাঙ্গ সময়সূচি" : "Today's Complete Schedule"}
              </h2>
            </div>

            {/* Actions: Copy & Print */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={copyPrayerTimes}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#d2ccc0] bg-white text-xs font-semibold text-[#0d4d3b] hover:bg-[#faf7f0] hover:border-[#c79a45] transition shadow-sm min-h-[40px]"
              >
                {copiedTime ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#c79a45]" />}
                <span>{copiedTime ? (isBn ? "কপি হয়েছে!" : "Copied!") : isBn ? "সময়সূচি কপি করুন" : "Copy Times"}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0d4d3b] text-white text-xs font-semibold hover:bg-[#072a20] transition shadow-sm min-h-[40px]"
              >
                <Printer className="w-3.5 h-3.5 text-[#e0be79]" />
                <span>{isBn ? "প্রিন্ট করুন" : "Print Timetable"}</span>
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {prayerList.map((prayer) => {
              const isNext = prayer.id === nextPrayerId;
              const isSunrise = prayer.id === "sunrise";
              const IconComponent = PRAYER_ICONS[prayer.id] || Sun;
              const iqamah = getIqamahTime(prayer.id, prayer.time24, isBn);

              return (
                <div
                  key={prayer.id}
                  className={`relative overflow-hidden rounded-2xl border p-5 sm:p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-lg ${
                    isNext
                      ? "border-[#c79a45] bg-gradient-to-br from-[#0d4d3b] to-[#072a20] text-white shadow-xl scale-[1.01]"
                      : isSunrise
                      ? "border-[#e0d6c1] bg-[#faf8f2] text-[#17211d]"
                      : "border-[#e7e3d7] bg-white text-[#17211d] hover:border-[#c79a45]/60"
                  }`}
                >
                  {/* Top Header */}
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            isNext
                              ? "bg-[#c79a45] text-[#072a20]"
                              : isSunrise
                              ? "bg-amber-100 text-amber-700"
                              : "bg-[#0d4d3b]/10 text-[#0d4d3b]"
                          }`}
                        >
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div>
                          <h3
                            className={`font-serif text-lg font-bold leading-tight ${
                              isNext ? "text-white" : "text-[#0e2a22]"
                            }`}
                          >
                            {prayer.name}
                          </h3>
                          <span
                            className={`text-xs font-serif font-medium ${
                              isNext ? "text-[#e0be79]" : "text-[#7b8782]"
                            }`}
                          >
                            {ARABIC_NAMES[prayer.id] || ""}
                          </span>
                        </div>
                      </div>

                      {/* Status Tag */}
                      {isNext ? (
                        <span className="px-2.5 py-1 rounded-full bg-[#c79a45] text-[#072a20] text-[10px] font-bold uppercase tracking-wider shadow-sm">
                          {isBn ? "আসন্ন ওয়াক্ত" : "UPCOMING"}
                        </span>
                      ) : isSunrise ? (
                        <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
                          {isBn ? "সূর্যোদয়" : "SOLAR"}
                        </span>
                      ) : null}
                    </div>

                    {/* Timings Row */}
                    <div className="mt-5 grid grid-cols-2 gap-3 pt-4 border-t border-current/10">
                      <div>
                        <span
                          className={`block text-[10px] font-bold uppercase tracking-wider ${
                            isNext ? "text-[#e0be79]" : "text-[#7b8782]"
                          }`}
                        >
                          {isBn ? "ওয়াক্ত শুরু" : "ADHAN (START)"}
                        </span>
                        <div
                          className={`mt-1 font-serif text-xl sm:text-2xl font-bold ${
                            isNext ? "text-white" : "text-[#0e2a22]"
                          }`}
                        >
                          {prayer.time}
                        </div>
                      </div>

                      <div>
                        <span
                          className={`block text-[10px] font-bold uppercase tracking-wider ${
                            isNext ? "text-[#e0be79]" : "text-[#c79a45]"
                          }`}
                        >
                          {isSunrise
                            ? isBn
                              ? "ওয়াক্ত সমাপ্তি"
                              : "FAJR END"
                            : isBn
                            ? "জামাত"
                            : "JAMAT (IQAMAH)"}
                        </span>
                        <div
                          className={`mt-1 font-serif text-xl sm:text-2xl font-bold ${
                            isNext ? "text-white" : isSunrise ? "text-[#69726d]" : "text-[#0d4d3b]"
                          }`}
                        >
                          {iqamah}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Spiritual Note */}
                  <div className="mt-4 pt-3 border-t border-current/10 text-[11px] leading-relaxed opacity-85">
                    {PRAYER_VIRTUES[prayer.id]
                      ? isBn
                        ? PRAYER_VIRTUES[prayer.id].bn
                        : PRAYER_VIRTUES[prayer.id].en
                      : ""}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. Jumu'ah (Friday Congregation) Spotlight Card */}
        <section aria-labelledby="jumuah-schedule-heading" className="w-full">
          <div className="relative overflow-hidden rounded-3xl border border-[#c79a45]/40 bg-white p-6 sm:p-8 lg:p-10 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#e5e1d3]">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-[#0d4d3b] uppercase">
                  <Sparkles className="w-4 h-4 text-[#c79a45]" />
                  <span>{isBn ? "সাপ্তাহিক শ্রেষ্ঠ দিন" : "WEEKLY CONGREGATION"}</span>
                </div>
                <h2 id="jumuah-schedule-heading" className="mt-2 text-2xl xs:text-3xl sm:text-4xl font-serif font-bold text-[#0e2a22]">
                  {isBn ? "পবিত্র জুমু'আ নামাজের সময়সূচি" : "Friday Jumu'ah Prayers"}
                </h2>
              </div>
              <div className="text-xs sm:text-sm text-[#718079] max-w-sm">
                {isBn
                  ? "জুমার দিনে সুগন্ধি ব্যবহার করা, সুরত আল-কাহাফ তেলাওয়াত করা এবং আগেভাগে মসজিদে উপস্থিত হওয়া সুন্নত।"
                  : "Arrive early, perform Sunnah ghusl, recite Surah Al-Kahf, and attend the blessed congregation."}
              </div>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {effectiveJumuah.map((shift, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-[#e5e1d3] bg-[#faf8f3] p-5 sm:p-6 flex flex-col justify-between hover:border-[#c79a45]/60 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 rounded-full bg-[#0d4d3b] text-white text-xs font-bold uppercase tracking-wider">
                        {idx === 0
                          ? isBn
                            ? "১ম জামাত"
                            : "1st Jumu'ah"
                          : isBn
                          ? "২য় জামাত"
                          : "2nd Jumu'ah"}
                      </span>
                      <span className="text-xs font-medium text-[#718079]">
                        {shift.location || "Main Sanctuary"}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-4">
                      <div className="p-3.5 rounded-xl bg-white border border-[#e5e1d3]">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-[#7b8782]">
                          {isBn ? "খুতবা শুরু" : "KHUTBAH"}
                        </span>
                        <div className="mt-1 font-serif text-xl sm:text-2xl font-bold text-[#0e2a22]">
                          {shift.khutbahTime}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-[#0d4d3b]/10 border border-[#0d4d3b]/20">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-[#0d4d3b]">
                          {isBn ? "নামাজ শুরু" : "JAMAT"}
                        </span>
                        <div className="mt-1 font-serif text-xl sm:text-2xl font-bold text-[#0d4d3b]">
                          {shift.prayerTime}
                        </div>
                      </div>
                    </div>

                    {shift.imam && (
                      <div className="mt-4 flex items-center gap-2 text-xs text-[#0e2a22]">
                        <Users className="w-3.5 h-3.5 text-[#c79a45] shrink-0" />
                        <span className="font-semibold">{isBn ? "খতীব ও ইমাম:" : "Khateeb & Imam:"}</span>
                        <span>{shift.imam}</span>
                      </div>
                    )}
                  </div>

                  {shift.notes && (
                    <p className="mt-4 text-xs text-[#69726d] leading-relaxed pt-3 border-t border-[#ece6db]">
                      {shift.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. Prohibited Times Guide & Qiblah Info */}
        <section aria-labelledby="forbidden-times-heading" className="grid gap-6 lg:grid-cols-12">
          {/* Prohibited Times Card */}
          <div className="lg:col-span-8 rounded-3xl border border-amber-200 bg-amber-50/60 p-6 sm:p-8">
            <div className="flex items-center gap-2.5 text-xs font-bold tracking-[0.18em] text-amber-900 uppercase">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>{isBn ? "নামাজের নিষিদ্ধ ও মাকরূহ সময়" : "PROHIBITED PRAYER TIMES (MAKRUH WAQT)"}</span>
            </div>

            <h3 id="forbidden-times-heading" className="mt-2 text-xl sm:text-2xl font-serif font-bold text-amber-950">
              {isBn
                ? "যেসব সময়ে নফল নামাজ আদায় করা নিষেধ"
                : "Times When Voluntary (Nafl) Prayers are Forbidden"}
            </h3>

            <p className="mt-2 text-xs sm:text-sm text-amber-900/80 leading-relaxed">
              {isBn
                ? "সহীহ হাদিস অনুযায়ী তিন সময়ে যেকোনো ধরনের সালাত আদায় করা থেকে বিরত থাকার নির্দেশ এসেছে:"
                : "According to authentic Hadith, voluntary prayers and funeral prayers are discouraged during three specific astronomical windows:"}
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="p-4 rounded-2xl bg-white border border-amber-200/80 shadow-sm">
                <span className="text-xs font-bold text-amber-900">
                  {isBn ? "১. সূর্যোদয়ের সময়" : "1. At Sunrise"}
                </span>
                <p className="mt-1 text-[11px] text-[#55635d] leading-relaxed">
                  {isBn
                    ? "সূর্য উদিত হওয়া শুরু থেকে প্রায় ১৫-২০ মিনিট পর্যন্ত।"
                    : "From initial solar rise until the sun is a spear's height (~15 min)."}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-amber-200/80 shadow-sm">
                <span className="text-xs font-bold text-amber-900">
                  {isBn ? "২. ঠিক দ্বিপ্রহরে (যাওয়াল)" : "2. Solar Zenith"}
                </span>
                <p className="mt-1 text-[11px] text-[#55635d] leading-relaxed">
                  {isBn
                    ? "সূর্য ঠিক মাথার ওপর থাকার সময় যোহরের ওয়াক্তের পূর্বমুহূর্ত।"
                    : "When the sun reaches exact meridian, ~10 min before Dhuhr adhan."}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-amber-200/80 shadow-sm">
                <span className="text-xs font-bold text-amber-900">
                  {isBn ? "৩. সূর্যাস্তের সময়" : "3. At Sunset"}
                </span>
                <p className="mt-1 text-[11px] text-[#55635d] leading-relaxed">
                  {isBn
                    ? "সূর্য হলুদ বর্ণ ধারণ করা থেকে পূর্ণ অস্ত যাওয়া পর্যন্ত।"
                    : "From amber solar dimming until full horizon disappearance."}
                </p>
              </div>
            </div>
          </div>

          {/* Tahajjud & Taraweeh Insight */}
          <div className="lg:col-span-4 rounded-3xl border border-[#0d4d3b]/30 bg-[#072a20] text-white p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-[#e0be79] uppercase">
                <Moon className="w-4 h-4" />
                <span>{isBn ? "তাহাজ্জুদ ও কিয়ামুল লাইল" : "TAHAJJUD & QIYAM"}</span>
              </div>
              <h4 className="mt-3 text-xl font-serif font-bold">
                {isBn ? "শেষ রাতের বরকত" : "The Last Third of the Night"}
              </h4>
              <p className="mt-2 text-xs sm:text-sm text-white/80 leading-relaxed font-light">
                {isBn
                  ? "মহান আল্লাহ শেষ তৃতীয়াংশে প্রথম আসমানে অবতরণ করে বান্দাদের দোয়া ও ক্ষমা প্রার্থনা কবুল করেন।"
                  : "Our Lord descends to the lowest heaven in the last third of the night, asking: 'Who calls upon Me so I may answer them?'"}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-white/15 text-xs text-[#e0be79]">
              {isBn ? "শ্রেষ্ঠ সময়: রাত ৩:১৫ হতে ফজরের আযান পর্যন্ত" : "Best Time: ~03:15 AM until Fajr Adhan"}
            </div>
          </div>
        </section>

        {/* 6. Interactive Monthly Calendar */}
        <section aria-labelledby="calendar-heading" className="rounded-3xl border border-[#e5e1d3] bg-white p-6 sm:p-8 lg:p-10 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#e5e1d3]">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-[#0d4d3b] uppercase">
                <Calendar className="w-4 h-4 text-[#c79a45]" />
                <span>{isBn ? "মাসিক ক্যালেন্ডার" : "INTERACTIVE TIMETABLE"}</span>
              </div>
              <h2 id="calendar-heading" className="mt-2 text-2xl xs:text-3xl font-serif font-bold text-[#0e2a22]">
                {selectedMonthLabel}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetToToday}
                className="px-4 py-2 rounded-xl border border-[#d2ccc0] text-xs font-semibold text-[#0d4d3b] hover:bg-[#faf7f0] transition shadow-sm min-h-[40px]"
              >
                {isBn ? "আজকের দিন" : "Today"}
              </button>

              <div className="flex items-center rounded-xl border border-[#d2ccc0] bg-white p-1">
                <button
                  type="button"
                  onClick={() => changeMonth(-1)}
                  aria-label="Previous Month"
                  className="p-1.5 rounded-lg hover:bg-[#faf7f0] text-[#0d4d3b] transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => changeMonth(1)}
                  aria-label="Next Month"
                  className="p-1.5 rounded-lg hover:bg-[#faf7f0] text-[#0d4d3b] transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="mt-6">
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-xs font-bold text-[#718079] pb-3 border-b border-[#ece6db]">
              {weekDayLabels.map((day) => (
                <div key={day} className="py-1">
                  {day}
                </div>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-7 gap-1.5 sm:gap-2">
              {monthDays.map((day, idx) => {
                if (day === null) {
                  return <div key={`blank-${idx}`} className="aspect-square" />;
                }
                const isoDate = `${monthAnchor.getFullYear()}-${String(monthAnchor.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isSelected = selectedDate === isoDate;
                const isCurrentToday = today === isoDate;

                return (
                  <button
                    key={isoDate}
                    type="button"
                    onClick={() => setSelectedDate(isoDate)}
                    className={`aspect-square rounded-2xl flex flex-col items-center justify-center text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "bg-[#0d4d3b] text-white shadow-md scale-105"
                        : isCurrentToday
                        ? "border-2 border-[#c79a45] bg-[#faf7f0] text-[#0e2a22] font-bold"
                        : "bg-[#faf9f4] hover:bg-[#f2efe6] text-[#24332d]"
                    }`}
                  >
                    <span>{day}</span>
                    {isCurrentToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#c79a45] mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Day Inspector */}
          <div className="mt-8 p-5 sm:p-6 rounded-2xl bg-[#faf8f3] border border-[#e5e1d3]">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-[#ece6db]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#c79a45]">
                {isBn ? "নির্বাচিত তারিখ" : "SELECTED DAY INSPECTOR"}
              </span>
              <span className="text-sm font-bold text-[#0e2a22]">
                {selectedDayLabel}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
              {prayerList.map((p) => (
                <div key={p.id} className="p-3 rounded-xl bg-white border border-[#e5e1d3]">
                  <span className="text-[10px] font-bold uppercase text-[#718079] block">
                    {p.name}
                  </span>
                  <span className="font-serif text-base font-bold text-[#0e2a22] mt-1 block">
                    {p.time}
                  </span>
                  <span className="text-[10px] text-[#0d4d3b] font-medium block mt-0.5">
                    {getIqamahTime(p.id, p.time24, isBn)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 7. Quranic Inscription & Fellowship Call */}
        <section className="relative overflow-hidden rounded-3xl bg-[#072a20] text-white p-8 sm:p-12 text-center border border-[#c79a45]/30 shadow-xl">
          <div
            className="absolute inset-0 opacity-10 bg-repeat pointer-events-none"
            style={{
              backgroundImage: "url('/textures/islamic-geometric.svg')",
              backgroundSize: "240px 240px",
            }}
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-3xl mx-auto space-y-4">
            <div className="w-10 h-10 rounded-full bg-[#c79a45]/20 flex items-center justify-center mx-auto text-[#e0be79]">
              <BookOpen className="w-5 h-5" />
            </div>

            <p className="font-serif text-xl xs:text-2xl sm:text-3xl italic text-[#f5f1e6] leading-relaxed">
              {isBn
                ? "‘নিশ্চয়ই নির্দিষ্ট সময়ে নামাজ কায়েম করা মুমিনদের ওপর ফরজ।’"
                : "“Indeed, performing prayer at fixed appointed hours has been prescribed upon the believers.”"}
            </p>

            <span className="block text-xs font-bold tracking-[0.25em] text-[#e0be79] uppercase">
              {isBn ? "— সূরা আন-নিসা (৪:১০৩)" : "— Surah An-Nisa (4:103)"}
            </span>

            <div className="pt-6 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/events"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#c79a45] text-[#051c15] font-semibold text-xs sm:text-sm hover:bg-[#d8ab54] transition shadow-md min-h-[46px]"
              >
                <span>{isBn ? "আসন্ন দ্বীনি অনুষ্ঠান" : "Upcoming Events"}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/donations"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-white/30 bg-white/5 text-white font-semibold text-xs sm:text-sm hover:bg-white/10 transition min-h-[46px]"
              >
                <span>{isBn ? "মসজিদে দান করুন" : "Donate to Mosque"}</span>
              </Link>
            </div>
          </div>
        </section>

      </main>

      <SiteFooter />
    </div>
  );
}
