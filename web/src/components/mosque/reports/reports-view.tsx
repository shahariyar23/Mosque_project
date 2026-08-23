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
import { FinanceEmptyState, InlineNotice } from "@/components/finance/ui/states";
import { DonutChart, MiniBarChart, SplitBar, type Segment } from "@/components/ui/charts";
import { DetailDrawer, DetailField, DetailGrid, DetailSection } from "@/components/ui/detail-drawer";
import { StatGrid } from "@/components/ui/stat-card";
import { ReportCategoryChip, ReportFormatChip } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import {
  incomeByFund,
  membersByAge,
  membersByTier,
  receivedByMonth,
  reportCatalogue,
  reportHeadline,
  reportStats,
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

/**
 * The reporting hub — every report the mosque produces, across community, finance, operations and
 * governance, with the year's headline figures at the top.
 *
 * This is the shelf, not the accounts. The ledger-level statements — income and expenditure, fund
 * balances — live under Finance → Financial reports and are built from verified entries; this page
 * complements them with a cross-domain catalogue and a year-at-a-glance. Nothing is really produced:
 * "generating" a report only stamps it as run in this browser, and the charts are drawn from the
 * shared kit, so a future `/reports` endpoint drops straight in behind it.
 */

const metrics: StatMetric[] = [
  {
    id: "total",
    label: "Reports available",
    value: formatCount(reportStats.total),
    hint: "Across every area",
    icon: "file-text",
    tone: "neutral",
  },
  {
    id: "scheduled",
    label: "Scheduled",
    value: formatCount(reportStats.scheduled),
    hint: "Run automatically",
    icon: "repeat",
    tone: "positive",
  },
  {
    id: "run",
    label: "Run this month",
    value: formatCount(reportStats.runThisMonth),
    hint: "Generated in August",
    icon: "check-circle",
    tone: "positive",
  },
  {
    id: "categories",
    label: "Categories",
    value: formatCount(reportStats.categories),
    hint: "Community to governance",
    icon: "grid",
    tone: "gold",
  },
];

const fundSegments: Segment[] = incomeByFund.map((row) => ({
  label: row.label,
  value: row.value,
  valueLabel: formatCompactAmount(row.value),
}));

const tierSegments: Segment[] = membersByTier.map((row) => ({ label: row.label, value: row.value }));
const ageSegments: Segment[] = membersByAge.map((row) => ({ label: row.label, value: row.value }));

export function ReportsView({ openGenerateOnMount = false }: { openGenerateOnMount?: boolean }) {
  const { notify } = useToast();
  const [reportList, setReportList] = useState<ReportDefinition[]>(reportCatalogue);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [format, setFormat] = useState("all");
  const [frequency, setFrequency] = useState("all");
  const [selected, setSelected] = useState<ReportDefinition | null>(null);
  const [generating, setGenerating] = useState(openGenerateOnMount);

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
  const clearAll = () => {
    resetFilters();
    setSearch("");
  };

  const runReport = (id: string, period: string, chosenFormat: ReportFormat) => {
    const report = reportList.find((item) => item.id === id);
    if (!report) return;
    setReportList((current) =>
      current.map((item) => (item.id === id ? { ...item, lastGeneratedAt: REFERENCE_DATE } : item)),
    );
    notify({
      message: "Report generated.",
      description: `${report.name} for ${period.toLowerCase()} as ${chosenFormat} — front-end preview, nothing was really produced or downloaded.`,
    });
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

  return (
    <div className="space-y-4">
      <StatGrid metrics={metrics} />

      {/* ---- The year at a glance ---- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Money received" description="Total received each month, year to date." icon="trending-up" />
          <PanelBody>
            <MiniBarChart
              points={receivedByMonth}
              formatValue={formatCompactAmount}
              caption={`Received each month · ${formatAmount(reportHeadline.receivedYtd)} year to date`}
            />
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Income by fund" description="Where the year's giving has been directed." icon="wallet" />
          <PanelBody>
            <DonutChart
              segments={fundSegments}
              centerValue={formatCompactAmount(reportHeadline.receivedYtd)}
              centerLabel="Received"
            />
          </PanelBody>
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title="Community at a glance"
          description={`${formatCount(reportHeadline.members)} members — how the roll breaks down.`}
          icon="users"
        />
        <PanelBody>
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
            <div>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[.08em] text-[#5c655f]">By tier</p>
              <SplitBar segments={tierSegments} label="Members by tier" />
            </div>
            <div>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[.08em] text-[#5c655f]">By age</p>
              <SplitBar segments={ageSegments} label="Members by age" />
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
                activeFilterCount > 0 || search ? (
                  <Button variant="secondary" icon="close" onClick={clearAll}>
                    Clear search and filters
                  </Button>
                ) : undefined
              }
            />
          }
          initialSort={{ key: "lastGenerated", direction: "desc" }}
          pageSize={10}
          mobileTitle={(report) => report.name}
          mobileSubtitle={(report) => `${report.category} · ${report.format}`}
          mobileTrailing={(report) => <span className="text-[12px] text-[#69726d]">{report.frequency}</span>}
          mobileHiddenKeys={["report", "category", "format", "frequency"]}
        />

        <PanelFooter>
          <p className="text-[12px] text-[#69726d]">
            Nothing is produced in the browser — generating a report is a preview only. For ledger-level statements —
            income and expenditure, fund balances — see Finance → Financial reports.
          </p>
        </PanelFooter>
      </Panel>

      {active ? (
        <ReportDetailDrawer
          report={active}
          onClose={() => setSelected(null)}
          onGenerate={(report) => runReport(report.id, "This month", report.format)}
          onToggleScheduled={toggleScheduled}
        />
      ) : null}

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
 * Detail drawer
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
 * Generate
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

  // Default the format to the chosen report's own each time the report changes.
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
      description="Pick a report and a period. Reports are put together by the API from live data, and that is not connected yet — this is a preview."
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button icon="chart" onClick={submit}>
            Generate
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
            hint="PDF for a document, CSV or Excel to work on the figures."
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

        <InlineNotice tone="gold" icon="shield">
          Front-end preview — the report is stamped as run in this browser only. Nothing is really produced or downloaded.
        </InlineNotice>
      </div>
    </Modal>
  );
}
