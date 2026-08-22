"use client";

import { useMemo, useState } from "react";
import { Chip, TransactionStatusBadge, TransactionTypeBadge } from "@/components/finance/ui/badge";
import { Button, IconButton } from "@/components/finance/ui/button";
import { DataTable, type Column } from "@/components/finance/ui/data-table";
import { FinanceFilters, type SelectFilter } from "@/components/finance/ui/filters";
import { AmountField, SelectField, SummaryRow, TextAreaField, TextField } from "@/components/finance/ui/form-field";
import { Modal } from "@/components/finance/ui/modal";
import { SignedMoney } from "@/components/finance/ui/money";
import { Panel, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { FinanceEmptyState, InlineNotice } from "@/components/finance/ui/states";
import { MiniStat } from "@/components/finance/ui/summary-card";
import { ApprovalTrail } from "@/components/finance/ui/workflow";
import { VoidDialog } from "@/components/finance/void-dialog";
import { fundFilterOptions, fundOptions } from "@/data/finance/funds";
import { recentTransactions } from "@/data/finance/transactions";
import { formatAmount, formatDate, formatShortDate, sumAmount } from "@/lib/finance/format";
import { paymentMethods, type Transaction, type TransactionStatus, type TransactionType } from "@/lib/finance/types";

/**
 * The ledger. Every rupee the mosque received or spent appears here once, whatever screen it was
 * entered from, which is why this page reads rather than owns the records.
 *
 * There is no edit and no delete, on purpose. A wrong entry is voided with a reason and a corrected
 * one is recorded beside it, so the running total always matches what an auditor can reconstruct.
 */

const typeFilterOptions: ReadonlyArray<{ value: TransactionType | "all"; label: string }> = [
  { value: "all", label: "All types" },
  { value: "Income", label: "Income" },
  { value: "Expense", label: "Expense" },
  { value: "Transfer", label: "Transfer" },
];

const statusFilterOptions: ReadonlyArray<{ value: TransactionStatus | "all"; label: string }> = [
  { value: "all", label: "All states" },
  { value: "Completed", label: "Completed" },
  { value: "Pending", label: "Pending" },
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
  { value: "Cancelled", label: "Cancelled" },
];

const transactionTypeOptions = [
  { value: "Income", label: "Income — money received" },
  { value: "Expense", label: "Expense — money paid out" },
  { value: "Transfer", label: "Transfer — between two funds" },
];

const incomeCategories = ["Donation", "Monthly Contribution", "Zakat", "Sadaqah", "Rent Income", "Other Income"];
const expenseCategories = ["Salary", "Electricity", "Water", "Internet", "Cleaning", "Maintenance", "Events", "Education", "Office", "Other"];

type FormState = {
  type: TransactionType;
  date: string;
  category: string;
  description: string;
  fundId: string;
  toFundId: string;
  paymentMethod: string;
  amount: string;
  reference: string;
  notes: string;
};

const emptyForm: FormState = {
  type: "Income",
  date: "2026-08-22",
  category: "",
  description: "",
  fundId: "",
  toFundId: "",
  paymentMethod: "Cash",
  amount: "",
  reference: "",
  notes: "",
};

export function TransactionsView() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<TransactionType | "all">("all");
  const [status, setStatus] = useState<TransactionStatus | "all">("all");
  const [fundId, setFundId] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  const [selected, setSelected] = useState<Transaction | null>(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const [voidTarget, setVoidTarget] = useState<Transaction | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitted, setSubmitted] = useState(false);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const min = minAmount ? Number(minAmount) : null;
    const max = maxAmount ? Number(maxAmount) : null;
    return recentTransactions.filter((row) => {
      if (term && ![row.id, row.description, row.category, row.fundName, row.reference ?? "", row.receiptNo ?? "", row.createdBy].some((value) => value.toLowerCase().includes(term))) {
        return false;
      }
      if (type !== "all" && row.type !== type) return false;
      if (status !== "all" && row.status !== status) return false;
      if (fundId !== "all" && row.fundId !== fundId && row.toFundId !== fundId) return false;
      if (from && row.date < from) return false;
      if (to && row.date > to) return false;
      if (min !== null && row.amount < min) return false;
      if (max !== null && row.amount > max) return false;
      return true;
    });
  }, [search, type, status, fundId, from, to, minAmount, maxAmount]);

  const activeCount = [type !== "all", status !== "all", fundId !== "all", Boolean(from || to), Boolean(minAmount || maxAmount)].filter(Boolean).length;

  const reset = () => {
    setType("all");
    setStatus("all");
    setFundId("all");
    setFrom("");
    setTo("");
    setMinAmount("");
    setMaxAmount("");
  };

  const filters: SelectFilter[] = [
    { id: "type", label: "Type", value: type, options: typeFilterOptions, onChange: (value) => setType(value as TransactionType | "all") },
    { id: "status", label: "State", value: status, options: statusFilterOptions, onChange: (value) => setStatus(value as TransactionStatus | "all") },
    { id: "fund", label: "Fund", value: fundId, options: fundFilterOptions, onChange: setFundId },
  ];

  const income = sumAmount(rows.filter((row) => row.type === "Income" && row.status === "Completed"), (row) => row.amount);
  const expense = sumAmount(rows.filter((row) => row.type === "Expense" && row.status === "Completed"), (row) => row.amount);

  const columns: Column<Transaction>[] = [
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
          <button
            type="button"
            onClick={() => setSelected(row)}
            className="rounded text-left font-medium text-[#17211d] underline-offset-2 transition-colors hover:text-[#0d4d3b] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
          >
            {row.description}
          </button>
          <p className="mt-0.5 text-[12px] text-[#8b938d]">
            {row.id} · {row.category}
          </p>
        </div>
      ),
      sortValue: (row) => row.description,
    },
    { key: "type", header: "Type", cell: (row) => <TransactionTypeBadge type={row.type} />, sortValue: (row) => row.type },
    {
      key: "fund",
      header: "Fund",
      cell: (row) => (
        <div className="flex flex-wrap items-center gap-1">
          <Chip>{row.fundName}</Chip>
          {row.toFundName ? (
            <>
              <span aria-hidden="true" className="text-[#9aa19c]">
                →
              </span>
              <Chip>{row.toFundName}</Chip>
            </>
          ) : null}
        </div>
      ),
      secondary: true,
    },
    { key: "method", header: "Method", cell: (row) => <span className="text-[13px]">{row.paymentMethod}</span>, secondary: true },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      cell: (row) => <SignedMoney value={row.amount} type={row.type} />,
      sortValue: (row) => row.amount,
    },
    { key: "status", header: "State", cell: (row) => <TransactionStatusBadge status={row.status} />, sortValue: (row) => row.status },
    {
      key: "actions",
      header: "Open record",
      headerHidden: true,
      align: "right",
      cell: (row) => <IconButton icon="eye" label={`Open ${row.id}`} onClick={() => setSelected(row)} />,
    },
  ];

  const categoryOptions = form.type === "Expense" ? expenseCategories : form.type === "Transfer" ? ["Fund Transfer"] : incomeCategories;
  const amountValue = Number(form.amount);
  const errors = {
    description: submitted && !form.description.trim() ? "Say what this entry is for." : undefined,
    category: submitted && !form.category ? "Choose a category." : undefined,
    fundId: submitted && !form.fundId ? "Choose the fund the money sits in." : undefined,
    toFundId:
      submitted && form.type === "Transfer"
        ? !form.toFundId
          ? "Choose the fund the money goes to."
          : form.toFundId === form.fundId
            ? "A transfer needs two different funds."
            : undefined
        : undefined,
    amount: submitted && (!form.amount || amountValue <= 0) ? "Enter an amount above zero." : undefined,
  };

  const submitRecord = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!form.description.trim() || !form.category || !form.fundId || !form.amount || amountValue <= 0) return;
    if (form.type === "Transfer" && (!form.toFundId || form.toFundId === form.fundId)) return;
    setRecordOpen(false);
    setSubmitted(false);
    setForm(emptyForm);
    setNotice(
      `Checked and ready: ${form.type.toLowerCase()} of ${formatAmount(amountValue)}. Nothing was written to the ledger — the finance API is not connected yet.`,
    );
  };

  return (
    <div className="space-y-5">
      {notice ? (
        <InlineNotice tone="gold" icon="info">
          {notice}
        </InlineNotice>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat label="Entries shown" value={String(rows.length)} hint="After the filters above" icon="list" />
        <MiniStat label="Income in view" value={formatAmount(income)} hint="Completed entries only" icon="arrow-down-right" tone="positive" />
        <MiniStat label="Expenses in view" value={formatAmount(expense)} hint="Completed entries only" icon="arrow-up" tone="negative" />
      </div>

      <Panel>
        <PanelHeader
          title="Ledger"
          description="Every recorded movement of money, newest first"
          icon="list"
          actions={
            <Can permission="transaction.record">
              <Button icon="plus" size="sm" onClick={() => setRecordOpen(true)}>
                Record entry
              </Button>
            </Can>
          }
        />
        <FinanceFilters
          search={{ value: search, onChange: setSearch, placeholder: "Search description, reference, receipt…", label: "Search the ledger" }}
          filters={filters}
          dateRange={{ label: "Date", from, to, onFromChange: setFrom, onToChange: setTo }}
          amountRange={{ label: "Amount", from: minAmount, to: maxAmount, onFromChange: setMinAmount, onToChange: setMaxAmount }}
          activeCount={activeCount}
          onReset={reset}
        />
        <DataTable
          rows={rows}
          columns={columns}
          getRowKey={(row) => row.id}
          caption="Ledger entries, filtered by the controls above"
          initialSort={{ key: "date", direction: "desc" }}
          pageSize={12}
          emptyState={
            <FinanceEmptyState
              icon="search"
              title="No entries match"
              description="Widen the date range or clear a filter to see more of the ledger."
              action={
                activeCount > 0 ? (
                  <Button variant="secondary" size="sm" icon="close" onClick={reset}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          }
          mobileTitle={(row) => row.description}
          mobileSubtitle={(row) => `${row.id} · ${formatShortDate(row.date)}`}
          mobileTrailing={(row) => <SignedMoney value={row.amount} type={row.type} />}
          mobileHiddenKeys={["date", "description", "amount"]}
        />
      </Panel>

      {/* ---- Record detail ---- */}
      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? selected.description : "Entry"}
        description={selected ? `${selected.id} · recorded by ${selected.createdBy}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelected(null)}>
              Close
            </Button>
            {selected && selected.status !== "Cancelled" ? (
              <Can permission="transaction.void">
                <Button
                  variant="danger"
                  icon="rotate"
                  onClick={() => {
                    setVoidTarget(selected);
                    setSelected(null);
                  }}
                >
                  Void entry
                </Button>
              </Can>
            ) : null}
          </>
        }
      >
        {selected ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <TransactionTypeBadge type={selected.type} />
              <TransactionStatusBadge status={selected.status} />
              <Chip>{selected.category}</Chip>
            </div>

            <dl className="divide-y divide-[#f0efe6] rounded-md border border-[#e2e1d6] bg-[#faf9f4] px-3.5 py-1">
              <SummaryRow label="Date" value={formatDate(selected.date)} />
              <SummaryRow label="Fund" value={selected.toFundName ? `${selected.fundName} → ${selected.toFundName}` : selected.fundName} />
              <SummaryRow label="Payment method" value={selected.paymentMethod} />
              {selected.reference ? <SummaryRow label="Reference" value={selected.reference} /> : null}
              {selected.receiptNo ? <SummaryRow label="Receipt" value={selected.receiptNo} /> : null}
              <SummaryRow label="Recorded by" value={`${selected.createdBy} (${selected.createdByRole})`} />
              <SummaryRow label="Amount" value={<SignedMoney value={selected.amount} type={selected.type} />} emphasis />
            </dl>

            {selected.notes ? <p className="text-[13px] leading-6 text-[#4d564f]">{selected.notes}</p> : null}

            <ApprovalTrail
              submittedBy={selected.createdBy}
              submittedAt={selected.date}
              approvedBy={selected.approvedBy}
              approvedAt={selected.approvedAt}
            />

            <InlineNotice icon="lock">
              Entries are never edited. If this one is wrong, void it and record a corrected entry so both stay in the books.
            </InlineNotice>
          </div>
        ) : null}
      </Modal>

      {/* ---- Void ---- */}
      <VoidDialog
        open={Boolean(voidTarget)}
        onClose={() => setVoidTarget(null)}
        recordLabel={voidTarget ? `${voidTarget.id} — ${voidTarget.description}` : ""}
        amount={voidTarget?.amount ?? 0}
        details={
          voidTarget
            ? [
                { label: "Date", value: formatDate(voidTarget.date) },
                { label: "Fund", value: voidTarget.fundName },
              ]
            : []
        }
        onVoid={(reason) => {
          const target = voidTarget;
          setVoidTarget(null);
          setNotice(
            `Void prepared for ${target?.id} with the reason "${reason}". Nothing changed in the ledger — the finance API is not connected yet.`,
          );
        }}
      />

      {/* ---- Record a new entry ---- */}
      <Modal
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
        title="Record a ledger entry"
        description="Use this for money that has already moved. Donations, contributions and salaries are recorded on their own pages."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRecordOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="record-transaction" icon="check">
              Record entry
            </Button>
          </>
        }
      >
        <form id="record-transaction" onSubmit={submitRecord} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Type"
              required
              options={transactionTypeOptions}
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.target.value as TransactionType, category: "" })}
            />
            <TextField label="Date" type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
            <SelectField
              label="Category"
              required
              placeholder="Choose a category"
              options={categoryOptions}
              value={form.category}
              error={errors.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
            />
            <AmountField
              label="Amount"
              required
              value={form.amount}
              error={errors.amount}
              onChange={(event) => setForm({ ...form, amount: event.target.value })}
            />
            <SelectField
              label={form.type === "Transfer" ? "From fund" : "Fund"}
              required
              placeholder="Choose a fund"
              options={fundOptions}
              value={form.fundId}
              error={errors.fundId}
              onChange={(event) => setForm({ ...form, fundId: event.target.value })}
            />
            {form.type === "Transfer" ? (
              <SelectField
                label="To fund"
                required
                placeholder="Choose a fund"
                options={fundOptions}
                value={form.toFundId}
                error={errors.toFundId}
                onChange={(event) => setForm({ ...form, toFundId: event.target.value })}
              />
            ) : (
              <SelectField
                label="Payment method"
                required
                options={paymentMethods}
                value={form.paymentMethod}
                onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })}
              />
            )}
          </div>

          <TextField
            label="Description"
            required
            placeholder="Shop rent for August"
            value={form.description}
            error={errors.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
          <TextField
            label="Reference"
            hint="Bill number, transfer reference or the record this came from."
            value={form.reference}
            onChange={(event) => setForm({ ...form, reference: event.target.value })}
          />
          <TextAreaField label="Notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />

          <InlineNotice icon="shield">
            Recording is not the same as verifying. A second person confirms the entry before a receipt is issued, and the API
            checks that permission again.
          </InlineNotice>
        </form>
      </Modal>
    </div>
  );
}
