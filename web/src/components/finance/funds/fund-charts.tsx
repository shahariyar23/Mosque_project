"use client";

import { useMemo, useState } from "react";
import type { FundWithBalance } from "@/services/donationFundsService";
import { formatAmount, formatCompactAmount } from "@/lib/finance/format";

const COLOR_PALETTE = [
  "#0d6e52", // Emerald Green
  "#1f669e", // Ocean Blue
  "#d97706", // Amber
  "#7c3aed", // Purple
  "#0891b2", // Cyan
  "#be123c", // Rose
  "#4b5563", // Slate
];

type Props = {
  funds: FundWithBalance[];
};

export function FundCharts({ funds }: Props) {
  const [activeTab, setActiveTab] = useState<"distribution" | "comparison">("distribution");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const activeFunds = useMemo(() => funds.filter((f) => f.status === "active"), [funds]);

  // Compute total available
  const totalAvailable = useMemo(() => {
    return activeFunds.reduce((acc, f) => acc + Math.max(0, parseFloat(f.availableBalance || "0")), 0);
  }, [activeFunds]);

  // Distribution data
  const distributionData = useMemo(() => {
    return activeFunds.map((fund, idx) => {
      const avail = Math.max(0, parseFloat(fund.availableBalance || "0"));
      const percentage = totalAvailable > 0 ? (avail / totalAvailable) * 100 : 0;
      return {
        id: fund.id,
        name: fund.name,
        amount: avail,
        percentage,
        color: COLOR_PALETTE[idx % COLOR_PALETTE.length],
        income: parseFloat(fund.totalIncome || "0"),
        expenses: parseFloat(fund.totalExpenses || "0"),
        transfersIn: parseFloat(fund.incomingTransfers || "0"),
        transfersOut: parseFloat(fund.outgoingTransfers || "0"),
      };
    });
  }, [activeFunds, totalAvailable]);

  // Max value for comparative bar chart
  const maxComparisonVal = useMemo(() => {
    let max = 1000;
    for (const f of distributionData) {
      if (f.amount > max) max = f.amount;
      if (f.income > max) max = f.income;
      if (f.expenses > max) max = f.expenses;
    }
    return max * 1.15;
  }, [distributionData]);

  // Active selected item for preview (default to first fund if none explicitly selected)
  const activeFundItem = selectedIndex !== null ? distributionData[selectedIndex] : (distributionData[0] || null);

  return (
    <div className="w-full rounded-xl border border-[#e2e1d6] bg-white p-4 sm:p-5 shadow-[0_1px_2px_rgba(7,58,45,.04),0_10px_28px_-24px_rgba(7,58,45,.2)]">
      {/* Header with Switcher - Mobile First Responsive Stack */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#eceae0] pb-3.5">
        <div>
          <h2 className="text-[15px] sm:text-[16px] font-semibold text-[#17211d]">
            Fund Balance & Capital Analytics
          </h2>
          <p className="text-[12px] sm:text-[12.5px] text-[#69726d]">
            Visual breakdown of allocated reserves and capital distribution
          </p>
        </div>

        {/* Tab switcher - touch friendly 44px min tap target on mobile */}
        <div className="inline-flex self-start sm:self-auto items-center rounded-lg border border-[#e2e1d6] bg-[#f8f7f1] p-1 text-[12px] font-medium text-[#4d564f]">
          <button
            type="button"
            onClick={() => setActiveTab("distribution")}
            className={`min-h-[34px] rounded-md px-3 py-1.5 transition-colors ${
              activeTab === "distribution"
                ? "bg-white font-semibold text-[#0d6e52] shadow-sm"
                : "text-[#69726d] hover:text-[#17211d]"
            }`}
          >
            Allocation Share
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("comparison")}
            className={`min-h-[34px] rounded-md px-3 py-1.5 transition-colors ${
              activeTab === "comparison"
                ? "bg-white font-semibold text-[#0d6e52] shadow-sm"
                : "text-[#69726d] hover:text-[#17211d]"
            }`}
          >
            Income vs Expenses
          </button>
        </div>
      </div>

      {distributionData.length === 0 ? (
        <div className="py-10 text-center text-[13px] text-[#858e87]">
          No active funds available to graph.
        </div>
      ) : activeTab === "distribution" ? (
        /* Allocation Distribution View - Fixed layout with NO layout thrashing */
        <div className="mt-4 grid items-start gap-5 lg:grid-cols-12">
          {/* Left Column: Stack Bar + Fixed Height Metric Box */}
          <div className="lg:col-span-6 flex flex-col gap-3.5">
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-[11.5px] sm:text-[12px] font-medium uppercase tracking-wider text-[#737c75]">
                  Total Capital in Reserves
                </span>
                <span className="text-[18px] sm:text-[20px] font-bold text-[#0d6e52]">
                  {formatAmount(totalAvailable)}
                </span>
              </div>

              {/* Progress Stack Bar */}
              <div className="mt-2 flex h-4 sm:h-4.5 w-full overflow-hidden rounded-full bg-[#eeebe2] p-0.5 shadow-inner">
                {totalAvailable === 0 ? (
                  <div className="h-full w-full rounded-full bg-[#d6d4c7]" title="Zero available balance" />
                ) : (
                  distributionData.map((item, idx) => (
                    item.percentage > 0 ? (
                      <div
                        key={item.id}
                        onClick={() => setSelectedIndex(idx)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: item.color,
                        }}
                        className={`h-full transition-opacity cursor-pointer first:rounded-l-full last:rounded-r-full ${
                          selectedIndex === idx ? "opacity-100 ring-2 ring-white" : "opacity-90 hover:opacity-100"
                        }`}
                        title={`${item.name}: ${formatAmount(item.amount)} (${item.percentage.toFixed(1)}%)`}
                      />
                    ) : null
                  ))
                )}
              </div>
            </div>

            {/* Metric highlight box - FIXED height to eliminate screen vibration */}
            <div className="h-[78px] rounded-lg border border-[#e8e6dc] bg-[#faf9f3] p-3 sm:p-3.5 flex flex-col justify-center overflow-hidden">
              {activeFundItem ? (
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: activeFundItem.color }}
                    />
                    <span className="font-semibold text-[#17211d] text-[13.5px] sm:text-[14px] truncate">
                      {activeFundItem.name}
                    </span>
                    <span className="ml-auto font-bold text-[#0d6e52] text-[14.5px] sm:text-[15px] shrink-0">
                      {formatAmount(activeFundItem.amount)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11.5px] sm:text-[12px] text-[#69726d] truncate">
                    Represents <strong className="text-[#17211d]">{activeFundItem.percentage.toFixed(1)}%</strong> of total mosque reserve capital.
                  </p>
                </div>
              ) : (
                <p className="text-[12px] text-[#69726d]">
                  Select or tap any fund to view reserve allocation share.
                </p>
              )}
            </div>
          </div>

          {/* Right Column: Clickable/Tappable Fund Items - Zero Gap Glitch */}
          <div className="lg:col-span-6">
            <div className="flex flex-col gap-2">
              {distributionData.map((item, idx) => {
                const isSelected = selectedIndex === idx || (selectedIndex === null && idx === 0);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedIndex(idx)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center justify-between rounded-lg border p-2.5 sm:p-3 text-[13px] text-left transition-colors cursor-pointer select-none ${
                      isSelected
                        ? "border-[#0d6e52] bg-[#f0f7f3] shadow-xs"
                        : "border-[#eceae0] bg-white hover:border-[#d2cfbe] hover:bg-[#faf9f5]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span
                        className="h-3.5 w-3.5 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-medium text-[#17211d] truncate">{item.name}</span>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="rounded bg-[#ece9de] px-2 py-0.5 text-[11px] font-semibold text-[#525954]">
                        {item.percentage.toFixed(1)}%
                      </span>
                      <span className="font-semibold text-[#0d6e52] text-[13px] sm:text-[13.5px]">
                        {formatAmount(item.amount)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Comparative Bar Graph View (SVG) - Mobile Responsive with Horizontal Scroll */
        <div className="mt-4 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11.5px] sm:text-[12px] text-[#69726d]">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="h-3 w-3 rounded-xs bg-[#0d6e52]" /> Income
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="h-3 w-3 rounded-xs bg-[#be123c]" /> Expenses
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="h-3 w-3 rounded-xs bg-[#1f669e]" /> Balance
              </span>
            </div>
            <span className="text-[11px] text-[#8e9690]">Scale Max: {formatCompactAmount(maxComparisonVal)}</span>
          </div>

          {/* Responsive SVG Chart with smooth touch drag */}
          <div className="w-full overflow-x-auto rounded-lg border border-[#eceae0] bg-[#faf9f4] p-2 sm:p-3">
            <svg
              viewBox={`0 0 680 ${Math.max(140, distributionData.length * 52 + 25)}`}
              className="w-full h-auto min-w-[480px]"
            >
              {/* Vertical Gridlines */}
              {[0, 0.25, 0.5, 0.75, 1].map((step) => {
                const xPos = 120 + step * 530;
                return (
                  <g key={step}>
                    <line
                      x1={xPos}
                      x2={xPos}
                      y1={8}
                      y2={distributionData.length * 52 + 8}
                      stroke="#eceae0"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                    />
                    <text
                      x={xPos}
                      y={distributionData.length * 52 + 20}
                      textAnchor="middle"
                      className="fill-[#8b938d] text-[10px] tabular-nums"
                    >
                      {formatCompactAmount(step * maxComparisonVal)}
                    </text>
                  </g>
                );
              })}

              {/* Fund Rows */}
              {distributionData.map((item, idx) => {
                const yBase = idx * 52 + 10;
                const incomeW = Math.max(2, (item.income / maxComparisonVal) * 530);
                const expenseW = Math.max(2, (item.expenses / maxComparisonVal) * 530);
                const balanceW = Math.max(2, (item.amount / maxComparisonVal) * 530);

                return (
                  <g key={item.id}>
                    {/* Fund Name */}
                    <text
                      x={110}
                      y={yBase + 20}
                      textAnchor="end"
                      className="fill-[#17211d] text-[11.5px] font-semibold"
                    >
                      {item.name}
                    </text>

                    {/* Income Bar */}
                    <rect
                      x={120}
                      y={yBase}
                      width={incomeW}
                      height={8}
                      rx={2}
                      fill="#0d6e52"
                    >
                      <title>{`${item.name} Income: ${formatAmount(item.income)}`}</title>
                    </rect>

                    {/* Expense Bar */}
                    <rect
                      x={120}
                      y={yBase + 11}
                      width={expenseW}
                      height={8}
                      rx={2}
                      fill="#be123c"
                    >
                      <title>{`${item.name} Expenses: ${formatAmount(item.expenses)}`}</title>
                    </rect>

                    {/* Balance Bar */}
                    <rect
                      x={120}
                      y={yBase + 22}
                      width={balanceW}
                      height={8}
                      rx={2}
                      fill="#1f669e"
                    >
                      <title>{`${item.name} Balance: ${formatAmount(item.amount)}`}</title>
                    </rect>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
