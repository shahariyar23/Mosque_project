/**
 * How each prayer is labelled on screen.
 *
 * The API sends times and nothing else — `{ fajr: "04:18", dhuhr: "12:10", … }` — because a heading, an
 * Arabic name and an icon are presentation rather than data, and putting them in the response would turn
 * renaming a label into a backend change. So they live here once, and every screen that lays a schedule
 * out builds its slots from this map instead of keeping its own copy.
 */

import type { IconName } from "@/components/finance/ui/icon";
import type { ClockTime, PrayerId, PrayerSlot } from "@/lib/mosque/types";

/**
 * The five obligatory prayers, in the order a schedule is read.
 *
 * Deliberately not the order `PRAYER_KEYS` uses in `prayerTimesService` — that one mirrors AlAdhan's
 * `tune` argument, where `maghrib` precedes `sunset`, and is not chronological.
 */
export const DAILY_PRAYER_IDS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;

export type DailyPrayerId = (typeof DAILY_PRAYER_IDS)[number];

type PrayerDisplay = {
  name: string;
  arabic: string;
  icon: IconName;
};

export const prayerDisplay: Record<PrayerId, PrayerDisplay> = {
  fajr: { name: "Fajr", arabic: "الفجر", icon: "sunrise" },
  sunrise: { name: "Sunrise", arabic: "الشروق", icon: "sun" },
  dhuhr: { name: "Dhuhr", arabic: "الظهر", icon: "sun" },
  asr: { name: "Asr", arabic: "العصر", icon: "sunset" },
  maghrib: { name: "Maghrib", arabic: "المغرب", icon: "sunset" },
  isha: { name: "Isha", arabic: "العشاء", icon: "moon-star" },
};

/**
 * Builds one slot for `PrayerStrip` and `PrayerCard` from an API time.
 *
 * `status` is always `"Active"`: a calculated time has no paused state anywhere in the backend, and
 * `PrayerSlot` carries the field for the mock schedule that could mark a congregation suspended. Passing
 * `"Paused"` here would be inventing a fact the API cannot report.
 *
 * `iqamah` is optional because it depends on the caller — `/prayer-times` publishes adhan times only, so
 * a screen showing them alone must also pass `showIqamah={false}` rather than render an empty line.
 */
export function toPrayerSlot(
  id: PrayerId,
  adhan: ClockTime,
  extra: { iqamah?: ClockTime; note?: string } = {},
): PrayerSlot {
  return {
    id,
    ...prayerDisplay[id],
    adhan,
    iqamah: extra.iqamah,
    // Sunrise closes Fajr rather than starting a congregation, so it never becomes "next prayer".
    isCongregation: id !== "sunrise",
    status: "Active",
    note: extra.note,
  };
}
