"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useLanguage } from "@/components/language-provider";
import { useMosqueBranding } from "@/components/mosque-branding-provider";
import {
  usePublicPrayerTimes,
  PrayerDisplay,
  PrayerKey,
  PRAYER_ORDER,
  PRAYER_NAMES,
  formatTime12,
  shiftMinutes,
  convertToBengaliNumber,
} from "@/hooks/use-public-prayer-times";
import {
  fetchPublicPrayerTimesForDate,
  DEFAULT_PUBLIC_MOSQUE_SLUG,
  type PublicPrayerTimes,
} from "@/services/publicHomeService";
import {
  Clock,
  Calendar,
  Compass,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  Printer,
  Copy,
  Check,
  ShieldCheck,
  BookOpen,
  MapPin,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Users,
  Sparkles,
} from "lucide-react";

const PRAYER_ICONS: Record<PrayerKey, any> = {
  fajr: Sunrise,
  sunrise: Sun,
  dhuhr: Sun,
  asr: Sun,
  maghrib: Sunset,
  isha: Moon,
};

const PRAYER_PERIODS: Record<
  PrayerKey,
  { en: string; bn: string; subtitleEn: string; subtitleBn: string }
> = {
  fajr: {
    en: "Dawn Congregation",
    bn: "ভোরের জামাত",
    subtitleEn: "Start the day in sacred communion",
    subtitleBn: "দিনের সূচনায় আত্মশুদ্ধির সালাত",
  },
  sunrise: {
    en: "Conclusion of Fajr",
    bn: "ফজরের সমাপ্তিকাল",
    subtitleEn: "Solar rise — nafl discouraged for 15 min",
    subtitleBn: "সূর্যোদয় কাল — ১৫ মিনিট নফল নামাজ মাকরূহ",
  },
  dhuhr: {
    en: "Midday Sanctuary",
    bn: "দুপুরের জামাত",
    subtitleEn: "Sun descends past midday meridian",
    subtitleBn: "সূর্য পশ্চিমাকাশে ঢলে পড়ার পরের জামাত",
  },
  asr: {
    en: "Salat al-Wusta",
    bn: "সালাতুল উসতা",
    subtitleEn: "The Quranically emphasized middle prayer",
    subtitleBn: "কুরআনে বিশেষভাবে নির্দেশিত মধ্যবর্তী সালাত",
  },
  maghrib: {
    en: "Dusk Congregation",
    bn: "সান্ধ্য জামাত",
    subtitleEn: "Convenes immediately after sunset",
    subtitleBn: "সূর্যাস্তের পরপরই সূচিত বরকতময় জামাত",
  },
  isha: {
    en: "Night Vigil Assembly",
    bn: "রাত্রিকালীন জামাত",
    subtitleEn: "Worship rewarding half the night in vigil",
    subtitleBn: "অর্ধরাত নফল ইবাদতের সমতুল্য সওয়াব",
  },
};

const WEEKDAYS_EN = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
const WEEKDAYS_BN = ["শনি", "রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র"];

export default function PrayerTimesPage() {
  const { language } = useLanguage();
  const isBn = language === "bn";
  const { branding, activeSlug } = useMosqueBranding();

  const {
    prayers,
    jumuah,
    timezone,
    hijriDate,
    hijri,
    methodName,
    schoolName,
    nextPrayerIndex,
    countdownHours,
    countdownMinutes,
    countdownSecs,
    targetPrayer,
    rawPrayerTimes,
    loading,
    error,
  } = usePublicPrayerTimes();

  const safeMethodName =
    typeof methodName === "object" && methodName !== null && "name" in (methodName as any)
      ? String((methodName as any).name)
      : typeof methodName === "string" && methodName
      ? methodName
      : "Islamic Foundation Bangladesh";

  const safeSchoolName =
    typeof schoolName === "object" && schoolName !== null && "name" in (schoolName as any)
      ? String((schoolName as any).name)
      : typeof schoolName === "string" && schoolName
      ? schoolName
      : "Hanafi";

  // 1. Live Local Mosque Clock
  const [liveTime, setLiveTime] = useState<string>("");
  useEffect(() => {
    const tz = timezone || "Asia/Dhaka";
    function updateClock() {
      try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat(isBn ? "bn-BD" : "en-US", {
          timeZone: tz,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        });
        setLiveTime(formatter.format(now));
      } catch {
        setLiveTime(new Date().toLocaleTimeString());
      }
    }
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [timezone, isBn]);

  // 2. Gregorian & Hijri Date Strings in Mosque Timezone
  const todayGregorian = useMemo(() => {
    const tz = timezone || "Asia/Dhaka";
    try {
      return new Intl.DateTimeFormat(isBn ? "bn-BD" : "en-GB", {
        timeZone: tz,
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date());
    } catch {
      return new Date().toLocaleDateString();
    }
  }, [timezone, isBn]);

  const todayHijri = useMemo(() => {
    if (hijri?.day && hijri?.monthName && hijri?.year) {
      if (isBn) {
        return `${convertToBengaliNumber(hijri.day)} ${hijri.monthName} ${convertToBengaliNumber(hijri.year)} হিজরি`;
      }
      return `${hijri.day} ${hijri.monthName} ${hijri.year} AH`;
    }
    return hijriDate || (isBn ? "১৪৪৭ হিজরি" : "1447 AH");
  }, [hijri, hijriDate, isBn]);

  // 3. Prohibited Prayer Times (Makruh Waqt) calculated dynamically
  const prohibitedTimes = useMemo(() => {
    const sunriseP = prayers.find((p) => p.id === "sunrise");
    const dhuhrP = prayers.find((p) => p.id === "dhuhr");
    const maghribP = prayers.find((p) => p.id === "maghrib");

    if (!sunriseP || !dhuhrP || !maghribP) return null;

    const sunriseEnd = shiftMinutes(sunriseP.time24, 15);
    const zawalStart = shiftMinutes(dhuhrP.time24, -10);
    const sunsetStart = shiftMinutes(maghribP.time24, -15);

    return {
      sunrise: {
        interval: `${sunriseP.timeEn} — ${formatTime12(sunriseEnd, false)}`,
        intervalBn: `${sunriseP.timeBn} — ${formatTime12(sunriseEnd, true)}`,
      },
      zawal: {
        interval: `${formatTime12(zawalStart, false)} — ${dhuhrP.timeEn}`,
        intervalBn: `${formatTime12(zawalStart, true)} — ${dhuhrP.timeBn}`,
      },
      sunset: {
        interval: `${formatTime12(sunsetStart, false)} — ${maghribP.timeEn}`,
        intervalBn: `${formatTime12(sunsetStart, true)} — ${maghribP.timeBn}`,
      },
    };
  }, [prayers]);

  // 4. Tahajjud / Last Third of the Night calculation
  const tahajjudWindow = useMemo(() => {
    const maghribP = prayers.find((p) => p.id === "maghrib");
    const fajrP = prayers.find((p) => p.id === "fajr");

    if (!maghribP || !fajrP) return null;

    const [mH, mM] = maghribP.time24.split(":").map(Number);
    const [fH, fM] = fajrP.time24.split(":").map(Number);

    const maghribMins = mH * 60 + mM;
    const fajrMins = fH * 60 + fM;
    const nightDuration = (fajrMins + 1440 - maghribMins) % 1440;
    const twoThirds = Math.round((2 / 3) * nightDuration);
    const lastThirdStartMins = (maghribMins + twoThirds) % 1440;

    const startH = Math.floor(lastThirdStartMins / 60);
    const startM = lastThirdStartMins % 60;
    const startTime24 = `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`;

    return {
      windowEn: `${formatTime12(startTime24, false)} — ${fajrP.timeEn}`,
      windowBn: `${formatTime12(startTime24, true)} — ${fajrP.timeBn}`,
    };
  }, [prayers]);

  // 5. Interactive Monthly Calendar State
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const tz = timezone || "Asia/Dhaka";
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(new Date());
      const y = parts.find((p) => p.type === "year")?.value;
      const m = parts.find((p) => p.type === "month")?.value;
      const d = parts.find((p) => p.type === "day")?.value;
      return `${y}-${m}-${d}`;
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  });

  const [selectedDayTimes, setSelectedDayTimes] = useState<PublicPrayerTimes | null>(null);
  const [selectedDayLoading, setSelectedDayLoading] = useState<boolean>(false);
  const dateCache = useRef<Map<string, PublicPrayerTimes>>(new Map());

  const todayIso = useMemo(() => {
    const tz = timezone || "Asia/Dhaka";
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(new Date());
      const y = parts.find((p) => p.type === "year")?.value;
      const m = parts.find((p) => p.type === "month")?.value;
      const d = parts.find((p) => p.type === "day")?.value;
      return `${y}-${m}-${d}`;
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  }, [timezone]);

  // Load prayer times for selected calendar date
  useEffect(() => {
    let active = true;

    if (selectedDate === todayIso && rawPrayerTimes) {
      setSelectedDayTimes(rawPrayerTimes);
      return;
    }

    if (dateCache.current.has(selectedDate)) {
      setSelectedDayTimes(dateCache.current.get(selectedDate)!);
      return;
    }

    setSelectedDayLoading(true);
    fetchPublicPrayerTimesForDate(activeSlug || DEFAULT_PUBLIC_MOSQUE_SLUG, selectedDate)
      .then((data) => {
        if (!active) return;
        if (data) {
          dateCache.current.set(selectedDate, data);
          setSelectedDayTimes(data);
        } else if (rawPrayerTimes) {
          setSelectedDayTimes(rawPrayerTimes);
        }
      })
      .catch(() => {
        if (!active) return;
        if (rawPrayerTimes) setSelectedDayTimes(rawPrayerTimes);
      })
      .finally(() => {
        if (active) setSelectedDayLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedDate, todayIso, rawPrayerTimes, activeSlug]);

  // Calendar navigation
  const changeMonth = (offset: number) => {
    setCalendarMonth((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + offset, 1);
      return next;
    });
  };

  const jumpToToday = () => {
    setCalendarMonth(new Date());
    setSelectedDate(todayIso);
  };

  // Build calendar matrix (Saturday through Friday)
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const totalDays = lastDay.getDate();
    const jsDay = firstDay.getDay();
    const leadBlanks = (jsDay + 1) % 7;

    const days: (number | null)[] = [];
    for (let i = 0; i < leadBlanks; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push(d);
    }
    return days;
  }, [calendarMonth]);

  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat(isBn ? "bn-BD" : "en-US", {
      month: "long",
      year: "numeric",
    }).format(calendarMonth);
  }, [calendarMonth, isBn]);

  const selectedDayHeader = useMemo(() => {
    try {
      const [y, m, d] = selectedDate.split("-").map(Number);
      const dateObj = new Date(y, m - 1, d);
      return new Intl.DateTimeFormat(isBn ? "bn-BD" : "en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(dateObj);
    } catch {
      return selectedDate;
    }
  }, [selectedDate, isBn]);

  // 6. Copy Schedule Action
  const [copied, setCopied] = useState(false);
  const handleCopySchedule = useCallback(() => {
    if (!prayers || prayers.length === 0) return;

    const text = [
      `🕌 ${branding.name || "Noor Community Mosque"} — ${isBn ? "সালাত সময়সূচি" : "Daily Prayer Schedule"}`,
      `📅 ${todayGregorian} | ${todayHijri}`,
      `📍 Dhaka, Bangladesh | Qibla: 274° WNW`,
      "",
      ...prayers.map((p) => {
        const iqamahStr = p.iqamahEn ? ` | Jamat: ${p.iqamahEn}` : "";
        return `• ${p.nameEn} (${p.arabicName}): ${p.timeEn}${iqamahStr}`;
      }),
      "",
      `Fiqh: ${safeMethodName} (${safeSchoolName})`,
    ].join("\n");

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [prayers, branding.name, todayGregorian, todayHijri, safeMethodName, safeSchoolName, isBn]);

  // 7. Print Timetable Action
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Active Next Prayer identification
  const activePrayer = targetPrayer || prayers[nextPrayerIndex] || prayers[0] || null;

  return (
    <div className="min-h-screen bg-[#f8f6ef] text-[#17211d] flex flex-col selection:bg-[#c79a45] selection:text-white">
      {/* Global Site Header */}
      <SiteHeader />

      {/* Print Stylesheet */}
      <style jsx global>{`
        @media print {
          header,
          footer,
          .no-print {
            display: none !important;
          }
          main {
            padding: 0 !important;
          }
          .print-clean {
            background: transparent !important;
            border-color: #cccccc !important;
            color: #000000 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* ================================================== */}
      {/* SECTION 1 — PRAYER TIMES EDITORIAL HERO (MATCHES SITE) */}
      {/* ================================================== */}
      <section className="relative overflow-hidden bg-[#072a20] text-white pt-32 sm:pt-36 pb-12 sm:pb-16 px-4 xs:px-6 lg:px-8 border-b border-[#c79a45]/20">
        {/* Subtle Ambient Background Texture */}
        <div
          className="absolute inset-0 opacity-10 bg-repeat pointer-events-none"
          style={{
            backgroundImage: "url('/textures/islamic-geometric.svg')",
            backgroundSize: "260px 260px",
          }}
          aria-hidden="true"
        />

        {/* Ambient Glows */}
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-[#0d4d3b] filter blur-3xl opacity-50 pointer-events-none" />
        <div className="absolute top-1/2 -right-24 w-72 h-72 rounded-full bg-[#c79a45]/20 filter blur-3xl opacity-40 pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-3xl">
              {/* Sacred Arabic Bismillah Calligraphy in Warm Radiant Gold */}
              <div
                dir="rtl"
                lang="ar"
                className="font-serif text-2xl sm:text-3xl lg:text-4xl text-[#dfba73] tracking-widest select-none pb-3"
              >
                بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
              </div>

              {/* Eyebrow Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-[#c79a45]/40 bg-[#041d16]/70 text-[#e0be79] text-xs font-semibold tracking-[0.18em] uppercase shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-[#e0be79]" />
                <span>
                  {isBn
                    ? "নূর জামে মসজিদ · দৈনিক ও জুমার সময়সূচি"
                    : "NOOR COMMUNITY MOSQUE · CONGREGATIONAL TIMETABLE"}
                </span>
              </div>

              {/* Headline */}
              <h1 className="mt-4 text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-[#f5f1e6] leading-tight tracking-tight">
                {isBn ? (
                  <>
                    দৈনন্দিন সালাত ও <br />
                    <span className="text-[#e0be79] italic font-normal">জামাত সময়সূচি</span>
                  </>
                ) : (
                  <>
                    Prayer Times & <br />
                    <span className="text-[#e0be79] italic font-normal">Congregational Schedule</span>
                  </>
                )}
              </h1>

              {/* Subheading */}
              <p className="mt-3 sm:mt-4 text-sm xs:text-base text-white/80 leading-relaxed font-light max-w-2xl">
                {isBn
                  ? "মসজিদ কমপ্লেক্সে অনুষ্ঠিত দৈনিক পাঁচ ওয়াক্ত সালাত ও জুমার প্রামাণ্য সময়সূচি।"
                  : "Authoritative daily congregation timings calculated for the sanctuary community."}
              </p>
            </div>

            {/* Quick Actions & Date Metadata Chips */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3 no-print">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySchedule}
                  aria-label={isBn ? "সময়সূচি কপি করুন" : "Copy schedule"}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#c79a45]/40 bg-[#041d16]/80 hover:bg-[#072a20] text-xs font-semibold text-[#e0be79] hover:text-white transition-colors shadow-sm"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-[#dfba73]" />
                      <span>{isBn ? "কপি হয়েছে" : "Copied"}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>{isBn ? "সময়সূচি কপি" : "Copy Schedule"}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  aria-label={isBn ? "সময়সূচি প্রিন্ট করুন" : "Print timetable"}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#c79a45]/40 bg-[#041d16]/80 hover:bg-[#072a20] text-xs font-semibold text-[#e0be79] hover:text-white transition-colors shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>{isBn ? "প্রিন্ট" : "Print Timetable"}</span>
                </button>
              </div>

              {/* Dynamic Gregorian & Hijri Badges */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 border border-white/15 text-white">
                  <Calendar className="w-3.5 h-3.5 text-[#e0be79]" />
                  <span className="font-medium">{todayGregorian}</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#041d16]/70 border border-[#c79a45]/30 text-[#e0be79]">
                  <Sparkles className="w-3.5 h-3.5 text-[#e0be79]" />
                  <span className="font-semibold">{todayHijri}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================== */}
      {/* MAIN CONTENT AREA                                  */}
      {/* ================================================== */}
      <main className="mx-auto max-w-7xl w-full px-4 xs:px-6 lg:px-8 py-10 sm:py-14 space-y-12 sm:space-y-16">
        
        {/* ================================================== */}
        {/* SECTION 2 — INFORMATION STRIP                     */}
        {/* ================================================== */}
        <section aria-label="Sanctuary Parameters">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* 1. Live Local Time */}
            <div className="rounded-2xl border border-[#e5e1d3] bg-white p-5 sm:p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-[0.2em] text-[#0d4d3b] uppercase">
                  {isBn ? "স্থানীয় সময়" : "LIVE LOCAL TIME"}
                </span>
                <div className="w-8 h-8 rounded-full bg-[#f4efe5] flex items-center justify-center text-[#c79a45]">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-3xl sm:text-4xl font-mono font-bold tracking-tight text-[#0e2a22]">
                {liveTime || "--:--:--"}
              </div>
              <p className="mt-2 text-xs text-[#52605a]">
                {isBn ? "মসজিদ ঘড়ির বর্তমান সময় (এশিয়া/ঢাকা)" : "Sanctuary wall clock (Asia/Dhaka)"}
              </p>
            </div>

            {/* 2. Qibla Direction */}
            <div className="rounded-2xl border border-[#e5e1d3] bg-white p-5 sm:p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-[0.2em] text-[#0d4d3b] uppercase">
                  {isBn ? "ক্বিবলা দিক" : "QIBLA DIRECTION"}
                </span>
                <div className="w-8 h-8 rounded-full bg-[#f4efe5] flex items-center justify-center text-[#c79a45]">
                  <Compass className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-3xl sm:text-4xl font-mono font-bold tracking-tight text-[#0e2a22]">
                {isBn ? "২৭৪° প-উ-প" : "274° WNW"}
              </div>
              <p className="mt-2 text-xs text-[#52605a]">
                {isBn ? "মসজিদ হতে পবিত্র কাবা শরীফের দিক" : "Direct bearing to Sacred Ka'aba"}
              </p>
            </div>

            {/* 3. Calculation Standard */}
            <div className="rounded-2xl border border-[#e5e1d3] bg-white p-5 sm:p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-[0.2em] text-[#0d4d3b] uppercase">
                  {isBn ? "গণনা মানদণ্ড" : "CALCULATION STANDARD"}
                </span>
                <div className="w-8 h-8 rounded-full bg-[#f4efe5] flex items-center justify-center text-[#c79a45]">
                  <BookOpen className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-xl sm:text-2xl font-bold tracking-tight text-[#0e2a22] truncate">
                {safeSchoolName} • {safeMethodName}
              </div>
              <p className="mt-2 text-xs text-[#52605a]">
                {isBn ? "অনুমোদিত প্রামাণ্য ফিকহি পদ্ধতি" : "Authorized jurisprudence parameters"}
              </p>
            </div>
          </div>
        </section>

        {/* ================================================== */}
        {/* SECTION 3 — NEXT PRAYER HERO (CENTERPIECE)        */}
        {/* ================================================== */}
        {activePrayer && (
          <section aria-labelledby="next-prayer-heading">
            <div className="relative rounded-3xl border border-[#c79a45]/40 bg-gradient-to-br from-[#0c2a20] via-[#092219] to-[#061912] p-6 sm:p-10 text-white shadow-xl overflow-hidden">
              {/* Corner Ambient Radial Light */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(circle,_rgba(199,154,69,0.15)_0%,_transparent_70%)]"
              />

              {/* Eyebrow Pill */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#c79a45]/40 bg-[#c79a45]/15 text-xs font-bold tracking-[0.2em] text-[#e0be79] uppercase">
                  <span className="w-2 h-2 rounded-full bg-[#e0be79] animate-pulse" />
                  <span id="next-prayer-heading">
                    {isBn ? "আসন্ন জামাত" : "UPCOMING CONGREGATION"}
                  </span>
                </div>

                <div className="text-xs text-white/70">
                  {PRAYER_PERIODS[activePrayer.id]?.[isBn ? "subtitleBn" : "subtitleEn"]}
                </div>
              </div>

              {/* Main Prayer Name & Arabic Calligraphy */}
              <div className="mt-6 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-6 border-b border-white/10">
                <div>
                  <h2 className="font-serif text-4xl sm:text-6xl font-bold text-white tracking-tight">
                    {isBn ? activePrayer.nameBn : activePrayer.nameEn}
                  </h2>
                  <p className="text-xs sm:text-sm text-white/70 mt-1">
                    {PRAYER_PERIODS[activePrayer.id]?.[isBn ? "bn" : "en"]}
                  </p>
                </div>

                <div
                  dir="rtl"
                  lang="ar"
                  className="font-serif text-4xl sm:text-5xl lg:text-6xl text-[#e0be79] font-bold select-none tracking-wide"
                >
                  {activePrayer.arabicName}
                </div>
              </div>

              {/* Timings & Countdown Split */}
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Adhan & Iqamah Boxes */}
                <div className="lg:col-span-6 grid grid-cols-2 gap-3.5 sm:gap-4">
                  {/* Adhan Box */}
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 backdrop-blur-sm">
                    <span className="text-[10px] font-bold tracking-[0.2em] text-white/70 uppercase block">
                      {isBn ? "ওয়াক্ত শুরু (আযান)" : "ADHAN TIME"}
                    </span>
                    <span className="mt-2 block font-mono text-2xl sm:text-3xl font-bold text-white">
                      {isBn ? activePrayer.timeBn : activePrayer.timeEn}
                    </span>
                    <span className="mt-1 block text-[11px] text-white/60">
                      {isBn ? "নামাজের সময় সূচনা" : "Beginning of prayer window"}
                    </span>
                  </div>

                  {/* Iqamah Box (Warm Radiant Gold) */}
                  <div className="rounded-2xl border border-[#c79a45]/60 bg-[#c79a45]/15 p-4 sm:p-5 shadow-[0_0_25px_rgba(199,154,69,0.15)]">
                    <span className="text-[10px] font-bold tracking-[0.2em] text-[#e0be79] uppercase block">
                      {isBn ? "জামাত শুরু (ইক্বামাহ)" : "IQAMAH / JAMAT"}
                    </span>
                    <span className="mt-2 block font-mono text-2xl sm:text-3xl font-bold text-[#e0be79]">
                      {activePrayer.iqamahEn
                        ? (isBn ? activePrayer.iqamahBn : activePrayer.iqamahEn)
                        : (isBn ? activePrayer.timeBn : activePrayer.timeEn)}
                    </span>
                    <span className="mt-1 block text-[11px] text-[#e0be79]/80">
                      {isBn ? "মূল মসজিদে জামাত অনুষ্ঠিত" : "Main sanctuary assembly"}
                    </span>
                  </div>
                </div>

                {/* Countdown to Iqamah Display */}
                <div className="lg:col-span-6 rounded-2xl border border-white/10 bg-black/30 p-5 sm:p-6 text-center backdrop-blur-sm">
                  <div className="text-[10px] font-bold tracking-[0.25em] text-[#e0be79] uppercase">
                    {isBn ? "জামাত শুরুর বাকি সময়" : "COUNTDOWN TO IQAMAH"}
                  </div>

                  {/* Tabular Timer: Hours : Mins : Secs */}
                  <div className="mt-3 flex items-center justify-center gap-2 sm:gap-4 font-mono font-bold text-white">
                    {/* Hours */}
                    <div className="flex flex-col items-center">
                      <span className="text-3xl sm:text-5xl tracking-tight bg-white/10 px-3 sm:px-4 py-2 rounded-xl border border-white/15 min-w-[58px] sm:min-w-[76px]">
                        {isBn
                          ? convertToBengaliNumber(countdownHours).padStart(2, "০")
                          : String(countdownHours).padStart(2, "0")}
                      </span>
                      <span className="text-[10px] tracking-wider text-white/70 mt-1 uppercase">
                        {isBn ? "ঘণ্টা" : "Hours"}
                      </span>
                    </div>

                    <span className="text-2xl sm:text-4xl text-[#e0be79] -mt-5">:</span>

                    {/* Mins */}
                    <div className="flex flex-col items-center">
                      <span className="text-3xl sm:text-5xl tracking-tight bg-white/10 px-3 sm:px-4 py-2 rounded-xl border border-white/15 min-w-[58px] sm:min-w-[76px]">
                        {isBn
                          ? convertToBengaliNumber(countdownMinutes).padStart(2, "০")
                          : String(countdownMinutes).padStart(2, "0")}
                      </span>
                      <span className="text-[10px] tracking-wider text-white/70 mt-1 uppercase">
                        {isBn ? "মিনিট" : "Mins"}
                      </span>
                    </div>

                    <span className="text-2xl sm:text-4xl text-[#e0be79] -mt-5">:</span>

                    {/* Secs */}
                    <div className="flex flex-col items-center">
                      <span className="text-3xl sm:text-5xl tracking-tight bg-white/10 px-3 sm:px-4 py-2 rounded-xl border border-white/15 min-w-[58px] sm:min-w-[76px] text-[#e0be79]">
                        {isBn
                          ? convertToBengaliNumber(countdownSecs).padStart(2, "০")
                          : String(countdownSecs).padStart(2, "0")}
                      </span>
                      <span className="text-[10px] tracking-wider text-white/70 mt-1 uppercase">
                        {isBn ? "সেকেন্ড" : "Secs"}
                      </span>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-white/60">
                    {isBn
                      ? "স্থানীয় ক্লায়েন্ট টাইমার দ্বারা প্রতি সেকেন্ডে হালনাগাদকৃত"
                      : "High precision client-side countdown timer in mosque local timezone"}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ================================================== */}
        {/* SECTION 4 — DAILY PRAYER TIMETABLE (MOBILE-FIRST) */}
        {/* ================================================== */}
        <section aria-labelledby="daily-schedule-heading">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-5 border-b border-[#e5e1d3]">
            <div>
              <span className="text-xs font-bold tracking-[0.2em] text-[#0d4d3b] uppercase">
                {isBn ? "দৈনিক জামাত নির্ঘণ্ট" : "DAILY PRAYER TIMETABLE"}
              </span>
              <h2
                id="daily-schedule-heading"
                className="mt-1 font-serif text-2xl sm:text-3xl font-bold text-[#0e2a22]"
              >
                {isBn ? "আজকের নামাজের সময়সূচি" : "Today's Congregational Timetable"}
              </h2>
            </div>
            <p className="text-xs text-[#52605a]">
              {isBn
                ? "মসজিদের মূল জামাত হলে অনুষ্ঠিত দৈনন্দিন সালাত"
                : "Congregations held in the main sanctuary hall"}
            </p>
          </div>

          {/* Cards Grid */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 sm:gap-4">
            {prayers.map((prayer) => {
              const isNext = prayer.id === activePrayer?.id;
              const IconComponent = PRAYER_ICONS[prayer.id] || Sun;

              return (
                <div
                  key={prayer.id}
                  className={`rounded-2xl transition-all duration-300 relative flex flex-col justify-between p-5 ${
                    isNext
                      ? "border-2 border-[#c79a45] bg-[#0d4d3b] text-white shadow-lg scale-[1.02]"
                      : "border border-[#e5e1d3] bg-white text-[#17211d] shadow-sm hover:border-[#0d4d3b]/50"
                  }`}
                >
                  <div>
                    {/* Top Bar: Icon + Arabic Calligraphy */}
                    <div className="flex items-center justify-between">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center ${
                          isNext ? "bg-white/15 text-[#e0be79]" : "bg-[#f4efe5] text-[#0d4d3b]"
                        }`}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>

                      <span
                        dir="rtl"
                        lang="ar"
                        className={`font-serif text-lg font-bold select-none ${
                          isNext ? "text-[#e0be79]" : "text-[#718079]"
                        }`}
                      >
                        {prayer.arabicName}
                      </span>
                    </div>

                    {/* Prayer Title */}
                    <div className="mt-3">
                      <h3
                        className={`font-serif text-lg font-bold ${
                          isNext ? "text-white" : "text-[#0e2a22]"
                        }`}
                      >
                        {isBn ? prayer.nameBn : prayer.nameEn}
                      </h3>
                      <p
                        className={`text-[11px] line-clamp-1 ${
                          isNext ? "text-white/75" : "text-[#697570]"
                        }`}
                      >
                        {PRAYER_PERIODS[prayer.id]?.[isBn ? "bn" : "en"]}
                      </p>
                    </div>

                    {/* Adhan & Jamat Times */}
                    <div
                      className={`mt-4 pt-3 space-y-2 border-t ${
                        isNext ? "border-white/15" : "border-[#ece6db]"
                      }`}
                    >
                      <div className="flex items-baseline justify-between">
                        <span
                          className={`text-[10px] uppercase tracking-wider font-semibold ${
                            isNext ? "text-white/75" : "text-[#718079]"
                          }`}
                        >
                          {isBn ? "আযান" : "Adhan"}
                        </span>
                        <span
                          className={`font-mono text-base font-semibold ${
                            isNext ? "text-white" : "text-[#0e2a22]"
                          }`}
                        >
                          {isBn ? prayer.timeBn : prayer.timeEn}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between">
                        <span
                          className={`text-[10px] uppercase tracking-wider font-bold ${
                            isNext ? "text-[#e0be79]" : "text-[#0d4d3b]"
                          }`}
                        >
                          {prayer.id === "sunrise" ? (isBn ? "সমাপ্তি" : "Ends") : (isBn ? "জামাত" : "Jamat")}
                        </span>
                        <span
                          className={`font-mono text-base font-bold ${
                            isNext ? "text-[#e0be79]" : "text-[#0d4d3b]"
                          }`}
                        >
                          {prayer.id === "sunrise"
                            ? (isBn ? prayer.timeBn : prayer.timeEn)
                            : (prayer.iqamahEn
                              ? (isBn ? prayer.iqamahBn : prayer.iqamahEn)
                              : (isBn ? prayer.timeBn : prayer.timeEn))}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Pill */}
                  <div className="mt-4 pt-2">
                    {isNext ? (
                      <div className="w-full text-center py-1 rounded-full bg-[#c79a45] text-[#072a20] text-[10px] font-bold tracking-wider uppercase">
                        {isBn ? "আসন্ন জামাত" : "NEXT PRAYER"}
                      </div>
                    ) : (
                      <div className="w-full text-center py-1 rounded-full bg-[#f8f6ef] text-[#718079] text-[10px] font-semibold tracking-wider uppercase">
                        {isBn ? "দৈনিক সালাত" : "SCHEDULED"}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ================================================== */}
        {/* SECTION 5 — JUMU'AH (FRIDAY CONGREGATION)         */}
        {/* ================================================== */}
        {jumuah && jumuah.length > 0 && (
          <section aria-labelledby="jumuah-heading">
            <div className="rounded-3xl border border-[#e5e1d3] bg-white p-6 sm:p-8 lg:p-10 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#e5e1d3]">
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-[#0d4d3b] uppercase">
                    <Sparkles className="w-4 h-4 text-[#c79a45]" />
                    <span>{isBn ? "পবিত্র জুমার জামাত" : "FRIDAY JUMU'AH CONGREGATION"}</span>
                  </div>
                  <h2
                    id="jumuah-heading"
                    className="mt-1 font-serif text-2xl sm:text-4xl font-bold text-[#0e2a22]"
                  >
                    {isBn ? "সাপ্তাহিক জুমার খুতবাহ ও জামাত" : "Weekly Friday Congregation"}
                  </h2>
                </div>

                <div className="text-xs text-[#52605a] max-w-xs">
                  {isBn
                    ? "জুমার দিনে সুন্নাত তরিকায় দ্রুত মসজিদে উপস্থিত হওয়ার আহ্বান জানানো হচ্ছে।"
                    : "Worshippers are encouraged to arrive early for the sermon."}
                </div>
              </div>

              {/* Jumu'ah Entries Grid */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {jumuah.map((entry, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-[#e5e1d3] bg-[#faf8f4] p-5 sm:p-6 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0d4d3b] uppercase tracking-wider">
                        {isBn ? `জামাত #${convertToBengaliNumber(idx + 1)}` : `Congregation #${idx + 1}`}
                      </span>
                      {entry.location && (
                        <span className="text-xs text-[#52605a]">{entry.location}</span>
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 pb-4 border-b border-[#ece6db]">
                      <div>
                        <span className="text-[10px] font-bold text-[#718079] uppercase tracking-wider">
                          {isBn ? "খুতবাহ শুরু" : "KHUTBAH"}
                        </span>
                        <div className="mt-1 font-mono text-xl sm:text-2xl font-bold text-[#0e2a22]">
                          {entry.khutbahTime}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-[#0d4d3b] uppercase tracking-wider">
                          {isBn ? "জামাত শুরু" : "JAMAT"}
                        </span>
                        <div className="mt-1 font-mono text-xl sm:text-2xl font-bold text-[#0d4d3b]">
                          {entry.prayerTime}
                        </div>
                      </div>
                    </div>

                    {entry.imam && (
                      <div className="mt-4 flex items-center gap-2 text-xs text-[#52605a]">
                        <Users className="w-3.5 h-3.5 text-[#c79a45]" />
                        <span>
                          <strong className="text-[#0e2a22]">{isBn ? "খতিব / ইমাম: " : "Khateeb: "}</strong>
                          {entry.imam}
                        </span>
                      </div>
                    )}

                    {entry.notes && (
                      <p className="mt-2 text-xs text-[#718079]">{entry.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ================================================== */}
        {/* SECTION 6 — PROHIBITED PRAYER TIMES (MAKRUH WAQT) */}
        {/* ================================================== */}
        {prohibitedTimes && (
          <section aria-labelledby="makruh-heading">
            <div className="rounded-3xl border border-[#e5e1d3] bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-[#c79a45] uppercase">
                <AlertTriangle className="w-4 h-4 text-[#c79a45]" />
                <span id="makruh-heading">
                  {isBn ? "নিষিদ্ধ নামাজের সময় (মাকরূহ ওয়াক্ত)" : "PROHIBITED PRAYER TIMES (MAKRUH WAQT)"}
                </span>
              </div>

              <p className="mt-2 text-xs sm:text-sm text-[#52605a] max-w-2xl">
                {isBn
                  ? "হাদিস শরিফ অনুযায়ী নিম্নলিখিত তিনটি মুহূর্তে যেকোনো ধরণের নফল নামাজ আদায় করা মাকরূহে তাহরিমি:"
                  : "Voluntary (Nafl) prayers are strictly prohibited during these three celestial transitions according to prophetic Sunnah:"}
              </p>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Sunrise Interval */}
                <div className="rounded-2xl border border-[#e5e1d3] bg-[#faf8f4] p-5">
                  <span className="text-[10px] font-bold text-[#718079] uppercase tracking-wider block">
                    {isBn ? "১. সূর্যোদয়ের সময়" : "1. SUNRISE TRANSITION"}
                  </span>
                  <div className="mt-2 font-mono text-lg sm:text-xl font-bold text-[#0d4d3b]">
                    {isBn ? prohibitedTimes.sunrise.intervalBn : prohibitedTimes.sunrise.interval}
                  </div>
                  <p className="mt-1 text-xs text-[#52605a]">
                    {isBn
                      ? "সূর্য উদিত হওয়ার পর এক বর্শা সমপরিমাণ উপরে ওঠা পর্যন্ত (~১৫ মিনিট)"
                      : "From sunrise until the sun rises the height of a spear (~15 min)"}
                  </p>
                </div>

                {/* 2. Zawal (Midday) */}
                <div className="rounded-2xl border border-[#e5e1d3] bg-[#faf8f4] p-5">
                  <span className="text-[10px] font-bold text-[#718079] uppercase tracking-wider block">
                    {isBn ? "২. ঠিক দ্বিপ্রহরের সময় (যাওয়াল)" : "2. SOLAR ZENITH (ZAWAL)"}
                  </span>
                  <div className="mt-2 font-mono text-lg sm:text-xl font-bold text-[#0d4d3b]">
                    {isBn ? prohibitedTimes.zawal.intervalBn : prohibitedTimes.zawal.interval}
                  </div>
                  <p className="mt-1 text-xs text-[#52605a]">
                    {isBn
                      ? "সূর্য মধ্যাকাশে অবস্থানকালে জোহরের ওয়াক্ত শুরু হওয়ার পূর্ব পর্যন্ত"
                      : "When sun is at its exact zenith until it begins western descent"}
                  </p>
                </div>

                {/* 3. Sunset Interval */}
                <div className="rounded-2xl border border-[#e5e1d3] bg-[#faf8f4] p-5">
                  <span className="text-[10px] font-bold text-[#718079] uppercase tracking-wider block">
                    {isBn ? "৩. সূর্যাস্তের সময়" : "3. SUNSET TRANSITION"}
                  </span>
                  <div className="mt-2 font-mono text-lg sm:text-xl font-bold text-[#0d4d3b]">
                    {isBn ? prohibitedTimes.sunset.intervalBn : prohibitedTimes.sunset.interval}
                  </div>
                  <p className="mt-1 text-xs text-[#52605a]">
                    {isBn
                      ? "সূর্য হলুদ ও স্তিমিত হওয়ার পর হতে সূর্যাস্ত সম্পন্ন হওয়া পর্যন্ত"
                      : "When the sun pales and descends until it completely sets"}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ================================================== */}
        {/* SECTION 7 — TAHAJJUD / NIGHT PRAYER               */}
        {/* ================================================== */}
        {tahajjudWindow && (
          <section aria-labelledby="tahajjud-heading">
            <div className="rounded-3xl border border-[#0d4d3b] bg-linear-to-br from-[#0d4d3b] via-[#0b4137] to-[#072a20] p-6 sm:p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-[#e0be79] uppercase">
                  <Moon className="w-4 h-4 text-[#e0be79]" />
                  <span id="tahajjud-heading">
                    {isBn ? "তাহাজ্জুদ ও কিয়ামুল লাইল" : "TAHAJJUD & NIGHT PRAYER (QIYAM AL-LAYL)"}
                  </span>
                </div>
                <h3 className="mt-2 font-serif text-2xl sm:text-3xl font-bold text-white">
                  {isBn ? "রাতের শেষ তৃতীয়াংশের বরকতময় সময়" : "The Last Third of the Night"}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-white/80 max-w-xl">
                  {isBn
                    ? "রাসূলুল্লাহ ﷺ বলেছেন: আমাদের প্রতিপালক প্রতি রাতের শেষ তৃতীয়াংশে প্রথম আসমানে নেমে আহ্বান জানান—কে আছো যে আমাকে ডাকবে, আমি তার ডাকে সাড়া দেব? (সহীহ বুখারী)"
                    : "The Prophet ﷺ said: Our Lord descends every night to the lowest heaven when the last third remains, answering those who call upon Him. (Sahih al-Bukhari)"}
                </p>
              </div>

              <div className="shrink-0 rounded-2xl border border-[#c79a45]/40 bg-black/25 p-5 text-center min-w-[220px]">
                <span className="text-[10px] font-bold tracking-[0.2em] text-[#e0be79] uppercase block">
                  {isBn ? "শ্রেষ্ঠ তাহাজ্জুদ সময়" : "PREFERRED WINDOW"}
                </span>
                <span className="mt-2 block font-mono text-xl sm:text-2xl font-bold text-white">
                  {isBn ? tahajjudWindow.windowBn : tahajjudWindow.windowEn}
                </span>
                <span className="mt-1 block text-[10px] text-white/70">
                  {isBn ? "ফজরের আযান পর্যন্ত অব্যাহত" : "Until dawn (Fajr) commences"}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* ================================================== */}
        {/* SECTION 8 — MONTHLY PRAYER CALENDAR               */}
        {/* ================================================== */}
        <section aria-labelledby="calendar-heading">
          <div className="rounded-3xl border border-[#e5e1d3] bg-white p-6 sm:p-8 lg:p-10 shadow-sm">
            {/* Header with Month Nav and Today Jump */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#e5e1d3]">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-[#0d4d3b] uppercase">
                  <Calendar className="w-4 h-4 text-[#c79a45]" />
                  <span>{isBn ? "মাসিক ক্যালেন্ডার" : "MONTHLY TIMETABLE CALENDAR"}</span>
                </div>
                <h2
                  id="calendar-heading"
                  className="mt-1 font-serif text-2xl sm:text-3xl font-bold text-[#0e2a22]"
                >
                  {monthLabel}
                </h2>
              </div>

              {/* Month Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={jumpToToday}
                  className="px-3.5 py-1.5 rounded-xl border border-[#d2ccc0] bg-white hover:bg-[#faf7f0] text-xs font-semibold text-[#0d4d3b] transition-colors shadow-xs"
                >
                  {isBn ? "আজকের দিন" : "Today"}
                </button>

                <div className="flex items-center rounded-xl border border-[#d2ccc0] bg-white p-1 shadow-xs">
                  <button
                    type="button"
                    onClick={() => changeMonth(-1)}
                    aria-label={isBn ? "পূর্ববর্তী মাস" : "Previous Month"}
                    className="p-1.5 rounded-lg hover:bg-[#faf7f0] text-[#0d4d3b] transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => changeMonth(1)}
                    aria-label={isBn ? "পরবর্তী মাস" : "Next Month"}
                    className="p-1.5 rounded-lg hover:bg-[#faf7f0] text-[#0d4d3b] transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="mt-6">
              {/* Weekday Header (Sat - Fri) */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs font-bold text-[#718079] pb-3 border-b border-[#ece6db]">
                {(isBn ? WEEKDAYS_BN : WEEKDAYS_EN).map((day, idx) => (
                  <div
                    key={day}
                    className={`py-1 ${idx === 6 ? "text-[#0d4d3b] font-extrabold" : ""}`}
                  >
                    {day}
                    {idx === 6 && <span className="block text-[9px] uppercase font-normal text-[#c79a45]">{isBn ? "জুমা" : "Jumu'ah"}</span>}
                  </div>
                ))}
              </div>

              {/* Month Grid Cells */}
              <div className="mt-3 grid grid-cols-7 gap-1 sm:gap-2">
                {calendarDays.map((day, idx) => {
                  if (day === null) {
                    return <div key={`blank-${idx}`} className="aspect-square" />;
                  }

                  const monthNum = String(calendarMonth.getMonth() + 1).padStart(2, "0");
                  const dayNum = String(day).padStart(2, "0");
                  const isoDate = `${calendarMonth.getFullYear()}-${monthNum}-${dayNum}`;
                  const isSelected = selectedDate === isoDate;
                  const isCurrentToday = todayIso === isoDate;
                  const dayOfWeek = (idx) % 7;
                  const isFriday = dayOfWeek === 6;

                  return (
                    <button
                      key={isoDate}
                      type="button"
                      onClick={() => setSelectedDate(isoDate)}
                      aria-label={`Date ${isoDate}`}
                      className={`aspect-square rounded-2xl flex flex-col items-center justify-center text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer relative ${
                        isSelected
                          ? "bg-[#0d4d3b] text-white font-bold shadow-md scale-105"
                          : isCurrentToday
                          ? "border-2 border-[#c79a45] bg-[#faf7f0] text-[#0e2a22] font-bold"
                          : isFriday
                          ? "bg-[#f2f7f4] hover:bg-[#e7f0ec] text-[#0d4d3b]"
                          : "bg-[#faf9f4] hover:bg-[#f2efe6] text-[#24332d]"
                      }`}
                    >
                      <span>{isBn ? convertToBengaliNumber(day) : day}</span>
                      {isCurrentToday && !isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#c79a45] mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Day Inspector Panel */}
            <div className="mt-8 rounded-2xl border border-[#e5e1d3] bg-[#faf8f3] p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#ece6db]">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c79a45]">
                    {isBn ? "নির্বাচিত তারিখের সময়সূচি" : "SELECTED DAY INSPECTOR"}
                  </span>
                  <h3 className="mt-1 font-serif text-xl sm:text-2xl font-bold text-[#0e2a22]">
                    {selectedDayHeader}
                  </h3>
                </div>

                {selectedDate === todayIso && (
                  <span className="px-3 py-1 rounded-full bg-[#0d4d3b]/10 border border-[#0d4d3b]/30 text-xs font-bold text-[#0d4d3b]">
                    {isBn ? "আজকের দিন" : "Today"}
                  </span>
                )}
              </div>

              {/* Day Inspector Prayer Row */}
              {selectedDayLoading ? (
                <div className="py-8 text-center text-xs text-[#52605a] animate-pulse">
                  {isBn ? "সময়সূচি লোড হচ্ছে..." : "Loading authoritative prayer schedule..."}
                </div>
              ) : selectedDayTimes ? (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {PRAYER_ORDER.map((key) => {
                    const timing = selectedDayTimes.timings[key];
                    if (!timing) return null;
                    const time24 = timing.time;
                    const timeDisp = formatTime12(time24, isBn);
                    const iqamah24 = selectedDayTimes.iqamahTimings?.[key];
                    const iqamahDisp = iqamah24 ? formatTime12(iqamah24, isBn) : null;

                    return (
                      <div
                        key={key}
                        className="rounded-xl border border-[#e5e1d3] bg-white p-3 text-center shadow-xs"
                      >
                        <span className="text-[10px] font-bold text-[#718079] uppercase block">
                          {isBn ? PRAYER_NAMES[key].bn : PRAYER_NAMES[key].en}
                        </span>
                        <span className="mt-1 block font-mono text-base sm:text-lg font-bold text-[#0e2a22]">
                          {timeDisp}
                        </span>
                        {key !== "sunrise" && (
                          <span className="mt-1 block text-[10px] font-semibold text-[#0d4d3b]">
                            {iqamahDisp ? (isBn ? `জামাত: ${iqamahDisp}` : `Jamat: ${iqamahDisp}`) : (isBn ? "জামাত নির্ধারিত" : "Congregation")}
                          </span>
                        )}
                        {key === "sunrise" && (
                          <span className="mt-1 block text-[10px] text-[#718079]">
                            {isBn ? "ফজরের সমাপ্তি" : "End of Fajr"}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-[#52605a]">
                  {isBn ? "এই তারিখের জন্য তথ্য পাওয়া যায়নি।" : "No data available for this date."}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ================================================== */}
        {/* SECTION 9 — SACRED QURANIC INSCRIPTION             */}
        {/* ================================================== */}
        <section aria-label="Quranic Inscription" className="text-center">
          <div className="rounded-3xl border border-[#c79a45]/30 bg-[#072a20] text-white p-6 sm:p-10 max-w-4xl mx-auto shadow-md">
            <div
              dir="rtl"
              lang="ar"
              className="font-serif text-2xl sm:text-3xl text-[#e0be79] leading-relaxed tracking-wide select-none"
            >
              إِنَّ ٱلصَّلَوٰةَ كَانَتْ عَلَى ٱلْمُؤْمِنِينَ كِتَٰبًا مَّوْقُوتًا
            </div>
            <p className="mt-4 text-xs sm:text-sm text-white/90 font-serif italic max-w-xl mx-auto">
              {isBn
                ? "“নিশ্চয়ই নির্দিষ্ট সময়ে সালাত আদায় করা মুমিনদের জন্য একটি আবশ্যক বিধান।”"
                : "“Indeed, prayer has been decreed upon the believers a decree of specified times.”"}
            </p>
            <p className="mt-1 text-[11px] font-medium tracking-wider text-[#e0be79] uppercase">
              {isBn ? "— সূরা আন-নিসা (৪:১০৩)" : "— Surah An-Nisa (4:103)"}
            </p>
          </div>
        </section>
      </main>

      {/* Global Site Footer */}
      <SiteFooter />
    </div>
  );
}
