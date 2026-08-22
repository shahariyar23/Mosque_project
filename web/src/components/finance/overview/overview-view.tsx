"use client";

import Link from "next/link";
import { useState } from "react";
import { TransactionStatusBadge, TransactionTypeBadge, Chip } from "@/components/finance/ui/badge";
import { ButtonLink } from "@/components/finance/ui/button";
import { DataTable, type Column } from "@/components/finance/ui/data-table";
import { SegmentedControl } from "@/components/finance/ui/filters";
import { FlowChart, FlowChartLegend } from "@/components/finance/overview/flow-chart";
import { Icon, type IconName } from "@/components/finance/ui/icon";
import { SignedMoney } from "@/components/finance/ui/money";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/finance/ui/panel";
import { ProgressBar } from "@/components/finance/ui/progress";
import { FinanceSummaryGrid, MiniStat } from "@/components/finance/ui/summary-card";
import { FinanceEmptyState, InlineNotice } from "@/components/finance/ui/states";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import { activeFunds } from "@/data/finance/funds";
import {
  chartCaptions,
  chartGroupingOptions,
  chartSeries,
  contributionSummary,
  dateRangeCaptions,
  dateRangeOptions,
  expenseFlow,
  incomeFlow,
  pendingApprovals,
  summaryMetrics,
} from "@/data/finance/overview";
import { recentTransactions } from "@/data/finance/transactions";
import { formatAmount, formatCollectionRate, formatShortDate, sumAmount } from "@/lib/finance/format";
import type { Permission } from "@/lib/permissions";
import type { ChartGrouping, DateRangeKey, FlowLine, Transaction } from "@/lib/finance/types";

/**
 * Finance overview. The first screen a treasurer opens, so it answers four questions in order:
 * what is in the funds, what came in and went out this month, what is waiting on somebody, and what
 * happened most recently.
 *
 * Every row that leads somewhere is checked against a permission, not a role. The three attention
 * rows are filtered with `can()` so a cashier who cannot see the expense queue is not told there are
 * two expenses waiting — a count is information too. Hiding them is presentation; the API will
 * refuse the request as well.
 */

const attentionRows: ReadonlyArray<{
  key: string;
  count: number;
  label: string;
  hint: string;
  href: string;
  icon: IconName;
  permission: Permission;
}> = [
  {
    key: "expenses",
    count: pendingApprovals.expenses,
    label: "Expenses waiting for approval",
    hint: "Quotations submitted, not yet signed off",
    href: "/dashboard/finance/expenses",
    icon: "receipt-minus",
    permission: "expense.view",
  },
  {
    key: "salaries",
    count: pendingApprovals.salaries,
    label: "Salary payments pending",
    hint: "This month's run is not closed",
    href: "/dashboard/finance/salaries",
    icon: "badge",
    permission: "salary.view",
  },
  {
    key: "transactions",
    count: pendingApprovals.transactions,
    label: "Transactions awaiting verification",
    hint: "Recorded in the ledger, not yet verified",
    href: "/dashboard/finance/transactions",
    icon: "list",
    permission: "transaction.view",
  },
];

const transactionColumns: Column<Transaction>[] = [
  {
    key: "date",
    header: "Date",
    cell: (row) => <span className="whitespace-nowrap tabular-nums">{formatShortDate(row.date)}</span>,
    sortValue: (row) => row.date,
  },
  {
    key: "description",
    header: "Description",
    cell: (row) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-[#17211d]">{row.description}</p>
        <p className="mt-0.5 text-[12px] text-[#8b938d]">{row.category}</p>
      </div>
    ),
  },
  {
    key: "type",
    header: "Type",
    cell: (row) => <TransactionTypeBadge type={row.type} />,
    sortValue: (row) => row.type,
  },
  {
    key: "fund",
    header: "Fund",
    cell: (row) => <Chip>{row.fundName}</Chip>,
    secondary: true,
  },
  {
    key: "amount",
    header: "Amount",
    align: "right",
    cell: (row) => <SignedMoney value={row.amount} type={row.type} />,
    sortValue: (row) => row.amount,
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => <TransactionStatusBadge status={row.status} />,
    sortValue: (row) => row.status,
  },
];

function FlowList({ lines, tone, total }: { lines: readonly FlowLine[]; tone: "success" | "danger"; total: number }) {
  return (
    <ul className="space-y-4">
      {lines.map((line) => (
        <li key={line.label}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[13.5px] font-medium text-[#3d453f]">{line.label}</p>
            <p className="shrink-0 text-[14px] font-semibold tabular-nums text-[#17211d]">{formatAmount(line.amount)}</p>
          </div>
          <ProgressBar
            className="mt-2"
            value={line.amount}
            max={total}
            tone={tone}
            label={`${line.label}, ${formatAmount(line.amount)} of ${formatAmount(total)}`}
          />
          {line.hint ? <p className="mt-1.5 text-[12px] text-[#8b938d]">{line.hint}</p> : null}
        </li>
      ))}
    </ul>
  );
}

export function FinanceOverviewView() {
  const { can } = useDashboardSession();
  const [range, setRange] = useState<DateRangeKey>("this-month");
  const [grouping, setGrouping] = useState<ChartGrouping>("monthly");

  const incomeTotal = sumAmount(incomeFlow, (line) => line.amount);
  const expenseTotal = sumAmount(expenseFlow, (line) => line.amount);
  const fundTotal = sumAmount(activeFunds, (fund) => fund.balance);
  const visibleAttention = attentionRows.filter((row) => can(row.permission));
  const attentionTotal = sumAmount(visibleAttention, (row) => row.count);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <SegmentedControl
          label="Period"
          value={range}
          onChange={setRange}
          options={dateRangeOptions.filter((option) => option.value !== "custom")}
        />
        <p className="text-[12.5px] text-[#69726d]">
          Showing <span className="font-semibold text-[#3d453f]">{dateRangeCaptions[range]}</span>
        </p>
      </div>

      <FinanceSummaryGrid metrics={summaryMetrics} />

      {range === "this-month" ? null : (
        <InlineNotice tone="gold" icon="info">
          The sample data covers August 2026 only. The period switch shapes the request the finance API will answer once
          it is connected; the figures above stay on the current month until then.
        </InlineNotice>
      )}

      <Panel>
        <PanelHeader
          title="Income against expenses"
          description={chartCaptions[grouping]}
          icon="chart"
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <FlowChartLegend />
              <SegmentedControl label="Grouping" size="sm" value={grouping} onChange={setGrouping} options={chartGroupingOptions} />
            </div>
          }
        />
        <PanelBody>
          <FlowChart points={chartSeries[grouping]} caption={chartCaptions[grouping]} />
        </PanelBody>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Where the money came from" description={`${formatAmount(incomeTotal)} received this month`} icon="arrow-down-right" />
          <PanelBody>
            <FlowList lines={incomeFlow} tone="success" total={incomeTotal} />
          </PanelBody>
          <PanelFooter>
            <p className="text-[12px] text-[#69726d]">Contributions, donations and rent, before anything was spent.</p>
          </PanelFooter>
        </Panel>

        <Panel>
          <PanelHeader title="Where it went" description={`${formatAmount(expenseTotal)} paid out this month`} icon="receipt-minus" />
          <PanelBody>
            <FlowList lines={expenseFlow} tone="danger" total={expenseTotal} />
          </PanelBody>
          <PanelFooter>
            <p className="text-[12px] text-[#69726d]">Only money already disbursed. Approved but unpaid items are not expenses yet.</p>
          </PanelFooter>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader
            title="Fund balances"
            description={`${formatAmount(fundTotal)} across ${activeFunds.length} active funds`}
            icon="vault"
            actions={
              can("fund.view") ? (
                <ButtonLink href="/dashboard/finance/funds" variant="ghost" size="sm" iconAfter="chevron-right">
                  Manage funds
                </ButtonLink>
              ) : null
            }
          />
          <PanelBody>
            <ul className="space-y-4">
              {activeFunds.map((fund) => (
                <li key={fund.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate text-[13.5px] font-semibold text-[#17211d]">{fund.name}</p>
                      <Chip>{fund.purpose}</Chip>
                    </div>
                    <p className="shrink-0 text-[14px] font-semibold tabular-nums text-[#17211d]">{formatAmount(fund.balance)}</p>
                  </div>
                  <ProgressBar
                    className="mt-2"
                    value={fund.balance}
                    max={fundTotal}
                    tone={fund.purpose === "Zakat" ? "gold" : "success"}
                    label={`${fund.name} holds ${formatAmount(fund.balance)} of ${formatAmount(fundTotal)}`}
                  />
                </li>
              ))}
            </ul>
          </PanelBody>
          <PanelFooter>
            <p className="text-[12px] text-[#69726d]">
              Restricted funds may only be spent on their own purpose. Zakat is marked in gold as a reminder.
            </p>
          </PanelFooter>
        </Panel>

        <Panel>
          <PanelHeader
            title="Needs your attention"
            description={attentionTotal === 1 ? "1 item is waiting" : `${attentionTotal} items are waiting`}
            icon="clock"
          />
          {visibleAttention.length === 0 ? (
            <PanelBody>
              <FinanceEmptyState
                icon="check-circle"
                title="Nothing for you here"
                description="Approval queues are shown to the people who can act on them."
              />
            </PanelBody>
          ) : (
            <ul className="divide-y divide-[#f0efe6]">
              {visibleAttention.map((row) => (
                <li key={row.key}>
                  <Link
                    href={row.href}
                    className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-[#fbfaf5] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0d4d3b]"
                  >
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-md border ${
                        row.count > 0 ? "border-[#e3ce9d] bg-[#f7f0df] text-[#835811]" : "border-[#e2e1d6] bg-[#f8f7f1] text-[#8b938d]"
                      }`}
                    >
                      <Icon name={row.icon} size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-semibold text-[#17211d]">{row.label}</span>
                      <span className="mt-0.5 block text-[12px] text-[#69726d]">{row.hint}</span>
                    </span>
                    <span className="shrink-0 text-[18px] font-semibold tabular-nums text-[#17211d]">{row.count}</span>
                    <Icon name="chevron-right" size={16} className="shrink-0 text-[#9aa19c]" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title="Monthly contributions"
          description={`${contributionSummary.paidMembers} of ${contributionSummary.totalMembers} members have paid for August`}
          icon="repeat"
          actions={
            can("contribution.view") ? (
              <ButtonLink href="/dashboard/finance/contributions" variant="ghost" size="sm" iconAfter="chevron-right">
                Open the register
              </ButtonLink>
            ) : null
          }
        />
        <PanelBody className="space-y-5">
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[13.5px] font-medium text-[#3d453f]">Collected against expected</p>
              <p className="text-[13.5px] font-semibold tabular-nums text-[#17211d]">
                {formatAmount(contributionSummary.collected)}{" "}
                <span className="font-normal text-[#69726d]">of {formatAmount(contributionSummary.expected)}</span>
              </p>
            </div>
            <ProgressBar
              className="mt-2.5"
              value={contributionSummary.collected}
              max={contributionSummary.expected}
              tone="success"
              label={`${formatCollectionRate(contributionSummary.collected, contributionSummary.expected)} of the expected contributions collected`}
            />
            <p className="mt-2 text-[12px] text-[#69726d]">
              Collection rate {formatCollectionRate(contributionSummary.collected, contributionSummary.expected)} for the month to date.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MiniStat label="Expected" value={formatAmount(contributionSummary.expected)} hint={`${contributionSummary.totalMembers} members enrolled`} icon="scale" />
            <MiniStat label="Collected" value={formatAmount(contributionSummary.collected)} hint={`${contributionSummary.paidMembers} members paid`} icon="check-circle" tone="positive" />
            <MiniStat label="Still outstanding" value={formatAmount(contributionSummary.pending)} hint={`${contributionSummary.pendingMembers} members to follow up`} icon="clock" tone="warning" />
          </div>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader
          title="Recent activity"
          description="The last entries in the ledger, newest first"
          icon="list"
          actions={
            can("transaction.view") ? (
              <ButtonLink href="/dashboard/finance/transactions" variant="ghost" size="sm" iconAfter="chevron-right">
                Full ledger
              </ButtonLink>
            ) : null
          }
        />
        <DataTable
          rows={recentTransactions.slice(0, 8)}
          columns={transactionColumns}
          getRowKey={(row) => row.id}
          caption="The eight most recent ledger entries"
          pageSize={8}
          emptyState={<FinanceEmptyState title="Nothing recorded yet" description="Entries appear here as soon as money is recorded." />}
          mobileTitle={(row) => row.description}
          mobileSubtitle={(row) => formatShortDate(row.date)}
          mobileTrailing={(row) => <SignedMoney value={row.amount} type={row.type} />}
          mobileHiddenKeys={["date", "description", "amount"]}
        />
      </Panel>
    </div>
  );
}
