"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { InnerPage } from "@/components/inner-page";
import { useResource } from "@/components/ui/use-resource";
import {
  formatClockTime,
  formatCount,
  formatLongDate,
  getTodayInTimezone,
} from "@/lib/mosque/format";
import { fetchRamadanSchedules } from "@/services/ramadanService";

function countdown(seconds: number) {
  const hours = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const remaining = Math.max(seconds % 60, 0)
    .toString()
    .padStart(2, "0");
  return `${hours} : ${minutes} : ${remaining}`;
}

export function PublicRamadanPage() {
  const [search, setSearch] = useState("");
  const [now, setNow] = useState<Date | null>(null);

  // Live real Ramadan API resource
  const { data: rawSchedules, error, initialising, reload } = useResource(fetchRamadanSchedules);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Sort and assign virtual sequential day numbers
  const schedules = useMemo(() => {
    const sorted = [...(rawSchedules || [])].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.map((s, idx) => ({
      ...s,
      dayNumber: idx + 1,
    }));
  }, [rawSchedules]);

  // Today in mosque timezone
  const todayMosque = useMemo(() => getTodayInTimezone("Asia/Dhaka"), []);
  const todaySchedule = schedules.find((s) => s.date === todayMosque);
  const nextSchedule = schedules.find((s) => s.date >= todayMosque) || schedules[0];
  const activeSchedule = todaySchedule || nextSchedule;

  // Filtered schedules for search
  const filteredSchedules = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return schedules;
    return schedules.filter(
      (s) =>
        s.date.toLowerCase().includes(q) ||
        `day ${s.dayNumber}`.toLowerCase().includes(q) ||
        (s.notes && s.notes.toLowerCase().includes(q))
    );
  }, [schedules, search]);

  // Next countdown calculation
  const secondsToNext = useMemo(() => {
    if (!activeSchedule) return 0;
    const [h, m] = activeSchedule.fastingEnd.split(":").map(Number);
    const target = new Date();
    target.setHours(h, m, 0, 0);
    const current = now || new Date();
    const diff = Math.floor((target.getTime() - current.getTime()) / 1000);
    return diff > 0 ? diff : 0;
  }, [activeSchedule, now]);

  return (
    <InnerPage
      eyebrow="RAMADAN TIMETABLE · DHAKA, BANGLADESH"
      title="Ramadan Kareem."
    >
      <div className="space-y-16">
        {/* Today's / Upcoming Fast Hero Section */}
        <section
          aria-labelledby="today-ramadan-heading"
          className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]"
        >
          <div className="border border-[#e1dfd5] bg-white p-6 shadow-[0_18px_50px_rgba(20,45,35,0.07)] sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#e5e3da] pb-6">
              <div>
                <p className="text-xs font-bold tracking-[.2em] text-[#c79a45]">
                  {todaySchedule ? "TODAY’S FAST" : "UPCOMING SCHEDULE"} ·{" "}
                  {activeSchedule ? formatLongDate(activeSchedule.date).toUpperCase() : "DHAKA"}
                </p>
                <h2 id="today-ramadan-heading" className="mt-3 text-3xl font-semibold text-[#17211d]">
                  {activeSchedule ? `Ramadan Day ${activeSchedule.dayNumber}` : "Fasting Timetable"}
                </h2>
                <p className="mt-2 text-sm text-[#69726d]">
                  {activeSchedule
                    ? `${activeSchedule.year} AH · Accurate local sighting and mosque timings`
                    : "Daily Sehri & Iftar timetable for Dhaka"}
                </p>
              </div>
              <div className="flex items-center gap-2 font-mono text-sm text-[#c79a45]">
                <span className="text-lg leading-none" aria-hidden="true">
                  ◷
                </span>
                <span>Asia/Dhaka</span>
              </div>
            </div>

            {initialising ? (
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-28 animate-pulse rounded bg-[#faf9f4]" />
                ))}
              </div>
            ) : error ? (
              <div className="mt-6 rounded-lg border border-[#e5a8a8] bg-[#fdf2f2] p-4 text-center">
                <p className="text-sm text-[#991b1b]">Unable to load Ramadan timetable at this time.</p>
                <button
                  type="button"
                  onClick={reload}
                  className="mt-2 text-xs font-semibold text-[#0d4d3b] underline"
                >
                  Try loading again
                </button>
              </div>
            ) : activeSchedule ? (
              <div className="mt-6 grid grid-cols-2 gap-px border border-[#e5e3da] bg-[#e5e3da] sm:grid-cols-4">
                <div className="bg-[#faf9f4] p-4">
                  <span className="block text-[11px] font-bold tracking-[.14em] text-[#69726d]">
                    SEHRI / IMSAK
                  </span>
                  <p className="mt-3 text-2xl font-bold text-[#17211d]">
                    {formatClockTime(activeSchedule.fastingStart)}
                  </p>
                  <span className="mt-2 block text-[11px] text-[#69726d]">Fast begins</span>
                </div>

                <div className="border-t-2 border-[#0d4d3b] bg-[#f2eee3] p-4">
                  <span className="block text-[11px] font-bold tracking-[.14em] text-[#0d4d3b]">
                    IFTAR (SUNSET)
                  </span>
                  <p className="mt-3 text-2xl font-bold text-[#0d4d3b]">
                    {formatClockTime(activeSchedule.fastingEnd)}
                  </p>
                  <span className="mt-2 block text-[11px] text-[#0d4d3b]">Fast breaks</span>
                </div>

                <div className="bg-[#faf9f4] p-4">
                  <span className="block text-[11px] font-bold tracking-[.14em] text-[#69726d]">
                    SUHOOR
                  </span>
                  <p className="mt-3 text-xl font-semibold text-[#17211d]">
                    {activeSchedule.suhoorTime ? formatClockTime(activeSchedule.suhoorTime) : "—"}
                  </p>
                  <span className="mt-2 block text-[11px] text-[#69726d]">Mosque service</span>
                </div>

                <div className="bg-[#faf9f4] p-4">
                  <span className="block text-[11px] font-bold tracking-[.14em] text-[#69726d]">
                    TARAWEEH
                  </span>
                  <p className="mt-3 text-xl font-semibold text-[#17211d]">
                    {activeSchedule.taraweehTime ? formatClockTime(activeSchedule.taraweehTime) : "—"}
                  </p>
                  <span className="mt-2 block text-[11px] text-[#69726d]">Congregation</span>
                </div>
              </div>
            ) : (
              <div className="mt-6 bg-[#faf9f4] p-8 text-center text-sm text-[#69726d]">
                No Ramadan schedule configured for this period yet.
              </div>
            )}
          </div>

          {/* Countdown Card */}
          <aside
            className="relative flex flex-col justify-between overflow-hidden bg-[#0d4d3b] p-7 text-white sm:p-8"
            aria-live="polite"
          >
            <div>
              <p className="text-xs font-bold tracking-[.2em] text-[#e0be79]">
                {todaySchedule ? "COUNTDOWN TO IFTAR" : "RAMADAN REMINDER"}
              </p>
              <h2 className="mt-4 text-4xl font-semibold">
                {todaySchedule ? "Iftar Time" : "Ramadan Kareem"}
              </h2>
              <p className="mt-2 text-sm text-white/70">
                {activeSchedule
                  ? `Day ${activeSchedule.dayNumber} · Iftar at ${formatClockTime(activeSchedule.fastingEnd)}`
                  : "Daily fasting and prayer timetable"}
              </p>
            </div>

            <div className="my-8 border-y border-white/20 py-6">
              <p className="font-mono text-3xl tracking-[.08em] sm:text-4xl">
                {secondsToNext > 0 ? countdown(secondsToNext) : "00 : 00 : 00"}
              </p>
              <p className="mt-2 text-xs text-white/65">
                {secondsToNext > 0
                  ? "remaining until Iftar / Maghrib"
                  : "May Allah accept our fasting and prayers."}
              </p>
            </div>

            <p className="text-xs tracking-[.12em] text-white/65">
              DHAKA · ASIA/DHAKA · BANGLADESH
            </p>
          </aside>
        </section>

        {/* Duas Section */}
        <section aria-labelledby="duas-heading" className="grid gap-6 md:grid-cols-2">
          <div className="border-l-2 border-[#c79a45] bg-[#f2eee3] p-6 sm:p-8">
            <p className="text-xs font-bold tracking-[.2em] text-[#c79a45]">
              INTENTION (NIYYAH) FOR FASTING
            </p>
            <p className="mt-4 font-serif text-lg leading-relaxed text-[#17211d]">
              نَوَيْتُ أَنْ أَصُومَ غَدًا عَنْ أَدَاءِ فَرْضِ شَهْرِ رَمَضَانَ هَذِهِ السَّنَةِ لِلَّهِ تَعَالَى
            </p>
            <p className="mt-3 text-xs italic text-[#69726d]">
              “I intend to fast tomorrow in fulfillment of the obligation of Ramadan this year for Allah the Almighty.”
            </p>
          </div>

          <div className="border-l-2 border-[#0d4d3b] bg-[#eaf2ed] p-6 sm:p-8">
            <p className="text-xs font-bold tracking-[.2em] text-[#0d4d3b]">
              DUA FOR BREAKING FAST (IFTAR)
            </p>
            <p className="mt-4 font-serif text-lg leading-relaxed text-[#0d4d3b]">
              ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الأَجْرُ إِنْ شَاءَ اللَّهُ
            </p>
            <p className="mt-3 text-xs italic text-[#555f58]">
              “The thirst is gone, the veins are moistened, and the reward is confirmed, if Allah wills.”
            </p>
          </div>
        </section>

        {/* Full 30-Day Timetable Section */}
        <section aria-labelledby="calendar-heading" className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[.2em] text-[#c79a45]">
                COMPLETE TIMETABLE
              </p>
              <h2 id="calendar-heading" className="mt-2 text-3xl font-semibold text-[#17211d]">
                Ramadan Daily Schedule
              </h2>
              <p className="mt-1 text-sm text-[#69726d]">
                {schedules.length > 0
                  ? `Showing ${formatCount(schedules.length)} scheduled days for Hijri Year ${schedules[0]?.year} AH`
                  : "Daily Sehri (Imsak) and Iftar schedule"}
              </p>
            </div>

            <div className="w-full sm:w-72">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search date or day (e.g. Day 1)..."
                className="w-full border border-[#deddd3] bg-white px-4 py-2.5 text-sm text-[#17211d] outline-none focus:border-[#0d4d3b]"
              />
            </div>
          </div>

          {filteredSchedules.length === 0 ? (
            <div className="border border-[#deddd3] bg-white p-10 text-center text-sm text-[#69726d]">
              {search
                ? `No schedule records match "${search}".`
                : "No Ramadan timetable entries have been published yet."}
            </div>
          ) : (
            <div className="overflow-x-auto border border-[#deddd3] bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#deddd3] bg-[#faf9f4] text-[11.5px] uppercase tracking-wider text-[#69726d]">
                  <tr>
                    <th className="px-5 py-3.5 font-bold">Ramadan Day</th>
                    <th className="px-5 py-3.5 font-bold">Date</th>
                    <th className="px-5 py-3.5 font-bold">Sehri (Imsak)</th>
                    <th className="px-5 py-3.5 font-bold">Iftar (Sunset)</th>
                    <th className="px-5 py-3.5 font-bold">Taraweeh</th>
                    <th className="px-5 py-3.5 font-bold">Notes & Events</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eceae0]">
                  {filteredSchedules.map((row) => {
                    const isToday = row.date === todayMosque;
                    return (
                      <tr
                        key={row.id}
                        className={`transition-colors hover:bg-[#faf9f4] ${
                          isToday ? "bg-[#f2eee3] font-medium" : ""
                        }`}
                      >
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${
                              isToday
                                ? "bg-[#0d4d3b] text-white"
                                : "bg-[#eaf2ed] text-[#0d4d3b]"
                            }`}
                          >
                            Day {row.dayNumber}
                            {isToday ? " (Today)" : ""}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-[#17211d]">{formatLongDate(row.date)}</div>
                          <div className="text-[11px] text-[#8b938d]">{row.date}</div>
                        </td>
                        <td className="px-5 py-4 tabular-nums font-semibold text-[#17211d]">
                          {formatClockTime(row.fastingStart)}
                        </td>
                        <td className="px-5 py-4 tabular-nums font-bold text-[#0d4d3b]">
                          {formatClockTime(row.fastingEnd)}
                        </td>
                        <td className="px-5 py-4 tabular-nums text-[#69726d]">
                          {row.taraweehTime ? formatClockTime(row.taraweehTime) : "—"}
                        </td>
                        <td className="px-5 py-4 text-xs text-[#555f58]">
                          {row.notes || <span className="text-[#a0a6a1]">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Community Banner & Donation CTA */}
        <section className="flex flex-col justify-between gap-6 bg-[#0d4d3b] p-7 text-white sm:p-10 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-bold tracking-[.2em] text-[#e0be79]">
              RAMADAN GIVING
            </p>
            <h2 className="mt-3 text-3xl font-semibold">
              Sponsor an Iftar or Community Dinner.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">
              Provide meals for fasting brothers and sisters throughout the blessed month of Ramadan.
            </p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-2 md:max-w-md">
            <Link
              href="/donations"
              className="flex min-h-12 w-full items-center justify-center bg-[#c79a45] px-5 py-3 text-center text-sm font-semibold text-[#15251f] transition-colors hover:bg-[#e0be79]"
            >
              Donate Iftar Fund
            </Link>
            <Link
              href="/contact"
              className="flex min-h-12 w-full items-center justify-center border border-white/35 px-5 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-white hover:text-[#0d4d3b]"
            >
              Volunteer with us
            </Link>
          </div>
        </section>
      </div>
    </InnerPage>
  );
}

