"use client";

import { useMemo, useState } from "react";
import { Chip, SalaryStatusBadge, StaffStatusBadge } from "@/components/finance/ui/badge";
import { Button, IconButton } from "@/components/finance/ui/button";
import { DataTable, type Column } from "@/components/finance/ui/data-table";
import { ApprovalDialog, ConfirmDialog } from "@/components/finance/ui/dialogs";
import { FinanceFilters, SegmentedControl, type SelectFilter } from "@/components/finance/ui/filters";
import { SummaryRow } from "@/components/finance/ui/form-field";
import { Modal } from "@/components/finance/ui/modal";
import { Money } from "@/components/finance/ui/money";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { ProgressBar } from "@/components/finance/ui/progress";
import { FinanceEmptyState, InlineNotice, NoAccessState } from "@/components/finance/ui/states";
import { MiniStat } from "@/components/finance/ui/summary-card";
import { ApprovalTrail, WorkflowSteps } from "@/components/finance/ui/workflow";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import {
  CURRENT_SALARY_PERIOD,
  salaryHistoryFor,
  salaryPaymentsAwaitingApproval,
  salaryPayments,
  salaryPeriodOptions,
  salaryStatusFilterOptions,
  salarySummary,
  staff,
  staffPositionFilterOptions,
} from "@/data/finance/salaries";
import { formatAmount, formatDate, formatMonth, formatOptionalDate, formatShortDate, sumAmount } from "@/lib/finance/format";
import { salaryWorkflow } from "@/lib/finance/status";
import type { SalaryPayment, SalaryStatus, StaffMember, StaffPosition } from "@/lib/finance/types";

/**
 * Staff and imam salaries. This is somebody's livelihood, not a line item, so the screen leads with
 * who has been paid this month rather than with a total.
 *
 * Two things shape it. A salary is prepared, approved by somebody other than the person who prepared
 * it, and only then paid; and an imam holding `salary.viewOwn` sees their own pay and nobody else's,
 * so this file renders a different page for them instead of hiding rows inside the payroll table.
 * Which records are actually theirs is still decided by the API, never here.
 */

/** Shared by the payroll table and the own-pay page, so one payment always reads the same way. */
function PaymentDetail({ payment }: { payment: SalaryPayment }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <SalaryStatusBadge status={payment.status} />
        <Chip>{payment.position}</Chip>
        <Chip>{payment.periodLabel}</Chip>
      </div>

      <WorkflowSteps
        steps={salaryWorkflow}
        current={payment.status === "Failed" ? "Approved" : payment.status}
        label="Salary progress"
        terminal={payment.status === "Failed" ? { label: "Failed", reason: payment.notes } : null}
      />

      <dl className="divide-y divide-[#f0efe6] rounded-md border border-[#e2e1d6] bg-[#faf9f4] px-3.5 py-1">
        <SummaryRow label="Paid to" value={payment.staffName} />
        <SummaryRow label="Period" value={payment.periodLabel} />
        <SummaryRow label="Fund" value={payment.fundName} />
        <SummaryRow label="Payment method" value={payment.paymentMethod} />
        <SummaryRow label="Payment date" value={formatOptionalDate(payment.paymentDate)} />
        {payment.receiptNo ? <SummaryRow label="Receipt" value={payment.receiptNo} /> : null}
        <SummaryRow label="Amount" value={<Money value={payment.amount} />} emphasis />
      </dl>

      {payment.notes ? <p className="text-[13px] leading-6 text-[#4d564f]">{payment.notes}</p> : null}

      <ApprovalTrail
        submittedBy={payment.submittedBy}
        submittedAt={payment.submittedAt}
        approvedBy={payment.approvedBy}
        approvedAt={payment.approvedAt}
      />
    </div>
  );
}

export function SalariesView() {
  const { can, user, scope } = useDashboardSession();
  const reach = scope("salary.view", "salary.viewOwn");

  const [period, setPeriod] = useState(CURRENT_SALARY_PERIOD);
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState<StaffPosition | "all">("all");
  const [status, setStatus] = useState<SalaryStatus | "all">("all");

  const [selected, setSelected] = useState<SalaryPayment | null>(null);
  const [openStaff, setOpenStaff] = useState<StaffMember | null>(null);
  const [decisionTarget, setDecisionTarget] = useState<SalaryPayment | null>(null);
  const [payTarget, setPayTarget] = useState<SalaryPayment | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = useMemo(() => salaryPayments.filter((row) => row.period === period).sort((a, b) => b.amount - a.amount), [period]);

  const paymentColumns: Column<SalaryPayment>[] = [
    {
      key: "staffName",
      header: "Who",
      cell: (row) => (
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => setSelected(row)}
            className="rounded text-left font-medium text-[#17211d] underline-offset-2 transition-colors hover:text-[#0d4d3b] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
          >
            {row.staffName}
          </button>
          <p className="mt-0.5 text-[12px] text-[#8b938d]">
            {row.position} · {row.id}
          </p>
        </div>
      ),
      sortValue: (row) => row.staffName,
    },
    { key: "period", header: "Period", cell: (row) => <span className="whitespace-nowrap">{row.periodLabel}</span>, sortValue: (row) => row.period },
    { key: "fund", header: "Paid from", cell: (row) => <span className="text-[13px]">{row.fundName}</span>, secondary: true },
    {
      key: "paymentDate",
      header: "Paid on",
      cell: (row) => <span className="whitespace-nowrap tabular-nums">{formatOptionalDate(row.paymentDate)}</span>,
      sortValue: (row) => row.paymentDate ?? "",
      secondary: true,
    },
    { key: "amount", header: "Amount", align: "right", cell: (row) => <Money value={row.amount} />, sortValue: (row) => row.amount },
    { key: "status", header: "State", cell: (row) => <SalaryStatusBadge status={row.status} />, sortValue: (row) => row.status },
    {
      key: "actions",
      header: "Open payment",
      headerHidden: true,
      align: "right",
      cell: (row) => <IconButton icon="eye" label={`Open ${row.id}`} onClick={() => setSelected(row)} />,
    },
  ];

  /* ------------------------------------------------------------------ *
   * Own pay. An imam sees their own record and no payroll totals.
   * ------------------------------------------------------------------ */
  if (reach === "own") {
    const mine = staff.find((member) => member.name === user?.name);
    const history = mine ? salaryHistoryFor(mine.id) : [];
    const paidTotal = sumAmount(
      history.filter((row) => row.status === "Paid"),
      (row) => row.amount,
    );
    const awaiting = history.find((row) => row.status !== "Paid");

    return (
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <MiniStat label="Your monthly salary" value={formatAmount(mine?.monthlySalary ?? 0)} hint={mine ? `Paid from ${mine.fundName}` : "On record"} icon="wallet" />
          <MiniStat label="Received so far" value={formatAmount(paidTotal)} hint={`${history.filter((row) => row.status === "Paid").length} payments recorded`} icon="check-circle" tone="positive" />
          <MiniStat
            label="This month"
            value={awaiting ? awaiting.status : "Paid"}
            hint={awaiting ? `${formatAmount(awaiting.amount)} for ${awaiting.periodLabel}` : formatMonth(CURRENT_SALARY_PERIOD)}
            icon="clock"
            tone={awaiting ? "warning" : "positive"}
          />
        </div>

        <Panel>
          <PanelHeader title="Your salary" description="What is on record for you, and when each payment was made" icon="wallet" />
          {mine ? (
            <PanelBody className="pb-0">
              <dl className="divide-y divide-[#f0efe6] rounded-md border border-[#e2e1d6] bg-[#faf9f4] px-3.5 py-1">
                <SummaryRow label="Position" value={mine.position} />
                <SummaryRow label="Paid" value={mine.frequency.toLowerCase()} />
                <SummaryRow label="Fund" value={mine.fundName} />
                <SummaryRow label="Payment method" value={mine.paymentMethod} />
                <SummaryRow label="Serving since" value={formatDate(mine.joinedAt)} />
                <SummaryRow label="Monthly salary" value={<Money value={mine.monthlySalary} />} emphasis />
              </dl>
            </PanelBody>
          ) : (
            <PanelBody>
              <FinanceEmptyState
                icon="user"
                title="No salary record is linked to your account yet"
                description="Once the finance API is connected it decides which staff record belongs to you. Ask the treasurer if you believe one should be here."
              />
            </PanelBody>
          )}
          <DataTable
            rows={history}
            columns={paymentColumns.filter((column) => column.key !== "staffName")}
            getRowKey={(row) => row.id}
            caption="Your salary payments, newest period first"
            initialSort={{ key: "period", direction: "desc" }}
            emptyState={<FinanceEmptyState icon="inbox" title="No payments recorded yet" description="Payments appear here as soon as the treasurer records them." />}
            mobileTitle={(row) => row.periodLabel}
            mobileSubtitle={(row) => row.status}
            mobileTrailing={(row) => <Money value={row.amount} />}
            mobileHiddenKeys={["period", "amount"]}
          />
          <PanelFooter>
            <p className="text-[12px] text-[#69726d]">
              You are seeing your own record only. The rest of the payroll is not shown to you, and the API decides which
              records are yours rather than this page.
            </p>
          </PanelFooter>
        </Panel>

        <Modal
          open={Boolean(selected)}
          onClose={() => setSelected(null)}
          title={selected ? `${selected.periodLabel} salary` : "Salary payment"}
          description={selected?.id}
          footer={
            <Button variant="secondary" onClick={() => setSelected(null)}>
              Close
            </Button>
          }
        >
          {selected ? <PaymentDetail payment={selected} /> : null}
        </Modal>
      </div>
    );
  }

  if (reach === "none") {
    return <NoAccessState area="Salaries" />;
  }

  /* ------------------------------------------------------------------ *
   * Full payroll.
   * ------------------------------------------------------------------ */
  const filteredStaff = staff.filter((member) => {
    const term = search.trim().toLowerCase();
    if (term && ![member.name, member.position, member.fundName, member.phone, member.id].some((value) => value.toLowerCase().includes(term))) {
      return false;
    }
    if (position !== "all" && member.position !== position) return false;
    return true;
  });

  const runShown = status === "all" ? run : run.filter((row) => row.status === status);
  const activeCount = [position !== "all", status !== "all"].filter(Boolean).length;

  const reset = () => {
    setPosition("all");
    setStatus("all");
  };

  const filters: SelectFilter[] = [
    { id: "position", label: "Position", value: position, options: staffPositionFilterOptions, onChange: (value) => setPosition(value as StaffPosition | "all") },
    { id: "status", label: "Payment state", value: status, options: salaryStatusFilterOptions, onChange: (value) => setStatus(value as SalaryStatus | "all") },
  ];

  const runTotal = sumAmount(run, (row) => row.amount);
  const runPaid = sumAmount(
    run.filter((row) => row.status === "Paid"),
    (row) => row.amount,
  );

  const staffColumns: Column<StaffMember>[] = [
    {
      key: "name",
      header: "Name",
      cell: (row) => (
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => setOpenStaff(row)}
            className="rounded text-left font-medium text-[#17211d] underline-offset-2 transition-colors hover:text-[#0d4d3b] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
          >
            {row.name}
          </button>
          <p className="mt-0.5 text-[12px] text-[#8b938d]">
            {row.id} · {row.phone}
          </p>
        </div>
      ),
      sortValue: (row) => row.name,
    },
    { key: "position", header: "Position", cell: (row) => <Chip>{row.position}</Chip>, sortValue: (row) => row.position },
    { key: "fund", header: "Paid from", cell: (row) => <span className="text-[13px]">{row.fundName}</span>, secondary: true },
    { key: "frequency", header: "Paid", cell: (row) => <span className="text-[13px]">{row.frequency}</span>, secondary: true },
    { key: "salary", header: "Salary", align: "right", cell: (row) => <Money value={row.monthlySalary} />, sortValue: (row) => row.monthlySalary },
    { key: "status", header: "State", cell: (row) => <StaffStatusBadge status={row.status} />, sortValue: (row) => row.status },
    {
      key: "actions",
      header: "Open staff record",
      headerHidden: true,
      align: "right",
      cell: (row) => <IconButton icon="eye" label={`Open ${row.name}`} onClick={() => setOpenStaff(row)} />,
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
        <MiniStat
          label="Monthly payroll"
          value={formatAmount(salarySummary.monthlyPayroll)}
          hint={`${salarySummary.activeStaffCount} active of ${salarySummary.staffCount} staff`}
          icon="users"
        />
        <MiniStat label="Paid this month" value={formatAmount(salarySummary.paid)} hint={`${salarySummary.paidCount} people paid`} icon="check-circle" tone="positive" />
        <MiniStat label="Approved, not yet paid" value={formatAmount(salarySummary.approvedNotPaid)} hint="Owed to staff" icon="scale" tone="warning" />
        <MiniStat
          label="Waiting for approval"
          value={formatAmount(salarySummary.pending)}
          hint={`${salaryPaymentsAwaitingApproval.length} payment${salaryPaymentsAwaitingApproval.length === 1 ? "" : "s"}`}
          icon="clock"
          tone="warning"
        />
      </div>

      {/* ---- The run for one period ---- */}
      <Panel>
        <PanelHeader
          title={`Salary run — ${formatMonth(period)}`}
          description={`${formatAmount(runPaid)} paid of ${formatAmount(runTotal)} prepared`}
          icon="wallet"
          actions={<SegmentedControl label="Period" size="sm" value={period} onChange={setPeriod} options={salaryPeriodOptions} />}
        />
        <PanelBody className="pb-0">
          <ProgressBar
            value={runPaid}
            max={runTotal || 1}
            showValue
            tone={runPaid >= runTotal ? "success" : "pending"}
            label={`${formatAmount(runPaid)} of ${formatAmount(runTotal)} paid for ${formatMonth(period)}`}
          />
        </PanelBody>
        <FinanceFilters
          search={{ value: search, onChange: setSearch, placeholder: "Search staff by name, position or phone…", label: "Search staff" }}
          filters={filters}
          activeCount={activeCount}
          onReset={reset}
        />
        <DataTable
          rows={runShown}
          columns={paymentColumns}
          getRowKey={(row) => row.id}
          caption={`Salary payments for ${formatMonth(period)}`}
          initialSort={{ key: "amount", direction: "desc" }}
          emptyState={
            <FinanceEmptyState
              icon="inbox"
              title="Nothing prepared for this period"
              description="No salary payments have been recorded for the period you picked."
              action={
                activeCount > 0 ? (
                  <Button variant="secondary" size="sm" icon="close" onClick={reset}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          }
          footNote="A salary is prepared by one person and approved by another before it is paid. The API refuses a self-approval even if this screen offers the button."
          mobileTitle={(row) => row.staffName}
          mobileSubtitle={(row) => `${row.position} · ${row.periodLabel}`}
          mobileTrailing={(row) => <Money value={row.amount} />}
          mobileHiddenKeys={["staffName", "amount"]}
        />
      </Panel>

      {/* ---- Approval and payment queue ---- */}
      {salaryPaymentsAwaitingApproval.length > 0 ? (
        <Panel>
          <PanelHeader
            title="Waiting on you"
            description={`${salaryPaymentsAwaitingApproval.length} payment${salaryPaymentsAwaitingApproval.length === 1 ? "" : "s"} still to approve`}
            icon="clock"
          />
          <ul className="divide-y divide-[#f0efe6]">
            {salaryPaymentsAwaitingApproval.map((row) => {
              const isPreparer = row.submittedBy === user?.name;
              return (
                <li key={row.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-6">
                  <div className="min-w-[200px] flex-1">
                    <p className="text-[13.5px] font-semibold text-[#17211d]">
                      {row.staffName} <span className="font-normal text-[#69726d]">· {row.position}</span>
                    </p>
                    <p className="mt-0.5 text-[12px] text-[#69726d]">
                      {row.periodLabel} · {row.fundName} · prepared by {row.submittedBy} on {formatShortDate(row.submittedAt)}
                    </p>
                  </div>
                  <p className="text-[15px] font-semibold tabular-nums text-[#17211d]">{formatAmount(row.amount)}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Can permission="salary.manage">
                      <Button size="sm" icon="check" disabled={isPreparer} onClick={() => setDecisionTarget(row)}>
                        Review
                      </Button>
                    </Can>
                    <IconButton icon="eye" label={`Open ${row.id}`} onClick={() => setSelected(row)} />
                  </div>
                  {isPreparer && can("salary.manage") ? (
                    <p className="w-full text-[12px] text-[#8b938d]">You prepared this one, so somebody else approves it.</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <PanelFooter>
            <p className="text-[12px] text-[#69726d]">
              Approving does not pay anybody. The money leaves when the payment is marked as paid, and a receipt is issued for it
              then.
            </p>
          </PanelFooter>
        </Panel>
      ) : null}

      {/* ---- Staff register ---- */}
      <Panel>
        <PanelHeader title="Staff on the payroll" description="Everybody the mosque pays, whatever their state" icon="users" />
        <DataTable
          rows={filteredStaff}
          columns={staffColumns}
          getRowKey={(row) => row.id}
          caption="Staff on the mosque payroll"
          initialSort={{ key: "salary", direction: "desc" }}
          emptyState={<FinanceEmptyState icon="search" title="No staff match" description="Clear the search or the position filter." />}
          footNote="A person on leave keeps their record. Whether they are paid while away is a committee decision, not something this screen assumes."
          mobileTitle={(row) => row.name}
          mobileSubtitle={(row) => row.position}
          mobileTrailing={(row) => <Money value={row.monthlySalary} />}
          mobileHiddenKeys={["name", "position", "salary"]}
        />
      </Panel>

      {/* ---- Payment detail ---- */}
      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.staffName} — ${selected.periodLabel}` : "Salary payment"}
        description={selected?.id}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelected(null)}>
              Close
            </Button>
            {selected?.status === "Pending" ? (
              <Can permission="salary.manage">
                <Button
                  icon="check"
                  disabled={selected.submittedBy === user?.name}
                  onClick={() => {
                    setDecisionTarget(selected);
                    setSelected(null);
                  }}
                >
                  Review
                </Button>
              </Can>
            ) : null}
            {selected?.status === "Approved" ? (
              <Can permission="salary.manage">
                <Button
                  icon="banknote"
                  onClick={() => {
                    setPayTarget(selected);
                    setSelected(null);
                  }}
                >
                  Mark as paid
                </Button>
              </Can>
            ) : null}
          </>
        }
      >
        {selected ? <PaymentDetail payment={selected} /> : null}
      </Modal>

      {/* ---- Staff record and pay history ---- */}
      <Modal
        open={Boolean(openStaff)}
        onClose={() => setOpenStaff(null)}
        title={openStaff ? openStaff.name : "Staff member"}
        description={openStaff ? `${openStaff.position} · ${openStaff.id}` : undefined}
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setOpenStaff(null)}>
            Close
          </Button>
        }
      >
        {openStaff ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StaffStatusBadge status={openStaff.status} />
              <Chip>{openStaff.position}</Chip>
              <Chip>{openStaff.frequency}</Chip>
            </div>

            <dl className="divide-y divide-[#f0efe6] rounded-md border border-[#e2e1d6] bg-[#faf9f4] px-3.5 py-1">
              <SummaryRow label="Phone" value={openStaff.phone} />
              <SummaryRow label="Serving since" value={formatDate(openStaff.joinedAt)} />
              <SummaryRow label="Paid from" value={openStaff.fundName} />
              <SummaryRow label="Payment method" value={openStaff.paymentMethod} />
              <SummaryRow label="Salary" value={<Money value={openStaff.monthlySalary} />} emphasis />
            </dl>

            <div>
              <p className="mb-2 text-[12px] font-bold uppercase tracking-[.06em] text-[#8b938d]">Payment history</p>
              <ul className="divide-y divide-[#f0efe6] rounded-md border border-[#e2e1d6]">
                {salaryHistoryFor(openStaff.id).map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-[#17211d]">{row.periodLabel}</p>
                      <p className="text-[11.5px] text-[#8b938d]">
                        {row.paymentDate ? `Paid ${formatShortDate(row.paymentDate)}` : "Not paid yet"}
                        {row.receiptNo ? ` · ${row.receiptNo}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <SalaryStatusBadge status={row.status} />
                      <span className="text-[13px] font-semibold tabular-nums text-[#17211d]">{formatAmount(row.amount)}</span>
                    </div>
                  </li>
                ))}
                {salaryHistoryFor(openStaff.id).length === 0 ? (
                  <li className="px-3.5 py-4 text-[13px] text-[#69726d]">No payments recorded for this person yet.</li>
                ) : null}
              </ul>
            </div>

            {openStaff.status === "On Leave" ? (
              <InlineNotice tone="neutral" icon="info">
                This person is on leave. Nothing is prepared for them automatically while they are away.
              </InlineNotice>
            ) : null}
          </div>
        ) : null}
      </Modal>

      {/* ---- Approve or reject ---- */}
      <ApprovalDialog
        open={Boolean(decisionTarget)}
        onClose={() => setDecisionTarget(null)}
        title="Review this salary payment"
        itemLabel={decisionTarget ? `${decisionTarget.staffName} — ${decisionTarget.periodLabel}` : ""}
        amountLabel={formatAmount(decisionTarget?.amount ?? 0)}
        details={
          decisionTarget ? (
            <dl className="divide-y divide-[#f0efe6]">
              <SummaryRow label="Position" value={decisionTarget.position} />
              <SummaryRow label="Paid from" value={decisionTarget.fundName} />
              <SummaryRow label="Method" value={decisionTarget.paymentMethod} />
              <SummaryRow label="Prepared by" value={`${decisionTarget.submittedBy}, ${formatDate(decisionTarget.submittedAt)}`} />
            </dl>
          ) : undefined
        }
        onDecision={(decision, note) => {
          const target = decisionTarget;
          setDecisionTarget(null);
          setNotice(
            decision === "approved"
              ? `Approval prepared for ${target?.staffName}'s ${target?.periodLabel} salary. It would then wait to be paid — nothing was saved, the finance API is not connected yet.`
              : `Rejection prepared for ${target?.staffName}'s ${target?.periodLabel} salary with the reason "${note}". Nothing was saved, the finance API is not connected yet.`,
          );
        }}
      />

      {/* ---- Mark as paid ---- */}
      <ConfirmDialog
        open={Boolean(payTarget)}
        onClose={() => setPayTarget(null)}
        onConfirm={() => {
          const target = payTarget;
          setPayTarget(null);
          setNotice(
            `Payment prepared: ${formatAmount(target?.amount ?? 0)} to ${target?.staffName} for ${target?.periodLabel}, with a receipt issued from ${target?.fundName}. Nothing was saved, the finance API is not connected yet.`,
          );
        }}
        tone="primary"
        icon="banknote"
        title="Mark this salary as paid"
        description="Only do this once the money has actually reached them. A receipt is issued at this point and the payment cannot be edited afterwards."
        confirmLabel="Mark as paid"
        details={
          payTarget ? (
            <dl className="divide-y divide-[#f0efe6]">
              <SummaryRow label="Who" value={`${payTarget.staffName} (${payTarget.position})`} />
              <SummaryRow label="Period" value={payTarget.periodLabel} />
              <SummaryRow label="Paid from" value={payTarget.fundName} />
              <SummaryRow label="Method" value={payTarget.paymentMethod} />
              <SummaryRow label="Amount" value={<Money value={payTarget.amount} />} emphasis />
            </dl>
          ) : undefined
        }
      />
    </div>
  );
}
