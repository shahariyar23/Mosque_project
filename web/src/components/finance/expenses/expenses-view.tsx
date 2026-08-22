"use client";

import { useMemo, useState } from "react";
import { Chip, ExpenseStatusBadge } from "@/components/finance/ui/badge";
import { Button, IconButton } from "@/components/finance/ui/button";
import { DataTable, type Column } from "@/components/finance/ui/data-table";
import { ApprovalDialog } from "@/components/finance/ui/dialogs";
import { FinanceFilters, type SelectFilter } from "@/components/finance/ui/filters";
import { AmountField, AttachmentField, SelectField, SummaryRow, TextAreaField, TextField } from "@/components/finance/ui/form-field";
import { Icon } from "@/components/finance/ui/icon";
import { Modal } from "@/components/finance/ui/modal";
import { Money } from "@/components/finance/ui/money";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { ProgressBar } from "@/components/finance/ui/progress";
import { FinanceEmptyState, InlineNotice } from "@/components/finance/ui/states";
import { MiniStat } from "@/components/finance/ui/summary-card";
import { ApprovalTrail, WorkflowSteps } from "@/components/finance/ui/workflow";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import {
  APPROVAL_THRESHOLD,
  expenseByCategory,
  expenseCategoryFilterOptions,
  expenseStatusFilterOptions,
  expenseSummary,
  expenses,
  expensesAwaitingApproval,
} from "@/data/finance/expenses";
import { fundFilterOptions, fundOptions } from "@/data/finance/funds";
import { formatAmount, formatDate, formatPercent, formatShortDate, sumAmount } from "@/lib/finance/format";
import { expenseWorkflow } from "@/lib/finance/status";
import { expenseCategories, paymentMethods, type Expense, type ExpenseCategory, type ExpenseStatus } from "@/lib/finance/types";

/**
 * Expenses. Money leaving a mosque belongs to people who gave it, so the shape here is submit, then
 * approve, then pay — three steps done by more than one person, never one form that spends money.
 *
 * Anything at or above the approval threshold has to be signed off before it is paid. Below it, a
 * treasurer may pay and record directly, because a mosque cannot hold a committee meeting over a
 * broken tap. That threshold lives in the data and is stated on screen rather than hidden in a rule.
 */

const submitStages = [
  { key: "submit", label: "Somebody submits the bill", hint: "With the quotation or receipt attached" },
  { key: "approve", label: "A second person approves it", hint: `Required at ${formatAmount(APPROVAL_THRESHOLD)} and above` },
  { key: "pay", label: "The treasurer pays and records it", hint: "Only then is it an expense" },
];

type FormState = {
  category: ExpenseCategory;
  description: string;
  vendor: string;
  amount: string;
  fundId: string;
  paymentMethod: string;
  date: string;
  reference: string;
  notes: string;
};

const emptyForm: FormState = {
  category: "Maintenance",
  description: "",
  vendor: "",
  amount: "",
  fundId: "",
  paymentMethod: "Cash",
  date: "2026-08-22",
  reference: "",
  notes: "",
};

export function ExpensesView() {
  const { can, user } = useDashboardSession();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ExpenseCategory | "all">("all");
  const [status, setStatus] = useState<ExpenseStatus | "all">("all");
  const [fundId, setFundId] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [selected, setSelected] = useState<Expense | null>(null);
  const [decisionTarget, setDecisionTarget] = useState<Expense | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [attachment, setAttachment] = useState<string | undefined>(undefined);
  const [submitted, setSubmitted] = useState(false);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return expenses.filter((row) => {
      if (
        term &&
        ![row.id, row.description, row.category, row.fundName, row.vendor ?? "", row.reference ?? "", row.submittedBy].some((value) =>
          value.toLowerCase().includes(term),
        )
      ) {
        return false;
      }
      if (category !== "all" && row.category !== category) return false;
      if (status !== "all" && row.status !== status) return false;
      if (fundId !== "all" && row.fundId !== fundId) return false;
      if (from && row.date < from) return false;
      if (to && row.date > to) return false;
      return true;
    });
  }, [search, category, status, fundId, from, to]);

  const activeCount = [category !== "all", status !== "all", fundId !== "all", Boolean(from || to)].filter(Boolean).length;

  const reset = () => {
    setCategory("all");
    setStatus("all");
    setFundId("all");
    setFrom("");
    setTo("");
  };

  const filters: SelectFilter[] = [
    { id: "category", label: "Category", value: category, options: expenseCategoryFilterOptions, onChange: (value) => setCategory(value as ExpenseCategory | "all") },
    { id: "status", label: "State", value: status, options: expenseStatusFilterOptions, onChange: (value) => setStatus(value as ExpenseStatus | "all") },
    { id: "fund", label: "Fund", value: fundId, options: fundFilterOptions, onChange: setFundId },
  ];

  const categoryTotal = sumAmount([...expenseByCategory], (line) => line.amount);

  const columns: Column<Expense>[] = [
    {
      key: "date",
      header: "Date",
      cell: (row) => <span className="whitespace-nowrap tabular-nums">{formatShortDate(row.date)}</span>,
      sortValue: (row) => row.date,
    },
    {
      key: "description",
      header: "What it was for",
      cell: (row) => (
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => setSelected(row)}
            className="rounded text-left font-medium text-[#17211d] underline-offset-2 transition-colors hover:text-[#0d4d3b] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
          >
            {row.description}
          </button>
          <p className="mt-0.5 text-[12px] text-[#8b938d]">
            {row.id}
            {row.vendor ? ` · ${row.vendor}` : ""}
          </p>
        </div>
      ),
      sortValue: (row) => row.description,
    },
    { key: "category", header: "Category", cell: (row) => <Chip>{row.category}</Chip>, sortValue: (row) => row.category },
    { key: "fund", header: "Fund", cell: (row) => <span className="text-[13px]">{row.fundName}</span>, secondary: true },
    {
      key: "attachment",
      header: "Bill",
      cell: (row) =>
        row.attachmentName ? (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-[#3d453f]">
            <Icon name="file-text" size={14} className="text-[#8b938d]" />
            Attached
          </span>
        ) : (
          <span className="text-[12px] text-[#9aa19c]">None</span>
        ),
      secondary: true,
    },
    { key: "amount", header: "Amount", align: "right", cell: (row) => <Money value={row.amount} />, sortValue: (row) => row.amount },
    { key: "status", header: "State", cell: (row) => <ExpenseStatusBadge status={row.status} />, sortValue: (row) => row.status },
    {
      key: "actions",
      header: "Open expense",
      headerHidden: true,
      align: "right",
      cell: (row) => <IconButton icon="eye" label={`Open ${row.id}`} onClick={() => setSelected(row)} />,
    },
  ];

  const amountValue = Number(form.amount);
  const needsApproval = amountValue >= APPROVAL_THRESHOLD;
  const errors = {
    description: submitted && !form.description.trim() ? "Say what the money was spent on." : undefined,
    amount: submitted && (!form.amount || amountValue <= 0) ? "Enter an amount above zero." : undefined,
    fundId: submitted && !form.fundId ? "Choose the fund this comes out of." : undefined,
  };

  const submitExpense = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!form.description.trim() || !form.amount || amountValue <= 0 || !form.fundId) return;
    setSubmitOpen(false);
    setSubmitted(false);
    setForm(emptyForm);
    setAttachment(undefined);
    setNotice(
      needsApproval
        ? `Checked and ready: ${formatAmount(amountValue)} for ${form.category.toLowerCase()}. At ${formatAmount(APPROVAL_THRESHOLD)} and above it would go for approval before payment — nothing was saved, the finance API is not connected yet.`
        : `Checked and ready: ${formatAmount(amountValue)} for ${form.category.toLowerCase()}, below the ${formatAmount(APPROVAL_THRESHOLD)} approval threshold — nothing was saved, the finance API is not connected yet.`,
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
        <MiniStat label="Paid this month" value={formatAmount(expenseSummary.paidThisMonth)} hint="Money that actually left" icon="arrow-up" tone="negative" />
        <MiniStat
          label="Waiting for approval"
          value={formatAmount(expenseSummary.awaitingApproval)}
          hint={`${expenseSummary.awaitingApprovalCount} submissions`}
          icon="clock"
          tone="warning"
        />
        <MiniStat label="Approved, not yet paid" value={formatAmount(expenseSummary.committed)} hint="Committed but not disbursed" icon="scale" />
        <MiniStat
          label="Largest category"
          value={expenseSummary.largestCategory}
          hint={`${formatAmount(expenseSummary.largestCategoryAmount)} this month`}
          icon="chart"
        />
      </div>

      {/* ---- Approval queue ---- */}
      <Panel>
        <PanelHeader
          title="Waiting for approval"
          description={
            expensesAwaitingApproval.length === 0
              ? "Nothing is waiting"
              : `${expensesAwaitingApproval.length} submissions, ${formatAmount(sumAmount(expensesAwaitingApproval, (row) => row.amount))} in total`
          }
          icon="clock"
          actions={
            <Can permission="expense.manage">
              <Button size="sm" icon="plus" onClick={() => setSubmitOpen(true)}>
                Submit an expense
              </Button>
            </Can>
          }
        />
        {expensesAwaitingApproval.length === 0 ? (
          <PanelBody>
            <FinanceEmptyState icon="check-circle" title="The queue is clear" description="Submitted expenses appear here until somebody approves or rejects them." />
          </PanelBody>
        ) : (
          <ul className="divide-y divide-[#f0efe6]">
            {expensesAwaitingApproval.map((row) => {
              const isSubmitter = row.submittedBy === user?.name;
              return (
                <li key={row.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-6">
                  <div className="min-w-[200px] flex-1">
                    <p className="text-[13.5px] font-semibold text-[#17211d]">{row.description}</p>
                    <p className="mt-0.5 text-[12px] text-[#69726d]">
                      {row.id} · {row.category} · {row.fundName} · submitted by {row.submittedBy} on {formatShortDate(row.submittedAt)}
                    </p>
                  </div>
                  <p className="text-[15px] font-semibold tabular-nums text-[#17211d]">{formatAmount(row.amount)}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Can permission="expense.manage">
                      <Button size="sm" icon="check" disabled={isSubmitter} onClick={() => setDecisionTarget(row)}>
                        Review
                      </Button>
                    </Can>
                    <IconButton icon="eye" label={`Open ${row.id}`} onClick={() => setSelected(row)} />
                  </div>
                  {isSubmitter && can("expense.manage") ? (
                    <p className="w-full text-[12px] text-[#8b938d]">You submitted this one, so somebody else approves it.</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        <PanelFooter>
          <ol className="flex flex-wrap gap-x-6 gap-y-2">
            {submitStages.map((stage, index) => (
              <li key={stage.key} className="flex items-start gap-2">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#eceadf] text-[11px] font-bold text-[#3d453f]">{index + 1}</span>
                <span>
                  <span className="block text-[12.5px] font-medium text-[#3d453f]">{stage.label}</span>
                  <span className="block text-[11.5px] text-[#8b938d]">{stage.hint}</span>
                </span>
              </li>
            ))}
          </ol>
        </PanelFooter>
      </Panel>

      {/* ---- Where it went ---- */}
      <Panel>
        <PanelHeader
          title="Spending by category"
          description={`${formatAmount(categoryTotal)} paid out this month across ${expenseByCategory.length} categories`}
          icon="chart"
        />
        <PanelBody>
          <ul className="grid gap-4 sm:grid-cols-2">
            {expenseByCategory.map((line) => (
              <li key={line.label}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[13px] font-medium text-[#3d453f]">{line.label}</p>
                  <p className="shrink-0 text-[13px] font-semibold tabular-nums text-[#17211d]">
                    {formatAmount(line.amount)}
                    <span className="ml-2 font-normal text-[#8b938d]">{formatPercent((line.amount / categoryTotal) * 100)}</span>
                  </p>
                </div>
                <ProgressBar
                  className="mt-1.5"
                  value={line.amount}
                  max={categoryTotal}
                  tone="danger"
                  label={`${line.label}, ${formatAmount(line.amount)} of ${formatAmount(categoryTotal)}`}
                />
                <p className="mt-1 text-[11.5px] text-[#8b938d]">{line.hint}</p>
              </li>
            ))}
          </ul>
        </PanelBody>
      </Panel>

      {/* ---- Register ---- */}
      <Panel>
        <PanelHeader title="Expense register" description="Every submission, whatever state it reached" icon="receipt-minus" />
        <FinanceFilters
          search={{ value: search, onChange: setSearch, placeholder: "Search description, vendor, reference…", label: "Search expenses" }}
          filters={filters}
          dateRange={{ label: "Date", from, to, onFromChange: setFrom, onToChange: setTo }}
          activeCount={activeCount}
          onReset={reset}
        />
        <DataTable
          rows={rows}
          columns={columns}
          getRowKey={(row) => row.id}
          caption="Expenses, filtered by the controls above"
          initialSort={{ key: "date", direction: "desc" }}
          pageSize={12}
          emptyState={
            <FinanceEmptyState
              icon="search"
              title="No expenses match"
              description="Clear a filter or widen the dates."
              action={
                activeCount > 0 ? (
                  <Button variant="secondary" size="sm" icon="close" onClick={reset}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          }
          footNote={`Anything at or above ${formatAmount(APPROVAL_THRESHOLD)} needs approval before it can be paid.`}
          mobileTitle={(row) => row.description}
          mobileSubtitle={(row) => `${row.id} · ${formatShortDate(row.date)}`}
          mobileTrailing={(row) => <Money value={row.amount} />}
          mobileHiddenKeys={["date", "description", "amount"]}
        />
      </Panel>

      {/* ---- Expense detail ---- */}
      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? selected.description : "Expense"}
        description={selected ? `${selected.id} · ${selected.category}` : undefined}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelected(null)}>
              Close
            </Button>
            {selected?.status === "Pending Approval" ? (
              <Can permission="expense.manage">
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
          </>
        }
      >
        {selected ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <ExpenseStatusBadge status={selected.status} />
              <Chip>{selected.category}</Chip>
              {selected.requiresApproval ? <Chip>Approval required</Chip> : <Chip>Below threshold</Chip>}
            </div>

            <WorkflowSteps
              steps={expenseWorkflow}
              current={selected.status === "Rejected" ? "Pending Approval" : selected.status}
              label="Expense progress"
              terminal={selected.status === "Rejected" ? { label: "Rejected", reason: selected.rejectionReason } : null}
            />

            <dl className="divide-y divide-[#f0efe6] rounded-md border border-[#e2e1d6] bg-[#faf9f4] px-3.5 py-1">
              <SummaryRow label="Date" value={formatDate(selected.date)} />
              <SummaryRow label="Fund" value={selected.fundName} />
              {selected.vendor ? <SummaryRow label="Paid to" value={selected.vendor} /> : null}
              <SummaryRow label="Payment method" value={selected.paymentMethod} />
              {selected.reference ? <SummaryRow label="Reference" value={selected.reference} /> : null}
              {selected.attachmentName ? <SummaryRow label="Bill attached" value={selected.attachmentName} /> : null}
              <SummaryRow label="Amount" value={<Money value={selected.amount} />} emphasis />
            </dl>

            {selected.notes ? <p className="text-[13px] leading-6 text-[#4d564f]">{selected.notes}</p> : null}

            <ApprovalTrail
              submittedBy={selected.submittedBy}
              submittedAt={selected.submittedAt}
              approvedBy={selected.approvedBy}
              approvedAt={selected.approvedAt}
              rejectionReason={selected.rejectionReason}
            />

            {selected.attachmentName ? null : (
              <InlineNotice tone="gold" icon="alert">
                No bill or quotation is attached. Approving without one leaves nothing to check the amount against.
              </InlineNotice>
            )}
          </div>
        ) : null}
      </Modal>

      {/* ---- Approve or reject ---- */}
      <ApprovalDialog
        open={Boolean(decisionTarget)}
        onClose={() => setDecisionTarget(null)}
        title="Review this expense"
        itemLabel={decisionTarget ? `${decisionTarget.id} — ${decisionTarget.description}` : ""}
        amountLabel={formatAmount(decisionTarget?.amount ?? 0)}
        details={
          decisionTarget ? (
            <dl className="divide-y divide-[#f0efe6]">
              <SummaryRow label="Category" value={decisionTarget.category} />
              <SummaryRow label="Fund" value={decisionTarget.fundName} />
              {decisionTarget.vendor ? <SummaryRow label="Paid to" value={decisionTarget.vendor} /> : null}
              <SummaryRow label="Submitted by" value={`${decisionTarget.submittedBy}, ${formatDate(decisionTarget.submittedAt)}`} />
              <SummaryRow label="Bill attached" value={decisionTarget.attachmentName ?? "None"} />
            </dl>
          ) : undefined
        }
        onDecision={(decision, note) => {
          const target = decisionTarget;
          setDecisionTarget(null);
          setNotice(
            decision === "approved"
              ? `Approval prepared for ${target?.id}. It would move to Approved and wait to be paid — nothing was saved, the finance API is not connected yet.`
              : `Rejection prepared for ${target?.id} with the reason "${note}". Nothing was saved, the finance API is not connected yet.`,
          );
        }}
      />

      {/* ---- Submit an expense ---- */}
      <Modal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        title="Submit an expense"
        description="Attach the bill or quotation. Whoever approves it needs something to check the amount against."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSubmitOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="submit-expense" icon="check">
              Submit for approval
            </Button>
          </>
        }
      >
        <form id="submit-expense" onSubmit={submitExpense} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Category"
              required
              options={expenseCategories}
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value as ExpenseCategory })}
            />
            <AmountField
              label="Amount"
              required
              hint={`Approval is required at ${formatAmount(APPROVAL_THRESHOLD)} and above.`}
              value={form.amount}
              error={errors.amount}
              onChange={(event) => setForm({ ...form, amount: event.target.value })}
            />
            <SelectField
              label="Fund"
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
            <TextField label="Date" type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
            <TextField label="Paid to" hint="Shop, contractor or utility." value={form.vendor} onChange={(event) => setForm({ ...form, vendor: event.target.value })} />
          </div>

          <TextField
            label="What it was for"
            required
            placeholder="Repair to the wudu area taps"
            value={form.description}
            error={errors.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
          <TextField label="Reference" hint="Bill or invoice number." value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} />

          <AttachmentField
            label="Bill or quotation"
            hint="A photo of the receipt is enough. PDF, JPG or PNG."
            fileName={attachment}
            onSelect={setAttachment}
            onClear={() => setAttachment(undefined)}
          />

          <TextAreaField label="Notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />

          {needsApproval ? (
            <InlineNotice tone="gold" icon="shield">
              {formatAmount(amountValue)} is at or above the {formatAmount(APPROVAL_THRESHOLD)} threshold, so this needs a second
              person&rsquo;s approval before it can be paid.
            </InlineNotice>
          ) : null}

          <InlineNotice icon="shield">
            Submitting is not paying. The expense counts against the mosque only once the money has actually left, and the API
            checks who is allowed to approve and who is allowed to pay.
          </InlineNotice>
        </form>
      </Modal>
    </div>
  );
}
