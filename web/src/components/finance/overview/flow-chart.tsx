import { formatAmount, formatCompactAmount } from "@/lib/finance/format";
import type { FlowPoint } from "@/lib/finance/types";

/**
 * Income against expense, drawn by hand in SVG.
 *
 * No chart library is installed and this module is not a reason to add one: two bars per period on a
 * linear scale is a shape plain SVG draws exactly. Everything is laid out in viewBox units and the
 * element scales with its container, so there is no measuring, no resize listener and nothing that
 * has to run on the client — this stays a server component.
 *
 * The figures also exist as a real table underneath, visually hidden. A screen reader gets the
 * numbers rather than a described picture of them, which for money is the only honest option.
 */

const WIDTH = 720;
const HEIGHT = 250;
const PAD_LEFT = 54;
const PAD_RIGHT = 10;
const PAD_TOP = 12;
const PAD_BOTTOM = 34;

const PLOT_WIDTH = WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_HEIGHT = HEIGHT - PAD_TOP - PAD_BOTTOM;

const STEPS = 5;

/**
 * Rounds the axis top up to a readable number so the gridline labels are 25,000 apart rather than
 * 24,860 apart. Five bands, because a mosque committee reads a quarter-scale faster than a tenth.
 */
function axisMax(highest: number): number {
  if (highest <= 0) return STEPS;
  const rough = highest / STEPS;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((candidate) => candidate >= rough);
  return (step ?? magnitude * 10) * STEPS;
}

type Props = {
  points: FlowPoint[];
  /** Describes the period the bars cover, for the accessible name. */
  caption: string;
};

export function FlowChart({ points, caption }: Props) {
  const max = axisMax(Math.max(...points.flatMap((point) => [point.income, point.expense])));
  const slot = PLOT_WIDTH / Math.max(1, points.length);
  const barWidth = Math.min(24, (slot - 10) / 2);
  const gap = 4;

  const y = (value: number) => PAD_TOP + PLOT_HEIGHT * (1 - value / max);
  const gridlines = Array.from({ length: STEPS + 1 }, (_, index) => (max / STEPS) * index);

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Income against expenses, ${caption}. The same figures follow in a table.`}
      >
        {gridlines.map((value) => (
          <g key={value}>
            <line
              x1={PAD_LEFT}
              x2={WIDTH - PAD_RIGHT}
              y1={y(value)}
              y2={y(value)}
              stroke={value === 0 ? "#d5d3c6" : "#eceae0"}
              strokeWidth={1}
            />
            <text
              x={PAD_LEFT - 10}
              y={y(value) + 4}
              textAnchor="end"
              className="fill-[#8b938d] text-[11px] font-medium tabular-nums"
            >
              {formatCompactAmount(value)}
            </text>
          </g>
        ))}

        {points.map((point, index) => {
          const centre = PAD_LEFT + slot * (index + 0.5);
          const incomeHeight = Math.max(2, (PLOT_HEIGHT * point.income) / max);
          const expenseHeight = Math.max(2, (PLOT_HEIGHT * point.expense) / max);
          return (
            <g key={point.period}>
              <rect
                x={centre - barWidth - gap / 2}
                y={PAD_TOP + PLOT_HEIGHT - incomeHeight}
                width={barWidth}
                height={incomeHeight}
                rx={2}
                fill="#0d4d3b"
              >
                <title>{`${point.label} income ${formatAmount(point.income)}`}</title>
              </rect>
              <rect
                x={centre + gap / 2}
                y={PAD_TOP + PLOT_HEIGHT - expenseHeight}
                width={barWidth}
                height={expenseHeight}
                rx={2}
                fill="#a13228"
              >
                <title>{`${point.label} expenses ${formatAmount(point.expense)}`}</title>
              </rect>
              <text
                x={centre}
                y={HEIGHT - 12}
                textAnchor="middle"
                className="fill-[#69726d] text-[11px] font-semibold"
              >
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>

      <table className="sr-only">
        <caption>{`Income and expenses, ${caption}`}</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            <th scope="col">Income</th>
            <th scope="col">Expenses</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.period}>
              <th scope="row">{point.label}</th>
              <td>{formatAmount(point.income)}</td>
              <td>{formatAmount(point.expense)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FlowChartLegend() {
  return (
    <div className="flex items-center gap-4">
      <span className="inline-flex items-center gap-2 text-[12px] font-medium text-[#4d564f]">
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-[#0d4d3b]" />
        Income
      </span>
      <span className="inline-flex items-center gap-2 text-[12px] font-medium text-[#4d564f]">
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-[#a13228]" />
        Expenses
      </span>
    </div>
  );
}
