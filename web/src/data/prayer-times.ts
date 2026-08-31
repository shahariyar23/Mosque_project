import { fromMinutes, getTodayInTimezone, REFERENCE_DATE, shiftDate, toMinutes } from "@/lib/mosque/format";
import type { DailyPrayerSchedule, PrayerId, PrayerSlot, WeeklyPrayerRow } from "@/lib/mosque/types";

/**
 * Prayer schedule for Dhaka. Times are stored as "HH:MM" on a 24-hour clock and formatted for display
 * through `formatClockTime`, so the 12/24-hour setting is honoured everywhere from one place.
 *
 * The figures are realistic for Dhaka under the Karachi convention with the Hanafi
 * Asr — they are not computed. A real calculation belongs on the server, where the method, the
 * co-ordinates and the Hijri adjustment all live.
 */

const currentToday = getTodayInTimezone("Asia/Dhaka");

/** Sunrise is listed for context. It is the end of Fajr, not a congregation, so it has no iqamah. */
export const todaySlots: PrayerSlot[] = [
  {
    id: "fajr",
    name: "Fajr",
    arabic: "الفجر",
    icon: "sunrise",
    adhan: "04:18",
    iqamah: "04:35",
    isCongregation: true,
    status: "Active",
  },
  {
    id: "sunrise",
    name: "Sunrise",
    arabic: "الشروق",
    icon: "sun",
    adhan: "05:35",
    isCongregation: false,
    status: "Active",
    note: "Fajr ends. No congregation.",
  },
  {
    id: "dhuhr",
    name: "Dhuhr",
    arabic: "الظهر",
    icon: "sun",
    adhan: "12:10",
    iqamah: "12:30",
    isCongregation: true,
    status: "Active",
  },
  {
    id: "asr",
    name: "Asr",
    arabic: "العصر",
    icon: "sunset",
    adhan: "16:36",
    iqamah: "16:50",
    isCongregation: true,
    status: "Active",
  },
  {
    id: "maghrib",
    name: "Maghrib",
    arabic: "المغرب",
    icon: "sunset",
    adhan: "18:32",
    iqamah: "18:35",
    isCongregation: true,
    status: "Active",
    note: "Iqamah three minutes after adhan.",
  },
  {
    id: "isha",
    name: "Isha",
    arabic: "العشاء",
    icon: "moon-star",
    adhan: "19:52",
    iqamah: "20:10",
    isCongregation: true,
    status: "Active",
  },
];

export const todaySchedule: DailyPrayerSchedule = {
  date: currentToday,
  location: "Dhaka, Bangladesh",
  hijriDate: "10 Rabi' al-Awwal 1448",
  slots: todaySlots,
};

/**
 * Adhan times for the week, Saturday through Friday — the Bangladeshi week, which is why Saturday
 * leads and Friday closes it rather than the other way round.
 *
 * Times drift by a minute or two a day as the days shorten, which is what makes a weekly table worth
 * publishing at all; a table of seven identical rows would tell nobody anything.
 */
const weekOffsets = [-1, 0, 1, 2, 3, 4, 5];

const weeklyTimes: Array<Record<PrayerId, string>> = [
  { fajr: "04:17", sunrise: "05:34", dhuhr: "12:10", asr: "16:37", maghrib: "18:33", isha: "19:53" },
  { fajr: "04:18", sunrise: "05:35", dhuhr: "12:10", asr: "16:36", maghrib: "18:32", isha: "19:52" },
  { fajr: "04:18", sunrise: "05:35", dhuhr: "12:09", asr: "16:36", maghrib: "18:31", isha: "19:51" },
  { fajr: "04:19", sunrise: "05:35", dhuhr: "12:09", asr: "16:35", maghrib: "18:30", isha: "19:50" },
  { fajr: "04:19", sunrise: "05:36", dhuhr: "12:09", asr: "16:35", maghrib: "18:30", isha: "19:49" },
  { fajr: "04:20", sunrise: "05:36", dhuhr: "12:08", asr: "16:34", maghrib: "18:29", isha: "19:48" },
  { fajr: "04:20", sunrise: "05:37", dhuhr: "12:08", asr: "16:34", maghrib: "18:28", isha: "19:47" },
];

const dayNames = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export const weeklySchedule: WeeklyPrayerRow[] = weekOffsets.map((offset, index) => ({
  day: dayNames[index],
  date: shiftDate(currentToday, offset),
  times: weeklyTimes[index],
  isFriday: dayNames[index] === "Friday",
}));

/** Column order for the weekly table. Sunrise is included so the Fajr window is legible. */
export const prayerColumns: Array<{ id: PrayerId; label: string }> = [
  { id: "fajr", label: "Fajr" },
  { id: "sunrise", label: "Sunrise" },
  { id: "dhuhr", label: "Dhuhr" },
  { id: "asr", label: "Asr" },
  { id: "maghrib", label: "Maghrib" },
  { id: "isha", label: "Isha" },
];

/**
 * A schedule for any date the picker lands on.
 *
 * The mock set only holds one real week, so days outside it fall back to today's times. That keeps the
 * date selector honest — every date returns a plausible schedule rather than an empty screen — without
 * pretending to be a calculation.
 */
export function scheduleFor(date: string): DailyPrayerSchedule {
  const known = weeklySchedule.find((row) => row.date === date);
  if (!known) {
    return { ...todaySchedule, date, slots: todaySlots };
  }
  return {
    ...todaySchedule,
    date,
    slots: todaySlots.map((slot) => {
      const adhan = known.times[slot.id];
      if (!adhan || adhan === slot.adhan) return slot;
      // Hold the gap between adhan and iqamah when the adhan moves.
      const shift = toMinutes(adhan) - toMinutes(slot.adhan);
      return {
        ...slot,
        adhan,
        iqamah: slot.iqamah ? fromMinutes(toMinutes(slot.iqamah) + shift) : undefined,
      };
    }),
  };
}
