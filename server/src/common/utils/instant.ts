import { ISO_DATE_PATTERN } from '../../prayer-times/prayer-time.utils';
import { toDateOnly } from './date-only';

/**
 * Conversions for `@db.Timestamptz` columns a *client* supplies — a moment in time, not a calendar day.
 *
 * `createdAt` and `updatedAt` need none of this: the database sets them. This file is for the handful of
 * timestamps a caller sends, `Donation.donatedAt` being the first, where the moment is a fact about the
 * world rather than about the row.
 *
 * Two forms are accepted, because two kinds of caller send them. An import or a payment record knows the
 * instant and sends a full one, `"2026-08-21T14:30:00Z"`. A treasurer entering Friday's cash collection
 * knows only the day and sends `"2026-08-21"`, which is read as midnight UTC — the same reading
 * `common/utils/date-only` gives every calendar date in this codebase.
 *
 * What is *not* accepted is a datetime with no zone, `"2026-08-21T14:30:00"`. `new Date` would read that in
 * the server's own timezone, so the same request would record two different moments on two differently
 * configured servers. Requiring `Z` or an explicit offset is what makes the value mean one thing.
 */

/**
 * A calendar date, optionally followed by a zoned time.
 *
 * Matches `2026-08-21`, `2026-08-21T14:30Z`, `2026-08-21T14:30:00+06:00`, `2026-08-21T14:30:00.123Z`.
 *
 * The hour, minute and second ranges are part of the pattern rather than left to `new Date`, which turns
 * `T99:99Z` into an Invalid Date and would reach the database as a null-ish value instead of a 400.
 */
export const INSTANT_PATTERN =
  /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])(?:T([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-]([01]\d|2[0-3]):[0-5]\d))?$/;

export const INSTANT_MESSAGE =
  'must be a calendar date (YYYY-MM-DD) or an ISO 8601 timestamp carrying a zone, for example ' +
  '"2026-08-21T14:30:00Z"';

/**
 * A validated instant string → the `Date` Prisma wants for a `@db.Timestamptz` column.
 *
 * A bare date goes through `toDateOnly` rather than straight to `new Date`, so "midnight UTC" has one
 * definition in this codebase instead of two that could disagree. Anything carrying a time already carries
 * its own zone, so `new Date` has nothing left to guess.
 */
export function toInstant(value: string): Date {
  return ISO_DATE_PATTERN.test(value) ? toDateOnly(value) : new Date(value);
}
