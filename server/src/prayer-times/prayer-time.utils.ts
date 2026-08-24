/**
 * Wall-clock arithmetic on `HH:mm` strings.
 *
 * Deliberately not done with `Date`. A prayer time is a time of day in the mosque's own zone, and the
 * moment you put one into a `Date` you have to invent a calendar day and a UTC offset for it —
 * whereupon adding five minutes to Fajr can move it across a DST boundary that has nothing to do with
 * the mosque, and comparing two of them compares invented dates. Minutes-since-midnight has none of
 * those failure modes and is what the arithmetic actually needs.
 */

/** `HH:mm`, 24-hour, leading zeros required. Also the DTO-level pattern for offsets and settings. */
export const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const MINUTES_PER_DAY = 24 * 60;

/** Minutes since midnight, or null if the string is not a time. */
export function toMinutes(time: string): number | null {
  const match = TIME_PATTERN.exec(time.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Minutes since midnight back to `HH:mm`, wrapping into range. */
export function toClock(minutes: number): string {
  const wrapped = ((Math.round(minutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hours = Math.floor(wrapped / 60);
  return `${String(hours).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`;
}

/**
 * Adds a signed number of minutes to a time, wrapping at midnight.
 *
 * Wrapping is correct rather than merely convenient here: Midnight and Imsak sit either side of 00:00,
 * so a negative adjustment to Imsak genuinely belongs at 23:5x. Returns the input untouched if it is
 * not a parseable time, because a malformed upstream value should show up as itself in the response
 * rather than as a plausible-looking time this function made up.
 */
export function shiftTime(time: string, minutes: number): string {
  const base = toMinutes(time);
  if (base === null) return time;
  if (!Number.isFinite(minutes) || minutes === 0) return toClock(base);
  return toClock(base + minutes);
}

/**
 * Strips AlAdhan's zone suffix: `"04:35 (+06)"` → `"04:35"`.
 *
 * Returns null rather than a guess when there is no `HH:mm` at the front, so the caller can treat a
 * changed upstream format as a failed request instead of publishing an empty prayer time.
 */
export function parseAlAdhanTime(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = /^\s*(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  return toClock(hours * 60 + minutes);
}

/** `YYYY-MM-DD`. The date format this API speaks, in and out. */
export const ISO_DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * `YYYY-MM-DD` → AlAdhan's `DD-MM-YYYY` path segment.
 *
 * String surgery rather than a `Date` round-trip, for the reason above: `new Date('2026-03-29')` is
 * parsed as UTC midnight, and formatting it back in a zone behind UTC returns the 28th. A date-only
 * value has no timezone to apply, so applying one can only introduce an error.
 */
export function toAlAdhanDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}-${month}-${year}`;
}

/**
 * Today's date in a given IANA zone, as `YYYY-MM-DD`.
 *
 * `Intl` is the only correct way to ask this. The server's own clock answers a different question —
 * "what is today where this container happens to run" — and for a mosque in Dhaka served from a
 * European region those are different days for six hours of every one of them.
 *
 * Falls back to the server's own date if the zone is unusable, since a stored typo in
 * `Mosque.timezone` should degrade the answer rather than fail the request.
 */
export function todayInZone(timeZone: string | null | undefined, now: Date = new Date()): string {
  if (timeZone) {
    try {
      // `en-CA` formats as YYYY-MM-DD, which is the shape wanted here.
      return new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(now);
    } catch {
      // Unknown zone — fall through.
    }
  }

  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
