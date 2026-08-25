"use client";
import { useEffect, useState } from "react";

type Props = { times24: string[]; language: "en" | "bn" };

function toBanglaDigits(s: string) {
  const map: Record<string, string> = {
    "0": "০",
    "1": "১",
    "2": "২",
    "3": "৩",
    "4": "৪",
    "5": "৫",
    "6": "৬",
    "7": "৭",
    "8": "৮",
    "9": "৯",
  };
  return s.replace(/[0-9]/g, (d) => map[d]);
}

function formatDuration(totalSeconds: number, lang: "en" | "bn") {
  if (totalSeconds < 0) totalSeconds = 0;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const str =
    `${String(h).padStart(2, "0")}::${String(m).padStart(2, "0")}::${String(s).padStart(2, "0")}`.replace(
      /::/g,
      ":",
    );
  return lang === "bn" ? toBanglaDigits(str) : str;
}

function parseDhakaTimeToLocal(time24: string, refDate = new Date()) {
  // Interpret `time24` ("HH:mm") as a time in Asia/Dhaka (UTC+06:00)
  // and return a Date object in the local timezone for the same calendar day.
  const [hh, mm] = time24.split(":");
  const year = refDate.getFullYear();
  const month = String(refDate.getMonth() + 1).padStart(2, "0");
  const day = String(refDate.getDate()).padStart(2, "0");
  const iso = `${year}-${month}-${day}T${hh}:${mm}:00+06:00`;
  return new Date(iso);
}

export function LiveWatch({ times24, language }: Props) {
  // Show a single clock representing current time in Dhaka (Asia/Dhaka)
  const [dhakaNow, setDhakaNow] = useState("00:00:00");

  useEffect(() => {
    const updateClock = () => {
      const t = new Date().toLocaleTimeString("en-US", {
        timeZone: "Asia/Dhaka",
        hour12: true,
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      });
      setDhakaNow(language === "bn" ? toBanglaDigits(t) : t);
    };

    updateClock();
    const id = setInterval(() => {
      updateClock();
    }, 1000);
    return () => clearInterval(id);
  }, [language]);

  // simple clock SVG icon
  const ClockIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block mr-3 align-middle"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );

  return (
    <div className="flex items-center gap-3">
      <div className="text-white/80">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      </div>
      <div>
        <div className="font-mono text-3xl tracking-wider">{dhakaNow}</div>
        <div className="mt-1 text-sm text-white/70">
          {language === "bn" ? "ঢাকা সময়" : "Dhaka time"}
        </div>
      </div>
    </div>
  );
}

export default LiveWatch;
