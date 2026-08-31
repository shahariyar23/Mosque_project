import type { AgeGroup, ClockTime, IsoDate, PrayerSlot } from "@/lib/mosque/types";

/**
 * Time, date and clock helpers for the community modules.
 *
 * Money and date formatting already live in `lib/finance/format.ts` and are imported directly where
 * needed — nothing here duplicates them. What this file adds is the clock: prayer times are stored
 * as "HH:MM" on a 24-hour clock so that sorting is a string compare, and every screen renders them
 * through `formatClockTime` so the 12/24-hour setting is honoured in exactly one place.
 */

/** The fallback reference "today" for static mocks. */
export const REFERENCE_DATE: IsoDate = "2026-08-23";

/**
 * Today's date in "YYYY-MM-DD" format in the specified timezone (default: Asia/Dhaka).
 * Computes the real current calendar date without UTC timezone drift.
 */
export function getTodayInTimezone(timezone: string = "Asia/Dhaka"): IsoDate {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/** Minutes since midnight for a "HH:MM" string. Returns 0 for anything malformed. */
export function toMinutes(time: ClockTime): number {
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  return hours * 60 + minutes;
}

export function fromMinutes(total: number): ClockTime {
  const wrapped = ((total % 1440) + 1440) % 1440;
  const hours = Math.floor(wrapped / 60);
  const minutes = wrapped % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** "04:18" → "04:18 AM". Pass "24h" to get it back unchanged. */
export function formatClockTime(time: ClockTime, format: "12h" | "24h" = "12h"): string {
  if (format === "24h") return time;
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time;
  const suffix = hours >= 12 ? "PM" : "AM";
  const display = hours % 12 === 0 ? 12 : hours % 12;
  return `${String(display).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

/** "1h 24m", "24m", "in a moment". Used for the countdown to the next prayer. */
export function formatDuration(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  if (minutes === 0) return "in a moment";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

export type NextPrayer = {
  slot: PrayerSlot;
  /** Minutes until the adhan. Already wrapped, so Fajr tomorrow is a positive number. */
  minutesAway: number;
  /** True when the next congregation is tomorrow's Fajr rather than later today. */
  tomorrow: boolean;
};

/**
 * The next congregation after `nowMinutes`.
 *
 * Sunrise is skipped — it marks the end of Fajr rather than a prayer of its own, so calling it the
 * "next prayer" would be wrong. When every prayer for the day has passed, this wraps to the first
 * congregation of the next day, which is why `minutesAway` can span midnight.
 */
export function resolveNextPrayer(slots: PrayerSlot[], nowMinutes: number): NextPrayer | null {
  const congregations = slots.filter((slot) => slot.isCongregation && slot.status === "Active");
  if (congregations.length === 0) return null;

  const upcoming = congregations.find((slot) => toMinutes(slot.adhan) > nowMinutes);
  if (upcoming) {
    return { slot: upcoming, minutesAway: toMinutes(upcoming.adhan) - nowMinutes, tomorrow: false };
  }

  const first = congregations[0];
  return { slot: first, minutesAway: 1440 - nowMinutes + toMinutes(first.adhan), tomorrow: true };
}

/** Minutes since midnight for a Date, in the viewer's own clock. */
export function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/* -------------------------------------------------------------------------- *
 * Dates
 * -------------------------------------------------------------------------- */

function toDate(value: string): Date {
  // Mock data is date-only; midday keeps the value on the intended day in every timezone.
  return new Date(value.length === 10 ? `${value}T12:00:00` : value);
}

/** "23 August" — the long form used on event rows and prayer headers. */
const longDayMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long" });
export function formatDayMonth(value: IsoDate): string {
  return longDayMonth.format(toDate(value));
}

/** "23 August 2026". */
const longDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });
export function formatLongDate(value: IsoDate): string {
  return longDate.format(toDate(value));
}

/** "Sunday". */
const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "long" });
export function formatWeekday(value: IsoDate): string {
  return weekday.format(toDate(value));
}

/** "Sun". */
const weekdayShort = new Intl.DateTimeFormat("en-GB", { weekday: "short" });
export function formatWeekdayShort(value: IsoDate): string {
  return weekdayShort.format(toDate(value));
}

/** "Jan 2026" — the joined-date form on the volunteers table. */
const monthYear = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" });
export function formatMonthYear(value: IsoDate): string {
  return monthYear.format(toDate(value));
}

/** Adds (or subtracts) whole days and returns "YYYY-MM-DD". */
export function shiftDate(value: IsoDate, days: number): IsoDate {
  const date = toDate(value);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Whole days between two dates. Positive when `to` is later. */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  const ms = toDate(to).getTime() - toDate(from).getTime();
  return Math.round(ms / 86_400_000);
}

/** "in 2 days", "today", "tomorrow", "5 days ago". */
export function formatRelativeDay(value: IsoDate, reference: IsoDate = REFERENCE_DATE): string {
  const days = daysBetween(reference, value);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days > 1) return `in ${days} days`;
  return `${Math.abs(days)} days ago`;
}

/**
 * "2h ago", "3 days ago" — for the activity feed, which carries date-times.
 *
 * Measured against a fixed reference instant rather than `Date.now()` so the server and the client
 * render the same string. A feed that reads "2h ago" on the server and "2h ago" in the browser is
 * worth more than one that is accurate to the second and warns about hydration.
 */
const REFERENCE_INSTANT = `${REFERENCE_DATE}T17:12:00`;

export function formatRelativeTime(value: string, reference: string = REFERENCE_INSTANT): string {
  const minutes = Math.round((new Date(reference).getTime() - new Date(value).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "last week" : `${weeks} weeks ago`;
}

/* -------------------------------------------------------------------------- *
 * People
 * -------------------------------------------------------------------------- */

/** Whole years old on the reference date. */
export function ageOf(dateOfBirth: IsoDate, reference: IsoDate = REFERENCE_DATE): number {
  const birth = toDate(dateOfBirth);
  const now = toDate(reference);
  let age = now.getFullYear() - birth.getFullYear();
  const monthDelta = now.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

export function ageGroupOf(dateOfBirth: IsoDate, reference: IsoDate = REFERENCE_DATE): AgeGroup {
  const age = ageOf(dateOfBirth, reference);
  if (age < 18) return "Under 18";
  if (age < 30) return "18–29";
  if (age < 45) return "30–44";
  if (age < 60) return "45–59";
  return "60+";
}

/**
 * Up to two initials from a name. Used by every avatar in the dashboard — members, volunteers and
 * registration participants all render the same way, so this lives here rather than in the component.
 */
export function initialsOf(name: string): string {
  const words = name?.trim().split(/\s+/).filter(Boolean);
  if (words?.length === 0) return "?";
  if (words?.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

/** "1,248" — plain counts, so a member total never renders with a currency symbol. */
const counter = new Intl.NumberFormat("en-GB");
export function formatCount(value: number): string {
  return counter.format(value);
}

/** "2 guests", "1 guest". */
export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatCount(count)} ${count === 1 ? singular : plural}`;
}
