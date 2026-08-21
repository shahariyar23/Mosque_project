import type { Amount, TransactionType } from "@/lib/finance/types";

const bdt = new Intl.NumberFormat("en-BD", { maximumFractionDigits: 0 });
const bdtDecimal = new Intl.NumberFormat("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ৳425,000 */
export function formatAmount(amount: Amount, options: { decimals?: boolean } = {}): string {
  const formatter = options.decimals ? bdtDecimal : bdt;
  return `৳${formatter.format(Math.abs(amount))}`;
}

/** +৳500 / -৳35,000 — signs follow accounting direction, never a bare number. */
export function formatSignedAmount(amount: Amount, type: TransactionType): string {
  if (type === "Transfer") return formatAmount(amount);
  return `${type === "Income" ? "+" : "−"}${formatAmount(amount)}`;
}

/** Compact form for chart axes: ৳1.2L, ৳87.5K */
export function formatCompactAmount(amount: Amount): string {
  const value = Math.abs(amount);
  if (value >= 10_000_000) return `৳${(value / 10_000_000).toFixed(1)}Cr`;
  if (value >= 100_000) return `৳${(value / 100_000).toFixed(1)}L`;
  if (value >= 1_000) return `৳${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return `৳${value}`;
}

export function formatPercent(value: number, options: { signed?: boolean } = {}): string {
  const rounded = Math.round(Math.abs(value) * 10) / 10;
  const sign = options.signed ? (value > 0 ? "+" : value < 0 ? "−" : "") : "";
  return `${sign}${rounded}%`;
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const shortDateFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const monthFormatter = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });
const shortMonthFormatter = new Intl.DateTimeFormat("en-GB", { month: "short" });

function toDate(value: string): Date {
  // Mock data uses date-only strings; midday avoids timezone drift across the date boundary.
  return new Date(value.length === 10 ? `${value}T12:00:00` : value);
}

/** 22 Aug 2026 */
export function formatDate(value: string): string {
  return dateFormatter.format(toDate(value));
}

/** 22 Aug */
export function formatShortDate(value: string): string {
  return shortDateFormatter.format(toDate(value));
}

/** August 2026 — accepts "2026-08" or a full date. */
export function formatMonth(value: string): string {
  return monthFormatter.format(toDate(value.length === 7 ? `${value}-01` : value));
}

/** Aug */
export function formatMonthShort(value: string): string {
  return shortMonthFormatter.format(toDate(value.length === 7 ? `${value}-01` : value));
}

/** "22 Aug 2026" or an em dash when nothing has happened yet. */
export function formatOptionalDate(value?: string): string {
  return value ? formatDate(value) : "—";
}

export function formatCollectionRate(collected: Amount, expected: Amount): string {
  if (expected <= 0) return "0%";
  return formatPercent((collected / expected) * 100);
}

export function sumAmount<T>(rows: T[], pick: (row: T) => Amount): Amount {
  return rows.reduce((total, row) => total + pick(row), 0);
}

/** Sort helper shared by every finance table so ordering behaves the same everywhere. */
export function compareValues(a: unknown, b: unknown): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a ?? "").localeCompare(String(b ?? ""), "en", { numeric: true, sensitivity: "base" });
}
