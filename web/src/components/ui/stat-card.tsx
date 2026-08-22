import { metricToneClass } from "@/lib/finance/status";
import { Icon, type IconName } from "@/components/finance/ui/icon";
import type { StatMetric } from "@/lib/mosque/types";
/**
 * Headline figure card for the community modules.
 *
 * Visually identical to `FinanceSummaryCard` — same tone classes, same type scale — but it takes a
 * pre-formatted string rather than an `Amount`, because these strips mix counts, money and durations
 * on one row. Sharing the tone map is what keeps the two from drifting apart.
 */
const directionIcon = { up: "trending-up", down: "trending-down", flat: "arrow-right" } as const;

export function StatCard({ metric }: { metric: StatMetric }) {
  const tone = metricToneClass[metric.tone];
  const change = metric.change;
  const changeTone =
    change?.direction === "up"
      ? "text-[#0b4634]"
      : change?.direction === "down"
        ? "text-[#94291f]"
        : "text-[#69726d]";

  return (
    <article className="rounded-lg border border-[#deddd3] bg-white p-4 shadow-[0_1px_2px_rgba(7,58,45,.04),0_10px_28px_-24px_rgba(7,58,45,.3)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[13px] font-semibold leading-5 text-[#5c655f]">{metric.label}</h3>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md border ${tone.icon}`}>
          <Icon name={metric.icon} size={17} />
        </span>
      </div>

      <p className={`mt-3 text-[26px] font-semibold leading-tight tabular-nums sm:text-[28px] ${tone.value}`}>
        {metric.value}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        {change ? (
          <span className={`inline-flex items-center gap-1 text-[12px] font-semibold tabular-nums ${changeTone}`}>
            <Icon name={directionIcon[change.direction]} size={14} />
            {change.label}
            <span className="font-normal text-[#69726d]">{change.period}</span>
          </span>
        ) : null}
        <p className="text-[12px] leading-5 text-[#69726d]">{metric.hint}</p>
      </div>
    </article>
  );
}

/**
 * Four-across on desktop, two on tablets, stacked on phones. Every summary strip in the community
 * modules uses this so the cards line up from page to page.
 */
export function StatGrid({ metrics }: { metrics: StatMetric[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <StatCard key={metric.id} metric={metric} />
      ))}
    </div>
  );
}

/** Compact figure for inside a panel — no change indicator, smaller type. */
export function InlineStat({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: IconName;
  tone?: keyof typeof metricToneClass;
}) {
  const toneClass = metricToneClass[tone];
  return (
    <div className="rounded-lg border border-[#e7e6dc] bg-[#faf9f4] px-3.5 py-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[.08em] text-[#8b938d]">{label}</p>
        {icon ? (
          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-md border ${toneClass.icon}`}>
            <Icon name={icon} size={14} />
          </span>
        ) : null}
      </div>
      <p className={`mt-1.5 text-[20px] font-semibold leading-tight tabular-nums ${toneClass.value}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-[11.5px] leading-5 text-[#69726d]">{hint}</p> : null}
    </div>
  );
}
