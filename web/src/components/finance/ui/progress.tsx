import { formatPercent } from "@/lib/finance/format";
import type { Tone } from "@/lib/finance/status";

const barTone: Record<Tone, string> = {
  success: "bg-[#0d4d3b]",
  pending: "bg-[#c79a45]",
  danger: "bg-[#a13228]",
  neutral: "bg-[#8b938d]",
  info: "bg-[#2c6b80]",
  gold: "bg-[#c79a45]",
};

type Props = {
  value: number;
  max: number;
  tone?: Tone;
  label: string;
  /** Shows the numeric percentage beside the bar. */
  showValue?: boolean;
  className?: string;
};

export function ProgressBar({ value, max, tone = "success", label, showValue = false, className = "" }: Props) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={className}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${Math.round(percent)}% ${label}`}
        className="h-1.5 w-full overflow-hidden rounded-full bg-[#eceadf]"
      >
        <div className={`h-full rounded-full ${barTone[tone]}`} style={{ width: `${percent}%` }} />
      </div>
      {showValue ? <p className="mt-1.5 text-[11px] font-semibold tabular-nums text-[#69726d]">{formatPercent(percent)}</p> : null}
    </div>
  );
}
