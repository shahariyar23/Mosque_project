"use client";
import dynamic from "next/dynamic";
import { useLanguage } from "@/components/language-provider";
import LiveWatch from "@/components/live-watch";
import { PrayerReveal } from "@/components/home/PrayerReveal";

const Islamic3DClock = dynamic(
  () => import("@/components/home/Islamic3DClock"),
  { ssr: false }
);

export function PrayerTimesSection() {
  const { language } = useLanguage();
  const bn = language === "bn";
  const prayers = bn
    ? [
        ["ফজর", "৪:৩৮ পূর্বাহ্ন", ""],
        ["সূর্যোদয়", "৫:৫৫ পূর্বাহ্ন", ""],
        ["যোহর", "১২:১৬ অপরাহ্ন", ""],
        ["আসর", "৪:৩৫ অপরাহ্ন", ""],
        ["মাগরিব", "৬:৩১ অপরাহ্ন", ""],
        ["এশা", "৭:৪৮ অপরাহ্ন", ""],
      ]
    : [
        ["Fajr", "4:38 AM", ""],
        ["Sunrise", "5:55 AM", ""],
        ["Dhuhr", "12:16 PM", ""],
        ["Asr", "4:35 PM", ""],
        ["Maghrib", "6:31 PM", ""],
        ["Isha", "7:48 PM", ""],
      ];

  // times in 24h HH:mm for live countdown (must match the above times)
  const times24 = ["04:38", "05:55", "12:16", "16:35", "18:31", "19:48"];

  // helper: interpret prayer times as Dhaka times (UTC+06:00)
  function parseDhakaToLocal(t: string, refDate = new Date()) {
    const [hh, mm] = t.split(":");
    const year = refDate.getFullYear();
    const month = String(refDate.getMonth() + 1).padStart(2, "0");
    const day = String(refDate.getDate()).padStart(2, "0");
    const iso = `${year}-${month}-${day}T${hh}:${mm}:00+06:00`;
    return new Date(iso);
  }

  // determine next prayer index based on Dhaka times converted to local timezone
  const now = new Date();
  const nextIndex = times24.findIndex((t) => parseDhakaToLocal(t) > now);
  const displayIndex = nextIndex === -1 ? 0 : nextIndex;

  return (
    <section
      id="prayer-times"
      className="relative mx-auto -mt-12 max-w-7xl px-5 lg:px-8"
    >
      <PrayerReveal>
        <div className="grid overflow-hidden bg-white shadow-[0_15px_45px_rgba(5,44,34,.12)] lg:grid-cols-[1.3fr_.7fr]">
          <div className="prayer-left-panel p-6 sm:p-9 z-10 bg-white">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold tracking-[.18em] text-[#c79a45]">
                  {bn ? "আজকের নামাজের সময়" : "TODAY’S PRAYER TIMES"}
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  {bn ? "মঙ্গলবার, ১৮ আগস্ট" : "Tuesday, 18 August"}
                </h2>
              </div>
              <a
                href="/prayer-times"
                className="text-sm font-semibold text-[#0d4d3b] transition hover:text-[#c79a45]"
              >
                {bn ? "সম্পূর্ণ সময়সূচি →" : "Full timetable →"}
              </a>
            </div>
            <div className="mt-7 grid grid-cols-2 gap-px bg-[#e8e8e1] sm:grid-cols-3 lg:grid-cols-6">
              {prayers.map(([name, time], i) => {
                const candidate = parseDhakaToLocal(times24[i]);
                const isNext = i === displayIndex;
                const statusText = isNext
                  ? bn
                    ? "পরবর্তী"
                    : "Next"
                  : candidate <= now
                    ? bn
                      ? "সময় শেষ"
                      : "Passed"
                    : "";
                return (
                  <div
                    className={`prayer-card p-4 transition-all duration-500 ${isNext ? "scale-105 bg-[#0d4d3b] text-white shadow-lg z-10" : "bg-[#fcfcf8]"}`}
                    key={name}
                  >
                    <span className="text-xs uppercase tracking-wider opacity-70">
                      {name}
                    </span>
                    <b className="mt-2 block text-lg">{time}</b>
                    {statusText && (
                      <span
                        className={`mt-2 block text-[10px] font-bold uppercase tracking-widest ${isNext ? "text-[#e0be79]" : "text-[#9a9d99]"}`}
                      >
                        {statusText}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="prayer-right-panel relative bg-[#0d4d3b] p-8 text-white overflow-hidden min-h-[360px]">
            <Islamic3DClock />
            <div className="relative z-10">
              <p className="text-xs font-bold tracking-[.18em] text-[#e0be79]">
                {bn ? "পরবর্তী নামাজ" : "NEXT PRAYER"}
              </p>
              <h3 className="mt-5 text-4xl">{prayers[displayIndex][0]}</h3>
              <p className="mt-1 text-lg text-white/70">
                {prayers[displayIndex][1]}
              </p>
              <div className="mt-8">
                <LiveWatch times24={times24} language={language} />
              </div>
              <div className="mt-8 border-t border-white/20 pt-5 text-sm">
                <b className="block text-[#e0be79]">
                  {bn ? "জুমুআর নামাজ" : "JUMU'AH PRAYER"}
                </b>
                <span className="mt-2 block">
                  {bn
                    ? "প্রথম: ১:১৫ অপরাহ্ন · দ্বিতীয়: ২:১৫ অপরাহ্ন"
                    : "First: 1:15 PM · Second: 2:15 PM"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </PrayerReveal>
    </section>
  );
}
