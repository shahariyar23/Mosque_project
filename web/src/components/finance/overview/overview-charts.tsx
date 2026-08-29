"use client";

import { useMemo, useState } from "react";
import type { FinancialSummary } from "@/services/financialReportsService";
import type { FundWithBalance } from "@/services/donationFundsService";
import { formatAmount, formatCompactAmount } from "@/lib/finance/format";
import { Icon } from "@/components/finance/ui/icon";
import Link from "next/link";

type Props = {
  summary: FinancialSummary;
  funds: FundWithBalance[];
};

export function OverviewCharts({ summary, funds }: Props) {
  const [chartMode, setChartMode] = useState<"flow" | "breakdown">("flow");

  const totalIncome = summary.income ? parseFloat(summary.income.total) : parseFloat(summary.donations.total);
  const totalExpenses = parseFloat(summary.expenses.total);
  const totalSalaries = parseFloat(summary.salaries.total);
  const totalSpending = totalExpenses + totalSalaries;
  const netBalance = parseFloat(summary.netBalance);

  const activeFunds = useMemo(() => funds.filter((f) => f.status === "active"), [funds]);
  const totalFundReserves = useMemo(() => {
    return activeFunds.reduce((sum, f) => sum + Math.max(0, parseFloat(f.availableBalance || "0")), 0);
  }, [activeFunds]);

  // Max value for comparative bar scaling
  const maxScale = Math.max(totalIncome, totalSpending, 1000) * 1.15;

  // Retention / Surplus rate calculation
  const surplusRate = totalIncome > 0 ? Math.round((netBalance / totalIncome) * 100) : 0;

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      {/* Main Flow & Performance Graphic Interface (8 cols on desktop, full width on mobile) */}
      <div className="lg:col-span-7 rounded-xl border border-[#e2e1d6] bg-white p-4 sm:p-5 shadow-[0_1px_2px_rgba(7,58,45,.04),0_10px_28px_-24px_rgba(7,58,45,.2)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#eceae0] pb-3.5">
          <div>
            <h3 className="text-[15px] sm:text-[16px] font-semibold text-[#17211d]">
              Cash Inflow vs. Outflow Analytics
            </h3>
            <p className="text-[12px] text-[#69726d]">
              Real-time balance comparison for the selected reporting period
            </p>
          </div>

          <div className="inline-flex self-start sm:self-auto items-center rounded-lg border border-[#e2e1d6] bg-[#f8f7f1] p-1 text-[12px] font-medium text-[#4d564f]">
            <button
              type="button"
              onClick={() => setChartMode("flow")}
              className={`rounded-md px-3 py-1 transition-colors ${
                chartMode === "flow"
                  ? "bg-white font-semibold text-[#0d6e52] shadow-xs"
                  : "text-[#69726d] hover:text-[#17211d]"
              }`}
            >
              Cash Flow
            </button>
            <button
              type="button"
              onClick={() => setChartMode("breakdown")}
              className={`rounded-md px-3 py-1 transition-colors ${
                chartMode === "breakdown"
                  ? "bg-white font-semibold text-[#0d6e52] shadow-xs"
                  : "text-[#69726d] hover:text-[#17211d]"
              }`}
            >
              Spending Split
            </button>
          </div>
        </div>

        {chartMode === "flow" ? (
          /* Visual Cash Flow Comparison */
          <div className="mt-4 space-y-4">
            {/* Surplus efficiency pill */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#e3ebe6] bg-[#f2f8f4] px-3.5 py-2 text-[12.5px]">
              <span className="font-medium text-[#0d6e52] flex items-center gap-1.5">
                <Icon name="trending-up" size={15} />
                {netBalance >= 0 ? "Operating Surplus" : "Operating Deficit"}
              </span>
              <span className="font-bold text-[#0d6e52]">
                {surplusRate}% Net Retention
              </span>
            </div>

            {/* Custom Responsive SVG Flow Graph */}
            <div className="w-full overflow-x-auto">
              <svg viewBox="0 0 540 140" className="w-full h-auto min-w-[360px]">
                {/* Horizontal Gridlines */}
                {[0, 0.5, 1].map((ratio) => {
                  const yPos = 15 + ratio * 85;
                  return (
                    <g key={ratio}>
                      <line
                        x1="120"
                        x2="530"
                        y1={yPos}
                        y2={yPos}
                        stroke="#eceae0"
                        strokeWidth="1"
                        strokeDasharray="3 3"
                      />
                      <text
                        x="110"
                        y={yPos + 4}
                        textAnchor="end"
                        className="fill-[#8b938d] text-[10px] tabular-nums"
                      >
                        {formatCompactAmount((1 - ratio) * maxScale)}
                      </text>
                    </g>
                  );
                })}

                {/* Bars */}
                {/* Total Inflow Bar */}
                <g className="cursor-pointer">
                  <text x="120" y="32" className="fill-[#17211d] text-[11.5px] font-medium">
                    Total Inflow
                  </text>
                  <rect
                    x="120"
                    y="38"
                    width={Math.max(4, (totalIncome / maxScale) * 400)}
                    height="16"
                    rx="4"
                    fill="#0d6e52"
                  >
                    <title>Total Income: {formatAmount(totalIncome)}</title>
                  </rect>
                  <text
                    x={130 + Math.max(4, (totalIncome / maxScale) * 400)}
                    y="51"
                    className="fill-[#0d6e52] text-[12px] font-bold"
                  >
                    {formatAmount(totalIncome)}
                  </text>
                </g>

                {/* Total Outflow Bar */}
                <g className="cursor-pointer">
                  <text x="120" y="74" className="fill-[#17211d] text-[11.5px] font-medium">
                    Total Outflow (Bills + Payroll)
                  </text>
                  <rect
                    x="120"
                    y="80"
                    width={Math.max(4, (totalSpending / maxScale) * 400)}
                    height="16"
                    rx="4"
                    fill="#be123c"
                  >
                    <title>Total Spending: {formatAmount(totalSpending)}</title>
                  </rect>
                  <text
                    x={130 + Math.max(4, (totalSpending / maxScale) * 400)}
                    y="93"
                    className="fill-[#be123c] text-[12px] font-bold"
                  >
                    {formatAmount(totalSpending)}
                  </text>
                </g>
              </svg>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#eceae0] text-[11.5px] text-[#69726d]">
              <span>Inflow includes all donations & contributions</span>
              <span>Ledger Verified</span>
            </div>
          </div>
        ) : (
          /* Spending Breakdown View */
          <div className="mt-4 space-y-3.5">
            <p className="text-[12.5px] text-[#555e58]">
              Distribution between operational expenses and staff payroll:
            </p>

            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[12px] mb-1">
                  <span className="font-medium text-[#17211d]">Operational Expenses</span>
                  <span className="font-semibold text-[#be123c]">{formatAmount(totalExpenses)}</span>
                </div>
                <div className="h-3 w-full bg-[#f0eee4] rounded-full overflow-hidden">
                  <div
                    style={{ width: `${totalSpending > 0 ? (totalExpenses / totalSpending) * 100 : 0}%` }}
                    className="h-full bg-[#be123c] rounded-full transition-all duration-300"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[12px] mb-1">
                  <span className="font-medium text-[#17211d]">Imam & Staff Payroll</span>
                  <span className="font-semibold text-[#d97706]">{formatAmount(totalSalaries)}</span>
                </div>
                <div className="h-3 w-full bg-[#f0eee4] rounded-full overflow-hidden">
                  <div
                    style={{ width: `${totalSpending > 0 ? (totalSalaries / totalSpending) * 100 : 0}%` }}
                    className="h-full bg-[#d97706] rounded-full transition-all duration-300"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fund Capital Reserves & Allocation Widget (5 cols on desktop, full width on mobile) */}
      <div className="lg:col-span-5 rounded-xl border border-[#e2e1d6] bg-white p-4 sm:p-5 shadow-[0_1px_2px_rgba(7,58,45,.04),0_10px_28px_-24px_rgba(7,58,45,.2)] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-[#eceae0] pb-3.5">
            <div>
              <h3 className="text-[15px] sm:text-[16px] font-semibold text-[#17211d]">
                Capital in Mosque Funds
              </h3>
              <p className="text-[12px] text-[#69726d]">
                Live distribution across active fund pots
              </p>
            </div>
            <Link
              href="/dashboard/finance/funds"
              className="text-[12px] font-semibold text-[#0d6e52] hover:underline shrink-0"
            >
              View all &rarr;
            </Link>
          </div>

          <div className="mt-3.5 space-y-3">
            {activeFunds.length === 0 ? (
              <p className="text-center py-6 text-[12.5px] text-[#8e9690]">No active funds found.</p>
            ) : (
              activeFunds.slice(0, 4).map((fund) => {
                const avail = parseFloat(fund.availableBalance || "0");
                const pct = totalFundReserves > 0 ? (avail / totalFundReserves) * 100 : 0;

                return (
                  <div key={fund.id} className="rounded-lg border border-[#edebe1] bg-[#faf9f4] p-2.5 sm:p-3">
                    <div className="flex items-center justify-between text-[12.5px] mb-1.5">
                      <span className="font-semibold text-[#17211d] truncate">{fund.name}</span>
                      <span className="font-bold text-[#0d6e52] shrink-0">{formatAmount(avail)}</span>
                    </div>
                    <div className="h-2 w-full bg-[#e8e5d8] rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full bg-[#0d6e52] rounded-full transition-all duration-300"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#eceae0] flex items-center justify-between text-[12px]">
          <span className="text-[#69726d]">Total Liquid Reserves:</span>
          <span className="font-bold text-[#0d6e52] text-[14px]">{formatAmount(totalFundReserves)}</span>
        </div>
      </div>
    </div>
  );
}
