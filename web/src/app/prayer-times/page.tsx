"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { InnerPage } from "@/components/inner-page";
import { SiteFooter } from "@/components/site-footer";

type Prayer = { name: string; time: string; period: string; jamaah?: string };

const prayers: Prayer[] = [
  { name: "Fajr", time: "4:38", period: "AM", jamaah: "5:00 AM" },
  { name: "Sunrise", time: "5:55", period: "AM", jamaah: "No congregation" },
  { name: "Dhuhr", time: "12:16", period: "PM", jamaah: "12:45 PM" },
  { name: "Asr", time: "4:35", period: "PM", jamaah: "4:50 PM" },
  { name: "Maghrib", time: "6:31", period: "PM", jamaah: "6:36 PM" },
  { name: "Isha", time: "7:48", period: "PM", jamaah: "8:15 PM" },
];

const fridayDetails = {
  imam: "Imam Rahman",
  topic: "The mercy found in congregation",
  image:
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80",
};

const months = [
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
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function prayerDate(prayer: Prayer, date: Date) {
  const [hours, minutes] = prayer.time.split(":").map(Number);
  const hour =
    prayer.period === "PM" && hours !== 12
      ? hours + 12
      : prayer.period === "AM" && hours === 12
        ? 0
        : hours;
  const result = new Date(date);
  result.setHours(hour, minutes, 0, 0);
  return result;
}

function calendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const count = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: offset + count }, (_, index) =>
    index < offset ? null : index - offset + 1,
  );
}

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

export default function PrayerTimes() {
  const [now, setNow] = useState<Date | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date(2026, 7, 20));
  const [month, setMonth] = useState(new Date(2026, 7, 1));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const currentTime = now ?? new Date(2026, 7, 20, 0, 0);
  const nextPrayer =
    prayers.find((prayer) => prayerDate(prayer, currentTime) > currentTime) ??
    prayers[0];
  const nextTime = prayerDate(nextPrayer, currentTime);
  if (nextTime <= currentTime) nextTime.setDate(nextTime.getDate() + 1);
  const seconds = Math.max(
    Math.floor((nextTime.getTime() - currentTime.getTime()) / 1000),
    0,
  );
  const days = calendarDays(month.getFullYear(), month.getMonth());
  const sameMonth =
    selectedDate.getFullYear() === month.getFullYear() &&
    selectedDate.getMonth() === month.getMonth();
  const selectedLabel = selectedDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const resetToday = () => {
    setMonth(new Date(2026, 7, 1));
    setSelectedDate(new Date(2026, 7, 20));
  };

  return (
    <>
      <InnerPage eyebrow="PRAYER TIMES · DHAKA, BANGLADESH" title="Prayer times.">
        <div className="space-y-16">
        <section
          aria-labelledby="today-heading"
          className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]"
        >
          <div className="border border-[#e1dfd5] bg-white p-6 shadow-[0_18px_50px_rgba(20,45,35,0.07)] sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#e5e3da] pb-6">
              <div>
                <p className="text-xs font-bold tracking-[.2em] text-[#c79a45]">
                  TODAY · THURSDAY, 20 AUGUST
                </p>
                <h2 id="today-heading" className="mt-3 text-3xl font-semibold">
                  Daily salah schedule
                </h2>
                <p className="mt-2 text-sm text-[#69726d]">
                  20 Safar 1448 · Local mosque time
                </p>
              </div>
              <time
                className="flex items-center gap-2 font-mono text-sm text-[#c79a45]"
                dateTime={currentTime.toISOString()}
              >
                <span className="text-lg leading-none" aria-hidden="true">
                  ◷
                </span>
                {currentTime.toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                <span className="text-[#69726d]">Dhaka</span>
              </time>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-px border border-[#e5e3da] bg-[#e5e3da] sm:grid-cols-3">
              {prayers.map((prayer) => {
                const isNext = prayer.name === nextPrayer.name;
                return (
                  <div
                    key={prayer.name}
                    className={`flex min-h-29.5 flex-col bg-[#faf9f4] p-4 ${isNext ? "border-t-2 border-[#c79a45] bg-[#f2eee3]" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-bold tracking-[.16em] text-[#69726d]">
                        {prayer.name}
                      </p>
                      {isNext && (
                        <span className="rounded-full bg-[#c79a45] px-2 py-1 text-[9px] font-bold text-[#17211d]">
                          NEXT
                        </span>
                      )}
                    </div>
                    <p className="mt-7 text-xl font-semibold">
                      {prayer.time}{" "}
                      <span className="text-xs font-normal text-[#69726d]">
                        {prayer.period}
                      </span>
                    </p>
                    <p className="mt-auto border-t border-[#e5e3da] pt-3 text-[11px] text-[#69726d]">
                      <span className="block font-bold tracking-[.12em] text-[#c79a45]">
                        JAMA’AH
                      </span>
                      <span className="mt-1 block font-semibold text-[#0d4d3b]">
                        {prayer.jamaah}
                      </span>
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
          <aside
            className="relative overflow-hidden bg-[#0d4d3b] p-7 text-white sm:p-8"
            aria-live="polite"
          >
            <p className="text-xs font-bold tracking-[.2em] text-[#e0be79]">
              NEXT PRAYER
            </p>
            <h2 className="mt-7 text-5xl font-semibold">{nextPrayer.name}</h2>
            <p className="mt-2 text-lg text-white/70">
              {nextPrayer.time} {nextPrayer.period}
            </p>
            <div className="mt-12 border-y border-white/20 py-6">
              <p className="font-mono text-3xl tracking-[.08em] sm:text-4xl">
                {countdown(seconds)}
              </p>
              <p className="mt-2 text-sm text-white/65">
                remaining until {nextPrayer.name}
              </p>
            </div>
            <p className="mt-6 text-xs tracking-[.12em] text-white/65">
              DHAKA · ASIA/DHAKA · UTC+06:00
            </p>
          </aside>
        </section>

        <section
          aria-labelledby="jumuah-heading"
          className="grid gap-8 lg:grid-cols-[.7fr_1.3fr] lg:items-start"
        >
          <div>
            <p className="text-xs font-bold tracking-[.2em] text-[#c79a45]">
              FRIDAY PRAYER
            </p>
            <h2 id="jumuah-heading" className="mt-3 text-4xl font-semibold">
              Jumu’ah, together.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-[#69726d]">
              Plan your Friday visit around the two congregational prayer times
              at Noor Community Mosque.
            </p>
            <div className="mt-7 flex items-center gap-4">
              <div
                className="h-16 w-16 shrink-0 rounded-full bg-[#e9e6dd] bg-cover bg-center"
                style={{ backgroundImage: `url(${fridayDetails.image})` }}
                role="img"
                aria-label={`${fridayDetails.imam} portrait`}
              />
              <div>
                <p className="text-xs font-bold tracking-[.16em] text-[#c79a45]">
                  LEADING IMAM
                </p>
                <p className="mt-1 font-semibold">{fridayDetails.imam}</p>
              </div>
            </div>
          </div>
          <div>
            <div className="grid gap-px border border-[#deddd3] bg-[#deddd3] sm:grid-cols-3">
              <div className="bg-white p-6">
                <p className="text-xs font-bold tracking-[.16em] text-[#69726d]">
                  FIRST KHUTBAH
                </p>
                <p className="mt-5 text-2xl font-semibold">1:15 PM</p>
              </div>
              <div className="bg-white p-6">
                <p className="text-xs font-bold tracking-[.16em] text-[#69726d]">
                  SECOND KHUTBAH
                </p>
                <p className="mt-5 text-2xl font-semibold">2:15 PM</p>
              </div>
              <div className="bg-[#f2eee3] p-6">
                <p className="text-xs font-bold tracking-[.16em] text-[#c79a45]">
                  UPCOMING
                </p>
                <p className="mt-5 text-lg font-semibold">Friday, 21 August</p>
              </div>
            </div>
            <div className="mt-4 border-l-2 border-[#c79a45] bg-[#f2eee3] p-5">
              <p className="text-xs font-bold tracking-[.16em] text-[#c79a45]">
                KHUTBAH TOPIC
              </p>
              <p className="mt-2 font-semibold">{fridayDetails.topic}</p>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="calendar-heading"
          className="grid gap-8 lg:grid-cols-[1fr_.75fr]"
        >
          <div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold tracking-[.2em] text-[#c79a45]">
                  MONTHLY VIEW
                </p>
                <h2
                  id="calendar-heading"
                  className="mt-3 text-3xl font-semibold"
                >
                  Prayer calendar
                </h2>
              </div>
              <button
                type="button"
                onClick={resetToday}
                className="min-h-11 border border-[#c79a45] px-4 text-sm font-semibold text-[#0d4d3b] hover:bg-[#f2eee3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c79a45]"
              >
                Today
              </button>
            </div>
            <div className="mt-6 border border-[#deddd3] bg-white p-4 sm:p-6">
              <div className="flex items-center justify-between border-b border-[#e5e3da] pb-4">
                <button
                  type="button"
                  onClick={() =>
                    setMonth(
                      new Date(month.getFullYear(), month.getMonth() - 1, 1),
                    )
                  }
                  className="min-h-11 min-w-11 text-xl text-[#0d4d3b] hover:bg-[#f2eee3]"
                  aria-label="Previous month"
                >
                  ←
                </button>
                <p className="font-semibold">
                  {months[month.getMonth()]} {month.getFullYear()}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setMonth(
                      new Date(month.getFullYear(), month.getMonth() + 1, 1),
                    )
                  }
                  className="min-h-11 min-w-11 text-xl text-[#0d4d3b] hover:bg-[#f2eee3]"
                  aria-label="Next month"
                >
                  →
                </button>
              </div>
              <div className="mt-5 grid grid-cols-7 gap-1 text-center text-xs font-bold text-[#69726d]">
                {weekdays.map((day) => (
                  <span key={day} className="py-2">
                    {day}
                  </span>
                ))}
                {days.map((day, index) =>
                  day === null ? (
                    <span key={`empty-${index}`} className="aspect-square" />
                  ) : (
                    <button
                      type="button"
                      key={day}
                      onClick={() =>
                        setSelectedDate(
                          new Date(month.getFullYear(), month.getMonth(), day),
                        )
                      }
                      className={`aspect-square rounded-full text-sm hover:bg-[#f2eee3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c79a45] ${day === selectedDate.getDate() && sameMonth ? "bg-[#0d4d3b] font-bold text-white hover:bg-[#0d4d3b]" : "text-[#17211d]"}`}
                    >
                      {day}
                    </button>
                  ),
                )}
              </div>
            </div>
          </div>
          <div className="border-l-2 border-[#c79a45] bg-[#f2eee3] p-7 sm:p-8">
            <p className="text-xs font-bold tracking-[.2em] text-[#c79a45]">
              SELECTED DAY
            </p>
            <h3 className="mt-4 text-2xl font-semibold">{selectedLabel}</h3>
            <div className="mt-6 divide-y divide-[#d9d4c5]">
              {prayers.map((prayer) => (
                <div
                  key={prayer.name}
                  className="flex justify-between py-3 text-sm"
                >
                  <span className="text-[#69726d]">{prayer.name}</span>
                  <strong>
                    {prayer.time} {prayer.period}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          aria-labelledby="details-heading"
          className="grid gap-8 border-t border-[#deddd3] pt-12 md:grid-cols-2"
        >
          <div>
            <p className="text-xs font-bold tracking-[.2em] text-[#c79a45]">
              TIME INFORMATION
            </p>
            <h2 id="details-heading" className="mt-3 text-3xl font-semibold">
              Clear, local, and current.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-6 text-[#69726d]">
              Prayer times are shown for Noor Community Mosque in Dhaka. The
              calculation method and last update will appear here when the
              mosque data service is connected.
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-px border border-[#deddd3] bg-[#deddd3] text-sm">
            <div className="bg-white p-5">
              <dt className="text-[#69726d]">Location</dt>
              <dd className="mt-2 font-semibold">Dhaka, Bangladesh</dd>
            </div>
            <div className="bg-white p-5">
              <dt className="text-[#69726d]">Timezone</dt>
              <dd className="mt-2 font-semibold">Asia/Dhaka</dd>
            </div>
            <div className="bg-white p-5">
              <dt className="text-[#69726d]">Calculation</dt>
              <dd className="mt-2 font-semibold">Not configured</dd>
            </div>
            <div className="bg-white p-5">
              <dt className="text-[#69726d]">Last updated</dt>
              <dd className="mt-2 font-semibold">Awaiting live data</dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="actions-heading">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[.2em] text-[#c79a45]">
                QUICK ACTIONS
              </p>
              <h2 id="actions-heading" className="mt-3 text-3xl font-semibold">
                Keep connected.
              </h2>
            </div>
            <p className="max-w-sm text-sm text-[#69726d]">
              Find the next thing you need without leaving the prayer schedule.
            </p>
          </div>
          <div className="mt-6 grid items-stretch border border-[#deddd3] sm:grid-cols-3">
            <Link
              href="/events"
              className="group flex min-h-40 flex-col border-b border-[#deddd3] p-6 transition-colors hover:bg-white hover:text-[#0d4d3b] sm:border-b-0 sm:border-r"
            >
              <span className="text-xs font-bold tracking-[.16em] text-[#c79a45]">
                01
              </span>
              <strong className="mt-5 block">Upcoming events</strong>
              <span className="mt-2 block text-sm text-[#69726d] group-hover:text-[#0d4d3b]">
                Gather, learn and grow →
              </span>
            </Link>
            <Link
              href="/about#gallery"
              className="group flex min-h-40 flex-col border-b border-[#deddd3] p-6 transition-colors hover:bg-[#0d4d3b] hover:text-white sm:border-b-0 sm:border-r"
            >
              <span className="text-xs font-bold tracking-[.16em] text-[#c79a45]">
                02
              </span>
              <strong className="mt-5 block">Visit the mosque</strong>
              <span className="mt-2 block text-sm text-[#69726d] group-hover:text-white">
                Explore Noor Community →
              </span>
            </Link>
            <Link
              href="/donations"
              className="group flex min-h-40 flex-col p-6 transition-colors hover:bg-[#0d4d3b] hover:text-white"
            >
              <span className="text-xs font-bold tracking-[.16em] text-[#c79a45]">
                03
              </span>
              <strong className="mt-5 block">Support the mosque</strong>
              <span className="mt-2 block text-sm text-[#69726d] group-hover:text-white">
                Support our shared work →
              </span>
            </Link>
          </div>
        </section>

        <section className="border-y border-[#deddd3] py-12 text-center">
          <p className="mx-auto max-w-2xl text-2xl font-semibold leading-9 text-[#0d4d3b] sm:text-3xl">
            “Indeed, prayer has been decreed upon the believers at specified
            times.”
          </p>
          <p className="mt-4 text-xs font-bold tracking-[.16em] text-[#c79a45]">
            QUR’AN 4:103
          </p>
        </section>
        <section className="flex flex-col justify-between gap-6 bg-[#0d4d3b] p-7 text-white sm:p-10 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-bold tracking-[.2em] text-[#e0be79]">
              STAY CONNECTED
            </p>
            <h2 className="mt-3 text-3xl font-semibold">
              There is a place for you at Noor.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">
              View what’s happening in the community or support the work that
              brings us together.
            </p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-2 md:max-w-md">
            <Link
              href="/events"
              className="flex min-h-12 w-full items-center justify-center border border-white/35 px-5 py-3 text-center text-sm font-semibold text-white hoverL transition-colors hover:bg-white hover:text-[#07906918]"
            >
              Upcoming events
            </Link>
            <Link
              href="/donations"
              className="flex min-h-12 w-full items-center justify-center bg-[#c79a45] px-5 py-3 text-center text-sm font-semibold text-[#15251f] transition-colors hover:bg-[#e0be79]"
            >
              Support our mosque
            </Link>
          </div>
        </section>
        </div>
      </InnerPage>
      <SiteFooter />
    </>
  );
}
