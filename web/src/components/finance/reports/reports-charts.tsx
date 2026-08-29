"use client";

import { useMemo } from "react";
import type {
  FinancialSummary,
  DonationReport,
  ExpenseReport,
  BudgetReport,
  SalaryReport,
} from "@/services/financialReportsService";
import { formatAmount } from "@/lib/finance/format";
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
  // Calculations for overview flow chart
  const totalIncome = summary?.income
    ? parseFloat(summary.income.total)
    : summary?.donations
    ? parseFloat(summary.donations.total)
    : 0;
  const totalExpenses = summary ? parseFloat(summary.expenses.total) : 0;
  const totalSalaries = summary ? parseFloat(summary.salaries.total) : 0;
  const totalSpending = totalExpenses + totalSalaries;
  const netBalance = summary ? parseFloat(summary.netBalance) : 0;
  const maxFlow = Math.max(totalIncome, totalSpending, 1000) * 1.15;
  const surplusRate = totalIncome > 0 ? Math.round((netBalance / totalIncome) * 100) : 0;

  // Sorted Expense categories for Spending chart
  const topExpenseCategories = useMemo(() => {
    if (!expenses?.byCategory) return [];
    return [...expenses.byCategory]
      .sort((a, b) => parseFloat(b.total) - parseFloat(a.total))
      .slice(0, 6);
  }, [expenses]);

  const maxExpenseCategory = useMemo(() => {
    if (!topExpenseCategories.length) return 1000;
    return Math.max(...topExpenseCategories.map((c) => parseFloat(c.total)), 1000);
  }, [topExpenseCategories]);

  // Donation payment methods
  const donationMethods = useMemo(() => {
    if (!donations?.byPaymentMethod) return [];
    return [...donations.byPaymentMethod].sort((a, b) => parseFloat(b.total) - parseFloat(a.total));
  }, [donations]);

  const totalDonationAmount = useMemo(() => {
    return donations ? parseFloat(donations.total) : 0;
  }, [donations]);

  return (
    <div className="rounded-2xl border border-[#e2e1d6] bg-white p-4 sm:p-6 shadow-[0_2px_4px_rgba(7,58,45,.04),0_12px_32px_-20px_rgba(7,58,45,.15)]">
      {/* Mobile-Friendly Navigation Pills */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#eceae0] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-[#eaf2ed] text-[#0d4d3b]">
              <Icon name="chart" size={16} />
            </span>
            <h3 className="text-[16px] sm:text-[17px] font-bold text-[#17211d]">
              Live Financial Visualizer & Graphs
            </h3>
          </div>
          <p className="mt-0.5 text-[12px] sm:text-[13px] text-[#69726d]">
            Visual breakdown computed directly from verified database ledger entries
          </p>
        </div>

        {/* Scrollable Tabs for Mobile & Desktop */}
        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
          {(
            [
              { id: "overview", label: "Cash Flow", icon: "scale" },
              { id: "income", label: "Income", icon: "gift" },
              { id: "spending", label: "Spending", icon: "receipt-minus" },
              { id: "budget", label: "Budgets", icon: "chart" },
              { id: "salary", label: "Payroll", icon: "badge" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-[12px] sm:text-[12.5px] font-semibold transition-all ${
                activeTab === tab.id
                  ? "bg-[#0d4d3b] text-white shadow-sm"
                  : "bg-[#f4f3ec] text-[#4d564f] hover:bg-[#e8e6dc] hover:text-[#17211d]"
              }`}
            >
              <Icon name={tab.icon as any} size={14} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Overview Flow */}
      {activeTab === "overview" && (
        <div className="mt-5 space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[#d9e8de] bg-[#f2f8f4] p-3.5">
              <span className="text-[11.5px] font-semibold text-[#0d6e52] uppercase tracking-wider">
                Total Inflow
              </span>
              <p className="mt-1 text-[18px] sm:text-[20px] font-extrabold text-[#0d4d3b]">
                {formatAmount(totalIncome)}
              </p>
              <span className="mt-1 block text-[11px] text-[#557e67]">
                {summary?.donations.count ?? 0} receipts
              </span>
            </div>

            <div className="rounded-xl border border-[#fed7aa] bg-[#fff7ed] p-3.5">
              <span className="text-[11.5px] font-semibold text-[#c2410c] uppercase tracking-wider">
                Total Outflow
              </span>
              <p className="mt-1 text-[18px] sm:text-[20px] font-extrabold text-[#9a3412]">
                {formatAmount(totalSpending)}
              </p>
              <span className="mt-1 block text-[11px] text-[#9a3412]/80">
                {(summary?.expenses.count ?? 0) + (summary?.salaries.count ?? 0)} vouchers paid
              </span>
            </div>

            <div
              className={`rounded-xl border p-3.5 ${
                netBalance >= 0
                  ? "border-[#bbf7d0] bg-[#f0fdf4]"
                  : "border-[#fecdd3] bg-[#fff1f2]"
              }`}
            >
              <span
                className={`text-[11.5px] font-semibold uppercase tracking-wider ${
                  netBalance >= 0 ? "text-[#15803d]" : "text-[#be123c]"
                }`}
              >
                {netBalance >= 0 ? "Net Operating Surplus" : "Operating Deficit"}
              </span>
              <p
                className={`mt-1 text-[18px] sm:text-[20px] font-extrabold ${
                  netBalance >= 0 ? "text-[#166534]" : "text-[#9f1239]"
                }`}
              >
                {formatAmount(netBalance)}
              </p>
              <span
                className={`mt-1 block text-[11px] font-semibold ${
                  netBalance >= 0 ? "text-[#15803d]" : "text-[#be123c]"
                }`}
              >
                {surplusRate}% retention rate
              </span>
            </div>
          </div>

          {/* Comparative Flow Bars */}
          <div className="rounded-xl border border-[#eceae0] bg-[#faf9f4] p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[13px] sm:text-[14px] font-bold text-[#17211d]">
                Comparative Flow Volume
              </h4>
              <span className="text-[11px] font-medium text-[#69726d]">
                Relative ratio based on total turnover
              </span>
            </div>

            <div className="space-y-4">
              {/* Inflow Bar */}
              <div>
                <div className="flex items-center justify-between text-[12.5px] mb-1.5">
                  <span className="font-semibold text-[#17211d] flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#0d6e52]"></span>
                    Money In (Donations & Funds)
                  </span>
                  <span className="font-bold text-[#0d6e52]">{formatAmount(totalIncome)}</span>
                </div>
                <div className="h-4 w-full bg-[#e7e5dc] rounded-full overflow-hidden p-0.5">
                  <div
                    style={{ width: `${Math.min(100, Math.max(4, (totalIncome / maxFlow) * 100))}%` }}
                    className="h-full bg-gradient-to-r from-[#0d6e52] to-[#10b981] rounded-full transition-all duration-500 shadow-xs"
                  />
                </div>
              </div>

              {/* Outflow Bar */}
              <div>
                <div className="flex items-center justify-between text-[12.5px] mb-1.5">
                  <span className="font-semibold text-[#17211d] flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#be123c]"></span>
                    Money Out (Bills & Payroll)
                  </span>
                  <span className="font-bold text-[#be123c]">{formatAmount(totalSpending)}</span>
                </div>
                <div className="h-4 w-full bg-[#e7e5dc] rounded-full overflow-hidden p-0.5">
                  <div
                    style={{ width: `${Math.min(100, Math.max(4, (totalSpending / maxFlow) * 100))}%` }}
                    className="h-full bg-gradient-to-r from-[#be123c] to-[#f43f5e] rounded-full transition-all duration-500 shadow-xs"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#eceae0] flex flex-wrap items-center justify-between text-[11.5px] text-[#69726d] gap-2">
              <span className="flex items-center gap-1">
                <Icon name="shield" size={13} />
                Calculated directly from confirmed ledger entries
              </span>
              <span className="font-semibold text-[#17211d]">
                Outflow split: {totalSpending > 0 ? Math.round((totalExpenses / totalSpending) * 100) : 0}% Expenses ·{" "}
                {totalSpending > 0 ? Math.round((totalSalaries / totalSpending) * 100) : 0}% Payroll
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Income Distribution */}
      {activeTab === "income" && (
        <div className="mt-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-[14px] sm:text-[15px] font-bold text-[#17211d]">
                Donations Received by Payment Method
              </h4>
              <p className="text-[12px] text-[#69726d]">
                Collection breakdown across digital gateways, cash boxes, and direct transfers
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-[#69726d]">Total Collected</span>
              <p className="text-[16px] font-extrabold text-[#0d6e52]">
                {formatAmount(totalDonationAmount)}
              </p>
            </div>
          </div>

          {donationMethods.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#dcd9ce] p-6 text-center text-[13px] text-[#8b938d]">
              No donation receipts recorded for this period.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {donationMethods.map((m, idx) => {
                const amount = parseFloat(m.total);
                const pct = totalDonationAmount > 0 ? Math.round((amount / totalDonationAmount) * 100) : 0;
                const colors = [
                  { bg: "bg-[#0d6e52]", badge: "text-[#0d6e52] bg-[#f0fdf4]" },
                  { bg: "bg-[#2563eb]", badge: "text-[#2563eb] bg-[#eff6ff]" },
                  { bg: "bg-[#d97706]", badge: "text-[#d97706] bg-[#fffbeb]" },
                  { bg: "bg-[#7c3aed]", badge: "text-[#7c3aed] bg-[#f5f3ff]" },
                  { bg: "bg-[#059669]", badge: "text-[#059669] bg-[#ecfdf5]" },
                ];
                const c = colors[idx % colors.length];

                return (
                  <div
                    key={m.paymentMethod}
                    className="rounded-xl border border-[#e5e3d8] bg-[#faf9f4] p-3.5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-[13px] text-[#17211d] capitalize">
                          {m.paymentMethod.replace(/_/g, " ")}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${c.badge}`}>
                          {pct}%
                        </span>
                      </div>
                      <p className="text-[17px] font-extrabold text-[#17211d]">
                        {formatAmount(amount)}
                      </p>
                      <span className="text-[11.5px] text-[#69726d]">
                        {m.count} verified receipts
                      </span>
                    </div>

                    <div className="mt-3 h-2 w-full bg-[#e8e5dc] rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className={`h-full ${c.bg} rounded-full transition-all duration-300`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Spending Breakdown */}
      {activeTab === "spending" && (
        <div className="mt-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-[14px] sm:text-[15px] font-bold text-[#17211d]">
                Spending by Operational Category
              </h4>
              <p className="text-[12px] text-[#69726d]">
                Distribution of expenses across maintenance, utilities, events, and supplies
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-[#69726d]">Total Expenses</span>
              <p className="text-[16px] font-extrabold text-[#be123c]">
                {formatAmount(totalExpenses)}
              </p>
            </div>
          </div>

          {topExpenseCategories.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#dcd9ce] p-6 text-center text-[13px] text-[#8b938d]">
              No expenses recorded for this reporting period.
            </div>
          ) : (
            <div className="space-y-3">
              {topExpenseCategories.map((c) => {
                const amt = parseFloat(c.total);
                const pctOfTotal = totalExpenses > 0 ? Math.round((amt / totalExpenses) * 100) : 0;
                const barWidth = Math.min(100, Math.max(5, (amt / maxExpenseCategory) * 100));

                return (
                  <div
                    key={c.category}
                    className="rounded-xl border border-[#e5e3d8] bg-[#faf9f4] p-3 sm:p-3.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[13px] mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#17211d]">{c.category}</span>
                        <span className="text-[11px] text-[#8b938d]">({c.count} items)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#be123c]">{formatAmount(amt)}</span>
                        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-[#fee2e2] text-[#991b1b]">
                          {pctOfTotal}%
                        </span>
                      </div>
                    </div>

                    <div className="h-2.5 w-full bg-[#eceae0] rounded-full overflow-hidden">
                      <div
                        style={{ width: `${barWidth}%` }}
                        className="h-full bg-gradient-to-r from-[#e11d48] to-[#f43f5e] rounded-full transition-all duration-300"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Budget vs Actual */}
      {activeTab === "budget" && (
        <div className="mt-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-[14px] sm:text-[15px] font-bold text-[#17211d]">
                Budget Plans vs. Actual Utilization
              </h4>
              <p className="text-[12px] text-[#69726d]">
                Monitor spending against approved allocations and headroom remaining
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-[#69726d]">Total Active Budget</span>
              <p className="text-[16px] font-extrabold text-[#0d4d3b]">
                {budget ? formatAmount(parseFloat(budget.total)) : "৳0"}
              </p>
            </div>
          </div>

          {!budget?.lines || budget.lines.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#dcd9ce] p-6 text-center text-[13px] text-[#8b938d]">
              No active budget lines configured for this period.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {budget.lines.map((line) => {
                const planned = parseFloat(line.planned);
                const spent = parseFloat(line.spent);
                const remaining = parseFloat(line.remaining);
                const usedPct = planned > 0 ? Math.round((spent / planned) * 100) : 100;
                const isOver = remaining < 0;

                return (
                  <div
                    key={line.category}
                    className="rounded-xl border border-[#e5e3d8] bg-[#faf9f4] p-3.5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-[13.5px] text-[#17211d]">{line.category}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            isOver
                              ? "bg-[#fee2e2] text-[#991b1b]"
                              : usedPct > 80
                              ? "bg-[#fef3c7] text-[#92400e]"
                              : "bg-[#dcfce7] text-[#166534]"
                          }`}
                        >
                          {usedPct}% Used
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[12px] my-2 p-2 rounded-lg bg-white border border-[#eceae0]">
                        <div>
                          <span className="text-[10.5px] text-[#8b938d] block">Planned</span>
                          <span className="font-semibold text-[#17211d]">{formatAmount(planned)}</span>
                        </div>
                        <div>
                          <span className="text-[10.5px] text-[#8b938d] block">Spent</span>
                          <span className="font-semibold text-[#be123c]">{formatAmount(spent)}</span>
                        </div>
                        <div>
                          <span className="text-[10.5px] text-[#8b938d] block">Remaining</span>
                          <span
                            className={`font-bold ${isOver ? "text-[#be123c]" : "text-[#0d6e52]"}`}
                          >
                            {formatAmount(remaining)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="h-2 w-full bg-[#eceae0] rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.min(100, usedPct)}%` }}
                        className={`h-full rounded-full transition-all duration-300 ${
                          isOver ? "bg-[#be123c]" : usedPct > 80 ? "bg-[#d97706]" : "bg-[#0d6e52]"
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Payroll Trends */}
      {activeTab === "salary" && (
        <div className="mt-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-[14px] sm:text-[15px] font-bold text-[#17211d]">
                Payroll Disbursements by Pay Period
              </h4>
              <p className="text-[12px] text-[#69726d]">
                Historical salary payouts disbursed to Imams, teachers, and staff
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-[#69726d]">Total Payroll Paid</span>
              <p className="text-[16px] font-extrabold text-[#d97706]">
                {salary ? formatAmount(parseFloat(salary.total)) : "৳0"}
              </p>
            </div>
          </div>

          {!salary?.byPeriod || salary.byPeriod.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#dcd9ce] p-6 text-center text-[13px] text-[#8b938d]">
              No salary disbursements found for this period.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {salary.byPeriod.map((p) => {
                const amt = parseFloat(p.total);

                return (
                  <div
                    key={p.payPeriod}
                    className="rounded-xl border border-[#e5e3d8] bg-[#faf9f4] p-3.5"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[13px] text-[#17211d]">
                        Period {p.payPeriod}
                      </span>
                      <span className="text-[11px] font-semibold text-[#8b938d]">
                        {p.count} staff members
                      </span>
                    </div>
                    <p className="text-[17px] font-extrabold text-[#d97706]">
                      {formatAmount(amt)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

