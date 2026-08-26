/**
 * Money from the API, handled as text.
 *
 * Every money column in the schema is `Decimal(14, 2)`, and the reason is written at the top of
 * `server/prisma/schema.prisma`: binary floating point cannot represent 0.10, so a mosque's ledger cannot
 * be kept in `Float`. The API serialises those columns as **strings** for the same reason — JSON numbers
 * are IEEE 754 doubles, so `JSON.parse` on a decimal is already the rounding the database was chosen to
 * avoid, and ৳12,345,678.90 does not survive it intact.
 *
 * Which makes the rule here simple: **a backend amount is never converted to a number.** Not with
 * `Number()`, not with `parseFloat`, not by arithmetic on it. These helpers read and compare the digits
 * as text, and every total the dashboard shows is a total the server computed — `/financial-reports/*`
 * and `/reports/*` exist precisely so the frontend never has to add money up.
 *
 * `web/src/lib/finance/format.ts` is the number-based counterpart and still serves the views that render
 * mock data. It is not used on an API value: `formatAmount` starts with `Math.abs(amount)`.
 */

const CURRENCY = "৳";

/**
 * `BigInt(…)` rather than `0n`: `tsconfig.json` targets ES2017, where a bigint *literal* is a compile
 * error while the constructor and the `bigint` type are available through the `esnext` lib. Bumping the
 * target to please three constants would change the output for every file in the app.
 */
const ZERO = BigInt(0);
const HUNDRED = BigInt(100);
/** The ceiling `percentOfDecimal` clamps to — ten times the target, past which a bar means nothing. */
const MAX_PERCENT = BigInt(1000);

/** An amount as the API sends it: an optionally signed decimal string, e.g. `"1234.50"`, `"-99.00"`. */
export type DecimalString = string;

type Parts = {
  negative: boolean;
  /** Digits only, leading zeros stripped, never empty. */
  integer: string;
  /** Digits only, no point. May be empty. */
  fraction: string;
};

/**
 * Splits a decimal string into sign, integer digits and fraction digits.
 *
 * Returns `null` for anything that is not a decimal — `null` and `undefined` from an optional field, an
 * empty string, or a value that is not digits and at most one point. Callers render an em dash for that
 * case rather than `NaN` or `৳0`, because "no amount recorded" and "zero taka" are different facts.
 */
function split(value: string | null | undefined): Parts | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const signed = trimmed.startsWith("-") || trimmed.startsWith("+");
  const negative = trimmed.startsWith("-");
  const unsigned = signed ? trimmed.slice(1) : trimmed;

  if (!/^\d*(?:\.\d*)?$/.test(unsigned) || unsigned === "." || unsigned === "") return null;

  const point = unsigned.indexOf(".");
  const rawInteger = point === -1 ? unsigned : unsigned.slice(0, point);
  const fraction = point === -1 ? "" : unsigned.slice(point + 1);

  // `0012.5` and `12.5` are the same amount; `.5` has no integer digits at all.
  const integer = rawInteger.replace(/^0+(?=\d)/, "") || "0";

  return { negative, integer, fraction };
}

/** Whether every digit is zero — so `-0.00` is not reported as a negative amount. */
function isZero(parts: Parts): boolean {
  return parts.integer === "0" && !/[1-9]/.test(parts.fraction);
}

/** Thousands separators, inserted by slicing rather than by formatting a number. */
function group(integer: string): string {
  let result = "";
  for (let index = integer.length; index > 0; index -= 3) {
    const chunk = integer.slice(Math.max(0, index - 3), index);
    result = result === "" ? chunk : `${chunk},${result}`;
  }
  return result;
}

/**
 * The fraction at exactly two digits.
 *
 * Padded when the server sent `"1234.5"` or `"1234"`, and cut when it sent more than two digits — which
 * the schema says cannot happen, every money column being `Decimal(14, 2)`. Cutting rather than rounding
 * is the safe direction for the case that should not arise: it cannot invent a value that was not sent.
 */
function toTwoPlaces(fraction: string): string {
  return fraction.length >= 2 ? fraction.slice(0, 2) : fraction.padEnd(2, "0");
}

export type FormatDecimalOptions = {
  /** Show the paisa. Default `true` — an exact figure is the point of a decimal column. */
  decimals?: boolean;
  /** Prefix with ৳. Default `true`. */
  currency?: boolean;
  /** What to render when the value is absent or unreadable. Default `"—"`. */
  fallback?: string;
};

/**
 * `"1234.5"` → `৳1,234.50`. Unsigned: the sign is a caller's presentation choice.
 *
 * Nothing here is parsed, so a figure the database can hold is a figure this can print — including ones
 * past `Number.MAX_SAFE_INTEGER`, where a numeric formatter starts quietly changing the digits.
 */
export function formatDecimal(
  value: string | null | undefined,
  options: FormatDecimalOptions = {},
): string {
  const parts = split(value);
  if (!parts) return options.fallback ?? "—";

  const prefix = options.currency === false ? "" : CURRENCY;
  const body =
    options.decimals === false
      ? group(parts.integer)
      : `${group(parts.integer)}.${toTwoPlaces(parts.fraction)}`;

  return `${prefix}${body}`;
}

/** True only when the amount is genuinely below zero. */
export function isNegativeDecimal(value: string | null | undefined): boolean {
  const parts = split(value);
  return parts !== null && parts.negative && !isZero(parts);
}

/** True when the value is a readable amount of exactly zero. */
export function isZeroDecimal(value: string | null | undefined): boolean {
  const parts = split(value);
  return parts !== null && isZero(parts);
}

/**
 * `-1`, `0` or `1`, by value.
 *
 * Compares sign, then integer length, then digits lexically — which works because the integer digits have
 * been stripped of leading zeros and the fractions are padded to the same width first. Unreadable values
 * sort last, so a missing amount does not land at the top of a column of real ones.
 */
export function compareDecimal(a: string | null | undefined, b: string | null | undefined): number {
  const left = split(a);
  const right = split(b);

  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;

  const leftNegative = left.negative && !isZero(left);
  const rightNegative = right.negative && !isZero(right);
  if (leftNegative !== rightNegative) return leftNegative ? -1 : 1;

  const magnitude = compareMagnitude(left, right);
  return leftNegative ? -magnitude : magnitude;
}

function compareMagnitude(left: Parts, right: Parts): number {
  if (left.integer.length !== right.integer.length) {
    return left.integer.length < right.integer.length ? -1 : 1;
  }
  if (left.integer !== right.integer) return left.integer < right.integer ? -1 : 1;

  const width = Math.max(left.fraction.length, right.fraction.length);
  const leftFraction = left.fraction.padEnd(width, "0");
  const rightFraction = right.fraction.padEnd(width, "0");
  if (leftFraction === rightFraction) return 0;

  return leftFraction < rightFraction ? -1 : 1;
}

/**
 * A percentage the server did not send, computed from two decimal strings without float arithmetic.
 *
 * Used only for progress bars — a fundraising campaign against its target, a category against its budget
 * line. Integer division on the scaled digits, so the result is a whole percent and no money value is
 * turned into a `number` on the way. Never used to derive a figure that is presented as money.
 */
export function percentOfDecimal(
  part: string | null | undefined,
  whole: string | null | undefined,
): number | null {
  const numerator = toMinorUnits(part);
  const denominator = toMinorUnits(whole);
  if (numerator === null || denominator === null || denominator === ZERO) return null;

  const percent = (numerator * HUNDRED) / denominator;

  // Clamped to a range a progress bar can render. `Number` on a percentage is safe in a way `Number` on
  // an amount is not: the value here is already a small integer.
  return Number(percent < ZERO ? ZERO : percent > MAX_PERCENT ? MAX_PERCENT : percent);
}

/** Paisa as a `BigInt`, for the one place a ratio is needed. Exact, and never used to print money. */
function toMinorUnits(value: string | null | undefined): bigint | null {
  const parts = split(value);
  if (!parts) return null;

  const digits = `${parts.integer}${toTwoPlaces(parts.fraction)}`;
  const magnitude = BigInt(digits);

  return parts.negative ? -magnitude : magnitude;
}
