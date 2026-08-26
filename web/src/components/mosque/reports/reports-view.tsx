"use client";

import { useMemo, useState } from "react";
import { Button, IconButton } from "@/components/finance/ui/button";
import { DataTable, type Column } from "@/components/finance/ui/data-table";
import { FinanceFilters, type SelectFilter } from "@/components/finance/ui/filters";
import { SelectField } from "@/components/finance/ui/form-field";
import { Icon } from "@/components/finance/ui/icon";
import { Modal } from "@/components/finance/ui/modal";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { FinanceEmptyState, FinanceErrorState, InlineNotice } from "@/components/finance/ui/states";
import { DonutChart, MiniBarChart, SplitBar, type Segment } from "@/components/ui/charts";
import { DetailDrawer, DetailField, DetailGrid, DetailSection } from "@/components/ui/detail-drawer";
import { StatGrid } from "@/components/ui/stat-card";
import { ReportCategoryChip, ReportFormatChip } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { TableSkeleton } from "@/components/finance/ui/skeleton";
import {
  reportCatalogue,
} from "@/data/reports";
import { formatAmount, formatCompactAmount } from "@/lib/finance/format";
import { downloadCsv } from "@/lib/mosque/export";
import { formatCount, formatLongDate, REFERENCE_DATE } from "@/lib/mosque/format";
import {
  reportCategories,
  reportFormats,
  reportFrequencies,
  reportPeriods,
  type ReportDefinition,
  type ReportFormat,
  type StatMetric,
} from "@/lib/mosque/types";
import { useApiResource } from "@/hooks/use-api";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import type { ReportWindow } from "@/services/financialReportsService";
import {
  fetchReportSummary,
  fetchUserReport,
  fetchDonationsReport,
  fetchExpensesReport,
  fetchFinanceReport,
  fetchVolunteersReport,
  fetchEventsReport,
} from "@/services/reportsService";

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

function openPrintDocument(title: string, period: string, mosqueName: string, prepBy: string, htmlContent: string) {
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
          <div class="meta-item"><span class="meta-label">Period:</span><span class="meta-value">${period}</span></div>
          <div class="meta-item"><span class="meta-label">Prepared On:</span><span class="meta-value">${new Date().toLocaleDateString('en-GB')}</span></div>
          <div class="meta-item"><span class="meta-label">Prepared By:</span><span class="meta-value">${prepBy}</span></div>
          <div class="meta-item"><span class="meta-label">Source:</span><span class="meta-value">Live Database Ledger</span></div>
        </div>
        ${htmlContent}
        <div class="footer">
          <span>NOOR Mosque Management System</span>
          <span>Official Report Summary</span>
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

export function ReportsView({ openGenerateOnMount = false }: { openGenerateOnMount?: boolean }) {
  const { can, user } = useDashboardSession();
  const { notify } = useToast();
  const [reportList, setReportList] = useState<ReportDefinition[]>(reportCatalogue);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [format, setFormat] = useState("all");
  const [frequency, setFrequency] = useState("all");
  const [selected, setSelected] = useState<ReportDefinition | null>(null);
  const [generating, setGenerating] = useState(openGenerateOnMount);

  // Live API hooks for the 7 report routes
  const { data: summaryData, loading: summaryLoading, error: summaryError, refetch: refetchSummary } = useApiResource(
    () => fetchReportSummary(), 
    [], 
    { enabled: can("report.view") }
  );

  const { data: userData } = useApiResource(
    () => fetchUserReport(), 
    [], 
    { enabled: can("report.view") && can("user.view") }
  );

  const { data: donationsData } = useApiResource(
    () => fetchDonationsReport(), 
    [], 
    { enabled: can("report.view") && can("donation.view") }
  );

  // Keep the open drawer pointing at the live row so a generate/schedule change shows straight away.
  const active = selected ? reportList.find((report) => report.id === selected.id) ?? null : null;

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return reportList.filter((report) => {
      if (needle) {
        const haystack = `${report.name} ${report.description} ${report.owner} ${report.id}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (category !== "all" && report.category !== category) return false;
      if (format !== "all" && report.format !== format) return false;
      if (frequency !== "all" && report.frequency !== frequency) return false;
      return true;
    });
  }, [category, format, frequency, reportList, search]);

  const filters: SelectFilter[] = [
    {
      id: "category",
      label: "Area",
      value: category,
      onChange: setCategory,
      options: [{ value: "all", label: "All areas" }, ...reportCategories.map((value) => ({ value, label: value }))],
    },
    {
      id: "format",
      label: "Format",
      value: format,
      onChange: setFormat,
      options: [{ value: "all", label: "Any format" }, ...reportFormats.map((value) => ({ value, label: value }))],
    },
    {
      id: "frequency",
      label: "Frequency",
      value: frequency,
      onChange: setFrequency,
      options: [{ value: "all", label: "Any frequency" }, ...reportFrequencies.map((value) => ({ value, label: value }))],
    },
  ];

  const activeFilterCount =
    (category !== "all" ? 1 : 0) + (format !== "all" ? 1 : 0) + (frequency !== "all" ? 1 : 0);
  const resetFilters = () => {
    setCategory("all");
    setFormat("all");
    setFrequency("all");
  };

  const runReport = async (id: string, period: string, chosenFormat: ReportFormat) => {
    const report = reportList.find((item) => item.id === id);
    if (!report) return;

    try {
      const now = new Date();
      let windowQuery: ReportWindow | undefined = undefined;
      if (period === "This month") {
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        windowQuery = {
          from: `${year}-${month}-01`,
          to: `${year}-${month}-${new Date(year, now.getMonth() + 1, 0).getDate()}`,
        };
      } else if (period === "Last month") {
        const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const year = prevMonthDate.getFullYear();
        const month = String(prevMonthDate.getMonth() + 1).padStart(2, "0");
        windowQuery = {
          from: `${year}-${month}-01`,
          to: `${year}-${month}-${new Date(year, prevMonthDate.getMonth() + 1, 0).getDate()}`,
        };
      }

      const mosqueName = user?.mosqueName || "NOOR Central Mosque";
      const prepBy = user?.name ?? "Super Admin";
      const prepDate = new Date().toLocaleDateString("en-GB");

      let htmlContent = "";
      let csvContent = "";

      if (report.category === "Finance") {
        const res = await fetchFinanceReport(windowQuery);
        csvContent = `"${mosqueName} - ${report.name}"\n` +
          `"Period:","${period}"\n` +
          `"Prepared On:","${prepDate}"\n` +
          `"Prepared By:","${prepBy}"\n\n` +
          `"Account","Count","Amount (${res.currency})"\n` +
          `"Donations",${res.donations.count},${res.donations.total}\n` +
          `"Expenses",${res.expenses.count},${res.expenses.total}\n` +
          `"Salaries",${res.salaries.count},${res.salaries.total}\n` +
          `"Net Balance",-,${res.netBalance}\n`;

        htmlContent = `
          <table>
            <thead><tr><th>Financial Account</th><th class="right">Entries</th><th class="right">Amount (${res.currency})</th></tr></thead>
            <tbody>
              <tr><td>Total Donations</td><td class="right">${res.donations.count}</td><td class="right" style="color: #0d4d3b; font-weight: 600;">${res.donations.total}</td></tr>
              <tr><td>Total Expenses</td><td class="right">${res.expenses.count}</td><td class="right" style="color: #a13228;">${res.expenses.total}</td></tr>
              <tr><td>Total Salaries</td><td class="right">${res.salaries.count}</td><td class="right" style="color: #a13228;">${res.salaries.total}</td></tr>
              <tr class="total-row"><td>Net Balance Result</td><td class="right">-</td><td class="right">${res.netBalance}</td></tr>
            </tbody>
          </table>
        `;
      } else if (report.category === "Community" || report.category === "Governance") {
        const res = await fetchUserReport(windowQuery);
        csvContent = `"${mosqueName} - ${report.name}"\n` +
          `"Period:","${period}"\n` +
          `"Prepared On:","${prepDate}"\n` +
          `"Prepared By:","${prepBy}"\n\n` +
          `"Metric","Count"\n` +
          `"Total Registered Users",${res.total}\n` +
          `"Active Users",${res.active}\n` +
          `"Inactive Users",${res.inactive}\n` +
          `"Volunteers",${res.volunteers}\n` +
          `"New Joined in Period",${res.joined}\n\n` +
          `"Users by Role"\n` +
          `"Role","Count"\n` +
          res.byRole.map(r => `"${r.role}",${r.count}`).join("\n");

        htmlContent = `
          <table>
            <thead><tr><th>Community Metric</th><th class="right">Headcount</th></tr></thead>
            <tbody>
              <tr><td>Total Users</td><td class="right">${res.total}</td></tr>
              <tr><td>Active Accounts</td><td class="right">${res.active}</td></tr>
              <tr><td>Inactive / Deactivated</td><td class="right">${res.inactive}</td></tr>
              <tr><td>Active Volunteers</td><td class="right">${res.volunteers}</td></tr>
              <tr class="total-row"><td>New Joined in Window</td><td class="right">${res.joined}</td></tr>
            </tbody>
          </table>
          <h3 style="margin-top: 24px; color: #0d4d3b;">Breakdown by Role</h3>
          <table>
            <thead><tr><th>Role</th><th class="right">Count</th></tr></thead>
            <tbody>
              ${res.byRole.map(r => `<tr><td>${r.role}</td><td class="right">${r.count}</td></tr>`).join("")}
            </tbody>
          </table>
        `;
      } else {
        const res = await fetchReportSummary(windowQuery);
        csvContent = `"${mosqueName} - ${report.name}"\n` +
          `"Period:","${period}"\n` +
          `"Prepared On:","${prepDate}"\n` +
          `"Prepared By:","${prepBy}"\n\n` +
          `"Area","Metric","Value"\n` +
          `"Community","Total Users",${res.users?.total ?? "N/A"}\n` +
          `"Volunteers","Active",${res.volunteers?.active ?? "N/A"}\n` +
          `"Finance","Total Income",${res.finance?.donations.total ?? "N/A"}\n` +
          `"Finance","Net Balance",${res.finance?.netBalance ?? "N/A"}\n`;

        htmlContent = `
          <table>
            <thead><tr><th>Domain Area</th><th>Summary Metric</th><th class="right">Value</th></tr></thead>
            <tbody>
              <tr><td>Community</td><td>Total Registered Users</td><td class="right">${res.users?.total ?? "N/A"}</td></tr>
              <tr><td>Volunteers</td><td>Active Volunteers</td><td class="right">${res.volunteers?.active ?? "N/A"}</td></tr>
              <tr><td>Finance</td><td>Total Income Received</td><td class="right">${res.finance?.donations.total ? formatAmount(parseFloat(res.finance.donations.total)) : "N/A"}</td></tr>
              <tr class="total-row"><td>Finance</td><td>Net Financial Balance</td><td class="right">${res.finance?.netBalance ? formatAmount(parseFloat(res.finance.netBalance)) : "N/A"}</td></tr>
            </tbody>
          </table>
        `;
      }

      if (chosenFormat === "PDF") {
        openPrintDocument(report.name, period, mosqueName, prepBy, htmlContent);
      } else {
        const safeSlug = report.name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
        const filename = `${safeSlug}_${new Date().toISOString().slice(0, 10)}.csv`;
        triggerFileDownload(filename, "\uFEFF" + csvContent, "text/csv;charset=utf-8;");
      }

      setReportList((current) =>
        current.map((item) => (item.id === id ? { ...item, lastGeneratedAt: REFERENCE_DATE } : item)),
      );

      notify({
        message: `${report.name} Generated`,
        description: chosenFormat === "PDF" ? "Opening printable PDF statement..." : "Downloaded CSV file from live database.",
        tone: "success",
      });
    } catch (err: any) {
      notify({
        message: "Failed to generate report",
        description: err.message || "Could not retrieve report from API",
        tone: "danger",
      });
    }
  };

  const toggleScheduled = (id: string) => {
    const report = reportList.find((item) => item.id === id);
    if (!report) return;
    const next = !report.scheduled;
    setReportList((current) =>
      current.map((item) => (item.id === id ? { ...item, scheduled: next } : item)),
    );
    notify({
      tone: "info",
      message: next ? "Automatic runs on." : "Automatic runs off.",
      description: `${report.name} will ${next ? `run automatically — ${report.frequency.toLowerCase()}` : "now only run when someone asks for it"}.`,
    });
  };

  const exportCsv = () => {
    downloadCsv("noor-mosque-reports.csv", filtered, [
      { header: "ID", value: (report) => report.id },
      { header: "Report", value: (report) => report.name },
      { header: "Area", value: (report) => report.category },
      { header: "Format", value: (report) => report.format },
      { header: "Frequency", value: (report) => report.frequency },
      { header: "Owner", value: (report) => report.owner },
      { header: "Automatic", value: (report) => (report.scheduled ? "Yes" : "No") },
      { header: "Last generated", value: (report) => report.lastGeneratedAt || "Never" },
    ]);
    notify({
      tone: "info",
      message: "Export downloaded.",
      description: `${formatCount(filtered.length)} rows, matching the filters currently applied.`,
    });
  };

  const columns: Column<ReportDefinition>[] = [
    {
      key: "report",
      header: "Report",
      cell: (report) => (
        <div className="min-w-0">
          <p className="font-medium text-[#17211d]">{report.name}</p>
          <p className="mt-0.5 text-[12px] leading-4 text-[#8b938d]">{report.description}</p>
        </div>
      ),
      sortValue: (report) => report.name,
    },
    {
      key: "category",
      header: "Area",
      cell: (report) => <ReportCategoryChip category={report.category} />,
      sortValue: (report) => report.category,
    },
    {
      key: "format",
      header: "Format",
      cell: (report) => <ReportFormatChip format={report.format} />,
      sortValue: (report) => report.format,
      secondary: true,
    },
    {
      key: "frequency",
      header: "Frequency",
      cell: (report) => <span className="whitespace-nowrap text-[13px]">{report.frequency}</span>,
      sortValue: (report) => report.frequency,
      secondary: true,
    },
    {
      key: "lastGenerated",
      header: "Last generated",
      align: "right",
      cell: (report) =>
        report.lastGeneratedAt ? (
          <span className="whitespace-nowrap tabular-nums text-[13px]">{formatLongDate(report.lastGeneratedAt)}</span>
        ) : (
          <span className="text-[13px] text-[#8b938d]">Never</span>
        ),
      sortValue: (report) => report.lastGeneratedAt,
    },
    {
      key: "actions",
      header: "View",
      headerHidden: true,
      align: "right",
      cell: (report) => (
        <IconButton icon="eye" label={`Open ${report.name}`} onClick={() => setSelected(report)} />
      ),
    },
  ];

  if (summaryLoading && !summaryData) return <TableSkeleton />;
  if (summaryError) return <FinanceErrorState description={summaryError} onRetry={refetchSummary} />;

  // Live calculations for metrics
  const liveDonationTotal = donationsData ? parseFloat(donationsData.total) : summaryData?.finance ? parseFloat(summaryData.finance.donations.total) : 0;
  const liveMemberCount = userData?.total ?? summaryData?.users?.total ?? 0;
  const liveVolunteersCount = summaryData?.volunteers?.active ?? userData?.volunteers ?? 0;

  const liveMetrics: StatMetric[] = [
    {
      id: "total",
      label: "Reports available",
      value: formatCount(reportList.length),
      hint: "Across every area",
      icon: "file-text",
      tone: "neutral",
    },
    {
      id: "scheduled",
      label: "Scheduled",
      value: formatCount(reportList.filter(r => r.scheduled).length),
      hint: "Run automatically",
      icon: "repeat",
      tone: "positive",
    },
    {
      id: "members",
      label: "Community members",
      value: formatCount(liveMemberCount),
      hint: `${liveVolunteersCount} active volunteers`,
      icon: "users",
      tone: "positive",
    },
    {
      id: "income",
      label: "Verified donations",
      value: formatCompactAmount(liveDonationTotal),
      hint: "From verified ledger",
      icon: "wallet",
      tone: "gold",
    },
  ];

  // Dynamic segments for charts
  const liveFundSegments: Segment[] = (donationsData?.byPaymentMethod && donationsData.byPaymentMethod.length > 0)
    ? donationsData.byPaymentMethod.map((row) => ({
        label: row.paymentMethod,
        value: parseFloat(row.total),
        valueLabel: formatCompactAmount(parseFloat(row.total)),
      }))
    : [{ label: "General", value: liveDonationTotal || 1, valueLabel: formatCompactAmount(liveDonationTotal) }];

  const liveRoleSegments: Segment[] = (userData?.byRole && userData.byRole.length > 0)
    ? userData.byRole.map((r) => ({ label: r.role, value: r.count }))
    : [{ label: "Members", value: liveMemberCount || 1 }];

  const liveStatusSegments: Segment[] = userData
    ? [
        { label: "Active", value: userData.active },
        { label: "Inactive", value: userData.inactive },
      ]
    : [{ label: "Active", value: liveMemberCount || 1 }];

  return (
    <div className="space-y-4">
      <StatGrid metrics={liveMetrics} />

      {/* ---- The year at a glance ---- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Money received" description="Total received across verified donations." icon="trending-up" />
          <PanelBody>
            <MiniBarChart
              points={[
                { label: "Total", value: liveDonationTotal },
              ]}
              formatValue={formatCompactAmount}
              caption={`Verified ledger total · ${formatAmount(liveDonationTotal)}`}
            />
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Income by payment method" description="How the mosque's giving arrived." icon="wallet" />
          <PanelBody>
            <DonutChart
              segments={liveFundSegments}
              centerValue={formatCompactAmount(liveDonationTotal)}
              centerLabel="Received"
            />
          </PanelBody>
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title="Community at a glance"
          description={`${formatCount(liveMemberCount)} registered people — live breakdown.`}
          icon="users"
        />
        <PanelBody>
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
            <div>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[.08em] text-[#5c655f]">By Role</p>
              <SplitBar segments={liveRoleSegments} label="Users by role" />
            </div>
            <div>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[.08em] text-[#5c655f]">Account Status</p>
              <SplitBar segments={liveStatusSegments} label="Account status" />
            </div>
          </div>
        </PanelBody>
      </Panel>

      {/* ---- The catalogue ---- */}
      <Panel>
        <PanelHeader
          title="Report catalogue"
          description="Every report the mosque produces, across community, finance, operations and governance."
          icon="chart"
          actions={
            <>
              <Button variant="secondary" size="sm" icon="download" onClick={exportCsv}>
                Export
              </Button>
              <Can permission="report.export">
                <Button size="sm" icon="chart" onClick={() => setGenerating(true)}>
                  Generate report
                </Button>
              </Can>
            </>
          }
        />

        <FinanceFilters
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "Search reports by name, owner or ID…",
            label: "Search reports by name, owner or ID",
          }}
          filters={filters}
          activeCount={activeFilterCount}
          onReset={resetFilters}
        />

        <DataTable
          rows={filtered}
          columns={columns}
          getRowKey={(report) => report.id}
          caption="The mosque's report catalogue"
          emptyState={
            <FinanceEmptyState
              icon="chart"
              title="No reports found."
              description={
                activeFilterCount > 0 || search
                  ? "Nothing matches the current search and filters. Try clearing them."
                  : "The catalogue is empty."
              }
              action={
                <Button variant="secondary" size="sm" onClick={resetFilters}>
                  Clear filters
                </Button>
              }
            />
          }
        />
      </Panel>

      {/* Drawer */}
      {active && (
        <ReportDetailDrawer
          report={active}
          onClose={() => setSelected(null)}
          onGenerate={(report) => {
            setSelected(null);
            setGenerating(true);
          }}
          onToggleScheduled={toggleScheduled}
        />
      )}

      {/* Generate Report Modal */}
      <GenerateReportModal
        open={generating}
        reports={reportList}
        onClose={() => setGenerating(false)}
        onRun={runReport}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Drawer
 * -------------------------------------------------------------------------- */

function ReportDetailDrawer({
  report,
  onClose,
  onGenerate,
  onToggleScheduled,
}: {
  report: ReportDefinition;
  onClose: () => void;
  onGenerate: (report: ReportDefinition) => void;
  onToggleScheduled: (id: string) => void;
}) {
  const onDemand = report.frequency === "On demand";

  return (
    <DetailDrawer
      open
      onClose={onClose}
      eyebrow={report.id}
      title={report.name}
      subtitle={`${report.category} · ${report.frequency}`}
      badge={
        <>
          <ReportCategoryChip category={report.category} />
          <ReportFormatChip format={report.format} />
        </>
      }
      footer={
        <>
          <Can permission="report.export">
            <Button size="sm" icon="download" onClick={() => onGenerate(report)}>
              Generate now
            </Button>
          </Can>
          {!onDemand ? (
            <Can permission="report.manage">
              <Button
                size="sm"
                variant="secondary"
                icon={report.scheduled ? "pause" : "repeat"}
                onClick={() => onToggleScheduled(report.id)}
              >
                {report.scheduled ? "Turn off automatic" : "Turn on automatic"}
              </Button>
            </Can>
          ) : null}
          <Button size="sm" variant="ghost" onClick={onClose} className="ml-auto">
            Close
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {report.lastGeneratedAt === "" ? (
          <InlineNotice tone="gold" icon="info">
            Not generated yet — run it to produce the first copy.
          </InlineNotice>
        ) : onDemand ? (
          <InlineNotice tone="neutral" icon="clock">
            Run on demand — this report is produced when someone asks for it, not on a schedule.
          </InlineNotice>
        ) : (
          <InlineNotice tone="info" icon="repeat">
            {report.scheduled
              ? `Runs automatically — ${report.frequency.toLowerCase()}.`
              : `Automatic runs are off — this ${report.frequency.toLowerCase()} report only runs when someone asks for it.`}
          </InlineNotice>
        )}

        <DetailSection title="About">
          <p className="text-[13px] leading-6 text-[#4d564f]">{report.description}</p>
        </DetailSection>

        <DetailSection title="What it includes">
          <ul className="space-y-2">
            {report.includes.map((line) => (
              <li key={line} className="flex items-start gap-2 text-[13px] leading-5 text-[#3d453f]">
                <Icon name="check-circle" size={15} className="mt-0.5 shrink-0 text-[#0d4d3b]" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </DetailSection>

        <DetailSection title="Details">
          <DetailGrid>
            <DetailField label="Area" value={<ReportCategoryChip category={report.category} />} />
            <DetailField label="Format" value={<ReportFormatChip format={report.format} />} />
            <DetailField label="Frequency" value={report.frequency} />
            <DetailField label="Owner" value={report.owner} />
            <DetailField
              label="Last generated"
              value={report.lastGeneratedAt ? formatLongDate(report.lastGeneratedAt) : "Never"}
            />
            <DetailField label="Automatic" value={onDemand ? "On demand" : report.scheduled ? "On" : "Off"} />
          </DetailGrid>
        </DetailSection>
      </div>
    </DetailDrawer>
  );
}

/* -------------------------------------------------------------------------- *
 * Generate Modal
 * -------------------------------------------------------------------------- */

function GenerateReportModal({
  open,
  reports,
  onClose,
  onRun,
}: {
  open: boolean;
  reports: ReportDefinition[];
  onClose: () => void;
  onRun: (id: string, period: string, format: ReportFormat) => void;
}) {
  const [reportId, setReportId] = useState(reports[0]?.id ?? "");
  const [period, setPeriod] = useState<string>(reportPeriods[0]);
  const [format, setFormat] = useState<ReportFormat>(reports[0]?.format ?? "PDF");

  const chosen = reports.find((report) => report.id === reportId);

  const reset = () => {
    const first = reports[0];
    setReportId(first?.id ?? "");
    setPeriod(reportPeriods[0]);
    setFormat(first?.format ?? "PDF");
  };

  const close = () => {
    reset();
    onClose();
  };

  const selectReport = (id: string) => {
    setReportId(id);
    const next = reports.find((report) => report.id === id);
    if (next) setFormat(next.format);
  };

  const submit = () => {
    if (!chosen) return;
    onRun(chosen.id, period, format);
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Generate a report"
      description="Pick a report and a period to query live ledger aggregates from the database."
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button icon="chart" onClick={submit}>
            {format === "PDF" ? "Generate & Print PDF" : "Generate & Download CSV"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <SelectField
          label="Report"
          required
          value={reportId}
          options={reports.map((report) => ({ value: report.id, label: `${report.name} · ${report.category}` }))}
          onChange={(event) => selectReport(event.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Period"
            required
            value={period}
            options={reportPeriods}
            onChange={(event) => setPeriod(event.target.value)}
          />
          <SelectField
            label="Format"
            required
            hint="PDF for a formatted document, CSV to work on the figures."
            value={format}
            options={reportFormats}
            onChange={(event) => setFormat(event.target.value as ReportFormat)}
          />
        </div>

        {chosen ? (
          <div className="rounded-md border border-[#e2e1d6] bg-[#faf9f4] px-4 py-3">
            <p className="text-[12.5px] leading-5 text-[#4d564f]">{chosen.description}</p>
            <p className="mt-1.5 text-[11.5px] text-[#8b938d]">
              {chosen.owner} · {chosen.lastGeneratedAt ? `last run ${formatLongDate(chosen.lastGeneratedAt)}` : "not run yet"}
            </p>
          </div>
        ) : null}

        <InlineNotice icon="shield">
          The file is generated by querying live backend aggregates, returning only verified ledger figures.
        </InlineNotice>
      </div>
    </Modal>
  );
}
