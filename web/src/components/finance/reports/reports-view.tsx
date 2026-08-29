"use client";

import { useEffect, useMemo, useState } from "react";
import { Chip } from "@/components/finance/ui/badge";
import { Button, IconButton } from "@/components/finance/ui/button";
import { DataTable, type Column } from "@/components/finance/ui/data-table";
import { SelectField, TextField } from "@/components/finance/ui/form-field";
import { Icon } from "@/components/finance/ui/icon";
import { Modal } from "@/components/finance/ui/modal";
import { Panel, PanelHeader } from "@/components/finance/ui/panel";
import { InlineNotice, FinanceEmptyState, FinanceErrorState } from "@/components/finance/ui/states";
import { MiniStat } from "@/components/finance/ui/summary-card";
import { TableSkeleton } from "@/components/finance/ui/skeleton";
import {
  reportFormatOptions,
  reportRangeOptions,
} from "@/data/finance/reports";
import { formatAmount, formatDate } from "@/lib/finance/format";
import type { GeneratedReport } from "@/lib/finance/types";
import { 
  fetchFinancialSummary, 
  fetchDonationReport, 
  fetchExpenseReport, 
  fetchSalaryReport, 
  fetchBudgetReport, 
  type ReportWindow,
  type FinancialSummary,
  type DonationReport,
  type ExpenseReport,
  type BudgetReport,
  type SalaryReport
} from "@/services/financialReportsService";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import { useToast } from "@/components/ui/toast";
import { FinancialReportCharts } from "./reports-charts";

type StoredReport = GeneratedReport & {
  htmlContent?: string;
  csvContent?: string;
};

function triggerFileDownload(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function renderPrintableHtml(title: string, rangeLabel: string, mosqueName: string, prepBy: string, htmlContent: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title} - ${mosqueName}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #17211d; padding: 30px; margin: 0; background: #fff; }
        .header { border-bottom: 2px solid #0d4d3b; padding-bottom: 12px; margin-bottom: 20px; }
        .title { font-size: 22px; font-weight: bold; color: #0d4d3b; margin: 0; }
        .subtitle { font-size: 14px; color: #69726d; margin-top: 4px; }
        .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; background: #faf9f4; border: 1px solid #e2e1d6; border-radius: 6px; padding: 12px; margin-bottom: 20px; font-size: 12.5px; }
        .meta-item { display: flex; justify-content: space-between; }
        .meta-label { color: #69726d; font-weight: 500; }
        .meta-value { font-weight: 600; color: #17211d; }
        table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 13px; }
        th { text-align: left; padding: 8px 10px; background: #f1f4ef; border-bottom: 2px solid #c2d8cb; color: #0d4d3b; font-weight: 600; }
        th.right, td.right { text-align: right; }
        td { padding: 8px 10px; border-bottom: 1px solid #e7e6dc; }
        tr:nth-child(even) td { background: #faf9f4; }
        .total-row td { font-weight: bold; background: #eaf2ed; border-top: 2px solid #0d4d3b; border-bottom: 2px solid #0d4d3b; }
        .footer { margin-top: 30px; border-top: 1px solid #e7e6dc; padding-top: 10px; font-size: 11px; color: #8b938d; display: flex; justify-content: space-between; }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 class="title">${mosqueName}</h1>
        <p class="subtitle">${title}</p>
      </div>
      <div class="meta-grid">
        <div class="meta-item"><span class="meta-label">Period:</span><span class="meta-value">${rangeLabel}</span></div>
        <div class="meta-item"><span class="meta-label">Prepared On:</span><span class="meta-value">${new Date().toLocaleDateString('en-GB')}</span></div>
        <div class="meta-item"><span class="meta-label">Prepared By:</span><span class="meta-value">${prepBy}</span></div>
        <div class="meta-item"><span class="meta-label">Source:</span><span class="meta-value">Verified Database Ledger</span></div>
      </div>
      ${htmlContent}
      <div class="footer">
        <span>NOOR Mosque Management System</span>
        <span>Generated from verified database records</span>
      </div>
    </body>
    </html>
  `;
}

export function ReportsView() {
  const { can, user } = useDashboardSession();
  const { notify } = useToast();

  // Active filters and state
  const [range, setRange] = useState("this-month");
  const [format, setFormat] = useState<GeneratedReport["format"]>("PDF");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedReportType, setSelectedReportType] = useState<"statement" | "donations" | "expenses" | "budget" | "salary">("statement");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [generatedList, setGeneratedList] = useState<StoredReport[]>([]);

  // Interactive Live Data State
  const [summaryData, setSummaryData] = useState<FinancialSummary | null>(null);
  const [donationsData, setDonationsData] = useState<DonationReport | null>(null);
  const [expensesData, setExpensesData] = useState<ExpenseReport | null>(null);
  const [budgetData, setBudgetData] = useState<BudgetReport | null>(null);
  const [salaryData, setSalaryData] = useState<SalaryReport | null>(null);
  const [isLoadingAll, setIsLoadingAll] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Active visual chart tab
  const [chartTab, setChartTab] = useState<"overview" | "income" | "spending" | "budget" | "salary">("overview");

  // In-app Report Preview Modal State
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{
    title: string;
    rangeLabel: string;
    prepBy: string;
    htmlContent: string;
    csvContent: string;
  } | null>(null);

  // Calculate current date query window
  const currentWindow = useMemo<ReportWindow | undefined>(() => {
    const now = new Date();
    if (range === "this-month") {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      return {
        from: `${year}-${month}-01`,
        to: `${year}-${month}-${new Date(year, now.getMonth() + 1, 0).getDate()}`,
      };
    } else if (range === "last-month") {
      const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const year = prevMonthDate.getFullYear();
      const month = String(prevMonthDate.getMonth() + 1).padStart(2, "0");
      return {
        from: `${year}-${month}-01`,
        to: `${year}-${month}-${new Date(year, prevMonthDate.getMonth() + 1, 0).getDate()}`,
      };
    } else if (range === "this-quarter") {
      const quarter = Math.floor(now.getMonth() / 3);
      const startMonth = String(quarter * 3 + 1).padStart(2, "0");
      const endMonth = String(quarter * 3 + 3).padStart(2, "0");
      const year = now.getFullYear();
      return {
        from: `${year}-${startMonth}-01`,
        to: `${year}-${endMonth}-${new Date(year, quarter * 3 + 3, 0).getDate()}`,
      };
    } else if (range === "this-year") {
      const year = now.getFullYear();
      return {
        from: `${year}-01-01`,
        to: `${year}-12-31`,
      };
    } else if (range === "custom" && from && to) {
      return { from, to };
    }
    return undefined;
  }, [range, from, to]);

  // Load all 5 financial report APIs simultaneously for complete live data & graph coverage
  const loadAllReports = async () => {
    try {
      setIsLoadingAll(true);
      setLoadError(null);

      const [sum, don, exp, bud, sal] = await Promise.allSettled([
        fetchFinancialSummary(currentWindow),
        fetchDonationReport(currentWindow),
        fetchExpenseReport(currentWindow),
        fetchBudgetReport(currentWindow),
        fetchSalaryReport(currentWindow),
      ]);

      if (sum.status === "fulfilled") setSummaryData(sum.value);
      if (don.status === "fulfilled") setDonationsData(don.value);
      if (exp.status === "fulfilled") setExpensesData(exp.value);
      if (bud.status === "fulfilled") setBudgetData(bud.value);
      if (sal.status === "fulfilled") setSalaryData(sal.value);

      if (sum.status === "rejected" && don.status === "rejected") {
        setLoadError("Failed to connect to the finance server. Please check your credentials.");
      }
    } catch (err: any) {
      setLoadError(err.message || "Failed to load reports");
    } finally {
      setIsLoadingAll(false);
    }
  };

  useEffect(() => {
    if (can("finance.view") || can("report.view")) {
      loadAllReports();
    }
  }, [currentWindow]);

  const handleGenerateStatement = async () => {
    try {
      setIsGenerating(true);
      const rangeLabel = range === "custom" ? `${formatDate(from)} to ${formatDate(to)}` : reportRangeOptions.find((option) => option.value === range)?.label ?? range;
      const mosqueName = user?.mosqueName || "NOOR Central Mosque";
      const prepBy = user?.name ?? "Treasurer";
      const prepDate = new Date().toLocaleDateString("en-GB");

      let reportTitle = "Official Income & Expense Statement";
      let summaryText = "";
      let htmlContent = "";
      let csvContent = "";

      if (selectedReportType === "donations") {
        reportTitle = "Donations Collection Report";
        const res = donationsData || await fetchDonationReport(currentWindow);
        summaryText = `Total donations: ${formatAmount(parseFloat(res.total))} across ${res.count} receipts.`;

        csvContent = `"${mosqueName} - ${reportTitle}"\n` +
          `"Period:","${rangeLabel}"\n` +
          `"Prepared On:","${prepDate}"\n` +
          `"Prepared By:","${prepBy}"\n\n` +
          `"Metric","Count","Amount (${res.currency})"\n` +
          `"Total Donations Received",${res.count},${res.total}\n\n` +
          `"Payment Methods"\n` +
          `"Method","Count","Amount (${res.currency})"\n` +
          res.byPaymentMethod.map(m => `"${m.paymentMethod}",${m.count},${m.total}`).join("\n") +
          `\n\n"Status Breakdown"\n` +
          `"Status","Count","Amount (${res.currency})"\n` +
          res.byStatus.map(s => `"${s.status}",${s.count},${s.total}`).join("\n");

        htmlContent = `
          <table>
            <thead>
              <tr><th>Summary Metric</th><th class="right">Count</th><th class="right">Total (${res.currency})</th></tr>
            </thead>
            <tbody>
              <tr class="total-row"><td>Total Verified Donations</td><td class="right">${res.count}</td><td class="right">${res.total}</td></tr>
            </tbody>
          </table>
          <h3 style="margin-top: 20px; color: #0d4d3b; font-size: 15px;">Breakdown by Payment Method</h3>
          <table>
            <thead><tr><th>Payment Method</th><th class="right">Receipts</th><th class="right">Amount (${res.currency})</th></tr></thead>
            <tbody>
              ${res.byPaymentMethod.map(m => `<tr><td>${m.paymentMethod}</td><td class="right">${m.count}</td><td class="right">${m.total}</td></tr>`).join("")}
            </tbody>
          </table>
        `;
      } else if (selectedReportType === "expenses") {
        reportTitle = "Operational Expense Report";
        const res = expensesData || await fetchExpenseReport(currentWindow);
        summaryText = `Total spending: ${formatAmount(parseFloat(res.total))} across ${res.count} items.`;

        csvContent = `"${mosqueName} - ${reportTitle}"\n` +
          `"Period:","${rangeLabel}"\n` +
          `"Prepared On:","${prepDate}"\n` +
          `"Prepared By:","${prepBy}"\n\n` +
          `"Metric","Count","Amount (${res.currency})"\n` +
          `"Total Expenses Paid",${res.count},${res.total}\n\n` +
          `"Spending by Category"\n` +
          `"Category","Count","Amount (${res.currency})"\n` +
          res.byCategory.map(c => `"${c.category}",${c.count},${c.total}`).join("\n");

        htmlContent = `
          <table>
            <thead><tr><th>Summary Metric</th><th class="right">Count</th><th class="right">Total (${res.currency})</th></tr></thead>
            <tbody>
              <tr class="total-row"><td>Total Expenses (Paid)</td><td class="right">${res.count}</td><td class="right">${res.total}</td></tr>
            </tbody>
          </table>
          <h3 style="margin-top: 20px; color: #0d4d3b; font-size: 15px;">Spending by Category</h3>
          <table>
            <thead><tr><th>Category</th><th class="right">Count</th><th class="right">Total (${res.currency})</th></tr></thead>
            <tbody>
              ${res.byCategory.map(c => `<tr><td>${c.category}</td><td class="right">${c.count}</td><td class="right">${c.total}</td></tr>`).join("")}
            </tbody>
          </table>
        `;
      } else if (selectedReportType === "salary") {
        reportTitle = "Salary & Payroll Register";
        const res = salaryData || await fetchSalaryReport(currentWindow);
        summaryText = `Total payroll: ${formatAmount(parseFloat(res.total))} across ${res.count} disbursements.`;

        csvContent = `"${mosqueName} - ${reportTitle}"\n` +
          `"Period:","${rangeLabel}"\n` +
          `"Prepared On:","${prepDate}"\n` +
          `"Prepared By:","${prepBy}"\n\n` +
          `"Metric","Count","Amount (${res.currency})"\n` +
          `"Total Payroll Paid",${res.count},${res.total}\n\n` +
          `"Disbursements by Pay Period"\n` +
          `"Pay Period","Disbursements","Amount (${res.currency})"\n` +
          res.byPeriod.map(p => `"${p.payPeriod}",${p.count},${p.total}`).join("\n");

        htmlContent = `
          <table>
            <thead><tr><th>Summary Metric</th><th class="right">Count</th><th class="right">Total (${res.currency})</th></tr></thead>
            <tbody>
              <tr class="total-row"><td>Total Payroll (Disbursed)</td><td class="right">${res.count}</td><td class="right">${res.total}</td></tr>
            </tbody>
          </table>
          <h3 style="margin-top: 20px; color: #0d4d3b; font-size: 15px;">Payroll by Pay Period</h3>
          <table>
            <thead><tr><th>Pay Period</th><th class="right">Disbursements</th><th class="right">Total (${res.currency})</th></tr></thead>
            <tbody>
              ${res.byPeriod.map(p => `<tr><td>${p.payPeriod}</td><td class="right">${p.count}</td><td class="right">${p.total}</td></tr>`).join("")}
            </tbody>
          </table>
        `;
      } else if (selectedReportType === "budget") {
        reportTitle = "Budget vs Actual Performance";
        const res = budgetData || await fetchBudgetReport(currentWindow);
        summaryText = `Active budget: ${formatAmount(parseFloat(res.total))} across ${res.lines.length} categories.`;

        csvContent = `"${mosqueName} - ${reportTitle}"\n` +
          `"Period:","${rangeLabel}"\n` +
          `"Prepared On:","${prepDate}"\n` +
          `"Prepared By:","${prepBy}"\n\n` +
          `"Category","Planned (${res.currency})","Spent (${res.currency})","Remaining (${res.currency})"\n` +
          res.lines.map(l => `"${l.category}",${l.planned},${l.spent},${l.remaining}`).join("\n");

        htmlContent = `
          <table>
            <thead><tr><th>Category</th><th class="right">Planned (${res.currency})</th><th class="right">Actual Spent (${res.currency})</th><th class="right">Remaining (${res.currency})</th></tr></thead>
            <tbody>
              ${res.lines.map(l => `<tr><td>${l.category}</td><td class="right">${l.planned}</td><td class="right">${l.spent}</td><td class="right">${l.remaining}</td></tr>`).join("")}
              <tr class="total-row"><td>Total Budget in Force</td><td class="right" colspan="3">${res.total}</td></tr>
            </tbody>
          </table>
        `;
      } else {
        const res = summaryData || await fetchFinancialSummary(currentWindow);
        const totalSpent = (parseFloat(res.expenses.total) + parseFloat(res.salaries.total)).toFixed(2);
        summaryText = `Net Balance: ${formatAmount(parseFloat(res.netBalance))} (Income: ${formatAmount(parseFloat(res.donations.total))}, Spent: ${formatAmount(parseFloat(totalSpent))}).`;

        csvContent = `"${mosqueName} - ${reportTitle}"\n` +
          `"Period:","${rangeLabel}"\n` +
          `"Prepared On:","${prepDate}"\n` +
          `"Prepared By:","${prepBy}"\n\n` +
          `"Line Item","Count","Amount (${res.currency})"\n` +
          `"Total Donations Received",${res.donations.count},${res.donations.total}\n` +
          `"General Expenses",${res.expenses.count},${res.expenses.total}\n` +
          `"Staff Salaries",${res.salaries.count},${res.salaries.total}\n` +
          `"Total Outflow (Expenses + Salaries)",${res.expenses.count + res.salaries.count},${totalSpent}\n` +
          `"Net Surplus / Deficit",-,${res.netBalance}\n` +
          `"Budget in Force",${res.budget.count},${res.budget.total}\n` +
          `"Budget Headroom Remaining",-,${res.budget.remaining ?? "N/A"}\n`;

        htmlContent = `
          <table>
            <thead><tr><th>Financial Account Line</th><th class="right">Transactions</th><th class="right">Amount (${res.currency})</th></tr></thead>
            <tbody>
              <tr><td><strong>Total Donations Received</strong></td><td class="right">${res.donations.count}</td><td class="right" style="color: #0d4d3b; font-weight: 600;">${res.donations.total}</td></tr>
              <tr><td>General Expenses</td><td class="right">${res.expenses.count}</td><td class="right" style="color: #be123c;">${res.expenses.total}</td></tr>
              <tr><td>Staff Salaries</td><td class="right">${res.salaries.count}</td><td class="right" style="color: #be123c;">${res.salaries.total}</td></tr>
              <tr><td><strong>Total Spending Outflow</strong></td><td class="right">${res.expenses.count + res.salaries.count}</td><td class="right" style="color: #be123c; font-weight: 600;">${totalSpent}</td></tr>
              <tr class="total-row"><td><strong>Net Result (Surplus / Deficit)</strong></td><td class="right">-</td><td class="right" style="font-size: 15px;">${res.netBalance}</td></tr>
            </tbody>
          </table>
          <h3 style="margin-top: 20px; color: #0d4d3b; font-size: 15px;">Budget Plan Status</h3>
          <table>
            <thead><tr><th>Plan Parameter</th><th class="right">Amount (${res.currency})</th></tr></thead>
            <tbody>
              <tr><td>Active Budget Allocated</td><td class="right">${res.budget.total}</td></tr>
              <tr><td>Budget Remaining Headroom</td><td class="right">${res.budget.remaining ?? "N/A"}</td></tr>
            </tbody>
          </table>
        `;
      }

      if (format === "CSV" || format === "Excel") {
        const safeSlug = reportTitle.toLowerCase().replace(/[^a-z0-9]+/g, "_");
        const filename = `${safeSlug}_${new Date().toISOString().slice(0, 10)}.csv`;
        triggerFileDownload(filename, "\uFEFF" + csvContent, "text/csv;charset=utf-8;");
      }

      setPreviewData({
        title: reportTitle,
        rangeLabel,
        prepBy,
        htmlContent,
        csvContent,
      });
      setPreviewModalOpen(true);
      setIsExportModalOpen(false);

      const newEntry: StoredReport = {
        id: `REP-${Math.floor(1000 + Math.random() * 9000)}`,
        reportId: selectedReportType,
        name: reportTitle,
        range: rangeLabel,
        format,
        size: format === "PDF" ? "142 KB" : "32 KB",
        generatedBy: prepBy,
        generatedAt: new Date().toISOString(),
        htmlContent,
        csvContent,
      };

      setGeneratedList((prev) => [newEntry, ...prev]);
      setNotice(`Report compiled successfully: ${reportTitle} (${rangeLabel}). ${summaryText}`);
      notify({
        message: `${reportTitle} Generated`,
        description: "Official statement generated from database records.",
        tone: "success",
      });
    } catch (err: any) {
      notify({
        message: "Failed to generate report",
        description: err.message || "Could not retrieve report from API",
        tone: "danger",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenPrintFrame = (title: string, rangeLabel: string, prepBy: string, htmlContent: string) => {
    const mosqueName = user?.mosqueName || "NOOR Central Mosque";
    const fullHtml = renderPrintableHtml(title, rangeLabel, mosqueName, prepBy, htmlContent);
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(fullHtml);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 300);
    }
  };

  const generatedColumns: Column<StoredReport>[] = [
    {
      key: "name",
      header: "Report Statement",
      cell: (row) => (
        <div className="min-w-0">
          <p className="font-semibold text-[#17211d]">{row.name}</p>
          <p className="mt-0.5 text-[12px] text-[#8b938d]">
            {row.id} · {row.range}
          </p>
        </div>
      ),
      sortValue: (row) => row.name,
    },
    { key: "format", header: "Format", cell: (row) => <Chip>{row.format}</Chip>, sortValue: (row) => row.format },
    { key: "size", header: "Size", cell: (row) => <span className="text-[13px] tabular-nums">{row.size}</span>, secondary: true },
    { key: "generatedBy", header: "Prepared by", cell: (row) => <span className="text-[13px]">{row.generatedBy}</span>, secondary: true },
    {
      key: "generatedAt",
      header: "Prepared on",
      cell: (row) => <span className="whitespace-nowrap tabular-nums">{formatDate(row.generatedAt)}</span>,
      sortValue: (row) => row.generatedAt,
    },
    {
      key: "actions",
      header: "Download",
      headerHidden: true,
      align: "right",
      cell: (row) => (
        <div className="flex items-center gap-1.5 justify-end">
          {row.htmlContent && (
            <Button
              size="sm"
              variant="secondary"
              icon="eye"
              onClick={() => {
                setPreviewData({
                  title: row.name,
                  rangeLabel: row.range,
                  prepBy: row.generatedBy,
                  htmlContent: row.htmlContent || "",
                  csvContent: row.csvContent || "",
                });
                setPreviewModalOpen(true);
              }}
            >
              View
            </Button>
          )}
          {row.csvContent && (
            <IconButton
              icon="download"
              label="Download CSV"
              onClick={() => {
                const filename = `${row.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_${row.id}.csv`;
                triggerFileDownload(filename, "\uFEFF" + row.csvContent, "text/csv;charset=utf-8;");
              }}
            />
          )}
        </div>
      ),
    },
  ];

  if (isLoadingAll && !summaryData) return <TableSkeleton />;
  if (loadError) return <FinanceErrorState description={loadError} onRetry={loadAllReports} />;

  const incomeTotal = summaryData ? parseFloat(summaryData.donations.total) : 0;
  const expenseTotal = summaryData ? parseFloat(summaryData.expenses.total) + parseFloat(summaryData.salaries.total) : 0;
  const netTotal = summaryData ? parseFloat(summaryData.netBalance) : 0;

  return (
    <div className="space-y-5 sm:space-y-6">
      {notice && (
        <InlineNotice tone="gold" icon="info">
          {notice}
        </InlineNotice>
      )}

      {/* Global Interactive Period Filter Bar with Export Action */}
      <div className="rounded-2xl border border-[#e2e1d6] bg-white p-3.5 sm:p-4 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#f1f4ef] text-[#0d4d3b]">
              <Icon name="calendar" size={17} />
            </span>
            <div>
              <h4 className="text-[13px] sm:text-[14px] font-bold text-[#17211d]">
                Reporting Timeframe
              </h4>
              <p className="text-[11.5px] text-[#69726d]">
                Select a period to update all 5 database financial queries simultaneously
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="no-scrollbar -mx-2 flex gap-1.5 overflow-x-auto px-2 sm:mx-0 sm:px-0">
              {[
                { id: "this-month", label: "This Month" },
                { id: "last-month", label: "Last Month" },
                { id: "this-quarter", label: "This Quarter" },
                { id: "this-year", label: "This Year" },
                { id: "all-time", label: "All Time" },
                { id: "custom", label: "Custom Range" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setRange(opt.id)}
                  className={`min-h-[38px] rounded-lg px-3 py-1.5 text-[12px] sm:text-[12.5px] font-semibold transition-all ${
                    range === opt.id
                      ? "bg-[#0d4d3b] text-white shadow-xs"
                      : "bg-[#f4f3ec] text-[#4d564f] hover:bg-[#e8e6dc]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {range === "custom" && (
              <div className="flex items-center gap-2 pt-2 sm:pt-0 w-full sm:w-auto">
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="min-h-[38px] rounded-lg border border-[#d2d0c2] bg-white px-2.5 py-1 text-[12.5px] text-[#17211d]"
                />
                <span className="text-[12px] text-[#69726d]">to</span>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="min-h-[38px] rounded-lg border border-[#d2d0c2] bg-white px-2.5 py-1 text-[12.5px] text-[#17211d]"
                />
              </div>
            )}

            <Button
              variant="primary"
              icon="download"
              onClick={() => setIsExportModalOpen(true)}
              className="min-h-[38px] px-3.5 font-bold shadow-xs ml-auto"
            >
              Export Statement
            </Button>
          </div>
        </div>
      </div>

      {/* Top Key Metrics Overview */}
      {summaryData && (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <MiniStat
            label="Received in Period"
            value={formatAmount(incomeTotal)}
            hint={`${summaryData.donations.count} verified receipts`}
            icon="arrow-down-right"
            tone="positive"
          />
          <MiniStat
            label="Spent in Period"
            value={formatAmount(expenseTotal)}
            hint={`${summaryData.expenses.count} expenses + ${summaryData.salaries.count} salaries`}
            icon="arrow-up"
            tone="negative"
          />
          <MiniStat
            label="Net Operating Result"
            value={formatAmount(netTotal)}
            hint={netTotal >= 0 ? "Surplus remaining" : "Operating deficit"}
            icon="scale"
            tone={netTotal >= 0 ? "positive" : "negative"}
          />
          <MiniStat
            label="Budget in Force"
            value={formatAmount(parseFloat(summaryData.budget.total))}
            hint={`Remaining: ${summaryData.budget.remaining ? formatAmount(parseFloat(summaryData.budget.remaining)) : "N/A"}`}
            icon="chart"
          />
        </div>
      )}

      {/* Interactive Visualizer and Graphs Component */}
      <FinancialReportCharts
        summary={summaryData}
        donations={donationsData}
        expenses={expensesData}
        budget={budgetData}
        salary={salaryData}
        activeTab={chartTab}
        onTabChange={setChartTab}
      />

      {/* Generated Statement Snapshots */}
      <Panel>
        <PanelHeader
          title="Generated Statements & Exports"
          description="Printable statements and spreadsheet exports compiled in this session"
          icon="download"
          actions={
            <Button
              size="sm"
              variant="secondary"
              icon="download"
              onClick={() => setIsExportModalOpen(true)}
            >
              New Statement Export
            </Button>
          }
        />
        <DataTable
          rows={generatedList}
          columns={generatedColumns}
          getRowKey={(row) => row.id}
          caption="Reports prepared in this session"
          emptyState={
            <FinanceEmptyState
              icon="download"
              title="No statements exported yet"
              description="Click 'Export Statement' to compile an official PDF or CSV document from verified ledger records."
            />
          }
          initialSort={{ key: "generatedAt", direction: "desc" }}
          pageSize={8}
          footNote="A generated file captures a verified ledger snapshot."
          mobileTitle={(row) => row.name}
          mobileSubtitle={(row) => `${row.range} · ${row.format}`}
          mobileHiddenKeys={["name", "format"]}
        />
      </Panel>

      {/* Export Statement Modal */}
      <Modal
        open={isExportModalOpen}
        onClose={() => !isGenerating && setIsExportModalOpen(false)}
        title="Export Official Statement"
        description="Select the report document to compile from live database transactions"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setIsExportModalOpen(false)} disabled={isGenerating}>
              Cancel
            </Button>
            <Button
              variant="primary"
              icon="download"
              disabled={isGenerating}
              onClick={handleGenerateStatement}
              className="font-bold min-h-[42px] px-4"
            >
              {isGenerating ? "Querying Database..." : "Generate Statement"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <SelectField
            label="Statement Type"
            required
            options={[
              { value: "statement", label: "Income & Expense Statement (Full Summary)" },
              { value: "donations", label: "Donation Collections Report" },
              { value: "expenses", label: "Operational Expense Breakdown" },
              { value: "budget", label: "Budget vs. Actual Performance" },
              { value: "salary", label: "Staff Salary & Payroll Register" },
            ]}
            value={selectedReportType}
            onChange={(e) => setSelectedReportType(e.target.value as any)}
          />

          <SelectField
            label="Reporting Period"
            required
            options={reportRangeOptions}
            value={range}
            onChange={(event) => setRange(event.target.value)}
          />

          {range === "custom" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="From Date"
                type="date"
                required
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
              <TextField
                label="To Date"
                type="date"
                required
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
            </div>
          )}

          <SelectField
            label="Export Format"
            required
            hint="PDF opens an interactive printable statement; CSV/Excel downloads a spreadsheet."
            options={reportFormatOptions}
            value={format}
            onChange={(event) => setFormat(event.target.value as GeneratedReport["format"])}
          />

          <dl className="divide-y divide-[#f0efe6] rounded-xl border border-[#e2e1d6] bg-[#faf9f4] px-3.5 py-1 text-[13px]">
            <div className="flex justify-between py-1.5">
              <span className="text-[#69726d]">Source</span>
              <span className="font-semibold text-[#17211d]">PostgreSQL Verified Ledger</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-[#69726d]">Currency</span>
              <span className="font-semibold text-[#0d4d3b]">{summaryData?.currency ?? "BDT"}</span>
            </div>
          </dl>
        </div>
      </Modal>

      {/* In-App Live Interactive Report Previewer Modal */}
      <Modal
        open={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        title={previewData?.title ?? "Report Statement"}
        description={`Period: ${previewData?.rangeLabel ?? ""} · Prepared by ${previewData?.prepBy ?? "Treasurer"}`}
        size="lg"
        footer={
          <div className="flex flex-wrap items-center justify-between w-full gap-2">
            <Button
              variant="secondary"
              icon="download"
              onClick={() => {
                if (previewData) {
                  const filename = `${previewData.title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.csv`;
                  triggerFileDownload(filename, "\uFEFF" + previewData.csvContent, "text/csv;charset=utf-8;");
                }
              }}
            >
              Download CSV
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setPreviewModalOpen(false)}>
                Close
              </Button>
              <Button
                variant="primary"
                icon="printer"
                onClick={() => {
                  if (previewData) {
                    handleOpenPrintFrame(
                      previewData.title,
                      previewData.rangeLabel,
                      previewData.prepBy,
                      previewData.htmlContent
                    );
                  }
                }}
              >
                Print / Save PDF
              </Button>
            </div>
          </div>
        }
      >
        {previewData && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="rounded-xl border border-[#e2e1d6] bg-[#faf9f4] p-3 sm:p-4 text-[12.5px] grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <span className="text-[#69726d] block text-[11px]">Mosque</span>
                <span className="font-bold text-[#17211d]">{user?.mosqueName || "NOOR Central Mosque"}</span>
              </div>
              <div>
                <span className="text-[#69726d] block text-[11px]">Period</span>
                <span className="font-bold text-[#17211d]">{previewData.rangeLabel}</span>
              </div>
              <div>
                <span className="text-[#69726d] block text-[11px]">Prepared On</span>
                <span className="font-bold text-[#17211d]">{new Date().toLocaleDateString("en-GB")}</span>
              </div>
              <div>
                <span className="text-[#69726d] block text-[11px]">Source</span>
                <span className="font-bold text-[#0d6e52]">Verified Ledger</span>
              </div>
            </div>

            <div
              className="rounded-xl border border-[#e2e1d6] bg-white p-4 text-[13px]"
              dangerouslySetInnerHTML={{ __html: previewData.htmlContent }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
