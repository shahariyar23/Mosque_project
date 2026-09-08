"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchPublicTodayPrayerTimes,
  fetchPublicJumuah,
  DEFAULT_PUBLIC_MOSQUE_SLUG,
  type PublicJumuahEntry,
} from "@/services/publicHomeService";

const PRAYER_ORDER = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"] as const;
type PrayerKey = (typeof PRAYER_ORDER)[number];

export type PrayerDisplay = {
  id: PrayerKey;
  nameEn: string;
  nameBn: string;
  time24: string;
  timeEn: string;
  timeBn: string;
};

export type PrayerTimesState = {
  prayers: PrayerDisplay[];
  jumuah: PublicJumuahEntry[];
  timezone: string;
  hijriDate: string | null;
  nextPrayerIndex: number;
  countdownSeconds: number;
  loading: boolean;
  error: string | null;
};

const PRAYER_NAMES: Record<PrayerKey, { en: string; bn: string }> = {
  fajr: { en: "FAJR", bn: "ফজর" },
  sunrise: { en: "SUNRISE", bn: "সূর্যোদয়" },
  dhuhr: { en: "DHUHR", bn: "যোহর" },
  asr: { en: "ASR", bn: "আসর" },
  maghrib: { en: "MAGHRIB", bn: "মাগরিব" },
  isha: { en: "ISHA", bn: "এশা" },
};

function parseTimeToDate(time24: string, timezone: string, refDate: Date): Date {
  const [hh, mm] = time24.split(":").map(Number);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(refDate);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`;
  const tzOffset = getTimezoneOffsetMinutes(timezone, refDate);
  const sign = tzOffset >= 0 ? "+" : "-";
  const offsetHours = Math.floor(Math.abs(tzOffset) / 60);
  const offsetMinutes = Math.abs(tzOffset) % 60;
  return new Date(`${iso}${sign}${String(offsetHours).padStart(2, "0")}:${String(offsetMinutes).padStart(2, "0")}`);
}

function getTimezoneOffsetMinutes(timezone: string, date: Date): number {
  const utc = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const local = new Date(date.toLocaleString("en-US", { timeZone: timezone }));
  return (local.getTime() - utc.getTime()) / 60000;
}

function formatTime12(time24: string, bn: boolean): string {
  const [hh, mm] = time24.split(":").map(Number);
  const period = hh >= 12 ? "PM" : "AM";
  const hour12 = hh % 12 || 12;
  if (bn) {
    const bnHour = convertToBengaliNumber(hour12);
    const bnMin = convertToBengaliNumber(mm);
    const bnPeriod = hh >= 12 ? "অপরাহ্ন" : "পূর্বাহ্ন";
    return `${bnHour}:${bnMin} ${bnPeriod}`;
  }
  return `${hour12}:${String(mm).padStart(2, "0")} ${period}`;
}

function convertToBengaliNumber(num: number): string {
  const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return String(num)
    .split("")
    .map((d) => bnDigits[Number(d)] ?? d)
    .join("");
}

export function usePublicPrayerTimes(mosqueSlug: string = DEFAULT_PUBLIC_MOSQUE_SLUG) {
  const [state, setState] = useState<PrayerTimesState>({
    prayers: [],
    jumuah: [],
    timezone: "Asia/Dhaka",
    hijriDate: null,
    nextPrayerIndex: 0,
    countdownSeconds: 0,
    loading: true,
    error: null,
  });

  const timesRef = useRef<Date[]>([]);
  const timezoneRef = useRef<string>("Asia/Dhaka");

  const updateCountdown = useCallback(() => {
    const now = new Date();
    const times = timesRef.current;
    if (times.length === 0) return;

    let nextIndex = 0;
    let nextTime: Date | null = null;
    for (let i = 0; i < times.length; i++) {
      if (times[i] > now) {
        nextIndex = i;
        nextTime = times[i];
        break;
      }
    }

    if (!nextTime) {
      nextIndex = 0;
      nextTime = times[0];
      nextTime.setDate(nextTime.getDate() + 1);
    }

    const diffMs = nextTime.getTime() - now.getTime();
    const diffSec = Math.max(0, Math.floor(diffMs / 1000));

    setState((prev) => {
      if (prev.nextPrayerIndex !== nextIndex || Math.abs(prev.countdownSeconds - diffSec) > 2) {
        return { ...prev, nextPrayerIndex: nextIndex, countdownSeconds: diffSec };
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [prayerTimes, jumuahEntries] = await Promise.all([
          fetchPublicTodayPrayerTimes(mosqueSlug),
          fetchPublicJumuah(mosqueSlug),
        ]);

        if (!mounted) return;

        if (!prayerTimes) {
          setState((prev) => ({ ...prev, loading: false, error: null }));
          return;
        }

        const tz = prayerTimes.timezone || "Asia/Dhaka";
        timezoneRef.current = tz;
        const now = new Date();

        const prayers: PrayerDisplay[] = [];
        const parsedTimes: Date[] = [];

        for (const key of PRAYER_ORDER) {
          const timing = prayerTimes.timings[key];
          if (!timing) continue;
          const time24 = timing.time;
          prayers.push({
            id: key,
            nameEn: PRAYER_NAMES[key].en,
            nameBn: PRAYER_NAMES[key].bn,
            time24,
            timeEn: formatTime12(time24, false),
            timeBn: formatTime12(time24, true),
          });
          parsedTimes.push(parseTimeToDate(time24, tz, now));
        }

        timesRef.current = parsedTimes;

        const hijriDate = prayerTimes.hijri?.date ?? null;

        setState((prev) => ({
          ...prev,
          prayers,
          jumuah: jumuahEntries || [],
          timezone: tz,
          hijriDate,
          loading: false,
          error: null,
        }));
      } catch {
        if (!mounted) return;
        setState((prev) => ({ ...prev, loading: false, error: "Unable to load today's prayer times." }));
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [mosqueSlug]);

  useEffect(() => {
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [updateCountdown]);

  return state;
}
