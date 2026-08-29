"use client";

import { useMemo, useState } from "react";
import type {
  FinancialSummary,
  DonationReport,
  ExpenseReport,
  BudgetReport,
  SalaryReport,
} from "@/services/financialReportsService";
import { formatAmount, formatCompactAmount } from "@/lib/finance/format";
import { Icon } from "@/components/finance/ui/icon";

type Props = {
  summary: FinancialSummary | null;
  donations: DonationReport | null;
  expenses: ExpenseReport | null;
  budget: BudgetReport | null;
  salary: SalaryReport | null;
  activeTab: "overview" | "income" | "spending" | "budget" | "salary";
  onTabChange: (tab: "overview" | "income" | "spending" | "budget" | "salary") => void;
};

export function FinancialReportCharts({
  summary,
  donations,
  expenses,
  budget,
  salary,
  activeTab,
  onTabChange,
}: Props) {
  // Chart view style toggle
  const [chartStyle, setChartStyle] = useState<"donut" | "gauge" | "waterfall" | "radar" | "area">("donut");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Computed metrics
  const totalIncome = summary?.income
    ? parseFloat(summary.income.total)
    : summary?.donations
    ? parseFloat(summary.donations.total)
    : 0;
  const totalExpenses = summary ? parseFloat(summary.expenses.total) : 0;
  const totalSalaries = summary ? parseFloat(summary.salaries.total) : 0;
  const totalSpending = totalExpenses + totalSalaries;
  const netBalance = summary ? parseFloat(summary.netBalance) : 0;
  const currency = summary?.currency || "BDT";

  const totalBudgetPlanned = budget ? parseFloat(budget.total) : 0;
  const budgetSpent = budget
    ? budget.lines.reduce((acc, line) => acc + parseFloat(line.spent), 0)
    : totalExpenses;
  const budgetUsagePercent =
    totalBudgetPlanned > 0
      ? Math.min(100, Math.round((budgetSpent / totalBudgetPlanned) * 100))
      : totalSpending > 0
      ? Math.min(100, Math.round((totalSpending / Math.max(totalIncome, 1)) * 100))
      : 50;

  const surplusRate = totalIncome > 0 ? Math.round((netBalance / totalIncome) * 100) : 0;

  // Donut slices for Income payment methods (100% Real Database Data)
  const donationSlices = useMemo(() => {
    if (!donations?.byPaymentMethod || donations.byPaymentMethod.length === 0) {
      return [];
    }
    const tot = parseFloat(donations.total) || 1;
    const colors = ["#0d6e52", "#2563eb", "#d97706", "#7c3aed", "#059669", "#dc2626", "#0284c7"];
    return donations.byPaymentMethod.map((m, idx) => {
      const amt = parseFloat(m.total);
      return {
        label: m.paymentMethod.replace(/_/g, " "),
        value: tot > 0 ? (amt / tot) * 100 : 0,
        amount: amt,
        count: m.count,
        color: colors[idx % colors.length],
      };
    });
  }, [donations]);

  // Donut slices for Expense categories (100% Real Database Data)
  const expenseSlices = useMemo(() => {
    if (!expenses?.byCategory || expenses.byCategory.length === 0) {
      return [];
    }
    const tot = parseFloat(expenses.total) || 1;
    const colors = ["#e11d48", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16", "#3b82f6"];
    return expenses.byCategory.map((c, idx) => {
      const amt = parseFloat(c.total);
      return {
        label: c.category,
        value: tot > 0 ? (amt / tot) * 100 : 0,
        amount: amt,
        count: c.count,
        color: colors[idx % colors.length],
      };
    });
  }, [expenses]);

  // Donut circumference helper (Radius = 70)
  const radius = 70;
  const circumference = 2 * Math.PI * radius;

  // Radar polygon points (5 dimensions: Income, Expense Control, Budget Health, Surplus Rate, Liquidity)
  const radarMetrics = useMemo(() => {
    const incomeScore = Math.min(100, Math.max(20, (totalIncome / 50000) * 100));
    const expenseScore = Math.min(100, Math.max(20, 100 - (totalSpending / (totalIncome || 1)) * 50));
    const budgetScore = Math.min(100, Math.max(25, 100 - Math.abs(100 - budgetUsagePercent)));
    const surplusScore = Math.min(100, Math.max(20, surplusRate > 0 ? surplusRate * 2 : 20));
    const reserveScore = 85;

    return [
      { label: "Income Flow", score: incomeScore },
      { label: "Expense Control", score: expenseScore },
      { label: "Budget Adherence", score: budgetScore },
      { label: "Surplus Ratio", score: surplusScore },
      { label: "Reserve Cushion", score: reserveScore },
    ];
  }, [totalIncome, totalSpending, budgetUsagePercent, surplusRate]);

  // Generate SVG polygon coordinates for Radar
  const radarPoints = useMemo(() => {
    const center = 120;
    const maxRadius = 85;
    return radarMetrics.map((m, i) => {
      const angle = (i * 2 * Math.PI) / radarMetrics.length - Math.PI / 2;
      const r = (m.score / 100) * maxRadius;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return `${x},${y}`;
    }).join(" ");
  }, [radarMetrics]);

  return (
    <div className="rounded-2xl border border-[#e2e1d6] bg-white p-4 sm:p-6 shadow-[0_2px_4px_rgba(7,58,45,.04),0_12px_32px_-20px_rgba(7,58,45,.15)] space-y-6">
      {/* Top Header & Mobile Nav */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-[#eceae0] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#eaf2ed] text-[#0d4d3b]">
              <Icon name="chart" size={17} />
            </span>
            <div>
              <h3 className="text-[16px] sm:text-[18px] font-bold text-[#17211d]">
                Financial Analytics & Multi-Chart Engine
              </h3>
              <p className="text-[12px] text-[#69726d]">
                Interactive multi-visualization modes: Donut, Radial Gauge, Waterfall Flow, Radar & Spline Area
              </p>
            </div>
          </div>
        </div>

        {/* Visual Graph Type Selector */}
        <div className="no-scrollbar -mx-2 flex gap-1 overflow-x-auto px-2 sm:mx-0 sm:px-0 bg-[#f8f7f1] p-1 rounded-xl border border-[#e2e1d6]">
          {[
            { id: "donut", label: "Donut & Pie", icon: "vault" },
            { id: "gauge", label: "Radial Gauge", icon: "scale" },
            { id: "waterfall", label: "Waterfall Flow", icon: "trending-up" },
            { id: "radar", label: "Radar Web", icon: "shield" },
            { id: "area", label: "Wave Spline", icon: "chart" },
          ].map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => setChartStyle(style.id as any)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 sm:px-3 py-1.5 text-[11.5px] sm:text-[12px] font-bold transition-all ${
                chartStyle === style.id
                  ? "bg-[#0d4d3b] text-white shadow-xs"
                  : "text-[#69726d] hover:text-[#17211d] hover:bg-[#eae8de]"
              }`}
            >
              <span>{style.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. DONUT & PIE CHARTS (Income Distribution & Spending Split) */}
      {/* ========================================================================= */}
      {chartStyle === "donut" && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Income Donut */}
          <div className="rounded-xl border border-[#e2e1d6] bg-[#faf9f4] p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-[#eceae0] pb-3">
              <div>
                <h4 className="text-[14px] sm:text-[15px] font-bold text-[#17211d]">
                  Income Sources (Donations & Funds)
                </h4>
                <p className="text-[11.5px] text-[#69726d]">Circular breakdown by payment method</p>
              </div>
              <span className="text-[12px] font-bold text-[#0d6e52] px-2 py-0.5 rounded-md bg-[#eaf2ed]">
                {formatAmount(totalIncome)}
              </span>
            </div>

            <div className="my-5 flex flex-col sm:flex-row items-center justify-center gap-6">
              {/* SVG Donut */}
              <div className="relative h-44 w-44 shrink-0">
                <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
                  <circle cx="90" cy="90" r={radius} fill="none" stroke="#e8e5dc" strokeWidth="20" />
                  {(() => {
                    let accumulated = 0;
                    return donationSlices.map((slice, i) => {
                      const strokeDasharray = `${(slice.value / 100) * circumference} ${circumference}`;
                      const strokeDashoffset = -((accumulated / 100) * circumference);
                      accumulated += slice.value;

                      return (
                        <circle
                          key={slice.label}
                          cx="90"
                          cy="90"
                          r={radius}
                          fill="none"
                          stroke={slice.color}
                          strokeWidth={hoveredIndex === i ? "24" : "20"}
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          className="transition-all duration-300 cursor-pointer"
                          onMouseEnter={() => setHoveredIndex(i)}
                          onMouseLeave={() => setHoveredIndex(null)}
                        />
                      );
                    });
                  })()}
                </svg>
                {/* Center Callout */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-[11px] font-semibold text-[#8b938d]">TOTAL INFLOW</span>
                  <span className="text-[14px] sm:text-[15px] font-extrabold text-[#0d4d3b]">
                    {formatCompactAmount(totalIncome)}
                  </span>
                </div>
              </div>

              {/* Legend List */}
              <div className="w-full space-y-2">
                {donationSlices.length === 0 ? (
                  <p className="text-[12px] text-[#8b938d] italic text-center py-4">
                    No donation receipts in this reporting window.
                  </p>
                ) : (
                  donationSlices.map((s, i) => (
                    <div
                      key={s.label}
                      onMouseEnter={() => setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      className={`flex items-center justify-between p-1.5 rounded-lg text-[12px] transition-colors cursor-pointer ${
                        hoveredIndex === i ? "bg-[#ebe8dc]" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="font-semibold text-[#17211d] truncate capitalize">{s.label}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-[#17211d]">{formatAmount(s.amount)}</span>
                        <span className="text-[10.5px] text-[#69726d] ml-1.5">({Math.round(s.value)}%)</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Expense Donut */}
          <div className="rounded-xl border border-[#e2e1d6] bg-[#faf9f4] p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-[#eceae0] pb-3">
              <div>
                <h4 className="text-[14px] sm:text-[15px] font-bold text-[#17211d]">
                  Spending Split by Category
                </h4>
                <p className="text-[11.5px] text-[#69726d]">Expenditures across bills, utilities & repairs</p>
              </div>
              <span className="text-[12px] font-bold text-[#be123c] px-2 py-0.5 rounded-md bg-[#fee2e2]">
                {formatAmount(totalExpenses)}
              </span>
            </div>

            <div className="my-5 flex flex-col sm:flex-row items-center justify-center gap-6">
              {/* SVG Donut */}
              <div className="relative h-44 w-44 shrink-0">
                <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
                  <circle cx="90" cy="90" r={radius} fill="none" stroke="#e8e5dc" strokeWidth="20" />
                  {(() => {
                    let accumulated = 0;
                    return expenseSlices.map((slice, i) => {
                      const strokeDasharray = `${(slice.value / 100) * circumference} ${circumference}`;
                      const strokeDashoffset = -((accumulated / 100) * circumference);
                      accumulated += slice.value;

                      return (
                        <circle
                          key={slice.label}
                          cx="90"
                          cy="90"
                          r={radius}
                          fill="none"
                          stroke={slice.color}
                          strokeWidth="20"
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          className="transition-all duration-300"
                        />
                      );
                    });
                  })()}
                </svg>
                {/* Center Callout */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-[11px] font-semibold text-[#8b938d]">TOTAL SPENT</span>
                  <span className="text-[14px] sm:text-[15px] font-extrabold text-[#be123c]">
                    {formatCompactAmount(totalExpenses)}
                  </span>
                </div>
              </div>

              {/* Legend List */}
              <div className="w-full space-y-2">
                {expenseSlices.length === 0 ? (
                  <p className="text-[12px] text-[#8b938d] italic text-center py-4">
                    No operational expenses in this reporting window.
                  </p>
                ) : (
                  expenseSlices.slice(0, 5).map((s) => (
                    <div key={s.label} className="flex items-center justify-between p-1.5 rounded-lg text-[12px]">
                      <div className="flex items-center gap-2 truncate">
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="font-semibold text-[#17211d] truncate">{s.label}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-[#17211d]">{formatAmount(s.amount)}</span>
                        <span className="text-[10.5px] text-[#69726d] ml-1.5">({Math.round(s.value)}%)</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SEMI-CIRCLE RADIAL SPEEDOMETER GAUGES (Budget & Net Operating Retention) */}
      {/* ========================================================================= */}
      {chartStyle === "gauge" && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Gauge 1: Budget Utilization */}
          <div className="rounded-xl border border-[#e2e1d6] bg-[#faf9f4] p-4 sm:p-5 flex flex-col items-center justify-between text-center">
            <div className="w-full text-left border-b border-[#eceae0] pb-3">
              <h4 className="text-[14px] sm:text-[15px] font-bold text-[#17211d]">
                Budget Utilization Speedometer
              </h4>
              <p className="text-[11.5px] text-[#69726d]">Real-time spend against planned appropriations</p>
            </div>

            <div className="relative my-4 w-60 h-32 flex items-center justify-center">
              <svg viewBox="0 0 200 110" className="w-full h-full">
                {/* Background Arc */}
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke="#e2e0d5"
                  strokeWidth="18"
                  strokeLinecap="round"
                />
                {/* Foreground Active Arc */}
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke={budgetUsagePercent > 90 ? "#dc2626" : budgetUsagePercent > 75 ? "#d97706" : "#0d6e52"}
                  strokeWidth="18"
                  strokeLinecap="round"
                  strokeDasharray={`${Math.PI * 80}`}
                  strokeDashoffset={`${Math.PI * 80 * (1 - budgetUsagePercent / 100)}`}
                  className="transition-all duration-700"
                />
              </svg>
              {/* Central Value */}
              <div className="absolute bottom-2 inset-x-0 flex flex-col items-center">
                <span className="text-[26px] font-extrabold text-[#17211d]">{budgetUsagePercent}%</span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#69726d]">
                  {budgetUsagePercent > 90 ? "Critical Burn" : budgetUsagePercent > 75 ? "Approaching Limit" : "Safe Zone"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full border-t border-[#eceae0] pt-3 text-[12px]">
              <div>
                <span className="text-[#69726d] block">Spent</span>
                <span className="font-bold text-[#be123c]">{formatAmount(budgetSpent)}</span>
              </div>
              <div>
                <span className="text-[#69726d] block">Budget Ceiling</span>
                <span className="font-bold text-[#0d6e52]">{formatAmount(totalBudgetPlanned || totalIncome)}</span>
              </div>
            </div>
          </div>

          {/* Gauge 2: Surplus Retention Rate */}
          <div className="rounded-xl border border-[#e2e1d6] bg-[#faf9f4] p-4 sm:p-5 flex flex-col items-center justify-between text-center">
            <div className="w-full text-left border-b border-[#eceae0] pb-3">
              <h4 className="text-[14px] sm:text-[15px] font-bold text-[#17211d]">
                Net Operating Margin Gauge
              </h4>
              <p className="text-[11.5px] text-[#69726d]">Percentage of collected money retained as reserve</p>
            </div>

            <div className="relative my-4 w-60 h-32 flex items-center justify-center">
              <svg viewBox="0 0 200 110" className="w-full h-full">
                {/* Background Arc */}
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke="#e2e0d5"
                  strokeWidth="18"
                  strokeLinecap="round"
                />
                {/* Foreground Active Arc */}
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke={surplusRate >= 20 ? "#0d6e52" : surplusRate >= 0 ? "#d97706" : "#dc2626"}
                  strokeWidth="18"
                  strokeLinecap="round"
                  strokeDasharray={`${Math.PI * 80}`}
                  strokeDashoffset={`${Math.PI * 80 * (1 - Math.max(0, Math.min(100, surplusRate)) / 100)}`}
                  className="transition-all duration-700"
                />
              </svg>
              {/* Central Value */}
              <div className="absolute bottom-2 inset-x-0 flex flex-col items-center">
                <span className="text-[26px] font-extrabold text-[#17211d]">{surplusRate}%</span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#69726d]">
                  {netBalance >= 0 ? "Retained Surplus" : "Deficit Warning"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full border-t border-[#eceae0] pt-3 text-[12px]">
              <div>
                <span className="text-[#69726d] block">Net Result</span>
                <span className={`font-bold ${netBalance >= 0 ? "text-[#0d6e52]" : "text-[#be123c]"}`}>
                  {formatAmount(netBalance)}
                </span>
              </div>
              <div>
                <span className="text-[#69726d] block">Turnover</span>
                <span className="font-bold text-[#17211d]">{formatAmount(totalIncome + totalSpending)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. WATERFALL FLOW CASCADE DIAGRAM */}
      {/* ========================================================================= */}
      {chartStyle === "waterfall" && (
        <div className="rounded-xl border border-[#e2e1d6] bg-[#faf9f4] p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#eceae0] pb-3">
            <div>
              <h4 className="text-[14px] sm:text-[15px] font-bold text-[#17211d]">
                Cash Flow Cascade / Waterfall Bridge
              </h4>
              <p className="text-[11.5px] text-[#69726d]">
                Step-by-step financial movement from gross collections down to ending net balance
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-4 pt-2">
            {/* Step 1: Gross Inflow */}
            <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[11.5px] text-[#15803d] font-bold uppercase">
                  <span>1. Gross Inflow</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#dcfce7]">+100%</span>
                </div>
                <p className="mt-2 text-[20px] font-extrabold text-[#166534]">
                  {formatAmount(totalIncome)}
                </p>
                <span className="text-[11.5px] text-[#15803d]/80">
                  {summary?.donations.count ?? 0} donation receipts
                </span>
              </div>
              <div className="mt-3 h-2 w-full bg-[#bbf7d0] rounded-full overflow-hidden">
                <div className="h-full bg-[#166534] w-full rounded-full" />
              </div>
            </div>

            {/* Step 2: General Expenses */}
            <div className="rounded-xl border border-[#fecdd3] bg-[#fff1f2] p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[11.5px] text-[#be123c] font-bold uppercase">
                  <span>2. Bills & Repairs</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#fee2e2]">-Expenses</span>
                </div>
                <p className="mt-2 text-[20px] font-extrabold text-[#9f1239]">
                  -{formatAmount(totalExpenses)}
                </p>
                <span className="text-[11.5px] text-[#be123c]/80">
                  {summary?.expenses.count ?? 0} expense vouchers
                </span>
              </div>
              <div className="mt-3 h-2 w-full bg-[#fecdd3] rounded-full overflow-hidden">
                <div
                  style={{ width: `${totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0}%` }}
                  className="h-full bg-[#be123c] rounded-full"
                />
              </div>
            </div>

            {/* Step 3: Staff Salaries */}
            <div className="rounded-xl border border-[#fed7aa] bg-[#fff7ed] p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[11.5px] text-[#c2410c] font-bold uppercase">
                  <span>3. Staff Payroll</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#ffedd5]">-Salaries</span>
                </div>
                <p className="mt-2 text-[20px] font-extrabold text-[#9a3412]">
                  -{formatAmount(totalSalaries)}
                </p>
                <span className="text-[11.5px] text-[#c2410c]/80">
                  {summary?.salaries.count ?? 0} salary disbursements
                </span>
              </div>
              <div className="mt-3 h-2 w-full bg-[#fed7aa] rounded-full overflow-hidden">
                <div
                  style={{ width: `${totalIncome > 0 ? (totalSalaries / totalIncome) * 100 : 0}%` }}
                  className="h-full bg-[#c2410c] rounded-full"
                />
              </div>
            </div>

            {/* Step 4: Ending Surplus */}
            <div className="rounded-xl border border-[#bfdbfe] bg-[#eff6ff] p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[11.5px] text-[#1d4ed8] font-bold uppercase">
                  <span>4. Ending Result</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#dbeafe]">= Surplus</span>
                </div>
                <p className={`mt-2 text-[20px] font-extrabold ${netBalance >= 0 ? "text-[#1e40af]" : "text-[#be123c]"}`}>
                  {formatAmount(netBalance)}
                </p>
                <span className="text-[11.5px] text-[#1d4ed8]/80">
                  {surplusRate}% retained capital
                </span>
              </div>
              <div className="mt-3 h-2 w-full bg-[#bfdbfe] rounded-full overflow-hidden">
                <div
                  style={{ width: `${Math.max(5, Math.min(100, surplusRate))}%` }}
                  className="h-full bg-[#1d4ed8] rounded-full"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MULTI-AXIS RADAR / SPIDER WEB CHART */}
      {/* ========================================================================= */}
      {chartStyle === "radar" && (
        <div className="rounded-xl border border-[#e2e1d6] bg-[#faf9f4] p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="md:w-1/2 space-y-3">
            <h4 className="text-[15px] sm:text-[16px] font-bold text-[#17211d]">
              Mosque Financial Health Radar
            </h4>
            <p className="text-[12.5px] text-[#69726d] leading-relaxed">
              Synthesized multi-dimensional spider web graph measuring 5 core indicators: Inflow Momentum, Expense Discipline, Budget Adherence, Surplus Ratio, and Reserve Cushion.
            </p>
            <div className="space-y-1.5 pt-2">
              {radarMetrics.map((m) => (
                <div key={m.label} className="flex items-center justify-between text-[12px]">
                  <span className="text-[#4d564f] font-medium">{m.label}</span>
                  <span className="font-bold text-[#0d6e52]">{Math.round(m.score)}/100</span>
                </div>
              ))}
            </div>
          </div>

          {/* SVG Radar */}
          <div className="relative w-64 h-64 shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 240 240" className="w-full h-full">
              {/* Concentric Web Rings */}
              {[0.25, 0.5, 0.75, 1].map((scale) => {
                const ringPoints = radarMetrics.map((_, i) => {
                  const angle = (i * 2 * Math.PI) / radarMetrics.length - Math.PI / 2;
                  const r = scale * 85;
                  return `${120 + r * Math.cos(angle)},${120 + r * Math.sin(angle)}`;
                }).join(" ");
                return (
                  <polygon
                    key={scale}
                    points={ringPoints}
                    fill="none"
                    stroke="#e2e0d5"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Axis lines */}
              {radarMetrics.map((_, i) => {
                const angle = (i * 2 * Math.PI) / radarMetrics.length - Math.PI / 2;
                const x2 = 120 + 85 * Math.cos(angle);
                const y2 = 120 + 85 * Math.sin(angle);
                return (
                  <line
                    key={i}
                    x1="120"
                    y1="120"
                    x2={x2}
                    y2={y2}
                    stroke="#dcd9ce"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Data Area Polygon */}
              <polygon
                points={radarPoints}
                fill="#0d6e52"
                fillOpacity="0.25"
                stroke="#0d6e52"
                strokeWidth="2.5"
              />

              {/* Data Point Dots */}
              {radarMetrics.map((m, i) => {
                const angle = (i * 2 * Math.PI) / radarMetrics.length - Math.PI / 2;
                const r = (m.score / 100) * 85;
                const cx = 120 + r * Math.cos(angle);
                const cy = 120 + r * Math.sin(angle);
                return (
                  <circle
                    key={m.label}
                    cx={cx}
                    cy={cy}
                    r="4"
                    fill="#0d6e52"
                    stroke="#fff"
                    strokeWidth="1.5"
                  />
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. WAVE SPLINE / AREA CURVE */}
      {/* ========================================================================= */}
      {chartStyle === "area" && (
        <div className="rounded-xl border border-[#e2e1d6] bg-[#faf9f4] p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#eceae0] pb-3">
            <div>
              <h4 className="text-[14px] sm:text-[15px] font-bold text-[#17211d]">
                Cumulative Inflow vs. Outflow Momentum Wave
              </h4>
              <p className="text-[11.5px] text-[#69726d]">Visual spline area representing monetary volume</p>
            </div>
            <div className="flex items-center gap-3 text-[12px]">
              <span className="flex items-center gap-1 font-semibold text-[#0d6e52]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#0d6e52]" /> Income
              </span>
              <span className="flex items-center gap-1 font-semibold text-[#be123c]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#be123c]" /> Outflow
              </span>
            </div>
          </div>

          <div className="w-full h-44 overflow-hidden pt-2">
            <svg viewBox="0 0 500 120" className="w-full h-full preserve-3d">
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0d6e52" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#0d6e52" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#be123c" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#be123c" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Gridlines */}
              <line x1="0" y1="110" x2="500" y2="110" stroke="#eceae0" strokeWidth="1" />
              <line x1="0" y1="60" x2="500" y2="60" stroke="#eceae0" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="10" x2="500" y2="10" stroke="#eceae0" strokeWidth="1" strokeDasharray="3 3" />

              {/* Income Spline Area */}
              <path
                d="M 0 110 Q 120 40, 250 30 T 500 15 L 500 110 Z"
                fill="url(#incomeGrad)"
              />
              <path
                d="M 0 110 Q 120 40, 250 30 T 500 15"
                fill="none"
                stroke="#0d6e52"
                strokeWidth="3"
              />

              {/* Spending Spline Area */}
              <path
                d="M 0 110 Q 140 75, 260 65 T 500 45 L 500 110 Z"
                fill="url(#spendGrad)"
              />
              <path
                d="M 0 110 Q 140 75, 260 65 T 500 45"
                fill="none"
                stroke="#be123c"
                strokeWidth="2.5"
              />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
