"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { InnerPage } from "@/components/inner-page";
import { SiteFooter } from "@/components/site-footer";
import { usePublicPrayerTimes } from "@/hooks/use-public-prayer-times";
import { getTodayInTimezone } from "@/lib/mosque/format";

const TIMEZONE = "Asia/Dhaka";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

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

function formatCountdown(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.max(totalSeconds % 60, 0)
    .toString()
    .padStart(2, "0");
  return `${hours} : ${minutes} : ${seconds}`;
}

function formatMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatLongDate(dateValue: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateValue}T12:00:00+06:00`));
}

function formatDisplayDate(dateValue: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateValue}T12:00:00+06:00`));
}

function formatTodayHeader(dateValue: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateValue}T12:00:00+06:00`));
}

function getCalendarDays(year: number, month: number): Array<number | null> {
  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const dateCount = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: offset + dateCount }, (_, index) =>
    index < offset ? null : index - offset + 1,
  );
}

export default function PrayerTimesPage() {
  const today = getTodayInTimezone(TIMEZONE);
  const { prayers: livePrayers, jumuah, timezone, hijriDate, nextPrayerIndex, countdownSeconds, loading, error } = usePublicPrayerTimes();
  const [selectedDate, setSelectedDate] = useState(today);
  const [monthAnchor, setMonthAnchor] = useState(() => new Date(`${today}T12:00:00+06:00`));
  const [now, setNow] = useState<Date>(new Date());

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
        { id: "fajr", name: "Fajr", time: "--:--", time24: "" },
        { id: "sunrise", name: "Sunrise", time: "--:--", time24: "" },
        { id: "dhuhr", name: "Dhuhr", time: "--:--", time24: "" },
        { id: "asr", name: "Asr", time: "--:--", time24: "" },
        { id: "maghrib", name: "Maghrib", time: "--:--", time24: "" },
        { id: "isha", name: "Isha", time: "--:--", time24: "" },
      ];
    }
    return livePrayers.map((prayer) => ({
      id: prayer.id,
      name: prayer.nameEn,
      time: prayer.timeEn,
      time24: prayer.time24,
    }));
  }, [livePrayers]);

  const nextPrayer = useMemo(() => {
    if (!prayerList.length || prayerList[0]?.time === "--:--") {
      return null;
    }

    const schedule = prayerList
      .filter((prayer) => prayer.time24)
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
    return { ...chosen, remainingSeconds: Math.max(0, Math.floor((chosen.date.getTime() - now.getTime()) / 1000)) };
  }, [prayerList, now, timezone]);

  const activeIndex = nextPrayerIndex >= 0 && nextPrayerIndex < prayerList.length
    ? nextPrayerIndex
    :0;

  const nextPrayerLabel = nextPrayer?.name ?? "Fajr";
  const nextPrayerTime = nextPrayer?.time ?? "--:--";
  const countdown = nextPrayer?.remainingSeconds ?? countdownSeconds ?? 0;
  const monthDays = getCalendarDays(monthAnchor.getFullYear(), monthAnchor.getMonth());
  const selectedMonthLabel = formatMonthLabel(monthAnchor);
  const selectedDayLabel = formatLongDate(selectedDate);
  const todayLabel = formatTodayHeader(today);
  const todayTimeText = new Intl.DateTimeFormat("en-GB", { timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit" }).format(now);
  const todayHijri = hijriDate ? hijriDate : "No hijri date available";

  const jumuahSummary = jumuah.length
    ? jumuah.map((entry) => `${entry.khutbahTime} / ${entry.prayerTime}`).join(" • ")
    : "Not configured";

  const selectedMatchesMonth =
    selectedDate.slice(0, 7) === `${monthAnchor.getFullYear()}-${String(monthAnchor.getMonth() + 1).padStart(2, "0")}`;

  const resetToToday = () => {
    setSelectedDate(today);
    setMonthAnchor(new Date(`${today}T12:00:00+06:00`));
  };

  const changeMonth = (direction: number) => {
    const next = new Date(monthAnchor);
    next.setMonth(next.getMonth() + direction);
    setMonthAnchor(next);
    setSelectedDate(
      `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(new Date(next.getFullYear(), next.getMonth(), 1).getDate()).padStart(2, "0")}`,
    );
  };

  if (loading && !livePrayers.length) {
    return (
      <>
        <InnerPage eyebrow="PRAYER TIMES · DHAKA, BANGLADESH" title="Prayer times.">
          <div className="space-y-6 p-4 sm:p-6">
            <div className="animate-pulse rounded-2xl border border-[#d9d4c6] bg-white p-5">
              <div className="h-4 w-32 rounded bg-slate-200" />
              <div className="mt-4 h-8 w-52 rounded bg-slate-200" />
              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-28 rounded-xl bg-slate-100" />
                ))}
              </div>
            </div>
          </div>
        </InnerPage>
        <SiteFooter />
      </>
    );
  }

  if (error && !livePrayers.length) {
    return (
      <>
        <InnerPage eyebrow="PRAYER TIMES · DHAKA, BANGLADESH" title="Prayer times.">
          <div className="mx-auto max-w-xl rounded-2xl border border-[#e1d9c6] bg-white p-8 text-center shadow-sm">
            <p className="text-xs font-bold tracking-[0.22em] text-[#c79a45]">UNABLE TO LOAD</p>
            <h2 className="mt-4 text-3xl font-semibold text-[#11241d]">Unable to load today&apos;s prayer times.</h2>
            <p className="mt-3 text-sm text-[#607068]">Please refresh the page or try again shortly.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-[#0d4d3b] px-5 text-sm font-semibold text-white"
            >
              Try again
            </button>
          </div>
        </InnerPage>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <InnerPage eyebrow="PRAYER TIMES · DHAKA, BANGLADESH" title="Prayer times.">
        <div className="space-y-8 px-0 pb-8 sm:space-y-10">
          <section className="rounded-[28px] border border-[#d9d4c5] bg-[#f9f6ef] p-4 shadow-[0_16px_40px_rgba(14,39,32,0.05)] sm:p-6 lg:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[10px] font-bold tracking-[0.26em] text-[#c79a45]">PRAYER TIMES</p>
                <h1 className="mt-3 text-3xl font-semibold text-[#12251d] sm:text-4xl">Daily prayer schedule for Noor Community Mosque</h1>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#51615d]">
                  <span>{todayLabel}</span>
                  <span className="text-[#c79a45]">•</span>
                  <span>{todayHijri}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-[#d9d4c5] bg-white px-4 py-3 text-sm text-[#21362d] shadow-sm">
                <div className="font-semibold">Dhaka, Bangladesh</div>
                <div className="text-[#607068]">{timezone || TIMEZONE}</div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-[28px] border border-[#d9d4c5] bg-white p-4 shadow-[0_16px_40px_rgba(14,39,32,0.04)] sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3 border-b border-[#ece6db] pb-4">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.24em] text-[#c79a45]">TODAY</p>
                  <h2 className="mt-2 text-xl font-semibold text-[#12251d]">{todayLabel}</h2>
                </div>
                <div className="font-mono text-sm text-[#45635a]">{todayTimeText}</div>
              </div>

              <div className="space-y-3">
                {prayerList.map((prayer, index) => {
                  const isNext = index === activeIndex && prayer.time !== "--:--";
                  const isSunrise = prayer.id === "sunrise";
                  const canShowJamaah = prayer.id !== "sunrise";
                  return (
                    <div
                      key={prayer.id}
                      className={`rounded-2xl border p-3 transition-colors ${
                        isNext
                          ? "border-[#d7b06c] bg-[#f4efe5]"
                          : "border-[#e9e4d9] bg-[#fbfaf7]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold tracking-[0.22em] text-[#76857f]">{prayer.name.toUpperCase()}</span>
                            {isNext && (
                              <span className="rounded-full bg-[#d7b06c] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#12251d]">
                                Next
                              </span>
                            )}
                          </div>
                          <div className="mt-2 text-2xl font-semibold text-[#12251d]">{isSunrise ? prayer.time : prayer.time}</div>
                        </div>
                        {canShowJamaah ? (
                          <div className="text-right">
                            <div className="text-[10px] font-bold tracking-[0.18em] text-[#c79a45]">Jama'ah</div>
                            <div className="mt-1 text-sm font-medium text-[#132d28]">Not configured</div>
                          </div>
                        ) : (
                          <div className="text-right">
                            <div className="text-[10px] font-bold tracking-[0.18em] text-[#8a938c]">SUNRISE</div>
                            <div className="mt-1 text-sm font-medium text-[#607068]">No congregation</div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <aside className="rounded-[28px] border border-[#0d4d3b] bg-[#0d4d3b] p-5 text-white shadow-[0_16px_40px_rgba(13,77,59,0.24)] sm:p-6" aria-live="polite">
              <p className="text-[10px] font-bold tracking-[0.26em] text-[#deb668]">NEXT PRAYER</p>
              <h2 className="mt-4 text-5xl font-semibold tracking-tight">{nextPrayerLabel}</h2>
              <p className="mt-2 text-xl text-white/80">{nextPrayerTime}</p>
              <div className="mt-6 border-y border-white/20 py-5">
                <p className="font-mono text-3xl tracking-[0.14em]">{formatCountdown(countdown)}</p>
                <p className="mt-2 text-sm text-white/65">remaining</p>
              </div>
              <div className="mt-5 text-sm text-white/75">Jama'ah {nextPrayerTime}</div>
              <div className="mt-5 text-[10px] font-bold tracking-[0.2em] text-[#d7b06c]">DHAKA • ASIA/DHAKA • UTC+06:00</div>
            </aside>
          </section>

          <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[28px] border border-[#d9d4c5] bg-white p-5 shadow-sm sm:p-6">
              <p className="text-[10px] font-bold tracking-[0.22em] text-[#c79a45]">JUMU'AH</p>
              <h3 className="mt-3 text-3xl font-semibold text-[#12251d]">Friday Prayer</h3>
              <p className="mt-4 text-sm text-[#607068]">{jumuahSummary}</p>
              <div className="mt-6 space-y-3 text-sm">
                {jumuah.length ? (
                  jumuah.map((entry, index) => (
                    <div key={`${entry.khutbahTime}-${index}`} className="rounded-2xl border border-[#e9e4d9] bg-[#faf8f4] p-3">
                      <div className="text-[10px] font-bold tracking-[0.18em] text-[#c79a45]">{index === 0 ? "FIRST" : "SECOND"}</div>
                      <div className="mt-2 font-semibold text-[#12251d]">Khutbah {entry.khutbahTime}</div>
                      <div className="mt-1 text-[#607068]">Prayer {entry.prayerTime}</div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-[#e9e4d9] bg-[#faf8f4] p-3 text-[#607068]">No Friday schedule is configured yet.</div>
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-[#d9d4c5] bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.22em] text-[#c79a45]">PRAYER CALENDAR</p>
                  <h3 className="mt-2 text-2xl font-semibold text-[#12251d]">{selectedMonthLabel}</h3>
                </div>
                <button
                  type="button"
                  onClick={resetToToday}
                  className="min-h-11 rounded-full border border-[#d7b06c] px-4 text-sm font-semibold text-[#0d4d3b]"
                >
                  Today
                </button>
              </div>

              <div className="mt-5 border border-[#ece6db] bg-[#fbfaf7] p-3">
                <div className="mb-3 flex items-center justify-between">
                  <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month" className="min-h-11 min-w-11 rounded-full text-xl text-[#0d4d3b]">←</button>
                  <div className="text-sm font-semibold text-[#12251d]">{selectedMonthLabel}</div>
                  <button type="button" onClick={() => changeMonth(1)} aria-label="Next month" className="min-h-11 min-w-11 rounded-full text-xl text-[#0d4d3b]">→</button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold tracking-[0.12em] text-[#76857f]">
                  {DAYS.map((day) => (
                    <div key={day} className="py-2">{day}</div>
                  ))}
                  {monthDays.map((day, index) => {
                    if (day === null) {
                      return <div key={`empty-${index}`} className="aspect-square" />;
                    }
                    const isoDate = `${monthAnchor.getFullYear()}-${String(monthAnchor.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const isSelected = selectedDate === isoDate;
                    const isToday = today === isoDate;
                    return (
                      <button
                        key={isoDate}
                        type="button"
                        onClick={() => setSelectedDate(isoDate)}
                        className={`aspect-square rounded-full text-sm font-medium ${
                          isSelected ? "bg-[#0d4d3b] text-white" : isToday ? "border border-[#d7b06c] bg-[#f4efe5] text-[#12251d]" : "text-[#12251d] hover:bg-[#f5f0e7]"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-[#d9d4c5] bg-white p-5 shadow-sm sm:p-6">
            <p className="text-[10px] font-bold tracking-[0.22em] text-[#c79a45]">SELECTED DAY</p>
            <h3 className="mt-3 text-2xl font-semibold text-[#12251d]">{selectedDayLabel}</h3>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {prayerList.map((prayer) => (
                <div key={`${prayer.id}-selected`} className="rounded-2xl border border-[#e9e4d9] bg-[#faf8f4] p-3">
                  <div className="text-[10px] font-bold tracking-[0.18em] text-[#76857f]">{prayer.name.toUpperCase()}</div>
                  <div className="mt-2 text-lg font-semibold text-[#12251d]">{prayer.time}</div>
                  <div className="mt-2 text-sm text-[#607068]">Jama'ah: Not configured</div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-[#d9d4c5] bg-white p-5 shadow-sm sm:p-6">
            <p className="text-[10px] font-bold tracking-[0.22em] text-[#c79a45]">TIME INFORMATION</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-[#e9e4d9] bg-[#faf8f4] p-4">
                <div className="text-[10px] font-bold tracking-[0.18em] text-[#76857f]">LOCATION</div>
                <div className="mt-2 font-semibold text-[#12251d]">Dhaka, Bangladesh</div>
              </div>
              <div className="rounded-2xl border border-[#e9e4d9] bg-[#faf8f4] p-4">
                <div className="text-[10px] font-bold tracking-[0.18em] text-[#76857f]">TIMEZONE</div>
                <div className="mt-2 font-semibold text-[#12251d]">{timezone || TIMEZONE}</div>
              </div>
              <div className="rounded-2xl border border-[#e9e4d9] bg-[#faf8f4] p-4">
                <div className="text-[10px] font-bold tracking-[0.18em] text-[#76857f]">HIJRI</div>
                <div className="mt-2 font-semibold text-[#12251d]">{todayHijri}</div>
              </div>
              <div className="rounded-2xl border border-[#e9e4d9] bg-[#faf8f4] p-4">
                <div className="text-[10px] font-bold tracking-[0.18em] text-[#76857f]">LAST UPDATED</div>
                <div className="mt-2 font-semibold text-[#12251d]">{new Intl.DateTimeFormat("en-GB", { timeZone: TIMEZONE, dateStyle: "medium", timeStyle: "short" }).format(now)}</div>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-[#d9d4c5] bg-white p-5 shadow-sm sm:p-6">
            <p className="text-[10px] font-bold tracking-[0.22em] text-[#c79a45]">QUICK LINKS</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Link href="/events" className="rounded-2xl border border-[#e9e4d9] bg-[#faf8f4] p-4 text-[#12251d] transition-colors hover:bg-[#f1ebdf]">Upcoming events</Link>
              <Link href="/about" className="rounded-2xl border border-[#e9e4d9] bg-[#faf8f4] p-4 text-[#12251d] transition-colors hover:bg-[#f1ebdf]">Visit the mosque</Link>
              <Link href="/donations" className="rounded-2xl border border-[#e9e4d9] bg-[#faf8f4] p-4 text-[#12251d] transition-colors hover:bg-[#f1ebdf]">Support the mosque</Link>
            </div>
          </section>

          <section className="rounded-[28px] border border-[#d9d4c5] bg-[#f8f4ed] p-6 text-center shadow-sm">
            <p className="text-2xl font-medium italic text-[#12251d] sm:text-3xl">“Indeed, prayer has been decreed upon the believers at specified times.”</p>
            <p className="mt-3 text-[10px] font-bold tracking-[0.22em] text-[#c79a45]">QUR’AN 4:103</p>
          </section>

          <section className="rounded-[28px] bg-[#0d4d3b] p-6 text-white shadow-[0_16px_40px_rgba(13,77,59,0.2)] sm:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <p className="text-[10px] font-bold tracking-[0.22em] text-[#d7b06c]">STAY CONNECTED</p>
                <h3 className="mt-2 text-3xl font-semibold leading-tight">There is a place for you at Noor.</h3>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center md:justify-end">
                <Link
                  href="/events"
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/35 bg-white/5 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Upcoming events
                </Link>
                <Link
                  href="/donations"
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#d7b06c] px-5 text-sm font-semibold text-[#102a24] transition-colors hover:bg-[#e0b76a]"
                >
                  Support the mosque
                </Link>
              </div>
            </div>
          </section>
        </div>
      </InnerPage>
      <SiteFooter />
    </>
  );
}

