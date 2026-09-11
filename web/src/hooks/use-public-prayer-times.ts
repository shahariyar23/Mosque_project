"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchPublicTodayPrayerTimes,
  fetchPublicJumuah,
  DEFAULT_PUBLIC_MOSQUE_SLUG,
  type PublicJumuahEntry,
  type PublicPrayerTimes,
} from "@/services/publicHomeService";
import { useMosqueBranding } from "@/components/mosque-branding-provider";

export const PRAYER_ORDER = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"] as const;
export type PrayerKey = (typeof PRAYER_ORDER)[number];

export const DEFAULT_IQAMAH_OFFSETS: Partial<Record<PrayerKey, number>> = {
  fajr: 20,
  dhuhr: 15,
  asr: 15,
  maghrib: 10,
  isha: 15,
};

type PublicPrayerData = {
  prayerTimes: PublicPrayerTimes | null;
  jumuahEntries: PublicJumuahEntry[];
};

const publicPrayerDataRequests = new Map<string, Promise<PublicPrayerData>>();

/**
 * The header and prayer pages can mount together. Share their in flight request so one visitor
 * only asks the public API for a day's schedule once, while the countdown continues entirely
 * in each browser from that returned schedule.
 */
function fetchPublicPrayerData(mosqueSlug: string) {
  const existingRequest = publicPrayerDataRequests.get(mosqueSlug);
  if (existingRequest) return existingRequest;

  const request = Promise.all([
    fetchPublicTodayPrayerTimes(mosqueSlug),
    fetchPublicJumuah(mosqueSlug),
  ])
    .then(([prayerTimes, jumuahEntries]) => ({ prayerTimes, jumuahEntries }))
    .catch((error: unknown) => {
      publicPrayerDataRequests.delete(mosqueSlug);
      throw error;
    });

  publicPrayerDataRequests.set(mosqueSlug, request);
  return request;
}

export type PrayerDisplay = {
  id: PrayerKey;
  nameEn: string;
  nameBn: string;
  arabicName?: string;
  time24: string;
  timeEn: string;
  timeBn: string;
  iqamah24?: string;
  iqamahEn?: string;
  iqamahBn?: string;
};

export type PrayerTimesState = {
  prayers: PrayerDisplay[];
  jumuah: PublicJumuahEntry[];
  timezone: string;
  hijriDate: string | null;
  hijri: PublicPrayerTimes["hijri"];
  methodName: string;
  schoolName: string;
  nextPrayerIndex: number;
  countdownSeconds: number;
  countdownHours: number;
  countdownMinutes: number;
  countdownSecs: number;
  targetPrayer: PrayerDisplay | null;
  rawPrayerTimes: PublicPrayerTimes | null;
  loading: boolean;
  error: string | null;
};

export const PRAYER_NAMES: Record<PrayerKey, { en: string; bn: string; ar: string }> = {
  fajr: { en: "FAJR", bn: "ফজর", ar: "الفجر" },
  sunrise: { en: "SUNRISE", bn: "সূর্যোদয়", ar: "الشروق" },
  dhuhr: { en: "DHUHR", bn: "যোহর", ar: "الظهر" },
  asr: { en: "ASR", bn: "আসর", ar: "العصر" },
  maghrib: { en: "MAGHRIB", bn: "মাগরিব", ar: "المغرب" },
  isha: { en: "ISHA", bn: "এশা", ar: "العشاء" },
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

export function formatTime12(time24: string, bn: boolean): string {
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

export function convertToBengaliNumber(num: number): string {
  const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return String(num)
    .split("")
    .map((d) => bnDigits[Number(d)] ?? d)
    .join("");
}

export function shiftMinutes(time24: string, minutes: number): string {
  const [hh, mm] = time24.split(":").map(Number);
  const total = (hh * 60 + mm + minutes + 1440) % 1440;
  const newH = Math.floor(total / 60);
  const newM = total % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

export function usePublicPrayerTimes(customSlug?: string) {
  const brandingContext = useMosqueBranding();
  const mosqueSlug = customSlug || brandingContext?.activeSlug || DEFAULT_PUBLIC_MOSQUE_SLUG;
  const [state, setState] = useState<PrayerTimesState>({
    prayers: [],
    jumuah: [],
    timezone: "Asia/Dhaka",
    hijriDate: null,
    hijri: null,
    methodName: "Islamic Foundation Bangladesh",
    schoolName: "Hanafi",
    nextPrayerIndex: 0,
    countdownSeconds: 0,
    countdownHours: 0,
    countdownMinutes: 0,
    countdownSecs: 0,
    targetPrayer: null,
    rawPrayerTimes: null,
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
    const countdownHours = Math.floor(diffSec / 3600);
    const countdownMinutes = Math.floor((diffSec % 3600) / 60);
    const countdownSecs = diffSec % 60;

    setState((prev) => {
      const targetPrayer = prev.prayers[nextIndex] || null;
      if (prev.nextPrayerIndex !== nextIndex || Math.abs(prev.countdownSeconds - diffSec) > 2) {
        return {
          ...prev,
          nextPrayerIndex: nextIndex,
          countdownSeconds: diffSec,
          countdownHours,
          countdownMinutes,
          countdownSecs,
          targetPrayer,
        };
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const { prayerTimes, jumuahEntries } = await fetchPublicPrayerData(mosqueSlug);

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

          let iqamah24: string | undefined;
          let iqamahEn: string | undefined;
          let iqamahBn: string | undefined;

          if (prayerTimes.iqamahTimings && prayerTimes.iqamahTimings[key]) {
            iqamah24 = prayerTimes.iqamahTimings[key];
          } else if (DEFAULT_IQAMAH_OFFSETS[key]) {
            iqamah24 = shiftMinutes(time24, DEFAULT_IQAMAH_OFFSETS[key]!);
          }

          if (iqamah24) {
            iqamahEn = formatTime12(iqamah24, false);
            iqamahBn = formatTime12(iqamah24, true);
          }

          prayers.push({
            id: key,
            nameEn: PRAYER_NAMES[key].en,
            nameBn: PRAYER_NAMES[key].bn,
            arabicName: PRAYER_NAMES[key].ar,
            time24,
            timeEn: formatTime12(time24, false),
            timeBn: formatTime12(time24, true),
            iqamah24,
            iqamahEn,
            iqamahBn,
          });
          parsedTimes.push(parseTimeToDate(time24, tz, now));
        }

        timesRef.current = parsedTimes;

        const hijriDate = prayerTimes.hijri?.date ?? null;
        const methodName = prayerTimes.method || "Islamic Foundation Bangladesh";
        const schoolName = prayerTimes.school || "Hanafi";

        setState((prev) => ({
          ...prev,
          prayers,
          jumuah: jumuahEntries || [],
          timezone: tz,
          hijriDate,
          hijri: prayerTimes.hijri,
          methodName,
          schoolName,
          rawPrayerTimes: prayerTimes,
          targetPrayer: prayers[prev.nextPrayerIndex] || null,
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
