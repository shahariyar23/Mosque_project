"use client";

import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import {
  formatEventDate,
  formatEventTime,
  type MosqueEvent,
} from "@/components/events/event-data";

export function EventDetail({ event }: { event: MosqueEvent }) {
  const { language } = useLanguage();
  const bengali = language === "bn";
  const title = bengali ? event.bnTitle : event.title;
  const description = bengali ? event.bnDescription : event.description;
  const dateLabel = formatEventDate(event.date, language, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${event.date.replaceAll("-", "")}T${event.startTime.replace(":", "")}00/${event.date.replaceAll("-", "")}T${event.endTime.replace(":", "")}00&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(event.address)}`;

  return (
    <div className="grid gap-10 lg:grid-cols-[1.25fr_.75fr]">
      <article>
        <div
          className="aspect-[16/8] bg-cover bg-center"
          style={{ backgroundImage: `url(${event.image})` }}
          role="img"
          aria-label={event.title}
        />
        <div className="mt-10">
          <p className="text-xs font-bold tracking-[.2em] text-[#c79a45]">
            {bengali ? "এই অনুষ্ঠান সম্পর্কে" : "ABOUT THIS EVENT"}
          </p>
          <h2 className="mt-3 text-3xl font-semibold">{title}</h2>
          <p className="mt-5 max-w-2xl leading-8 text-[#69726d]">
            {description}
          </p>
        </div>
      </article>
      <aside className="h-fit bg-[#ecece3] p-7">
        <p className="text-xs font-bold tracking-[.18em] text-[#c79a45]">
          {event.category.toUpperCase()}
        </p>
        <dl className="mt-6 space-y-5 text-sm">
          <div>
            <dt className="font-semibold text-[#0d4d3b]">Date</dt>
            <dd className="mt-1 text-[#69726d]">{dateLabel}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[#0d4d3b]">Time</dt>
            <dd className="mt-1 text-[#69726d]">
              {formatEventTime(event.startTime, language)} to{" "}
              {formatEventTime(event.endTime, language)}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[#0d4d3b]">Location</dt>
            <dd className="mt-1 text-[#69726d]">
              {event.location}
              <br />
              {event.address}
            </dd>
          </div>
        </dl>
        {event.registrationRequired ? (
          <Link
            href="/contact"
            className="mt-7 block bg-[#0d4d3b] p-3 text-center font-semibold text-white"
          >
            {bengali ? "নিবন্ধন করুন" : "Register now"} ↗
          </Link>
        ) : (
          <p className="mt-7 border border-[#c79a45] p-3 text-center text-sm font-semibold text-[#0d4d3b]">
            {bengali ? "সবার জন্য উন্মুক্ত" : "Open to everyone"}
          </p>
        )}
        <a
          href={calendarUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block border border-[#0d4d3b] p-3 text-center text-sm font-semibold text-[#0d4d3b]"
        >
          {bengali ? "গুগল ক্যালেন্ডারে যোগ করুন" : "Add to Google Calendar"} ↗
        </a>
      </aside>
    </div>
  );
}
