"use client";

import { useMemo, useState } from "react";
import { Chip } from "@/components/finance/ui/badge";
import { Button, IconButton } from "@/components/finance/ui/button";
import { DataTable, type Column } from "@/components/finance/ui/data-table";
import { SegmentedControl } from "@/components/finance/ui/filters";
import { SelectField, SummaryRow, TextField } from "@/components/finance/ui/form-field";
import { Icon } from "@/components/finance/ui/icon";
import { Modal } from "@/components/finance/ui/modal";
import { NetMoney } from "@/components/finance/ui/money";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { InlineNotice, FinanceEmptyState } from "@/components/finance/ui/states";
import { MiniStat } from "@/components/finance/ui/summary-card";
import {
  fundBalanceRows,
  generatedReports,
  incomeStatementExpenses,
  incomeStatementIncome,
  incomeStatementPeriod,
  incomeStatementTotals,
  reportCategories,
  reportDefinitions,
  reportFormatOptions,
  reportRangeOptions,
} from "@/data/finance/reports";
import { formatAmount, formatDate, formatOptionalDate, sumAmount } from "@/lib/finance/format";
import type { GeneratedReport, ReportCategory, ReportRow } from "@/lib/finance/types";

/**
 * Financial reports. These are what the committee reads at the monthly meeting and what a donor is
 * entitled to ask for, so the two statements a mosque is actually held to are shown in full on the
 * page rather than hidden behind a download button.
 *
 * Every figure here is a sum of ledger entries. Nothing is typed in, which is why there is no edit
 * anywhere on this screen: a wrong report means a wrong entry, and that gets voided and re-recorded.
 */

type ReportCard = (typeof reportDefinitions)[number];

const categoryNotes: Record<ReportCategory, string> = {
  Statements: "What the committee reads at the monthly meeting.",
  Income: "Where the money came from, and from whom.",
  Spending: "Where it went, and who approved it.",
  People: "Members, staff and who still owes what.",
};

/** One side of the income statement. Kept plain so it prints as a statement, not as a dashboard. */
function StatementBlock({
  title,
  rows,
  total,
  totalLabel,
  accent,
}: {
  title: string;
  rows: ReportRow[];
  total: number;
  totalLabel: string;
  accent: string;
}) {
  return (
    <div className="rounded-md border border-[#e2e1d6] bg-[#fbfaf5]">
      <p className="border-b border-[#eceae0] px-4 py-2.5 text-[11px] font-bold uppercase tracking-[.08em] text-[#5c655f]">{title}</p>
      <ul className="divide-y divide-[#f0efe6]">
        {rows.map((row) => (
          <li key={row.label} className="flex items-baseline justify-between gap-4 px-4 py-2.5">
            <span className="min-w-0">
              <span className="block text-[13px] text-[#3d453f]">{row.label}</span>
              {row.note ? <span className="block text-[11.5px] text-[#8b938d]">{row.note}</span> : null}
            </span>
            <span className="shrink-0 text-[13.5px] font-semibold tabular-nums text-[#17211d]">
              {formatAmount(row.income ?? row.expense ?? 0)}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex items-baseline justify-between gap-4 border-t border-[#d5d3c6] px-4 py-3">
        <span className="text-[12px] font-bold uppercase tracking-[.06em] text-[#3d453f]">{totalLabel}</span>
        <span className="text-[16px] font-semibold tabular-nums" style={{ color: accent }}>
          {formatAmount(total)}
        </span>
      </div>
    </div>
  );
}

export function ReportsView() {
  const [category, setCategory] = useState<ReportCategory>("Statements");
  const [target, setTarget] = useState<ReportCard | null>(null);
  const [range, setRange] = useState("this-month");
  const [format, setFormat] = useState<GeneratedReport["format"]>("PDF");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const shown = useMemo(() => reportDefinitions.filter((report) => report.category === category), [category]);

  const categoryOptions = reportCategories.map((entry) => ({
    value: entry.value,
    label: `${entry.label} (${reportDefinitions.filter((report) => report.category === entry.value).length})`,
  }));

  const fundTotals = {
    income: sumAmount([...fundBalanceRows], (row) => row.income ?? 0),
    expense: sumAmount([...fundBalanceRows], (row) => row.expense ?? 0),
    net: sumAmount([...fundBalanceRows], (row) => row.net ?? 0),
  };

  const openGenerate = (report: ReportCard) => {
    setTarget(report);
    setRange("this-month");
    setFormat("PDF");
    setFrom("");
    setTo("");
    setSubmitted(false);
  };

  const customIncomplete = range === "custom" && (!from || !to);

  const submitGenerate = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (customIncomplete) return;
    const report = target;
    const rangeLabel = range === "custom" ? `${formatDate(from)} to ${formatDate(to)}` : reportRangeOptions.find((option) => option.value === range)?.label;
    setTarget(null);
    setNotice(
      `Checked and ready: ${report?.name} for ${rangeLabel} as ${format}. The file is built by the finance API from the ledger, and that is not connected yet, so nothing was produced.`,
    );
  };

  const generatedColumns: Column<GeneratedReport>[] = [
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
          icon="download"
          label={`Download ${row.name}`}
          onClick={() =>
            setNotice(`${row.name} (${row.format}) would be downloaded from the finance API. It is not connected yet, so nothing came through.`)
          }
        />
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {notice ? (
        <InlineNotice tone="gold" icon="info">
          {notice}
        </InlineNotice>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat label="Received this period" value={formatAmount(incomeStatementTotals.income)} hint={incomeStatementPeriod} icon="arrow-down-right" tone="positive" />
        <MiniStat label="Spent this period" value={formatAmount(incomeStatementTotals.expense)} hint={incomeStatementPeriod} icon="arrow-up" tone="negative" />
        <MiniStat
          label="Left over"
          value={formatAmount(incomeStatementTotals.net)}
          hint={incomeStatementTotals.net >= 0 ? "Added to the funds" : "Taken from the funds"}
          icon="scale"
          tone={incomeStatementTotals.net >= 0 ? "positive" : "negative"}
        />
        <MiniStat label="Held across funds" value={formatAmount(fundTotals.net)} hint={`${fundBalanceRows.length} funds`} icon="vault" tone="gold" />
      </div>

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
                  <Icon name={report.icon} size={17} />
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

      {/* ---- Income and expense statement ---- */}
      <Panel>
        <PanelHeader title="Income and expense statement" description={incomeStatementPeriod} icon="file-text" as="h2" />
        <PanelBody>
          <div className="grid gap-4 lg:grid-cols-2">
            <StatementBlock title="Money received" rows={incomeStatementIncome} total={incomeStatementTotals.income} totalLabel="Total received" accent="#0b4634" />
            <StatementBlock title="Money spent" rows={incomeStatementExpenses} total={incomeStatementTotals.expense} totalLabel="Total spent" accent="#94291f" />
          </div>
          <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3 rounded-md border border-[#cfd4cd] bg-[#f1f4ef] px-4 py-3.5">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[.06em] text-[#3d453f]">
                {incomeStatementTotals.net >= 0 ? "Surplus for the period" : "Shortfall for the period"}
              </p>
              <p className="mt-0.5 text-[11.5px] text-[#69726d]">Received less spent. Transfers between funds are not counted either way.</p>
            </div>
            <NetMoney value={incomeStatementTotals.net} className="text-[22px]" />
          </div>
        </PanelBody>
      </Panel>

      {/* ---- Fund balances ---- */}
      <Panel>
        <PanelHeader title="Fund balances" description="What each promise is holding right now" icon="vault" as="h2" />
        <PanelBody>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left">
              <caption className="sr-only">Balance held in each fund, with money in and money out</caption>
              <thead>
                <tr className="border-b border-[#e2e1d6]">
                  <th scope="col" className="pb-2 text-[11px] font-bold uppercase tracking-[.06em] text-[#8b938d]">
                    Fund
                  </th>
                  <th scope="col" className="pb-2 text-right text-[11px] font-bold uppercase tracking-[.06em] text-[#8b938d]">
                    Money in
                  </th>
                  <th scope="col" className="pb-2 text-right text-[11px] font-bold uppercase tracking-[.06em] text-[#8b938d]">
                    Money out
                  </th>
                  <th scope="col" className="pb-2 text-right text-[11px] font-bold uppercase tracking-[.06em] text-[#8b938d]">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody>
                {fundBalanceRows.map((row) => (
                  <tr key={row.label} className="border-b border-[#f0efe6]">
                    <th scope="row" className="py-2.5 pr-4 font-normal">
                      <span className="block text-[13px] font-medium text-[#17211d]">{row.label}</span>
                      {row.note ? <span className="block text-[11.5px] text-[#8b938d]">{row.note}</span> : null}
                    </th>
                    <td className="py-2.5 text-right text-[13px] tabular-nums text-[#0b4634]">{formatAmount(row.income ?? 0)}</td>
                    <td className="py-2.5 text-right text-[13px] tabular-nums text-[#94291f]">{formatAmount(row.expense ?? 0)}</td>
                    <td className="py-2.5 text-right text-[13.5px] font-semibold tabular-nums text-[#17211d]">{formatAmount(row.net ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" className="pt-3 text-[12px] font-bold uppercase tracking-[.06em] text-[#3d453f]">
                    All funds
                  </th>
                  <td className="pt-3 text-right text-[13px] font-semibold tabular-nums text-[#0b4634]">{formatAmount(fundTotals.income)}</td>
                  <td className="pt-3 text-right text-[13px] font-semibold tabular-nums text-[#94291f]">{formatAmount(fundTotals.expense)}</td>
                  <td className="pt-3 text-right text-[15px] font-semibold tabular-nums text-[#073a2d]">{formatAmount(fundTotals.net)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </PanelBody>
        <PanelFooter>
          <p className="text-[12px] text-[#69726d]">
            A restricted fund may only be spent on what it was collected for. A healthy balance in one fund does not cover a
            shortfall in another.
          </p>
        </PanelFooter>
      </Panel>

      {/* ---- Recently generated ---- */}
      <Panel>
        <PanelHeader title="Recently prepared" description="Files somebody has already produced" icon="download" />
        <DataTable
          rows={generatedReports}
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

      {/* ---- Generate ---- */}
      <Modal
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        title={target ? target.name : "Generate a report"}
        description={target?.rangeHint}
        footer={
          <>
            <Button variant="secondary" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" form="generate-report" icon="download">
              Generate
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
            hint="PDF for the committee, Excel or CSV to work on the figures."
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
            The file is put together by the finance API, not in your browser, so a report only ever contains figures you are
            allowed to see.
          </InlineNotice>
        </form>
      </Modal>
    </div>
  );
}
