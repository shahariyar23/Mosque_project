"use client";

import { useMemo, useState } from "react";
import { SegmentedControl } from "@/components/finance/ui/filters";
import { Panel, PanelBody, PanelHeader } from "@/components/finance/ui/panel";
import { FinanceSummaryGrid, MiniStat } from "@/components/finance/ui/summary-card";
import { FinanceEmptyState, FinanceErrorState } from "@/components/finance/ui/states";
import { TableSkeleton } from "@/components/finance/ui/skeleton";
import { useApiResource } from "@/hooks/use-api";
import { fetchFinancialSummary, type ReportWindow } from "@/services/financialReportsService";
import { formatAmount } from "@/lib/finance/format";
import type { DateRangeKey, SummaryMetric } from "@/lib/finance/types";

const dateRangeOptions: ReadonlyArray<{ value: DateRangeKey; label: string }> = [
  { value: "this-month", label: "This Month" },
  { value: "last-month", label: "Last Month" },
  { value: "this-year", label: "This Year" },
];

export function FinanceOverviewView() {
  const [range, setRange] = useState<DateRangeKey>("this-month");

  const window = useMemo<ReportWindow>(() => {
    const now = new Date();
    if (range === "this-month") {
      return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0] };
    }
    if (range === "last-month") {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: prev.toISOString().split('T')[0], to: end.toISOString().split('T')[0] };
    }
    if (range === "this-year") {
      return { from: new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0] };
    }
    return {};
  }, [range]);

  const { data: summary, loading, error, refetch } = useApiResource(
    () => fetchFinancialSummary(window),
    [window]
  );

  if (loading && !summary) return <TableSkeleton />;
  if (error) return <FinanceErrorState description={error} onRetry={refetch} />;

  const summaryMetrics: SummaryMetric[] = summary ? [
    {
      id: "month-income",
      label: "Total Income",
      amount: parseFloat(summary.donations.total),
      hint: `${summary.donations.count} donations`,
      tone: "positive",
      icon: "trending-up",
    },
    {
      id: "month-expenses",
      label: "Total Expenses",
      amount: parseFloat(summary.expenses.total),
      hint: `${summary.expenses.count} expense records`,
      tone: "negative",
      icon: "trending-down",
    },
    {
      id: "month-salaries",
      label: "Total Salaries",
      amount: parseFloat(summary.salaries.total),
      hint: `${summary.salaries.count} payroll records`,
      tone: "negative",
      icon: "badge",
    },
    {
      id: "net-balance",
      label: "Net Balance",
      amount: parseFloat(summary.netBalance),
      hint: "Income minus expenses & salaries",
      tone: parseFloat(summary.netBalance) >= 0 ? "positive" : "negative",
      icon: "scale",
    },
  ] : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <SegmentedControl
          label="Period"
          value={range}
          onChange={setRange}
          options={dateRangeOptions}
        />
      </div>

      {summaryMetrics.length > 0 && <FinanceSummaryGrid metrics={summaryMetrics} />}

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <PanelHeader 
            title="Budget Summary" 
            description={summary?.budget?.count ? `${summary.budget.count} budgets active` : "No active budgets"} 
            icon="vault" 
          />
          <PanelBody>
            {summary?.budget && summary.budget.total !== "0.00" ? (
              <div className="space-y-4">
                <MiniStat label="Budgeted Total" value={formatAmount(parseFloat(summary.budget.total))} icon="chart" />
                <MiniStat 
                  label="Remaining" 
                  value={summary.budget.remaining ? formatAmount(parseFloat(summary.budget.remaining)) : "0.00"} 
                  icon="scale" 
                  tone={parseFloat(summary.budget.remaining ?? "0") >= 0 ? "positive" : "negative"} 
                />
              </div>
            ) : (
              <FinanceEmptyState icon="vault" title="No budget set" description="There are no budgets defined for this period." />
            )}
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Currency" description="Operating currency for the report" icon="globe" />
          <PanelBody>
            <MiniStat label="Base Currency" value={summary?.currency ?? "N/A"} icon="coins" />
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}
