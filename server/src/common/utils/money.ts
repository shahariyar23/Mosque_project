import { Prisma } from '@prisma/client';

/**
 * Money in and out of the API, without ever touching a binary float.
 *
 * The schema's rule is that money is `Decimal`, never `Float`, because binary floating point cannot
 * represent 0.10 exactly. That rule is only kept if the value never becomes a JavaScript `number` on
 * either side of the database either — so the API speaks money as a decimal *string*, `"1500.00"`,
 * and every conversion goes through this file.
 *
 * A JSON number is still accepted on input, because clients send them and refusing would be pedantic
 * about the wire format rather than about the arithmetic. It is stringified before it reaches
 * `Prisma.Decimal`, and anything that has already lost precision by the time it arrives fails the
 * pattern below rather than being rounded into something plausible.
 */

/**
 * A non-negative amount with at most two decimal places: `0`, `0.50`, `1500`, `1500.00`, `1234567.89`.
 *
 * The scale limit is part of the pattern rather than a separate check because `Decimal(14, 2)` would
 * silently round a third decimal on write. Rejecting `10.005` is more honest than storing `10.01`.
 * The integer part is capped at twelve digits to match the column's precision, so an amount that
 * cannot be stored is refused here instead of by the database.
 */
export const MONEY_PATTERN = /^\d{1,12}(?:\.\d{1,2})?$/;

export const MONEY_MESSAGE =
  'must be a non-negative amount with at most 2 decimal places, for example "1500.00"';

/**
 * The same amount, but it has to be more than nothing: rejects `0`, `0.0` and `0.00`.
 *
 * A fund's target may legitimately be zero — an open-ended fund is recorded that way — but a donation of
 * nothing and an expense of nothing are not events, they are mistakes, and letting one through puts a row
 * in a financial table that a reconciliation later has to explain. The leading negative lookahead is the
 * only difference from `MONEY_PATTERN`; the rest of the shape, including the twelve-digit and two-place
 * limits, is the same and for the same reasons.
 */
export const POSITIVE_MONEY_PATTERN = /^(?!0+(?:\.0+)?$)\d{1,12}(?:\.\d{1,2})?$/;

export const POSITIVE_MONEY_MESSAGE =
  'must be an amount greater than zero with at most 2 decimal places, for example "500.00"';

/**
 * Normalises a money input to the string form `MONEY_PATTERN` validates.
 *
 * Returns the value untouched when it is neither a string nor a finite number, so class-validator
 * produces the message above rather than this throwing first. `String(number)` is safe here: the
 * pattern rejects the exponential and long-tail forms a lossy number would produce.
 */
export function normalizeMoney(value: unknown): unknown {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : value;
  }
  if (typeof value === 'string') return value.trim();
  return value;
}

/**
 * The stored `Decimal` as an exact two-place string. `null` stays `null`.
 *
 * Overloaded so a non-nullable column keeps its non-nullable type: a campaign's `targetAmount` is
 * required, and widening it to `string | null` on the way out would force every caller to handle a null
 * the column cannot hold.
 */
export function fromMoney(value: Prisma.Decimal): string;
export function fromMoney(value: Prisma.Decimal | null): string | null;
export function fromMoney(value: Prisma.Decimal | null): string | null {
  return value === null ? null : value.toFixed(2);
}

/** A validated money string on its way into a write. */
export function toMoney(value: string): Prisma.Decimal {
  return new Prisma.Decimal(value);
}
