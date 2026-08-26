/**
 * The currency a monetary row is denominated in.
 *
 * Every money column in this codebase is a bare `Decimal` — a number with no unit attached — so the unit
 * has to be stored beside it. `MosqueSettings.currency` says what a mosque normally deals in and is the
 * default a donation or expense picks up when the caller does not say. It is not, however, read at display
 * time: the code is copied onto the row when the row is written, because a mosque that switches from BDT to
 * USD must not silently restate what a donor gave three years ago.
 *
 * Nothing here converts between currencies, and nothing adds two amounts. A rate is a fact about a moment
 * that this application has no source for, and a total across mixed currencies computed from one would be a
 * number nobody could reconcile.
 */

/**
 * ISO 4217: exactly three upper-case letters. `BDT`, `USD`, `SAR`, `GBP`.
 *
 * The list of real codes is deliberately not enumerated. It changes — currencies are introduced and
 * withdrawn — and a hard-coded set would eventually refuse something legitimate while claiming to be
 * authoritative. The shape is checked; the meaning is the mosque's business.
 */
export const CURRENCY_PATTERN = /^[A-Z]{3}$/;

export const CURRENCY_MESSAGE =
  'must be a 3-letter ISO 4217 currency code, for example "BDT". Lower case is accepted and upper-cased.';

/**
 * What to store when the mosque has no settings row, or has one holding something that is not a currency
 * code. The column is `VarChar(8)` with a default of `"BDT"`, so it can legitimately hold a value this
 * pattern rejects; falling back is better than writing a unit that means nothing onto a financial record.
 */
export const FALLBACK_CURRENCY = 'BDT';

/**
 * Trims and upper-cases a currency input so `" bdt "` validates as `BDT`.
 *
 * Declared as a named function taking `unknown`, the same convention the money and boolean transforms in
 * this codebase follow: a non-string is returned untouched so class-validator produces the message above
 * rather than this throwing first.
 */
export function normalizeCurrency(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}
