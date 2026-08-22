"use client";

import { useMemo, useState } from "react";
import { Chip, RecurringStatusBadge } from "@/components/finance/ui/badge";
import { Button, IconButton } from "@/components/finance/ui/button";
import { DataTable, type Column } from "@/components/finance/ui/data-table";
import { ConfirmDialog } from "@/components/finance/ui/dialogs";
import { FinanceFilters, type SelectFilter } from "@/components/finance/ui/filters";
import { AmountField, SelectField, SummaryRow, TextField } from "@/components/finance/ui/form-field";
import { Icon } from "@/components/finance/ui/icon";
import { Modal } from "@/components/finance/ui/modal";
import { Money } from "@/components/finance/ui/money";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { FinanceEmptyState, InlineNotice } from "@/components/finance/ui/states";
import { MiniStat } from "@/components/finance/ui/summary-card";
import { fundOptions } from "@/data/finance/funds";
import {
  recurringContributions,
  recurringDueSoon,
  recurringFrequencyFilterOptions,
  recurringStatusFilterOptions,
  recurringSummary,
} from "@/data/finance/recurring";
import { formatAmount, formatDate, formatOptionalDate, formatShortDate } from "@/lib/finance/format";
import {
  contributionFrequencies,
  paymentMethods,
  type ContributionFrequency,
  type RecurringContribution,
  type RecurringStatus,
} from "@/lib/finance/types";

/**
 * Recurring contributions, which is to say standing arrangements: a member who has said they will give
 * a fixed amount every month until they stop. It is a promise on a schedule, not money in the bank, so
 * nothing here counts as income. The payment itself is recorded on the contributions page when it
 * actually arrives.
 *
 * The three actions that matter are pause, resume and stop, and all three change what the mosque
 * expects next month. Each one asks for confirmation because a paused arrangement quietly stops
 * appearing in the collection list.
 */

const actionCopy = {
  pause: {
    title: "Pause this arrangement",
    description:
      "Nothing will be expected from this member while it is paused, and they will not appear in the follow-up list. Resume it whenever they are ready.",
    confirmLabel: "Pause it",
    icon: "pause" as const,
    tone: "primary" as const,
  },
  resume: {
    title: "Resume this arrangement",
    description: "The member goes back into the expected collection from the next due date onwards.",
    confirmLabel: "Resume it",
    icon: "play" as const,
    tone: "primary" as const,
  },
  cancel: {
    title: "Stop this arrangement",
    description:
      "Stopping is final. Everything already paid stays in the books, and a new arrangement would have to be set up if the member wants to give again.",
    confirmLabel: "Stop it",
    icon: "close" as const,
    tone: "danger" as const,
  },
};

type ActionKind = keyof typeof actionCopy;

type FormState = {
  memberName: string;
  memberCode: string;
  amount: string;
  frequency: ContributionFrequency;
  fundId: string;
  paymentMethod: string;
  startDate: string;
};

const emptyForm: FormState = {
  memberName: "",
  memberCode: "",
  amount: "",
  frequency: "Monthly",
  fundId: "",
  paymentMethod: "Mobile Banking",
  startDate: "2026-09-01",
};

export function RecurringView() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<RecurringStatus | "all">("all");
  const [frequency, setFrequency] = useState<ContributionFrequency | "all">("all");

  const [selected, setSelected] = useState<RecurringContribution | null>(null);
  const [action, setAction] = useState<{ row: RecurringContribution; kind: ActionKind } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitted, setSubmitted] = useState(false);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return recurringContributions.filter((row) => {
      if (term && ![row.memberName, row.memberCode, row.id, row.fundName].some((value) => value.toLowerCase().includes(term))) {
        return false;
      }
      if (status !== "all" && row.status !== status) return false;
      if (frequency !== "all" && row.frequency !== frequency) return false;
      return true;
    });
  }, [search, status, frequency]);

  const activeCount = [status !== "all", frequency !== "all"].filter(Boolean).length;

  const reset = () => {
    setStatus("all");
    setFrequency("all");
  };

  const filters: SelectFilter[] = [
    { id: "status", label: "State", value: status, options: recurringStatusFilterOptions, onChange: (value) => setStatus(value as RecurringStatus | "all") },
    {
      id: "frequency",
      label: "How often",
      value: frequency,
      options: recurringFrequencyFilterOptions,
      onChange: (value) => setFrequency(value as ContributionFrequency | "all"),
    },
  ];

  const columns: Column<RecurringContribution>[] = [
    {
      key: "memberName",
      header: "Member",
      cell: (row) => (
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => setSelected(row)}
            className="rounded text-left font-medium text-[#17211d] underline-offset-2 transition-colors hover:text-[#0d4d3b] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
          >
            {row.memberName}
          </button>
          <p className="mt-0.5 text-[12px] text-[#8b938d]">
            {row.memberCode} · {row.paymentMethod}
          </p>
        </div>
      ),
      sortValue: (row) => row.memberName,
    },
    {
      key: "amount",
      header: "Gives",
      align: "right",
      cell: (row) => (
        <span className="whitespace-nowrap">
          <Money value={row.amount} />
          <span className="ml-1 text-[12px] text-[#8b938d]">/ {row.frequency.replace("ly", "").toLowerCase()}</span>
        </span>
      ),
      sortValue: (row) => row.amount,
    },
    { key: "fund", header: "Into", cell: (row) => <Chip>{row.fundName}</Chip>, secondary: true },
    {
      key: "nextDueDate",
      header: "Next due",
      cell: (row) => (
        <span className="whitespace-nowrap tabular-nums">{row.status === "Active" ? formatShortDate(row.nextDueDate) : <span className="text-[#9aa19c]">—</span>}</span>
      ),
      sortValue: (row) => row.nextDueDate,
    },
    {
      key: "paymentsMade",
      header: "Given so far",
      align: "right",
      cell: (row) => (
        <span className="whitespace-nowrap">
          <span className="font-semibold tabular-nums text-[#0b4634]">{formatAmount(row.totalPaid)}</span>
          <span className="ml-1 text-[12px] text-[#8b938d]">
            ({row.paymentsMade} payment{row.paymentsMade === 1 ? "" : "s"})
          </span>
        </span>
      ),
      sortValue: (row) => row.totalPaid,
      secondary: true,
    },
    { key: "status", header: "State", cell: (row) => <RecurringStatusBadge status={row.status} />, sortValue: (row) => row.status },
    {
      key: "actions",
      header: "Open arrangement",
      headerHidden: true,
      align: "right",
      cell: (row) => <IconButton icon="eye" label={`Open ${row.memberName}`} onClick={() => setSelected(row)} />,
    },
  ];

  const amountValue = Number(form.amount);
  const errors = {
    memberName: submitted && !form.memberName.trim() ? "Enter the member's name." : undefined,
    amount: submitted && (!form.amount || amountValue <= 0) ? "Enter an amount above zero." : undefined,
    fundId: submitted && !form.fundId ? "Choose the fund this goes into." : undefined,
  };

  const submitCreate = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!form.memberName.trim() || !form.amount || amountValue <= 0 || !form.fundId) return;
    setCreateOpen(false);
    setSubmitted(false);
    const name = form.memberName.trim();
    setForm(emptyForm);
    setNotice(
      `Checked and ready: ${name} giving ${formatAmount(amountValue)} ${form.frequency.toLowerCase()} from ${formatDate(form.startDate)}. Nothing was saved, the finance API is not connected yet.`,
    );
  };

  const runAction = () => {
    const current = action;
    setAction(null);
    if (!current) return;
    const verb = current.kind === "pause" ? "paused" : current.kind === "resume" ? "resumed" : "stopped";
    setNotice(
      `${current.row.memberName}'s arrangement would be ${verb}, changing what is expected next month by ${formatAmount(current.row.amount)}. Nothing was saved, the finance API is not connected yet.`,
    );
  };

  return (
    <div className="space-y-5">
      {notice ? (
        <InlineNotice tone="gold" icon="info">
          {notice}
        </InlineNotice>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat
          label="Expected every month"
          value={formatAmount(recurringSummary.expectedMonthly)}
          hint={`${recurringSummary.activeCount} active arrangements`}
          icon="repeat"
          tone="positive"
        />
        <MiniStat label="Due next month" value={String(recurringSummary.dueNextMonth)} hint={`${recurringSummary.dueThisWeek} due this week`} icon="calendar" />
        <MiniStat label="Given through these" value={formatAmount(recurringSummary.collectedLifetime)} hint="Since each arrangement started" icon="coins" />
        <MiniStat
          label="Not collecting"
          value={String(recurringSummary.pausedCount + recurringSummary.cancelledCount)}
          hint={`${recurringSummary.pausedCount} paused, ${recurringSummary.cancelledCount} stopped`}
          icon="pause"
          tone="warning"
        />
      </div>

      {/* ---- Due soon ---- */}
      <Panel>
        <PanelHeader
          title="Coming up"
          description={recurringDueSoon.length === 0 ? "Nothing falls due in the next few days" : `${recurringDueSoon.length} arrangements due soon`}
          icon="calendar"
          actions={
            <Can permission="contribution.manage">
              <Button size="sm" icon="plus" onClick={() => setCreateOpen(true)}>
                Set up an arrangement
              </Button>
            </Can>
          }
        />
        {recurringDueSoon.length === 0 ? (
          <PanelBody>
            <FinanceEmptyState
              icon="calendar"
              title="Nothing due in the next few days"
              description="Arrangements appear here as their next due date approaches, so the cashier knows who to expect."
            />
          </PanelBody>
        ) : (
          <ul className="divide-y divide-[#f0efe6]">
            {recurringDueSoon.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 sm:px-6">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#e2e1d6] bg-[#f1f4ef] text-[#0d4d3b]">
                  <Icon name="repeat" size={16} />
                </span>
                <div className="min-w-[180px] flex-1">
                  <p className="text-[13.5px] font-semibold text-[#17211d]">{row.memberName}</p>
                  <p className="mt-0.5 text-[12px] text-[#69726d]">
                    {row.memberCode} · {row.fundName} · due {formatShortDate(row.nextDueDate)}
                  </p>
                </div>
                <p className="text-[15px] font-semibold tabular-nums text-[#17211d]">{formatAmount(row.amount)}</p>
                <IconButton icon="eye" label={`Open ${row.memberName}`} onClick={() => setSelected(row)} />
              </li>
            ))}
          </ul>
        )}
        <PanelFooter>
          <p className="text-[12px] text-[#69726d]">
            A due date is an expectation, not a payment. Money is only in the books once somebody records it against the member on
            the contributions page.
          </p>
        </PanelFooter>
      </Panel>

      {/* ---- Register ---- */}
      <Panel>
        <PanelHeader title="Standing arrangements" description="Every member who has committed to give on a schedule" icon="repeat" />
        <FinanceFilters
          search={{ value: search, onChange: setSearch, placeholder: "Search member name or code…", label: "Search arrangements" }}
          filters={filters}
          activeCount={activeCount}
          onReset={reset}
        />
        <DataTable
          rows={rows}
          columns={columns}
          getRowKey={(row) => row.id}
          caption="Recurring contribution arrangements"
          initialSort={{ key: "nextDueDate", direction: "asc" }}
          pageSize={12}
          emptyState={
            <FinanceEmptyState
              icon="search"
              title="No arrangements match"
              description="Clear a filter to see the rest."
              action={
                activeCount > 0 ? (
                  <Button variant="secondary" size="sm" icon="close" onClick={reset}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          }
          mobileTitle={(row) => row.memberName}
          mobileSubtitle={(row) => `${row.memberCode} · ${row.frequency}`}
          mobileTrailing={(row) => <Money value={row.amount} />}
          mobileHiddenKeys={["memberName", "amount"]}
        />
      </Panel>

      {/* ---- Arrangement detail ---- */}
      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? selected.memberName : "Arrangement"}
        description={selected ? `${selected.memberCode} · ${selected.id}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelected(null)}>
              Close
            </Button>
            {selected && (selected.status === "Active" || selected.status === "Paused") ? (
              <Can permission="contribution.manage">
                <Button
                  variant={selected.status === "Active" ? "secondary" : "primary"}
                  icon={selected.status === "Active" ? "pause" : "play"}
                  onClick={() => {
                    const row = selected;
                    setSelected(null);
                    setAction({ row, kind: row.status === "Active" ? "pause" : "resume" });
                  }}
                >
                  {selected.status === "Active" ? "Pause" : "Resume"}
                </Button>
              </Can>
            ) : null}
            {selected && selected.status !== "Cancelled" && selected.status !== "Completed" ? (
              <Can permission="contribution.manage">
                <Button
                  variant="danger"
                  icon="close"
                  onClick={() => {
                    const row = selected;
                    setSelected(null);
                    setAction({ row, kind: "cancel" });
                  }}
                >
                  Stop
                </Button>
              </Can>
            ) : null}
          </>
        }
      >
        {selected ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <RecurringStatusBadge status={selected.status} />
              <Chip>{selected.frequency}</Chip>
              <Chip>{selected.fundName}</Chip>
            </div>

            <dl className="divide-y divide-[#f0efe6] rounded-md border border-[#e2e1d6] bg-[#faf9f4] px-3.5 py-1">
              <SummaryRow label="Started" value={formatDate(selected.startDate)} />
              <SummaryRow label="Ends" value={selected.endDate ? formatDate(selected.endDate) : "No end date"} />
              <SummaryRow label="Next due" value={selected.status === "Active" ? formatDate(selected.nextDueDate) : "Not collecting"} />
              <SummaryRow label="Last paid" value={formatOptionalDate(selected.lastPaidDate)} />
              <SummaryRow label="Payment method" value={selected.paymentMethod} />
              <SummaryRow label="Payments made" value={String(selected.paymentsMade)} />
              <SummaryRow label="Given so far" value={<Money value={selected.totalPaid} />} emphasis />
            </dl>

            {selected.status === "Paused" ? (
              <InlineNotice tone="gold" icon="pause">
                This arrangement is paused, so nothing is expected from this member and they do not appear in the follow-up list.
              </InlineNotice>
            ) : null}

            {selected.status === "Cancelled" ? (
              <InlineNotice tone="neutral" icon="info">
                This arrangement was stopped. Everything already given stays in the books.
              </InlineNotice>
            ) : null}
          </div>
        ) : null}
      </Modal>

      {/* ---- Pause, resume or stop ---- */}
      <ConfirmDialog
        open={Boolean(action)}
        onClose={() => setAction(null)}
        onConfirm={runAction}
        title={action ? actionCopy[action.kind].title : ""}
        description={action ? actionCopy[action.kind].description : ""}
        confirmLabel={action ? actionCopy[action.kind].confirmLabel : "Confirm"}
        icon={action ? actionCopy[action.kind].icon : undefined}
        tone={action ? actionCopy[action.kind].tone : "primary"}
        details={
          action ? (
            <dl className="divide-y divide-[#f0efe6]">
              <SummaryRow label="Member" value={`${action.row.memberName} (${action.row.memberCode})`} />
              <SummaryRow label="Arrangement" value={`${formatAmount(action.row.amount)} ${action.row.frequency.toLowerCase()}`} />
              <SummaryRow label="Into" value={action.row.fundName} />
            </dl>
          ) : undefined
        }
      />

      {/* ---- Set up an arrangement ---- */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Set up a standing arrangement"
        description="Record what a member has agreed to give and how often. No money moves here."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="new-recurring" icon="check">
              Save arrangement
            </Button>
          </>
        }
      >
        <form id="new-recurring" onSubmit={submitCreate} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Member name"
              required
              value={form.memberName}
              error={errors.memberName}
              onChange={(event) => setForm({ ...form, memberName: event.target.value })}
            />
            <TextField
              label="Member code"
              hint="If they already have one."
              placeholder="MEM-0042"
              value={form.memberCode}
              onChange={(event) => setForm({ ...form, memberCode: event.target.value })}
            />
            <AmountField label="Amount" required value={form.amount} error={errors.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
            <SelectField
              label="How often"
              required
              options={contributionFrequencies}
              value={form.frequency}
              onChange={(event) => setForm({ ...form, frequency: event.target.value as ContributionFrequency })}
            />
            <SelectField
              label="Into fund"
              required
              placeholder="Choose a fund"
              options={fundOptions}
              value={form.fundId}
              error={errors.fundId}
              onChange={(event) => setForm({ ...form, fundId: event.target.value })}
            />
            <SelectField
              label="Payment method"
              required
              options={paymentMethods}
              value={form.paymentMethod}
              onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })}
            />
          </div>

          <TextField
            label="First due date"
            type="date"
            required
            hint="Every later due date follows from this one."
            value={form.startDate}
            onChange={(event) => setForm({ ...form, startDate: event.target.value })}
          />

          <InlineNotice icon="shield">
            An arrangement is a promise on a schedule. It changes what the mosque expects, and nothing is counted as income until
            a payment is actually recorded.
          </InlineNotice>
        </form>
      </Modal>
    </div>
  );
}
