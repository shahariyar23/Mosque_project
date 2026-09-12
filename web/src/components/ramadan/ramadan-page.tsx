"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Clock3, MoonStar, Search, Sparkles } from "lucide-react";
import { InnerPage } from "@/components/inner-page";
import { useResource } from "@/components/ui/use-resource";
import {
  formatClockTime,
  formatCount,
  formatLongDate,
  getTodayInTimezone,
} from "@/lib/mosque/format";
import { fetchRamadanSchedules } from "@/services/ramadanService";
import { fetchPublicRamadanSchedules } from "@/services/ramadanService";
import { useMosqueBranding } from "@/components/mosque-branding-provider";

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
  const { activeSlug } = useMosqueBranding();
  const [search, setSearch] = useState("");
  const [now, setNow] = useState<Date | null>(null);

  const loadPublicRamadan = useCallback(
    () => fetchPublicRamadanSchedules(activeSlug),
    [activeSlug],
  );
  const { data: rawSchedules, error, initialising, reload } = useResource(loadPublicRamadan);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const schedules = useMemo(() => {
    const sorted = [...(rawSchedules || [])].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.map((s, idx) => ({
      ...s,
      dayNumber: idx + 1,
    }));
  }, [rawSchedules]);

  const todayMosque = useMemo(() => getTodayInTimezone("Asia/Dhaka"), []);
  const todaySchedule = schedules.find((s) => s.date === todayMosque);
  const nextSchedule = schedules.find((s) => s.date >= todayMosque) || schedules[0];
  const activeSchedule = todaySchedule || nextSchedule;

  const filteredSchedules = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return schedules;
    return schedules.filter(
      (s) =>
        s.date.toLowerCase().includes(q) ||
        `day ${s.dayNumber}`.toLowerCase().includes(q) ||
        (s.notes && s.notes.toLowerCase().includes(q)),
    );
  }, [schedules, search]);

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
    <InnerPage eyebrow="RAMADAN TIMETABLE · DHAKA, BANGLADESH" title="Ramadan Kareem.">
      <div className="space-y-6 pb-8 sm:space-y-8">
        <section className="relative isolate overflow-hidden rounded-[28px] bg-linear-to-br from-[#0d4d3b] via-[#0b4137] to-[#0b5b4b] p-4 text-white shadow-[0_22px_60px_rgba(13,77,59,0.22)] sm:p-6 lg:p-8">
          <div className="pointer-events-none absolute -right-16 -top-20 -z-10 h-64 w-64 rounded-full border border-[#f4d58f]/20 bg-[#f4d58f]/5 blur-[1px]" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 -z-10 h-56 w-56 rounded-full border border-white/10" />
          <div className="mb-6 flex items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl border border-[#f4d58f]/30 bg-[#f4d58f]/10 text-[#f4d58f]">
                <MoonStar size={22} strokeWidth={1.7} aria-hidden="true" />
              </span>
              <div>
                <p className="text-[10px] font-bold tracking-[0.24em] text-[#f4d58f]">NOOR COMMUNITY MOSQUE</p>
                <p className="mt-1 text-xs text-white/65">A month of mercy, worship and community</p>
              </div>
            </div>
            <Sparkles className="hidden text-[#f4d58f]/80 sm:block" size={22} aria-hidden="true" />
          </div>
          <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[10px] font-bold tracking-[0.22em] text-[#f0d28a]">
                  {todaySchedule ? "TODAY'S FAST" : "UPCOMING SCHEDULE"}
                </p>
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/80">
                  <Clock3 size={13} aria-hidden="true" />
                  <span>Asia/Dhaka</span>
                </div>
              </div>

              <div className="mt-4">
                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  {activeSchedule ? `Ramadan Day ${activeSchedule.dayNumber}` : "Fasting Timetable"}
                </h2>
                <p className="mt-2 text-sm text-white/75 sm:text-base">
                  {activeSchedule
                    ? `${activeSchedule.year} AH · ${formatLongDate(activeSchedule.date)} · Accurate local timings`
                    : "Daily Sehri and Iftar timetable for Dhaka"}
                </p>
              </div>

              {initialising ? (
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="h-24 animate-pulse rounded-2xl bg-white/10" />
                  ))}
                </div>
              ) : error ? (
                <div className="mt-6 rounded-2xl border border-[#f6d5a9] bg-[#f8efe1] p-4 text-center text-[#1a2e28]">
                  <p className="text-sm font-medium">Unable to load Ramadan timetable at this time.</p>
                  <button
                    type="button"
                    onClick={reload}
                    className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full bg-[#0d4d3b] px-4 text-xs font-semibold text-white"
                  >
                    Try loading again
                  </button>
                </div>
              ) : activeSchedule ? (
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-[#f9f7f1] p-3 text-[#14342d] shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
                    <div className="text-[10px] font-bold tracking-[0.18em] text-[#5d6e68]">SEHRI</div>
                    <div className="mt-2 text-xl font-bold">{formatClockTime(activeSchedule.fastingStart)}</div>
                    <div className="mt-1 text-[10px] text-[#5d6e68]">Fast begins</div>
                  </div>

                  <div className="rounded-2xl border border-[#d8b46d]/40 bg-[#f4e7c9] p-3 text-[#13362e] shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
                    <div className="text-[10px] font-bold tracking-[0.18em] text-[#695b38]">IFTAR</div>
                    <div className="mt-2 text-xl font-bold">{formatClockTime(activeSchedule.fastingEnd)}</div>
                    <div className="mt-1 text-[10px] text-[#695b38]">Fast breaks</div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/8 p-3 text-white">
                    <div className="text-[10px] font-bold tracking-[0.18em] text-white/70">SUHOOR</div>
                    <div className="mt-2 text-lg font-semibold">
                      {activeSchedule.suhoorTime ? formatClockTime(activeSchedule.suhoorTime) : "—"}
                    </div>
                    <div className="mt-1 text-[10px] text-white/65">Mosque service</div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/8 p-3 text-white">
                    <div className="text-[10px] font-bold tracking-[0.18em] text-white/70">TARAWEEH</div>
                    <div className="mt-2 text-lg font-semibold">
                      {activeSchedule.taraweehTime ? formatClockTime(activeSchedule.taraweehTime) : "—"}
                    </div>
                    <div className="mt-1 text-[10px] text-white/65">Congregation</div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/80">
                  No Ramadan schedule configured for this period yet.
                </div>
              )}
            </div>

            <aside className="relative rounded-3xl border border-[#e5c67f]/30 bg-[#0f5848] p-4 shadow-inner shadow-black/10 sm:p-5" aria-live="polite">
              <div className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full border border-[#f4d58f]/25 bg-[#f4d58f]/10 text-[#f4d58f]">
                <MoonStar size={20} strokeWidth={1.6} aria-hidden="true" />
              </div>
              <p className="text-[10px] font-bold tracking-[0.22em] text-[#f4d58f]">
                {todaySchedule ? "COUNTDOWN TO IFTAR" : "RAMADAN REMINDER"}
              </p>
              <h3 className="mt-3 text-2xl font-semibold sm:text-3xl">
                {todaySchedule ? "Iftar Time" : "Ramadan Kareem"}
              </h3>
              <p className="mt-2 text-sm text-white/70">
                {activeSchedule ? `Day ${activeSchedule.dayNumber} · Iftar at ${formatClockTime(activeSchedule.fastingEnd)}` : "Daily fasting and prayer timetable"}
              </p>

              <div className="mt-6 border-y border-white/15 py-5">
                <p className="font-mono text-3xl tracking-[0.12em] sm:text-4xl">
                  {secondsToNext > 0 ? countdown(secondsToNext) : "00 : 00 : 00"}
                </p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-white/60">
                  {secondsToNext > 0 ? "remaining" : "May Allah accept our fasting and prayers."}
                </p>
              </div>

              <div className="mt-5 text-[10px] font-bold tracking-[0.18em] text-[#f6d58b]">
                DHAKA · ASIA/DHAKA · BANGLADESH
              </div>
            </aside>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[26px] border border-[#e6d8b5] bg-[#f7f0dd] p-5 text-[#162b25] sm:p-6">
            <p className="text-[10px] font-bold tracking-[0.22em] text-[#a6782c]">INTENTION (NIYYAH)</p>
            <p className="mt-4 font-serif text-lg leading-relaxed text-[#17211d] sm:text-xl">
              نَوَيْتُ أَنْ أَصُومَ غَدًا عَنْ أَدَاءِ فَرْضِ شَهْرِ رَمَضَانَ هَذِهِ السَّنَةِ لِلَّهِ تَعَالَى
            </p>
            <p className="mt-3 text-sm italic text-[#53665f]">
              “I intend to fast tomorrow in fulfillment of the obligation of Ramadan this year for Allah the Almighty.”
            </p>
          </div>

          <div className="rounded-[26px] border border-[#cfe0d8] bg-[#edf5f1] p-5 text-[#153a2f] sm:p-6">
            <p className="text-[10px] font-bold tracking-[0.22em] text-[#0d4d3b]">DUA FOR BREAKING FAST</p>
            <p className="mt-4 font-serif text-lg leading-relaxed text-[#0d4d3b] sm:text-xl">
              ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الأَجْرُ إِنْ شَاءَ اللَّهُ
            </p>
            <p className="mt-3 text-sm italic text-[#53665f]">
              “The thirst is gone, the veins are moistened, and the reward is confirmed, if Allah wills.”
            </p>
          </div>
        </section>

        <section className="rounded-[28px] border border-[#e0ddd3] bg-white p-4 shadow-[0_16px_40px_rgba(14,39,32,0.04)] sm:p-5 lg:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-[0.22em] text-[#c79a45]">COMPLETE TIMETABLE</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#17211d] sm:text-3xl">Ramadan Daily Schedule</h2>
              <p className="mt-1 text-sm text-[#69726d]">
                {schedules.length > 0
                  ? `Showing ${formatCount(schedules.length)} scheduled days for Hijri Year ${schedules[0]?.year} AH`
                  : "Daily Sehri (Imsak) and Iftar schedule"}
              </p>
            </div>

            <div className="w-full max-w-md">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#7b857f]" size={16} aria-hidden="true" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search date or day (e.g. Day 1)..."
                  className="w-full rounded-full border border-[#d9d4c5] bg-[#faf8f3] py-3 pl-11 pr-4 text-sm text-[#17211d] outline-none transition focus:border-[#0d4d3b] focus:bg-white"
                />
              </div>
            </div>
          </div>

          {filteredSchedules.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-[#e6dfd1] bg-[#faf8f4] p-8 text-center text-sm text-[#69726d]">
              {search ? `No schedule records match "${search}".` : "No Ramadan timetable entries have been published yet."}
            </div>
          ) : (
            <>
              <div className="mt-5 hidden overflow-hidden rounded-2xl border border-[#e3dfd5] md:block">
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead className="bg-[#faf8f4] text-[11px] uppercase tracking-[0.18em] text-[#69726d]">
                    <tr>
                      <th className="px-4 py-3 font-bold">Ramadan Day</th>
                      <th className="px-4 py-3 font-bold">Date</th>
                      <th className="px-4 py-3 font-bold">Sehri</th>
                      <th className="px-4 py-3 font-bold">Iftar</th>
                      <th className="px-4 py-3 font-bold">Taraweeh</th>
                      <th className="px-4 py-3 font-bold">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ede8df] bg-white">
                    {filteredSchedules.map((row) => {
                      const isToday = row.date === todayMosque;
                      return (
                        <tr key={row.id} className={isToday ? "bg-[#f4efe5]" : "bg-white hover:bg-[#faf9f4]"}>
                          <td className="px-4 py-4">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${isToday ? "bg-[#0d4d3b] text-white" : "bg-[#eaf3f0] text-[#0d4d3b]"}`}>
                              Day {row.dayNumber}
                              {isToday ? " • Today" : ""}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-[#17211d]">
                            <div className="font-medium">{formatLongDate(row.date)}</div>
                            <div className="text-[11px] text-[#7d8a84]">{row.date}</div>
                          </td>
                          <td className="px-4 py-4 font-semibold tabular-nums text-[#17211d]">{formatClockTime(row.fastingStart)}</td>
                          <td className="px-4 py-4 font-bold tabular-nums text-[#0d4d3b]">{formatClockTime(row.fastingEnd)}</td>
                          <td className="px-4 py-4 text-[#69726d] tabular-nums">{row.taraweehTime ? formatClockTime(row.taraweehTime) : "—"}</td>
                          <td className="px-4 py-4 text-xs text-[#5a655f]">{row.notes || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 grid gap-3 md:hidden">
                {filteredSchedules.map((row) => {
                  const isToday = row.date === todayMosque;
                  return (
                    <div key={row.id} className={`rounded-[22px] border p-4 ${isToday ? "border-[#d7b06c] bg-[#f9f1de]" : "border-[#e3dfd5] bg-[#faf8f4]"}`}>
                      <div className="flex items-center justify-between gap-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${isToday ? "bg-[#0d4d3b] text-white" : "bg-[#eaf3f0] text-[#0d4d3b]"}`}>
                          Day {row.dayNumber}
                        </span>
                        {isToday ? <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0d4d3b]">Today</span> : null}
                      </div>

                      <div className="mt-3 text-base font-semibold text-[#17211d]">{formatLongDate(row.date)}</div>
                      <div className="mt-1 text-[11px] text-[#75807a]">{row.date}</div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-xl bg-white p-2.5">
                          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6a726d]">Sehri</div>
                          <div className="mt-1 font-semibold text-[#17211d]">{formatClockTime(row.fastingStart)}</div>
                        </div>
                        <div className="rounded-xl bg-white p-2.5">
                          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6a726d]">Iftar</div>
                          <div className="mt-1 font-semibold text-[#0d4d3b]">{formatClockTime(row.fastingEnd)}</div>
                        </div>
                      </div>

                      <div className="mt-3 text-sm text-[#5a655f]">
                        <span className="font-semibold text-[#17211d]">Taraweeh:</span> {row.taraweehTime ? formatClockTime(row.taraweehTime) : "—"}
                      </div>

                      {row.notes ? <div className="mt-2 text-xs text-[#5a655f]">{row.notes}</div> : null}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>

        <section className="flex flex-col justify-between gap-6 rounded-[28px] bg-[#0d4d3b] p-5 text-white shadow-[0_18px_45px_rgba(13,77,59,0.18)] sm:p-7 md:flex-row md:items-center">
          <div>
            <p className="text-[10px] font-bold tracking-[0.22em] text-[#e0be79]">RAMADAN GIVING</p>
            <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">Sponsor an Iftar or Community Dinner.</h2>
            <p className="mt-2 max-w-xl text-sm text-white/70">Provide meals for fasting brothers and sisters throughout the blessed month of Ramadan.</p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-2 md:max-w-md">
            <Link href="/donations" className="group flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#c79a45] px-5 py-3 text-center text-sm font-semibold text-[#15251f] transition-colors hover:bg-[#e0be79]">
              Donate Iftar Fund <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <Link href="/contact" className="flex min-h-12 items-center justify-center rounded-full border border-white/35 px-5 py-3 text-center text-sm font-semibold text-white transition-colors hover:border-[#f4e7c9] hover:bg-[#f4e7c9] hover:!text-[#0d4d3b]">
              Volunteer with us
            </Link>
          </div>
        </section>
      </div>
    </InnerPage>
  );
}

