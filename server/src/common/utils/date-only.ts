/**
 * Conversions for `@db.Date` columns — a calendar day with no time and no zone.
 *
 * Prisma has no date-only type: a `@db.Date` column comes back as a `Date` pinned to midnight UTC, and
 * `JSON.stringify` turns that into `"2026-03-06T00:00:00.000Z"`. Serving that is a small lie with real
 * consequences — a browser in Dhaka reading it as a local date gets the 6th at 06:00, and one in São
 * Paulo gets the 5th at 21:00. So the API speaks `YYYY-MM-DD` in both directions and these two
 * functions are the only place the `Date` exists.
 *
 * Both work in UTC deliberately. The server's own zone has no bearing on which day a mosque wrote down.
 */

/** `YYYY-MM-DD` → the `Date` Prisma wants for a `@db.Date` column. */
export function toDateOnly(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

/** A `@db.Date` column's value → `YYYY-MM-DD`. */
export function fromDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * The day of the week for a `YYYY-MM-DD` string, in UTC. 0 is Sunday, 5 is Friday.
 *
 * Read from a UTC-constructed date rather than `getDay()` on a local one, for the same reason as above:
 * `new Date('2026-03-06')` is UTC midnight, and `getDay()` on a server behind UTC would call it
 * Thursday.
 */
export function dayOfWeekUtc(isoDate: string): number {
  return toDateOnly(isoDate).getUTCDay();
}

const MS_PER_DAY = 86_400_000;

/**
 * Midnight UTC on the day *after* `isoDate` — the exclusive upper bound for an inclusive day.
 *
 * For filtering a `Timestamptz` column by calendar day. `createdAt <= toDateOnly(to)` means "at or
 * before midnight", which silently drops everything written during the final day of the window; the
 * correct filter is `< dayAfter(to)`. Columns that are genuinely `@db.Date` need no such thing, since
 * their values *are* midnight.
 *
 * Adding a day in milliseconds is safe because `toDateOnly` produces midnight UTC, which has no
 * daylight-saving transition to step over.
 */
export function dayAfter(isoDate: string): Date {
  return new Date(toDateOnly(isoDate).getTime() + MS_PER_DAY);
}
