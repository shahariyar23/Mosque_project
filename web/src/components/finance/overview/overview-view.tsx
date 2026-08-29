"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SegmentedControl } from "@/components/finance/ui/filters";
import { Panel, PanelBody, PanelHeader } from "@/components/finance/ui/panel";
import { MiniStat } from "@/components/finance/ui/summary-card";
import { FinanceEmptyState, FinanceErrorState } from "@/components/finance/ui/states";
import { TableSkeleton } from "@/components/finance/ui/skeleton";
import { Icon, type IconName } from "@/components/finance/ui/icon";
import { Chip, TransactionStatusBadge } from "@/components/finance/ui/badge";
import { Button } from "@/components/finance/ui/button";
import { useApiResource } from "@/hooks/use-api";
import { fetchFinancialSummary, type ReportWindow } from "@/services/financialReportsService";
import { fetchFundsWithBalances, type FundWithBalance } from "@/services/donationFundsService";
import { fetchTransactions, type Transaction } from "@/services/transactionsService";
import { formatAmount, formatDate } from "@/lib/finance/format";
import type { DateRangeKey } from "@/lib/finance/types";
import { OverviewCharts } from "./overview-charts";

const dateRangeOptions: ReadonlyArray<{ value: DateRangeKey; label: string }> = [
  { value: "this-month", label: "This Month" },
  { value: "last-month", label: "Last Month" },
  { value: "this-year", label: "This Year" },
];

export function FinanceOverviewView() {
  const [range, setRange] = useState<DateRangeKey>("this-month");
  const [funds, setFunds] = useState<FundWithBalance[]>([]);
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);

  const window = useMemo<ReportWindow>(() => {
    const now = new Date();
    if (range === "this-month") {
      return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0] };
    }
    if (range === "last-month") {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: prev.toISOString().split("T")[0], to: end.toISOString().split("T")[0] };
    }
    if (range === "this-year") {
      return { from: new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0] };
    }
    return {};
  }, [range]);

  const { data: summary, loading, error, refetch } = useApiResource(
    () => fetchFinancialSummary(window),
    [window]
  );

  useEffect(() => {
    fetchFundsWithBalances().then(setFunds).catch(() => {});
    fetchTransactions({ limit: 5 }).then((res) => setRecentTx(res.rows)).catch(() => {});
  }, []);

  if (loading && !summary) return <TableSkeleton />;
  if (error) return <FinanceErrorState description={error} onRetry={refetch} />;

  const totalIncomeVal = summary?.income ? parseFloat(summary.income.total) : parseFloat(summary?.donations?.total || "0");
  const totalIncomeCount = summary?.income ? summary.income.count : (summary?.donations?.count || 0);
  const totalExpensesVal = parseFloat(summary?.expenses?.total || "0");
  const totalSalariesVal = parseFloat(summary?.salaries?.total || "0");
  const netBalanceVal = parseFloat(summary?.netBalance || "0");

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Actions Hub - Mobile First */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[20px] sm:text-[22px] font-bold text-[#17211d]">
            Financial Operations
          </h2>
          <p className="text-[13px] text-[#69726d]">
            Overview of mosque inflows, operational expenses, and liquidity reserves
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/finance/transactions">
            <Button size="sm" variant="secondary" icon="plus">
              Record Inflow
            </Button>
          </Link>
          <Link href="/dashboard/finance/expenses">
            <Button size="sm" variant="secondary" icon="trending-down">
              New Expense
            </Button>
          </Link>
          <Link href="/dashboard/finance/funds">
            <Button size="sm" variant="primary" icon="arrow-right">
              Transfer Funds
            </Button>
          </Link>
        </div>
      </div>

      {/* Period Filter Tabs */}
      <div className="flex items-center justify-between">
        <SegmentedControl
          label="Reporting Period"
          value={range}
          onChange={setRange}
          options={dateRangeOptions}
        />
        <span className="text-[12px] text-[#8e9690] hidden sm:inline-block">
          Operating Currency: <strong className="text-[#17211d]">{summary?.currency || "BDT"}</strong>
        </span>
      </div>

      {/* 4 Modern Elevated Hero Cards - Mobile First (1 col mobile -> 2 col tablet -> 4 col desktop) */}
      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {/* Total Income Card */}
        <div className="rounded-xl border border-[#deddd3] bg-white p-4 sm:p-5 shadow-[0_1px_2px_rgba(7,58,45,.04),0_10px_28px_-24px_rgba(7,58,45,.2)] transition hover:border-[#c5c3b2]">
          <div className="flex items-start justify-between">
            <p className="text-[13px] font-semibold text-[#5c655f]">Total Income</p>
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-[#c4e3d5] bg-[#eef7f2] text-[#0d6e52]">
              <Icon name="trending-up" size={16} />
            </span>
          </div>
          <p className="mt-2 text-[24px] sm:text-[28px] font-bold tracking-tight text-[#0d6e52]">
            {formatAmount(totalIncomeVal)}
          </p>
          <p className="mt-1.5 text-[12px] text-[#69726d]">
            {totalIncomeCount} completed income records
          </p>
        </div>

        {/* Total Expenses Card */}
        <div className="rounded-xl border border-[#deddd3] bg-white p-4 sm:p-5 shadow-[0_1px_2px_rgba(7,58,45,.04),0_10px_28px_-24px_rgba(7,58,45,.2)] transition hover:border-[#c5c3b2]">
          <div className="flex items-start justify-between">
            <p className="text-[13px] font-semibold text-[#5c655f]">Total Expenses</p>
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-[#f5c6cb] bg-[#fdf2f2] text-[#be123c]">
              <Icon name="trending-down" size={16} />
            </span>
          </div>
          <p className="mt-2 text-[24px] sm:text-[28px] font-bold tracking-tight text-[#be123c]">
            {formatAmount(totalExpensesVal)}
          </p>
          <p className="mt-1.5 text-[12px] text-[#69726d]">
            {summary?.expenses?.count || 0} bill & maintenance entries
          </p>
        </div>

        {/* Total Salaries Card */}
        <div className="rounded-xl border border-[#deddd3] bg-white p-4 sm:p-5 shadow-[0_1px_2px_rgba(7,58,45,.04),0_10px_28px_-24px_rgba(7,58,45,.2)] transition hover:border-[#c5c3b2]">
          <div className="flex items-start justify-between">
            <p className="text-[13px] font-semibold text-[#5c655f]">Staff Salaries</p>
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-[#f5dfb8] bg-[#fdf8ee] text-[#d97706]">
              <Icon name="badge" size={16} />
            </span>
          </div>
          <p className="mt-2 text-[24px] sm:text-[28px] font-bold tracking-tight text-[#d97706]">
            {formatAmount(totalSalariesVal)}
          </p>
          <p className="mt-1.5 text-[12px] text-[#69726d]">
            {summary?.salaries?.count || 0} staff payroll records
          </p>
        </div>

        {/* Net Reserve Balance Card */}
        <div className="rounded-xl border border-[#c2d8cb] bg-linear-to-br from-[#f2f8f5] to-[#ffffff] p-4 sm:p-5 shadow-[0_1px_2px_rgba(7,58,45,.06),0_10px_28px_-24px_rgba(7,58,45,.3)]">
          <div className="flex items-start justify-between">
            <p className="text-[13px] font-semibold text-[#0d4d3b]">Net Surplus Balance</p>
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-[#0d6e52] bg-[#0d6e52] text-white">
              <Icon name="coins" size={16} />
            </span>
          </div>
          <p className={`mt-2 text-[24px] sm:text-[28px] font-bold tracking-tight ${netBalanceVal >= 0 ? "text-[#0d6e52]" : "text-[#be123c]"}`}>
            {formatAmount(netBalanceVal)}
          </p>
          <p className="mt-1.5 text-[12px] text-[#0d6e52] font-medium">
            Income minus all operational outflows
          </p>
        </div>
      </div>

      {/* Graphical Chart Interface: Cash Flow Inflow/Outflow + Fund Capital Breakdown */}
      {summary && <OverviewCharts summary={summary} funds={funds} />}

      {/* Recent Ledger Activity & Budget Summary Grid */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Recent Transactions Feed (7 cols on desktop) */}
        <div className="lg:col-span-7">
          <Panel>
            <PanelHeader
              title="Recent Financial Transactions"
              description="Latest movements recorded in the mosque financial journal"
              icon="receipt"
              actions={
                <Link
                  href="/dashboard/finance/transactions"
                  className="text-[12.5px] font-semibold text-[#0d6e52] hover:underline"
                >
                  View full ledger &rarr;
                </Link>
              }
            />
            <PanelBody>
              {recentTx.length === 0 ? (
                <div className="py-8 text-center text-[13px] text-[#8e9690]">
                  No financial transactions recorded yet.
                </div>
              ) : (
                <ul className="divide-y divide-[#eceae0]">
                  {recentTx.map((tx) => {
                    const isIncome = tx.type === "income";
                    const isTransfer = tx.type === "transfer";
                    return (
                      <li key={tx.id} className="py-3 sm:py-3.5 flex items-center justify-between gap-3 text-[13px]">
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#17211d] truncate">
                              {tx.description || (isIncome ? "Donation received" : isTransfer ? "Fund transfer" : "Expense payment")}
                            </span>
                            <Chip>{tx.fund?.name || "General"}</Chip>
                          </div>
                          <p className="text-[11.5px] text-[#8e9690] mt-0.5">
                            {formatDate(tx.transactedAt || (tx as any).createdAt)} &bull; {tx.paymentMethod}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className={`font-bold text-[14px] ${isIncome ? "text-[#0d6e52]" : isTransfer ? "text-[#1f669e]" : "text-[#be123c]"}`}>
                            {isIncome ? `+${formatAmount(parseFloat(tx.amount))}` : isTransfer ? formatAmount(parseFloat(tx.amount)) : `-${formatAmount(parseFloat(tx.amount))}`}
                          </p>
                          <span className="inline-block mt-0.5">
                            <TransactionStatusBadge status={tx.status as any} />
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </PanelBody>
          </Panel>
        </div>

        {/* Budget & Target Overview (5 cols on desktop) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          <Panel>
            <PanelHeader
              title="Budget vs Actual"
              description={summary?.budget?.count ? `${summary.budget.count} budgets active` : "No active budgets"}
              icon="vault"
            />
            <PanelBody>
              {summary?.budget && summary.budget.total !== "0.00" ? (
                <div className="space-y-4">
                  <MiniStat label="Budgeted Total" value={formatAmount(parseFloat(summary.budget.total))} icon="chart" />
                  <MiniStat
                    label="Remaining Budget"
                    value={summary.budget.remaining ? formatAmount(parseFloat(summary.budget.remaining)) : "0.00"}
                    icon="scale"
                    tone={parseFloat(summary.budget.remaining ?? "0") >= 0 ? "positive" : "negative"}
                  />
                </div>
              ) : (
                <div className="py-6 text-center">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#f3f1e7] text-[#7d6520] mb-2">
                    <Icon name="vault" size={18} />
                  </span>
                  <p className="text-[13px] font-medium text-[#17211d]">No active budget set</p>
                  <p className="text-[12px] text-[#8e9690] mt-0.5">
                    Define periodic budgets to track spending goals.
                  </p>
                  <Link href="/dashboard/finance/budgets" className="mt-3 inline-block">
                    <Button size="sm" variant="secondary">
                      Create Budget
                    </Button>
                  </Link>
                </div>
              )}
            </PanelBody>
          </Panel>

          {/* Quick Shortcuts */}
          <div className="rounded-xl border border-[#e2e1d6] bg-[#faf9f4] p-4 text-[12.5px] space-y-2">
            <p className="font-semibold text-[#17211d]">Useful Shortcuts</p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link href="/dashboard/finance/reports" className="flex items-center gap-1.5 p-2 rounded-lg border border-[#e6e4d8] bg-white text-[#0d6e52] hover:bg-[#f0f6f3] font-medium">
                <Icon name="file-text" size={14} /> Financial Reports
              </Link>
              <Link href="/dashboard/audit" className="flex items-center gap-1.5 p-2 rounded-lg border border-[#e6e4d8] bg-white text-[#5c655f] hover:bg-[#f5f4ef] font-medium">
                <Icon name="shield" size={14} /> Audit Trail
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
