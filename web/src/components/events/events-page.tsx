"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { IslamicTexture } from "@/components/islamic-texture";
import { useLanguage } from "@/components/language-provider";
import { eventCategories, formatEventDate, formatEventTime, mosqueEvents, type EventCategory, type MosqueEvent } from "@/components/events/event-data";

type ViewMode = "list" | "calendar";

function EventMeta({ event, language }: { event: MosqueEvent; language: "en" | "bn" }) {
  return <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#69726d]"><span>◷ {formatEventTime(event.startTime, language)}</span><span>⌖ {event.location}</span><span className="text-[#0d4d3b]">{event.category}</span></div>;
}

function EventList({ events, language }: { events: MosqueEvent[]; language: "en" | "bn" }) {
  if (!events.length) return <div className="border border-dashed border-[#cfcfc3] bg-white p-10 text-center"><h3 className="text-2xl font-semibold">{language === "bn" ? "কোনো অনুষ্ঠান পাওয়া যায়নি।" : "No upcoming events."}</h3><p className="mx-auto mt-3 max-w-md text-[#69726d]">{language === "bn" ? "এই সময়ের জন্য এখনও কোনো কার্যক্রম নির্ধারিত হয়নি। অন্য মাস দেখুন বা নামাজের সময়সূচি দেখুন।" : "There are no scheduled programmes for this period yet. Check another month or explore the prayer schedule."}</p><Link href="/prayer-times" className="mt-6 inline-block bg-[#0d4d3b] px-5 py-3 font-semibold text-white">{language === "bn" ? "নামাজের সময়" : "Prayer Times"} ↗</Link></div>;

  return <div className="relative ml-3 border-l border-[#c79a45]/40 pl-7 sm:ml-8 sm:pl-10">{events.map((event) => <article className="relative border-b border-[#deddd3] py-7 first:pt-0 last:border-b-0" key={event.slug}><span className="absolute -left-[2.15rem] top-8 grid h-3 w-3 place-items-center rounded-full bg-[#c79a45] ring-4 ring-[#f8f6ef] sm:-left-[2.65rem]" aria-hidden="true" /><div className="grid gap-4 sm:grid-cols-[110px_1fr_auto] sm:items-start"><div className="text-sm font-bold uppercase tracking-[.14em] text-[#0d4d3b]"><span className="block text-[#c79a45]">{formatEventDate(event.date, language, { month: "short" })}</span><span className="block text-4xl leading-none text-[#17211d]">{formatEventDate(event.date, language, { day: "numeric" })}</span><span className="mt-1 block text-xs text-[#69726d]">{formatEventDate(event.date, language, { weekday: "short" })}</span></div><div><h3 className="text-2xl font-semibold">{language === "bn" ? event.bnTitle : event.title}</h3><EventMeta event={event} language={language} /><p className="mt-3 max-w-2xl text-sm leading-6 text-[#69726d]">{language === "bn" ? event.bnDescription : event.description}</p></div><Link href={`/events/${event.slug}`} className="text-sm font-semibold text-[#0d4d3b] hover:text-[#c79a45]">{language === "bn" ? "বিস্তারিত" : "View details"} ↗</Link></div></article>)}</div>;
}

function EventCalendar({ events, month, language }: { events: MosqueEvent[]; month: string; language: "en" | "bn" }) {
  const [year, monthNumber] = month.split("-").map(Number);
  const firstDay = new Date(year, monthNumber - 1, 1).getDay();
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const eventDays = new Set(events.map((event) => Number(event.date.slice(-2))));
  const weekdays = language === "bn" ? ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহস্পতি", "শুক্র", "শনি"] : ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, index) => index < firstDay ? null : index - firstDay + 1);

  return <div className="border border-[#deddd3] bg-white p-4 sm:p-6"><div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold tracking-wider text-[#69726d] sm:gap-2">{weekdays.map((weekday) => <span className="py-2" key={weekday}>{weekday}</span>)}{cells.map((day, index) => <div className={`relative aspect-square border p-2 text-left text-sm ${day && eventDays.has(day) ? "border-[#c79a45] bg-[#f7f0df] font-bold text-[#0d4d3b]" : "border-[#eeeeE7] text-[#69726d]"}`} key={`${month}-${index}`}>{day}{day && eventDays.has(day) && <span className="absolute bottom-2 left-2 h-1.5 w-1.5 rounded-full bg-[#c79a45]" aria-label="Event scheduled" />}</div>)}</div></div>;
}

export function EventsPage() {
  const { language } = useLanguage();
  const bengali = language === "bn";
  const [category, setCategory] = useState<"All" | EventCategory>("All");
  const [month, setMonth] = useState("2026-08");
  const [view, setView] = useState<ViewMode>("list");
  const featured = mosqueEvents.find((event) => event.featured) ?? mosqueEvents[0];
  const upcoming = useMemo(() => mosqueEvents.filter((event) => !event.past && event.date.startsWith(month) && (category === "All" || event.category === category)), [category, month]);
  const pastEvents = mosqueEvents.filter((event) => event.past);
  const monthLabel = new Intl.DateTimeFormat(bengali ? "bn-BD" : "en-GB", { month: "long", year: "numeric" }).format(new Date(`${month}-15T12:00:00`));
  const shiftMonth = (amount: number) => { const [year, monthNumber] = month.split("-").map(Number); const next = new Date(year, monthNumber - 1 + amount, 1); setMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`); };

  return <div>
    <section className="relative overflow-hidden bg-[#073a2d] px-5 pb-20 pt-36 text-white"><IslamicTexture variant="hero" position="left" className="left-[-180px] top-24 h-[600px] w-[540px] bg-contain opacity-10" /><div className="relative z-10 mx-auto max-w-7xl lg:px-8"><p className="text-xs font-bold tracking-[.22em] text-[#e0be79]">{bengali ? "নূর কমিউনিটি মসজিদ · ঢাকা" : "NOOR COMMUNITY MOSQUE · DHAKA"}</p><h1 className="mt-4 max-w-4xl text-5xl font-semibold leading-tight sm:text-7xl">{bengali ? "অনুষ্ঠান ও কার্যক্রম।" : "Events & Programs."}</h1><p className="mt-6 max-w-xl text-lg leading-8 text-white/70">{bengali ? "নামাজ, শিক্ষা, কমিউনিটি এবং প্রতিটি প্রজন্মের জন্য কার্যক্রমে আমাদের সঙ্গে যোগ দিন।" : "Join us for prayer, learning, community gatherings and programmes for every generation."}</p></div></section>

    <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><div className="grid overflow-hidden border border-[#deddd3] bg-white lg:grid-cols-[1.15fr_.85fr]"><div className="min-h-[330px] bg-cover bg-center" style={{ backgroundImage: `url(${featured.image})` }} role="img" aria-label={featured.title} /><div className="flex flex-col justify-center p-7 sm:p-10"><p className="text-xs font-bold tracking-[.2em] text-[#c79a45]">{bengali ? "বিশেষ অনুষ্ঠান" : "FEATURED EVENT"}</p><h2 className="mt-5 text-4xl font-semibold">{bengali ? featured.bnTitle : featured.title}</h2><p className="mt-4 leading-7 text-[#69726d]">{bengali ? featured.bnDescription : featured.description}</p><div className="mt-6 border-t border-[#deddd3] pt-5"><p className="font-semibold text-[#0d4d3b]">{formatEventDate(featured.date, language, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p><EventMeta event={featured} language={language} /></div><Link href={`/events/${featured.slug}`} className="mt-7 inline-block self-start bg-[#c79a45] px-5 py-3 font-semibold text-[#153128]">{bengali ? "অনুষ্ঠান দেখুন" : "View Event"} ↗</Link></div></div></section>

    <section className="mx-auto max-w-7xl px-5 pb-20 lg:px-8"><div className="flex flex-col gap-5 border-y border-[#deddd3] py-6 lg:flex-row lg:items-center lg:justify-between"><div className="flex gap-2 overflow-x-auto pb-1">{eventCategories.map((item) => <button type="button" onClick={() => setCategory(item)} className={`shrink-0 border px-4 py-2 text-sm font-semibold transition ${category === item ? "border-[#0d4d3b] bg-[#0d4d3b] text-white" : "border-[#deddd3] hover:border-[#c79a45]"}`} key={item}>{bengali && item === "All" ? "সব" : item}</button>)}</div><div className="flex items-center gap-2"><button type="button" onClick={() => shiftMonth(-1)} className="border border-[#deddd3] px-3 py-2 text-sm" aria-label="Previous month">←</button><strong className="min-w-36 text-center">{monthLabel}</strong><button type="button" onClick={() => shiftMonth(1)} className="border border-[#deddd3] px-3 py-2 text-sm" aria-label="Next month">→</button></div></div><div className="mt-12 flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-bold tracking-[.2em] text-[#c79a45]">{bengali ? "আসন্ন অনুষ্ঠান" : "UPCOMING EVENTS"}</p><h2 className="mt-3 text-4xl font-semibold">{bengali ? "সময়ে, জায়গায়, একসঙ্গে।" : "Make room for what matters."}</h2></div><div className="flex border border-[#deddd3] p-1"><button type="button" onClick={() => setView("list")} className={`px-4 py-2 text-sm font-semibold ${view === "list" ? "bg-[#0d4d3b] text-white" : ""}`}>{bengali ? "তালিকা" : "List"}</button><button type="button" onClick={() => setView("calendar")} className={`px-4 py-2 text-sm font-semibold ${view === "calendar" ? "bg-[#0d4d3b] text-white" : ""}`}>{bengali ? "ক্যালেন্ডার" : "Calendar"}</button></div></div><div className="mt-10">{view === "list" ? <EventList events={upcoming} language={language} /> : <EventCalendar events={upcoming} month={month} language={language} />}</div></section>

    <section className="bg-[#ecece3] px-5 py-16"><div className="mx-auto max-w-7xl lg:px-8"><p className="text-xs font-bold tracking-[.2em] text-[#c79a45]">{bengali ? "কমিউনিটির স্মৃতি" : "FROM OUR COMMUNITY"}</p><h2 className="mt-3 text-4xl font-semibold">{bengali ? "পেছনে ফিরে দেখা।" : "Moments we shared."}</h2><div className="mt-8 grid gap-5 md:grid-cols-3">{pastEvents.map((event) => <Link href={`/events/${event.slug}`} key={event.slug} className="group bg-white"><div className="aspect-[4/3] bg-cover bg-center transition duration-500 group-hover:scale-[1.02]" style={{ backgroundImage: `url(${event.image})` }} role="img" aria-label={event.title} /><div className="p-5"><p className="text-xs font-bold tracking-[.16em] text-[#c79a45]">{formatEventDate(event.date, language, { month: "long", day: "numeric", year: "numeric" })}</p><h3 className="mt-2 text-xl font-semibold">{bengali ? event.bnTitle : event.title}</h3></div></Link>)}</div></div></section>

    <section className="mx-auto max-w-7xl px-5 py-20 text-center lg:px-8"><p className="text-xs font-bold tracking-[.2em] text-[#c79a45]">{bengali ? "আমাদের সঙ্গে যোগ দিন" : "JOIN OUR COMMUNITY"}</p><h2 className="mx-auto mt-4 max-w-2xl text-4xl font-semibold">{bengali ? "নূরের সঙ্গে আপনার জায়গা আছে।" : "There is a place for you at Noor."}</h2><Link href="/contact" className="mt-7 inline-block bg-[#0d4d3b] px-6 py-3 font-semibold text-white">{bengali ? "যোগাযোগ করুন" : "Get in touch"} ↗</Link></section>
  </div>;
  
}
