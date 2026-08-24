/**
 * The shape of AlAdhan's replies, described only as far as this module reads them.
 *
 * Nothing here is exported to a client. The whole purpose of naming these types is to keep the
 * external vocabulary — `Firstthird`, `timezonestring`, `DD-MM-YYYY` — inside this folder, so the
 * normalized NOOR response is free to be stable while the upstream one is free to change. Anything
 * AlAdhan sends that is not listed below is deliberately ignored rather than passed along.
 *
 * The fields are optional because they are *claims*, not guarantees: this is parsed from a network
 * response, and a type assertion over `await response.json()` is a promise TypeScript cannot keep.
 * `parseTimingsResponse` in `aladhan.client.ts` is what turns one of these into something trusted.
 */

/** The timings block. Keys are AlAdhan's own capitalisation. Values look like `"04:35 (+06)"`. */
export interface AlAdhanTimings {
  Fajr?: unknown;
  Sunrise?: unknown;
  Dhuhr?: unknown;
  Asr?: unknown;
  Sunset?: unknown;
  Maghrib?: unknown;
  Isha?: unknown;
  Imsak?: unknown;
  Midnight?: unknown;
  /** Sent, never read: the nine above are the schedule a mosque publishes. */
  Firstthird?: unknown;
  Lastthird?: unknown;
}

export interface AlAdhanHijriDate {
  date?: unknown;
  day?: unknown;
  year?: unknown;
  month?: { number?: unknown; en?: unknown; ar?: unknown };
  weekday?: { en?: unknown; ar?: unknown };
}

export interface AlAdhanDate {
  readable?: unknown;
  timestamp?: unknown;
  gregorian?: { date?: unknown; weekday?: { en?: unknown } };
  hijri?: AlAdhanHijriDate;
}

export interface AlAdhanTimingsData {
  timings?: AlAdhanTimings;
  date?: AlAdhanDate;
  meta?: { timezone?: unknown; latitude?: unknown; longitude?: unknown };
}

export interface AlAdhanTimingsResponse {
  code?: unknown;
  status?: unknown;
  data?: AlAdhanTimingsData;
}

/** The nine timings, normalized: `HH:mm` with the parenthetical zone stripped. */
export interface RawTimings {
  imsak: string;
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  sunset: string;
  maghrib: string;
  isha: string;
  midnight: string;
}

/** What the client hands back: the calculated times plus the little of the envelope worth keeping. */
export interface AlAdhanDay {
  timings: RawTimings;
  /** `YYYY-MM-DD`, echoed from the reply rather than assumed from the request. */
  gregorianDate: string | null;
  hijri: {
    date: string | null;
    day: number | null;
    month: number | null;
    monthName: string | null;
    year: number | null;
  } | null;
  /** The zone AlAdhan says it calculated in. Used to report, never to convert. */
  timezone: string | null;
}
