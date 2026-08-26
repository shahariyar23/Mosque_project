/**
 * `/prayer-times` — the calculated schedule, and the mosque's own adjustments to it.
 *
 * **Raw module: no envelope.** Every call goes through the `*Raw` helpers.
 *
 * The frontend never talks to AlAdhan. This controller normalises upstream into the shapes below, so the
 * schedule arrives keyed `fajr` not `Fajr`, formatted `HH:mm` not `"04:35 (+06)"`, with the mosque's offsets
 * already applied.
 *
 * **Each timing comes back three ways** — `calculated`, `adjustment`, `time` — and that is deliberate: it is
 * what lets a screen answer "why does this say 04:40 when the calculation says 04:35" instead of just
 * printing a number. Render `time`; show the other two where someone is checking the schedule.
 *
 * Reading needs `prayer.view`; changing the settings needs `prayer.manage`. The settings are readable by
 * anyone who may read the schedule, because they explain the times it publishes.
 *
 * Two failures are normal here and are not bugs to hide: **400** when the mosque has no coordinates (nothing
 * can be calculated until they are recorded on the mosque profile), and **503** when upstream is unreachable.
 * Both deserve their own message rather than a generic "something went wrong".
 */

import { apiGetRaw, apiPatchRaw } from "./apiClient";

/**
 * The nine timings, in the backend's own order.
 *
 * Note this is **not chronological** — `maghrib` precedes `sunset`, mirroring AlAdhan's documented `tune`
 * ordering. A UI listing prayers should pick its own order (`fajr, dhuhr, asr, maghrib, isha`) rather than
 * iterating this one.
 */
export const PRAYER_KEYS = [
  "imsak",
  "fajr",
  "sunrise",
  "dhuhr",
  "asr",
  "sunset",
  "maghrib",
  "isha",
  "midnight",
] as const;
export type PrayerKey = (typeof PRAYER_KEYS)[number];

/** The five obligatory prayers, in the order a schedule is read. */
export const DAILY_PRAYER_KEYS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;

export const prayerLabels: Record<PrayerKey, string> = {
  imsak: "Imsak",
  fajr: "Fajr",
  sunrise: "Sunrise",
  dhuhr: "Dhuhr",
  asr: "Asr",
  sunset: "Sunset",
  maghrib: "Maghrib",
  isha: "Isha",
  midnight: "Midnight",
};

/** One timing. `time` is `calculated` plus `adjustment`, and is the one to publish. */
export type PrayerTime = {
  /** `HH:mm`, what the calculation returned. */
  calculated: string;
  /** Minutes this mosque adds. Negative moves it earlier. */
  adjustment: number;
  /** `HH:mm`, what this mosque announces. */
  time: string;
};

export type PrayerTimings = Record<PrayerKey, PrayerTime>;

/** Every field is nullable: upstream does not always return a Hijri date. */
export type HijriDate = {
  /** `DD-MM-YYYY` in the Hijri calendar. */
  date: string | null;
  day: number | null;
  month: number | null;
  monthName: string | null;
  year: number | null;
};

/** Numbers, not decimal strings — this is the calculation input, echoed back, not a stored column. */
export type Coordinates = {
  latitude: number;
  longitude: number;
};

/** A calculation method or Asr school, with the name to show for it. */
export type NamedId = {
  id: number;
  name: string;
};

export type PrayerTimesResponse = {
  /** `YYYY-MM-DD`, the day these times are for. */
  date: string;
  hijri: HijriDate | null;
  /** The IANA zone these wall-clock times are in. */
  timezone: string;
  coordinates: Coordinates;
  method: NamedId;
  school: NamedId;
  timings: PrayerTimings;
  /** `"cache"` means the same calculation was already in memory. Offsets are applied fresh either way. */
  source: "aladhan" | "cache";
  /** True when any timing carries a non-zero adjustment — label the schedule as the mosque's own. */
  adjusted: boolean;
};

/**
 * Overrides for one lookup, stored nowhere.
 *
 * Sending any of these calculates a schedule for somewhere or something else **for that request only**, which
 * is why a plain reader is allowed to. The settings screen uses this to preview a method before saving it.
 *
 * `tune` is nine comma-separated integers in AlAdhan's order — the same order as `PRAYER_KEYS`. It stacks on
 * top of the mosque's saved offsets rather than replacing them.
 */
export type PrayerTimesQuery = {
  /** −90 to 90. */
  latitude?: number;
  /** −180 to 180. */
  longitude?: number;
  /** AlAdhan method id. */
  method?: number;
  /** `0` = Standard (Shafi), `1` = Hanafi. */
  school?: number;
  /** IANA zone name, e.g. `"Asia/Dhaka"`. */
  timezone?: string;
  /** Nine integers, e.g. `"0,5,0,0,0,0,0,0,0"`. */
  tune?: string;
};

/**
 * The saved configuration, read back — **both halves of every setting**.
 *
 * `method` is what this mosque has *overridden* (`null` = nothing); `effectiveMethod` is what will actually be
 * used. A settings form needs both: only the first tells a deliberate choice from an inherited default, which
 * is the difference between being able to clear an override and not.
 *
 * `effectiveCoordinates` is `null` when the mosque has no coordinates recorded — in that state prayer times
 * cannot be calculated at all, and the honest thing to show is a link to the mosque profile, not an empty
 * schedule.
 *
 * `offsets` is keyed by prayer (`offsets.fajr`), while the update DTO takes `fajrOffset`. The read shape and
 * the write shape genuinely differ; `offsetsToInput` below converts.
 */
export type PrayerSettings = {
  /** The override, or `null` if the mosque has not set one. */
  method: number | null;
  school: number | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  /** What will be used, override or not. */
  effectiveMethod: NamedId;
  effectiveSchool: NamedId;
  /** `null` means the mosque has no coordinates — nothing can be calculated yet. */
  effectiveCoordinates: Coordinates | null;
  effectiveTimezone: string;
  /** Minutes added to each calculated time. */
  offsets: Record<PrayerKey, number>;
  /** When the overrides were last changed. `null` if never. */
  updatedAt: string | null;
};

/** How far one prayer may be moved, in minutes, in either direction. The server rejects more. */
export const MAX_OFFSET_MINUTES = 30;

/**
 * What may be saved.
 *
 * **`undefined` and `null` mean different things here.** Omitting a field leaves it as it was; sending `null`
 * *clears* the override back to the mosque's own value. Without that distinction there would be no way to
 * undo an override once set. So a form's "use the mosque default" control must send `null`, not omit the key.
 *
 * The nine offsets are `number | undefined` only — an offset of "no override" is `0`, so there is nothing for
 * `null` to mean.
 *
 * There is no `mosqueId`: sending one is a 400, which is the right way for an attempt to write another
 * mosque's settings to fail.
 */
export type UpdatePrayerSettingsInput = {
  /** AlAdhan method id, or `null` to fall back to the method named in mosque settings. */
  method?: number | null;
  /** `0` = Standard, `1` = Hanafi, or `null` to fall back. */
  school?: number | null;
  /** Calculate from here instead of the mosque's coordinates. `null` uses the mosque's. */
  latitude?: number | null;
  longitude?: number | null;
  /** IANA zone, or `null` to use the mosque's. */
  timezone?: string | null;
  /** −30 to 30. */
  imsakOffset?: number;
  fajrOffset?: number;
  sunriseOffset?: number;
  dhuhrOffset?: number;
  asrOffset?: number;
  sunsetOffset?: number;
  maghribOffset?: number;
  ishaOffset?: number;
  midnightOffset?: number;
};

/**
 * Today's schedule for the caller's mosque, or another date via `date`. `prayer.view`.
 *
 * With no arguments this is the answer almost every caller wants. `400` if the mosque has no coordinates;
 * `503` if upstream is unreachable.
 */
export function fetchPrayerTimes(
  query: PrayerTimesQuery & { date?: string } = {},
): Promise<PrayerTimesResponse> {
  return apiGetRaw<PrayerTimesResponse>("/prayer-times", {
    date: query.date,
    latitude: query.latitude,
    longitude: query.longitude,
    method: query.method,
    school: query.school,
    timezone: query.timezone,
    tune: query.tune,
  });
}

/**
 * Today in the mosque's own timezone. `prayer.view`.
 *
 * Identical to `fetchPrayerTimes()` with no date. **`date` is not accepted here** — it is not on this route's
 * query DTO, so sending it is a 400 rather than being ignored.
 */
export function fetchTodayPrayerTimes(query: PrayerTimesQuery = {}): Promise<PrayerTimesResponse> {
  return apiGetRaw<PrayerTimesResponse>("/prayer-times/today", {
    latitude: query.latitude,
    longitude: query.longitude,
    method: query.method,
    school: query.school,
    timezone: query.timezone,
    tune: query.tune,
  });
}

/**
 * One specific date. `prayer.view`.
 *
 * `date` must be `YYYY-MM-DD`; anything else is a 400 from the service, not a 404 from the router. As above,
 * a `date` in the query is rejected — it belongs in the path on this route.
 */
export function fetchPrayerTimesForDate(
  date: string,
  query: PrayerTimesQuery = {},
): Promise<PrayerTimesResponse> {
  return apiGetRaw<PrayerTimesResponse>(`/prayer-times/${date}`, {
    latitude: query.latitude,
    longitude: query.longitude,
    method: query.method,
    school: query.school,
    timezone: query.timezone,
    tune: query.tune,
  });
}

/** The saved configuration and what it resolves to. `prayer.view`. */
export function fetchPrayerSettings(): Promise<PrayerSettings> {
  return apiGetRaw<PrayerSettings>("/prayer-times/settings");
}

/**
 * Saves the mosque's calculation choices and per-prayer adjustments. `prayer.manage`.
 *
 * Nothing upstream is modified: the adjustments are applied to the calculated times as they are served, which
 * is why changing them takes effect immediately and retroactively for every date.
 */
export function updatePrayerSettings(
  input: UpdatePrayerSettingsInput,
): Promise<PrayerSettings> {
  return apiPatchRaw<PrayerSettings>("/prayer-times/settings", input);
}

/**
 * `offsets.fajr` → `fajrOffset`, for submitting a form built from the read shape.
 *
 * The read and write shapes differ on the server, so something has to bridge them; doing it here once beats
 * nine hand-written lines in the settings form, and keeps the field names the DTO expects in the same file as
 * the type that declares them.
 */
export function offsetsToInput(
  offsets: Partial<Record<PrayerKey, number>>,
): UpdatePrayerSettingsInput {
  return {
    imsakOffset: offsets.imsak,
    fajrOffset: offsets.fajr,
    sunriseOffset: offsets.sunrise,
    dhuhrOffset: offsets.dhuhr,
    asrOffset: offsets.asr,
    sunsetOffset: offsets.sunset,
    maghribOffset: offsets.maghrib,
    ishaOffset: offsets.isha,
    midnightOffset: offsets.midnight,
  };
}
