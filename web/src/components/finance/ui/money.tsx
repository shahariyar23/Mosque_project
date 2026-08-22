import { formatAmount, formatSignedAmount } from "@/lib/finance/format";
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
