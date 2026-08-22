import { formatCount } from "@/lib/mosque/format";

/**
 * The small set of charts the community modules need. No charting library: these are three fixed
 * shapes drawn with SVG and CSS, which is a fraction of the weight of a chart package and keeps the
 * palette tied to the design tokens rather than to a theme object.
 *
 * Every chart here follows the same accessibility rule — the drawing is `aria-hidden` and the numbers
 * are rendered next to it as a real `<dl>`. A donut a screen reader cannot read is decoration; the
 * legend is the content. It is also why nothing here depends on colour alone.
 */

/** Chart series colours, in the order they should be used. Emerald first, gold second. */
export const seriesColors = ["#0d4d3b", "#c79a45", "#2c6b80", "#7d8a80", "#a97b23"] as const;

export type Segment = {
  label: string;
  value: number;
  /** Defaults to the series colour for its position. */
  color?: string;
  /** Replaces the formatted count in the legend — "678 (54%)". */
  valueLabel?: string;
};

function withColors(segments: Segment[]): Array<Required<Pick<Segment, "color">> & Segment> {
  return segments.map((segment, index) => ({
    ...segment,
    color: segment.color ?? seriesColors[index % seriesColors.length],
  }));
}

/* -------------------------------------------------------------------------- *
 * Donut
 * -------------------------------------------------------------------------- */

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function DonutChart({
  segments,
  centerValue,
  centerLabel,
  size = 168,
}: {
  segments: Segment[];
  centerValue: string;
  centerLabel: string;
  size?: number;
}) {
  const resolved = withColors(segments);
  const total = resolved.reduce((sum, segment) => sum + segment.value, 0);

  let offset = 0;
  const arcs = resolved.map((segment) => {
    const share = total > 0 ? segment.value / total : 0;
    const arc = { ...segment, share, dash: share * CIRCUMFERENCE, offset };
    offset += arc.dash;
    return arc;
  });

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg aria-hidden="true" viewBox="0 0 100 100" width={size} height={size} className="-rotate-90">
          <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="#f0efe6" strokeWidth={11} />
          {arcs.map((arc) => (
            <circle
              key={arc.label}
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              stroke={arc.color}
              strokeWidth={11}
              strokeLinecap="butt"
              strokeDasharray={`${arc.dash} ${CIRCUMFERENCE - arc.dash}`}
              strokeDashoffset={-arc.offset}
            />
          ))}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-[22px] font-semibold leading-tight tabular-nums text-[#17211d]">{centerValue}</p>
            <p className="mt-0.5 text-[10.5px] font-bold uppercase tracking-[.12em] text-[#8b938d]">{centerLabel}</p>
          </div>
        </div>
      </div>

      <dl className="min-w-0 flex-1 space-y-2.5">
        {arcs.map((arc) => (
          <div key={arc.label} className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: arc.color }}
            />
            <dt className="min-w-0 flex-1 truncate text-[13px] text-[#4d564f]">{arc.label}</dt>
            <dd className="shrink-0 text-[13px] font-semibold tabular-nums text-[#17211d]">
              {arc.valueLabel ?? formatCount(arc.value)}
              <span className="ml-1.5 font-normal text-[#8b938d]">{Math.round(arc.share * 100)}%</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Split bar
 * -------------------------------------------------------------------------- */

/** Proportional stacked bar with a legend under it. Used for age bands and team sizes. */
export function SplitBar({ segments, label }: { segments: Segment[]; label: string }) {
  const resolved = withColors(segments);
  const total = resolved.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <div>
      <div
        role="img"
        aria-label={`${label}: ${resolved.map((s) => `${s.label} ${formatCount(s.value)}`).join(", ")}`}
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-[#f0efe6]"
      >
        {resolved.map((segment) => {
          const share = total > 0 ? (segment.value / total) * 100 : 0;
          if (share <= 0) return null;
          return (
            <span
              key={segment.label}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{ width: `${share}%`, backgroundColor: segment.color }}
            />
          );
        })}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        {resolved.map((segment) => (
          <div key={segment.label} className="flex items-baseline gap-2">
            <span
              aria-hidden="true"
              className="mt-1 h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: segment.color }}
            />
            <dt className="min-w-0 truncate text-[12px] text-[#69726d]">{segment.label}</dt>
            <dd className="ml-auto shrink-0 text-[12.5px] font-semibold tabular-nums text-[#3d453f]">
              {segment.valueLabel ?? formatCount(segment.value)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Mini bar chart
 * -------------------------------------------------------------------------- */

/**
 * Small column chart for a short series — the last several Fridays' attendance, for instance. Bars
 * are `<div>`s in a flex row rather than SVG rects so the labels underneath stay in the normal flow
 * and wrap sensibly at 320px.
 */
export function MiniBarChart({
  points,
  caption,
  formatValue = formatCount,
  highlightLast = true,
}: {
  points: Array<{ label: string; value: number }>;
  caption: string;
  formatValue?: (value: number) => string;
  highlightLast?: boolean;
}) {
  const max = Math.max(...points.map((point) => point.value), 1);

  return (
    <figure className="m-0">
      <div className="flex h-40 items-end gap-1.5 sm:gap-2.5">
        {points.map((point, index) => {
          const height = Math.max(4, (point.value / max) * 100);
          const highlighted = highlightLast && index === points.length - 1;
          return (
            <div key={`${point.label}-${index}`} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <span className="text-[10.5px] font-semibold tabular-nums text-[#69726d]">
                {formatValue(point.value)}
              </span>
              <div
                className={`w-full rounded-t ${highlighted ? "bg-[#0d4d3b]" : "bg-[#c2d8cb]"}`}
                style={{ height: `${height}%` }}
              />
              <span className="w-full truncate text-center text-[10.5px] text-[#8b938d]">{point.label}</span>
            </div>
          );
        })}
      </div>
      <figcaption className="mt-3 text-[11.5px] text-[#8b938d]">{caption}</figcaption>
    </figure>
  );
}

/* -------------------------------------------------------------------------- *
 * Capacity meter
 * -------------------------------------------------------------------------- */

/**
 * Filled-of-capacity meter with the three figures spelled out beneath it. Used for Jumu'ah halls and
 * event capacity, where "738 of 850, 112 places left" is the actual answer someone wants and the bar
 * is only a summary of it.
 */
export function CapacityMeter({
  filled,
  capacity,
  filledLabel = "Registered",
  capacityLabel = "Expected",
  remainingLabel = "Available",
  tone = "#0d4d3b",
}: {
  filled: number;
  capacity: number;
  filledLabel?: string;
  capacityLabel?: string;
  remainingLabel?: string;
  tone?: string;
}) {
  const share = capacity > 0 ? Math.min(100, (filled / capacity) * 100) : 0;
  const remaining = Math.max(0, capacity - filled);

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <p className="text-[26px] font-semibold leading-none tabular-nums text-[#17211d]">{formatCount(filled)}</p>
        <p className="text-[12.5px] text-[#69726d]">
          of {formatCount(capacity)} · {Math.round(share)}% full
        </p>
      </div>
      <div
        role="progressbar"
        aria-label={`${filledLabel} against ${capacityLabel.toLowerCase()}`}
        aria-valuenow={Math.round(share)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${formatCount(filled)} of ${formatCount(capacity)}, ${formatCount(remaining)} still available`}
        className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-[#eceadf]"
      >
        <div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: tone }} />
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-[#eceae0] pt-3.5">
        {[
          { label: capacityLabel, value: capacity },
          { label: filledLabel, value: filled },
          { label: remainingLabel, value: remaining },
        ].map((item) => (
          <div key={item.label}>
            <dt className="text-[10.5px] font-bold uppercase tracking-[.08em] text-[#8b938d]">{item.label}</dt>
            <dd className="mt-0.5 text-[16px] font-semibold tabular-nums text-[#17211d]">{formatCount(item.value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
