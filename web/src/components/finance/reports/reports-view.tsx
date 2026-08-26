"use client";

import { useMemo, useState } from "react";
import { Chip } from "@/components/finance/ui/badge";
import { Button, IconButton } from "@/components/finance/ui/button";
import { DataTable, type Column } from "@/components/finance/ui/data-table";
import { SegmentedControl } from "@/components/finance/ui/filters";
import { SelectField, SummaryRow, TextField } from "@/components/finance/ui/form-field";
import { Icon } from "@/components/finance/ui/icon";
import { Modal } from "@/components/finance/ui/modal";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { InlineNotice, FinanceEmptyState, FinanceErrorState } from "@/components/finance/ui/states";
import { MiniStat } from "@/components/finance/ui/summary-card";
import { TableSkeleton } from "@/components/finance/ui/skeleton";
import {
  reportCategories,
  reportDefinitions,
  reportFormatOptions,
  reportRangeOptions,
} from "@/data/finance/reports";
import { formatAmount, formatDate, formatOptionalDate } from "@/lib/finance/format";
import type { GeneratedReport, ReportCategory } from "@/lib/finance/types";
import { useApiResource } from "@/hooks/use-api";
import { 
  fetchFinancialSummary, 
  fetchDonationReport, 
  fetchExpenseReport, 
  fetchSalaryReport, 
  fetchBudgetReport, 
  type ReportWindow
} from "@/services/financialReportsService";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import { useToast } from "@/components/ui/toast";

type ReportCard = (typeof reportDefinitions)[number];

type StoredReport = GeneratedReport & {
  htmlContent?: string;
  csvContent?: string;
};

const categoryNotes: Record<ReportCategory, string> = {
  Statements: "What the committee reads at the monthly meeting.",
  Income: "Where the money came from, and from whom.",
  Spending: "Where it went, and who approved it.",
  People: "Members, staff and who still owes what.",
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

function openPrintDocument(title: string, rangeLabel: string, mosqueName: string, prepBy: string, htmlContent: string) {
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title} - ${mosqueName}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #17211d; padding: 40px; margin: 0; background: #fff; }
          .header { border-bottom: 2px solid #0d4d3b; padding-bottom: 16px; margin-bottom: 24px; }
          .title { font-size: 24px; font-weight: bold; color: #0d4d3b; margin: 0; }
          .subtitle { font-size: 14px; color: #69726d; margin-top: 4px; }
          .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; background: #faf9f4; border: 1px solid #e2e1d6; border-radius: 6px; padding: 14px; margin-bottom: 24px; font-size: 13px; }
          .meta-item { display: flex; justify-content: space-between; }
          .meta-label { color: #69726d; font-weight: 500; }
          .meta-value { font-weight: 600; color: #17211d; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13.5px; }
          th { text-align: left; padding: 10px 12px; background: #f1f4ef; border-bottom: 2px solid #c2d8cb; color: #0d4d3b; font-weight: 600; }
          th.right, td.right { text-align: right; }
          td { padding: 10px 12px; border-bottom: 1px solid #e7e6dc; }
          tr:nth-child(even) td { background: #faf9f4; }
          .total-row td { font-weight: bold; background: #eaf2ed; border-top: 2px solid #0d4d3b; border-bottom: 2px solid #0d4d3b; }
          .footer { margin-top: 40px; border-top: 1px solid #e7e6dc; padding-top: 12px; font-size: 11.5px; color: #8b938d; display: flex; justify-content: space-between; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; display: flex; gap: 10px;">
          <button onclick="window.print()" style="padding: 9px 18px; background: #0d4d3b; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px;">🖨️ Print / Save as PDF</button>
          <button onclick="window.close()" style="padding: 9px 18px; background: #e2e1d6; color: #17211d; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">Close</button>
        </div>
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
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }
}

export function ReportsView() {
  const { can, user } = useDashboardSession();
  const { notify } = useToast();
  const [category, setCategory] = useState<ReportCategory>("Statements");
  const [target, setTarget] = useState<ReportCard | null>(null);
  const [range, setRange] = useState("this-month");
  const [format, setFormat] = useState<GeneratedReport["format"]>("PDF");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [generatedList, setGeneratedList] = useState<StoredReport[]>([]);

  const { data: summary, loading, error, refetch } = useApiResource(
    () => fetchFinancialSummary(), 
    [], 
    { enabled: can("finance.view") || can("report.view") }
  );

  const shown = useMemo(() => reportDefinitions.filter((report) => report.category === category), [category]);

  const categoryOptions = reportCategories.map((entry) => ({
    value: entry.value,
    label: `${entry.label} (${reportDefinitions.filter((report) => report.category === entry.value).length})`,
  }));

  const openGenerate = (report: ReportCard) => {
    setTarget(report);
    setRange("this-month");
    setFormat("PDF");
    setFrom("");
    setTo("");
    setSubmitted(false);
  };

  const customIncomplete = range === "custom" && (!from || !to);

  const submitGenerate = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (customIncomplete || !target) return;

    try {
      setIsGenerating(true);
      const report = target;

      // Compute date window
      let windowQuery: ReportWindow | undefined = undefined;
      const now = new Date();
      if (range === "this-month") {
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        windowQuery = {
          from: `${year}-${month}-01`,
          to: `${year}-${month}-${new Date(year, now.getMonth() + 1, 0).getDate()}`,
        };
      } else if (range === "last-month") {
        const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const year = prevMonthDate.getFullYear();
        const month = String(prevMonthDate.getMonth() + 1).padStart(2, "0");
        windowQuery = {
          from: `${year}-${month}-01`,
          to: `${year}-${month}-${new Date(year, prevMonthDate.getMonth() + 1, 0).getDate()}`,
        };
      } else if (range === "custom") {
        windowQuery = { from, to };
      }

      const rangeLabel = range === "custom" ? `${formatDate(from)} to ${formatDate(to)}` : reportRangeOptions.find((option) => option.value === range)?.label ?? range;
      const mosqueName = user?.mosqueName || "NOOR Central Mosque";
      const prepBy = user?.name ?? "Treasurer";
      const prepDate = new Date().toLocaleDateString("en-GB");

      let summaryText = "";
      let htmlContent = "";
      let csvContent = "";

      if (report.category === "Income" || report.id === "donations-by-fund" || report.id === "donor-summary") {
        const res = await fetchDonationReport(windowQuery);
        summaryText = `Total donations: ${formatAmount(parseFloat(res.total))} across ${res.count} receipts.`;

        csvContent = `"${mosqueName} - ${report.name}"\n` +
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
          <h3 style="margin-top: 24px; color: #0d4d3b;">Breakdown by Payment Method</h3>
          <table>
            <thead><tr><th>Payment Method</th><th class="right">Receipts</th><th class="right">Amount (${res.currency})</th></tr></thead>
            <tbody>
              ${res.byPaymentMethod.map(m => `<tr><td>${m.paymentMethod}</td><td class="right">${m.count}</td><td class="right">${m.total}</td></tr>`).join("")}
            </tbody>
          </table>
          <h3 style="margin-top: 24px; color: #0d4d3b;">Breakdown by Status</h3>
          <table>
            <thead><tr><th>Status</th><th class="right">Count</th><th class="right">Amount (${res.currency})</th></tr></thead>
            <tbody>
              ${res.byStatus.map(s => `<tr><td>${s.status}</td><td class="right">${s.count}</td><td class="right">${s.total}</td></tr>`).join("")}
            </tbody>
          </table>
        `;
      } else if (report.category === "Spending" || report.id === "expense-summary") {
        const res = await fetchExpenseReport(windowQuery);
        summaryText = `Total spending: ${formatAmount(parseFloat(res.total))} across ${res.count} items.`;

        csvContent = `"${mosqueName} - ${report.name}"\n` +
          `"Period:","${rangeLabel}"\n` +
          `"Prepared On:","${prepDate}"\n` +
          `"Prepared By:","${prepBy}"\n\n` +
          `"Metric","Count","Amount (${res.currency})"\n` +
          `"Total Expenses Paid",${res.count},${res.total}\n\n` +
          `"Spending by Category"\n` +
          `"Category","Count","Amount (${res.currency})"\n` +
          res.byCategory.map(c => `"${c.category}",${c.count},${c.total}`).join("\n") +
          `\n\n"Status Breakdown"\n` +
          `"Status","Count","Amount (${res.currency})"\n` +
          res.byStatus.map(s => `"${s.status}",${s.count},${s.total}`).join("\n");

        htmlContent = `
          <table>
            <thead><tr><th>Summary Metric</th><th class="right">Count</th><th class="right">Total (${res.currency})</th></tr></thead>
            <tbody>
              <tr class="total-row"><td>Total Expenses (Paid)</td><td class="right">${res.count}</td><td class="right">${res.total}</td></tr>
            </tbody>
          </table>
          <h3 style="margin-top: 24px; color: #0d4d3b;">Spending by Category</h3>
          <table>
            <thead><tr><th>Category</th><th class="right">Count</th><th class="right">Total (${res.currency})</th></tr></thead>
            <tbody>
              ${res.byCategory.map(c => `<tr><td>${c.category}</td><td class="right">${c.count}</td><td class="right">${c.total}</td></tr>`).join("")}
            </tbody>
          </table>
        `;
      } else if (report.id === "payroll-summary") {
        const res = await fetchSalaryReport(windowQuery);
        summaryText = `Total payroll: ${formatAmount(parseFloat(res.total))} across ${res.count} disbursements.`;

        csvContent = `"${mosqueName} - ${report.name}"\n` +
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
          <h3 style="margin-top: 24px; color: #0d4d3b;">Payroll by Pay Period</h3>
          <table>
            <thead><tr><th>Pay Period</th><th class="right">Disbursements</th><th class="right">Total (${res.currency})</th></tr></thead>
            <tbody>
              ${res.byPeriod.map(p => `<tr><td>${p.payPeriod}</td><td class="right">${p.count}</td><td class="right">${p.total}</td></tr>`).join("")}
            </tbody>
          </table>
        `;
      } else if (report.id === "budget-vs-actual") {
        const res = await fetchBudgetReport(windowQuery);
        summaryText = `Active budget: ${formatAmount(parseFloat(res.total))} across ${res.lines.length} categories.`;

        csvContent = `"${mosqueName} - ${report.name}"\n` +
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
        const res = await fetchFinancialSummary(windowQuery);
        const totalSpent = (parseFloat(res.expenses.total) + parseFloat(res.salaries.total)).toFixed(2);
        summaryText = `Net Balance: ${formatAmount(parseFloat(res.netBalance))} (Income: ${formatAmount(parseFloat(res.donations.total))}, Spent: ${formatAmount(parseFloat(totalSpent))}).`;

        csvContent = `"${mosqueName} - ${report.name}"\n` +
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
              <tr><td>General Expenses</td><td class="right">${res.expenses.count}</td><td class="right" style="color: #a13228;">${res.expenses.total}</td></tr>
              <tr><td>Staff Salaries</td><td class="right">${res.salaries.count}</td><td class="right" style="color: #a13228;">${res.salaries.total}</td></tr>
              <tr><td><strong>Total Spending Outflow</strong></td><td class="right">${res.expenses.count + res.salaries.count}</td><td class="right" style="color: #a13228; font-weight: 600;">${totalSpent}</td></tr>
              <tr class="total-row"><td><strong>Net Result (Surplus / Deficit)</strong></td><td class="right">-</td><td class="right" style="font-size: 15px;">${res.netBalance}</td></tr>
            </tbody>
          </table>
          <h3 style="margin-top: 24px; color: #0d4d3b;">Budget Plan Status</h3>
          <table>
            <thead><tr><th>Plan Parameter</th><th class="right">Amount (${res.currency})</th></tr></thead>
            <tbody>
              <tr><td>Active Budget Allocated</td><td class="right">${res.budget.total}</td></tr>
              <tr><td>Budget Remaining Headroom</td><td class="right">${res.budget.remaining ?? "N/A"}</td></tr>
            </tbody>
          </table>
        `;
      }

      // Execute PDF preview/print or CSV download
      if (format === "PDF") {
        openPrintDocument(report.name, rangeLabel, mosqueName, prepBy, htmlContent);
      } else {
        const safeSlug = report.name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
        const filename = `${safeSlug}_${new Date().toISOString().slice(0, 10)}.csv`;
        triggerFileDownload(filename, "\uFEFF" + csvContent, "text/csv;charset=utf-8;");
      }

      const newEntry: StoredReport = {
        id: `REP-${Math.floor(1000 + Math.random() * 9000)}`,
        reportId: report.id,
        name: report.name,
        range: rangeLabel,
        format,
        size: format === "PDF" ? "142 KB" : format === "Excel" ? "68 KB" : "18 KB",
        generatedBy: prepBy,
        generatedAt: new Date().toISOString(),
        htmlContent,
        csvContent,
      };

      setGeneratedList((prev) => [newEntry, ...prev]);
      setTarget(null);
      setNotice(`Report generated successfully from live database: ${report.name} (${rangeLabel}). ${summaryText}`);
      notify({
        message: `${report.name} Generated`,
        description: format === "PDF" ? "Opening printable PDF statement..." : "Downloaded CSV spreadsheet.",
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

  const handleDownloadExisting = (row: StoredReport) => {
    const mosqueName = user?.mosqueName || "NOOR Central Mosque";
    if (row.format === "PDF" && row.htmlContent) {
      openPrintDocument(row.name, row.range, mosqueName, row.generatedBy, row.htmlContent);
    } else if (row.csvContent) {
      const safeSlug = row.name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      const filename = `${safeSlug}_${row.id}.csv`;
      triggerFileDownload(filename, "\uFEFF" + row.csvContent, "text/csv;charset=utf-8;");
      notify({
        message: "Downloading Report",
        description: `${filename} downloaded successfully.`,
        tone: "success",
      });
    } else {
      notify({
        message: "Report File Ready",
        description: `${row.name} (${row.format}) ready.`,
        tone: "info",
      });
    }
  };

  const generatedColumns: Column<StoredReport>[] = [
    {
      key: "name",
      header: "Report",
      cell: (row) => (
        <div className="min-w-0">
          <p className="font-medium text-[#17211d]">{row.name}</p>
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
        <IconButton
          icon={row.format === "PDF" ? "eye" : "download"}
          label={row.format === "PDF" ? `View/Print ${row.name}` : `Download ${row.name}`}
          onClick={() => handleDownloadExisting(row)}
        />
      ),
    },
  ];

  if (loading && !summary) return <TableSkeleton />;
  if (error) return <FinanceErrorState description={error} onRetry={refetch} />;

  const incomeTotal = summary ? parseFloat(summary.donations.total) : 0;
  const expenseTotal = summary ? parseFloat(summary.expenses.total) + parseFloat(summary.salaries.total) : 0;
  const netTotal = summary ? parseFloat(summary.netBalance) : 0;

  return (
    <div className="space-y-5">
      {notice ? (
        <InlineNotice tone="gold" icon="info">
          {notice}
        </InlineNotice>
      ) : null}

      {summary && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MiniStat label="Received all time" value={formatAmount(incomeTotal)} hint="From donations" icon="arrow-down-right" tone="positive" />
          <MiniStat label="Spent all time" value={formatAmount(expenseTotal)} hint="Expenses & Salaries" icon="arrow-up" tone="negative" />
          <MiniStat
            label="Left over"
            value={formatAmount(netTotal)}
            hint={netTotal >= 0 ? "Surplus" : "Shortfall"}
            icon="scale"
            tone={netTotal >= 0 ? "positive" : "negative"}
          />
        </div>
      )}

      {/* ---- Reports you can run ---- */}
      <Panel>
        <PanelHeader
          title="Reports"
          description={categoryNotes[category]}
          icon="chart"
          actions={<SegmentedControl label="Kind of report" size="sm" value={category} onChange={setCategory} options={categoryOptions} />}
        />
        <PanelBody>
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((report) => (
              <li
                key={report.id}
                className="flex flex-col rounded-lg border border-[#e2e1d6] bg-white p-4 shadow-[0_1px_2px_rgba(7,58,45,.04),0_10px_28px_-24px_rgba(7,58,45,.3)]"
              >
                <span className="grid h-9 w-9 place-items-center rounded-md border border-[#e2e1d6] bg-[#f1f4ef] text-[#0d4d3b]">
                  <Icon name={report.icon as any} size={17} />
                </span>
                <p className="mt-3 text-[14px] font-semibold text-[#17211d]">{report.name}</p>
                <p className="mt-1.5 flex-1 text-[12.5px] leading-5 text-[#69726d]">{report.description}</p>
                <p className="mt-3 text-[11.5px] text-[#8b938d]">{report.rangeHint}</p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#eceae0] pt-3">
                  <span className="text-[11.5px] text-[#9aa19c]">
                    {report.lastGenerated ? `Last run ${formatOptionalDate(report.lastGenerated)}` : "Not run yet"}
                  </span>
                  <Can permission="report.export">
                    <Button size="sm" variant="secondary" icon="download" onClick={() => openGenerate(report)}>
                      Generate
                    </Button>
                  </Can>
                </div>
              </li>
            ))}
          </ul>
        </PanelBody>
        <PanelFooter>
          <p className="text-[12px] text-[#69726d]">
            Every report is built from the ledger when you ask for it, so two people running the same report for the same period
            get the same figures.
          </p>
        </PanelFooter>
      </Panel>

      {/* ---- Recently prepared ---- */}
      <Panel>
        <PanelHeader title="Recently prepared" description="Files somebody has already produced" icon="download" />
        <DataTable
          rows={generatedList}
          columns={generatedColumns}
          getRowKey={(row) => row.id}
          caption="Reports prepared recently"
          emptyState={
            <FinanceEmptyState
              icon="download"
              title="Nothing prepared yet"
              description="Run a report above and the file will be listed here with who prepared it and when."
            />
          }
          initialSort={{ key: "generatedAt", direction: "desc" }}
          pageSize={8}
          footNote="A prepared file is a snapshot. Run the report again for the current figures."
          mobileTitle={(row) => row.name}
          mobileSubtitle={(row) => `${row.range} · ${row.format}`}
          mobileHiddenKeys={["name", "format"]}
        />
      </Panel>

      {/* ---- Generate Modal ---- */}
      <Modal
        open={Boolean(target)}
        onClose={() => !isGenerating && setTarget(null)}
        title={target ? target.name : "Generate a report"}
        description={target?.rangeHint}
        footer={
          <>
            <Button variant="secondary" onClick={() => setTarget(null)} disabled={isGenerating}>
              Cancel
            </Button>
            <Button type="submit" form="generate-report" icon="download" disabled={isGenerating}>
              {isGenerating ? "Generating..." : format === "PDF" ? "View & Save as PDF" : "Download CSV"}
            </Button>
          </>
        }
      >
        <form id="generate-report" onSubmit={submitGenerate} noValidate className="space-y-4">
          <SelectField label="Period" required options={reportRangeOptions} value={range} onChange={(event) => setRange(event.target.value)} />

          {range === "custom" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="From"
                type="date"
                required
                value={from}
                error={submitted && !from ? "Pick a start date." : undefined}
                onChange={(event) => setFrom(event.target.value)}
              />
              <TextField
                label="To"
                type="date"
                required
                value={to}
                error={submitted && !to ? "Pick an end date." : undefined}
                onChange={(event) => setTo(event.target.value)}
              />
            </div>
          ) : null}

          <SelectField
            label="Format"
            required
            hint="PDF for committee meetings / printing, Excel or CSV for spreadsheet analysis."
            options={reportFormatOptions}
            value={format}
            onChange={(event) => setFormat(event.target.value as GeneratedReport["format"])}
          />

          <dl className="divide-y divide-[#f0efe6] rounded-md border border-[#e2e1d6] bg-[#faf9f4] px-3.5 py-1">
            <SummaryRow label="Report" value={target?.name ?? ""} />
            <SummaryRow label="Built from" value="Verified ledger entries only" />
            <SummaryRow label="Last run" value={target?.lastGenerated ? formatOptionalDate(target.lastGenerated) : "Not run yet"} />
          </dl>

          <InlineNotice icon="shield">
            The file is put together by querying the finance API, so a report only ever contains figures from verified ledger transactions.
          </InlineNotice>
        </form>
      </Modal>
    </div>
  );
}
