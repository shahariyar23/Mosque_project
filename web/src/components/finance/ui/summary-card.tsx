import { formatAmount, formatPercent } from "@/lib/finance/format";
import { metricToneClass } from "@/lib/finance/status";
import { Icon, type IconName } from "@/components/finance/ui/icon";
import type { SummaryMetric } from "@/lib/finance/types";

const directionIcon = { up: "trending-up", down: "trending-down", flat: "arrow-right" } as const;

/**
 * Financial summary tile. The amount is the loudest element on the card; the tone only
 * colours the amount and the icon chip so a row of six cards never turns into a rainbow.
 */
export function FinanceSummaryCard({ metric }: { metric: SummaryMetric }) {
  const tone = metricToneClass[metric.tone];
  const change = metric.change;
  const changeTone =
    change?.direction === "up" ? "text-[#0b4634]" : change?.direction === "down" ? "text-[#94291f]" : "text-[#69726d]";

  return (
    <article className="rounded-lg border border-[#deddd3] bg-white p-4 shadow-[0_1px_2px_rgba(7,58,45,.04),0_10px_28px_-24px_rgba(7,58,45,.3)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[13px] font-semibold leading-5 text-[#5c655f]">{metric.label}</h3>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md border ${tone.icon}`}>
          <Icon name={metric.icon as IconName} size={17} />
        </span>
      </div>

      <p className={`mt-3 text-[26px] font-semibold leading-tight tabular-nums sm:text-[28px] ${tone.value}`}>
        {formatAmount(metric.amount)}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        {change ? (
          <span className={`inline-flex items-center gap-1 text-[12px] font-semibold tabular-nums ${changeTone}`}>
            <Icon name={directionIcon[change.direction]} size={14} />
            {formatPercent(change.value, { signed: true })}
            <span className="font-normal text-[#69726d]">{change.label}</span>
          </span>
        ) : null}
        <p className="text-[12px] leading-5 text-[#69726d]">{metric.hint}</p>
      </div>
    </article>
  );
}

export function FinanceSummaryGrid({ metrics }: { metrics: SummaryMetric[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {metrics.map((metric) => (
        <FinanceSummaryCard key={metric.id} metric={metric} />
      ))}
    </div>
  );
}

/** Tight version used inside pages that only need three or four figures above a table. */
export function MiniStat({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: IconName;
  tone?: keyof typeof metricToneClass;
}) {
  const toneClass = metricToneClass[tone];
  return (
    <article className="rounded-lg border border-[#deddd3] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[13px] font-semibold leading-5 text-[#5c655f]">{label}</h3>
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md border ${toneClass.icon}`}>
          <Icon name={icon} size={16} />
        </span>
      </div>
      <p className={`mt-2.5 text-[22px] font-semibold leading-tight tabular-nums ${toneClass.value}`}>{value}</p>
      {hint ? <p className="mt-1 text-[12px] leading-5 text-[#69726d]">{hint}</p> : null}
    </article>
  );
}
