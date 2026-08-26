import { formatAmount, formatSignedAmount } from "@/lib/finance/format";
import { formatDecimal, isNegativeDecimal, isZeroDecimal } from "@/lib/finance/decimal";
import type { Amount, TransactionType } from "@/lib/finance/types";

/** Plain amount, tabular so columns of money line up. */
export function Money({
  value,
  className = "",
  decimals = false,
}: {
  value: Amount;
  className?: string;
  decimals?: boolean;
}) {
  return <span className={`tabular-nums ${className}`}>{formatAmount(value, { decimals })}</span>;
}

/**
 * Signed amount for ledger rows. Income reads +৳500 in Islamic green, expenses read −৳35,000
 * in the error tone, transfers stay neutral because money only moves between funds.
 */
export function SignedMoney({ value, type, className = "" }: { value: Amount; type: TransactionType; className?: string }) {
  const tone = type === "Income" ? "text-[#0b4634]" : type === "Expense" ? "text-[#94291f]" : "text-[#1d5265]";
  return (
    <span className={`tabular-nums font-semibold ${tone} ${className}`}>
      {formatSignedAmount(value, type)}
      <span className="sr-only">{type === "Income" ? " received" : type === "Expense" ? " paid out" : " transferred"}</span>
    </span>
  );
}

/** Net figure that flips tone on the sign — used for net balance and report totals. */
export function NetMoney({ value, className = "" }: { value: Amount; className?: string }) {
  const tone = value > 0 ? "text-[#0b4634]" : value < 0 ? "text-[#94291f]" : "text-[#17211d]";
  return (
    <span className={`tabular-nums font-semibold ${tone} ${className}`}>
      {value < 0 ? "−" : ""}
      {formatAmount(value)}
      {value < 0 ? <span className="sr-only"> shortfall</span> : null}
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * The same three, for money that came from the API.
 *
 * The API sends every amount as a decimal *string*, because the columns
 * are `Decimal(14, 2)` and a JSON number would round them on the way
 * in. So these take a string and never parse it — the components above
 * take `Amount = number` and are for the views still on mock data.
 * Keeping both is deliberate: one shared component with a
 * `string | number` prop would make it impossible to see, at a call
 * site, whether a real amount is about to go through float maths.
 * ------------------------------------------------------------------ */

/** Plain API amount, tabular so columns of money line up. Renders `—` when nothing was recorded. */
export function DecimalMoney({
  value,
  className = "",
  decimals = true,
  currency = true,
}: {
  value: string | null | undefined;
  className?: string;
  decimals?: boolean;
  /**
   * Prefix with ৳. Pass `false` where the API told us which currency this is.
   *
   * `formatDecimal` prints the taka sign because that is the only currency this deployment uses, but the
   * financial reports return a `currency` field taken from the mosque's own settings. A screen that reads
   * it must be able to state that code instead of stamping ৳ on a figure that might not be in taka.
   */
  currency?: boolean;
}) {
  return <span className={`tabular-nums ${className}`}>{formatDecimal(value, { decimals, currency })}</span>;
}

/**
 * Net API figure that flips tone on the sign — net balance, remaining budget, report totals.
 *
 * The minus is rendered as U+2212 and the amount printed unsigned, matching `NetMoney`, so a negative
 * balance reads as `−৳4,500.00` rather than with a hyphen that a screen reader announces as a dash.
 */
export function DecimalNetMoney({
  value,
  className = "",
  currency = true,
}: {
  value: string | null | undefined;
  className?: string;
  /** As `DecimalMoney` — `false` where the currency is stated alongside the figure. */
  currency?: boolean;
}) {
  const negative = isNegativeDecimal(value);
  // Zero is neutral, matching `NetMoney`: a fund that balances exactly is neither good news nor bad.
  const tone = negative ? "text-[#94291f]" : isZeroDecimal(value) ? "text-[#17211d]" : "text-[#0b4634]";

  return (
    <span className={`tabular-nums font-semibold ${tone} ${className}`}>
      {negative ? "−" : ""}
      {formatDecimal(value, { currency })}
      {negative ? <span className="sr-only"> shortfall</span> : null}
    </span>
  );
}

/**
 * Signed amount for decimal ledger rows from the API.
 * Income reads +৳500 in Islamic green, expenses read −৳35,000 in the error tone, transfers stay neutral.
 */
export function SignedDecimalMoney({
  value,
  type,
  className = "",
  currency = true,
}: {
  value: string | null | undefined;
  type: string;
  className?: string;
  currency?: boolean;
}) {
  const isIncome = type.toLowerCase() === "income";
  const isExpense = type.toLowerCase() === "expense";
  const tone = isIncome ? "text-[#0b4634]" : isExpense ? "text-[#94291f]" : "text-[#1d5265]";
  const prefix = isIncome ? "+" : isExpense ? "−" : "";

  return (
    <span className={`tabular-nums font-semibold ${tone} ${className}`}>
      {prefix}
      {formatDecimal(value, { currency })}
      <span className="sr-only">{isIncome ? " received" : isExpense ? " paid out" : " transferred"}</span>
    </span>
  );
}
