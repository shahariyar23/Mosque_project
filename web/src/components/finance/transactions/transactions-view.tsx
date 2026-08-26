"use client";

import { useMemo, useState } from "react";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import { Chip, TransactionStatusBadge, TransactionTypeBadge } from "@/components/finance/ui/badge";
import { Button, IconButton } from "@/components/finance/ui/button";
import { DataTable, Pagination, type Column } from "@/components/finance/ui/data-table";
import { FinanceFilters, type SelectFilter } from "@/components/finance/ui/filters";
import { AmountField, SelectField, SummaryRow, TextAreaField, TextField } from "@/components/finance/ui/form-field";
import { Modal } from "@/components/finance/ui/modal";
import { SignedDecimalMoney } from "@/components/finance/ui/money";
import { Panel, PanelFooter, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { TableSkeleton } from "@/components/finance/ui/skeleton";
import { FinanceEmptyState, FinanceErrorState, InlineNotice } from "@/components/finance/ui/states";
import { MiniStat } from "@/components/finance/ui/summary-card";
import { VoidDialog } from "@/components/finance/void-dialog";
import { useToast } from "@/components/ui/toast";
import { useApiList, useApiResource } from "@/hooks/use-api";
import { formatDecimal } from "@/lib/finance/decimal";
import { formatDate, formatShortDate } from "@/lib/finance/format";
import { fetchDonationFunds } from "@/services/donationFundsService";
import {
  createTransaction,
  fetchTransactions,
  fetchTransactionSummary,
  voidTransaction,
  type CreateTransactionInput,
  type Transaction,
  type TransactionQuery,
  type TransactionStatus,
  type TransactionType,
} from "@/services/transactionsService";

const typeFilterOptions: ReadonlyArray<{ value: TransactionType | "all"; label: string }> = [
  { value: "all", label: "All types" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
  { value: "transfer", label: "Transfer" },
];

const statusFilterOptions: ReadonlyArray<{ value: TransactionStatus | "all"; label: string }> = [
  { value: "all", label: "All states" },
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" },
  { value: "voided", label: "Voided" },
  { value: "cancelled", label: "Cancelled" },
];

const transactionTypeOptions = [
  { value: "income", label: "Income — money received" },
  { value: "expense", label: "Expense — money paid out" },
  { value: "transfer", label: "Transfer — between two funds" },
];

const transactionPaymentMethods = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "online", label: "Online" },
  { value: "other", label: "Other" },
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
  type: "income",
  date: new Date().toISOString().slice(0, 10),
  category: "",
  description: "",
  fundId: "",
  toFundId: "",
  paymentMethod: "cash",
  amount: "",
  reference: "",
  notes: "",
};

export function TransactionsView() {
  const { can } = useDashboardSession();
  const { notify } = useToast();

  const [page, setPage] = useState(1);
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>(undefined);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitted, setSubmitted] = useState(false);

  // Funds list for dropdowns
  const { data: fundsData } = useApiResource(() => fetchDonationFunds({ limit: 100 }), []);
  const fundsList = fundsData?.rows || [];

  const fundFilterOptions = useMemo(() => [
    { value: "all", label: "All funds" },
    ...fundsList.map((f) => ({ value: f.id, label: f.name })),
  ], [fundsList]);

  const fundOptions = useMemo(() => [
    ...fundsList.map((f) => ({ value: f.id, label: f.name })),
  ], [fundsList]);

  // Query payload for transactions
  const query: TransactionQuery = useMemo(() => ({
    page,
    limit: 12,
    search: search.trim() || undefined,
    type: type !== "all" ? type : undefined,
    status: status !== "all" ? status : undefined,
    fundId: fundId !== "all" ? fundId : undefined,
    dateFrom: from || undefined,
    dateTo: to || undefined,
    minAmount: minAmount || undefined,
    maxAmount: maxAmount || undefined,
  }), [page, search, type, status, fundId, from, to, minAmount, maxAmount]);

  const { rows, meta, loading, error, refetch } = useApiList(fetchTransactions, query, {
    enabled: can("transaction.view"),
  });

  const { data: summary, refetch: refetchSummary } = useApiResource(fetchTransactionSummary, [], {
    enabled: can("transaction.view"),
  });

  const totalCount = meta?.total ?? rows.length;
  const totalPages = meta?.totalPages ?? 1;
  const currentPage = meta?.page ?? page;

  const activeCount = [
    type !== "all",
    status !== "all",
    fundId !== "all",
    Boolean(from || to),
    Boolean(minAmount || maxAmount),
  ].filter(Boolean).length;

  const reset = () => {
    setType("all");
    setStatus("all");
    setFundId("all");
    setFrom("");
    setTo("");
    setMinAmount("");
    setMaxAmount("");
    setPage(1);
  };

  const filters: SelectFilter[] = [
    {
      id: "type",
      label: "Type",
      value: type,
      options: typeFilterOptions,
      onChange: (value) => {
        setType(value as TransactionType | "all");
        setPage(1);
      },
    },
    {
      id: "status",
      label: "State",
      value: status,
      options: statusFilterOptions,
      onChange: (value) => {
        setStatus(value as TransactionStatus | "all");
        setPage(1);
      },
    },
    {
      id: "fund",
      label: "Fund",
      value: fundId,
      options: fundFilterOptions,
      onChange: (value) => {
        setFundId(value);
        setPage(1);
      },
    },
  ];

  const columns: Column<Transaction>[] = [
    {
      key: "date",
      header: "Date",
      cell: (row) => <span className="whitespace-nowrap tabular-nums">{formatShortDate(row.transactedAt)}</span>,
      sortValue: (row) => row.transactedAt,
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
            {row.id.slice(0, 8)} · {row.category || "General"}
          </p>
        </div>
      ),
      sortValue: (row) => row.description,
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
      cell: (row) => (
        <div className="flex flex-wrap items-center gap-1">
          <Chip>{row.fund?.name || "General"}</Chip>
          {row.toFund ? (
            <>
              <span aria-hidden="true" className="text-[#9aa19c]">
                →
              </span>
              <Chip>{row.toFund.name}</Chip>
            </>
          ) : null}
        </div>
      ),
      secondary: true,
    },
    {
      key: "method",
      header: "Method",
      cell: (row) => <span className="text-[13px] capitalize">{row.paymentMethod?.replace(/_/g, " ")}</span>,
      secondary: true,
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      cell: (row) => <SignedDecimalMoney value={row.amount} type={row.type} />,
      sortValue: (row) => Number(row.amount),
    },
    {
      key: "status",
      header: "State",
      cell: (row) => <TransactionStatusBadge status={row.status} />,
      sortValue: (row) => row.status,
    },
    {
      key: "actions",
      header: "Open record",
      headerHidden: true,
      align: "right",
      cell: (row) => <IconButton icon="eye" label={`Open ${row.id}`} onClick={() => setSelected(row)} />,
    },
  ];

  const categoryOptions = form.type === "expense" ? expenseCategories : form.type === "transfer" ? ["Fund Transfer"] : incomeCategories;
  const amountValue = Number(form.amount);
  const errors = {
    description: (submitted && !form.description.trim() ? "Say what this entry is for." : undefined) || fieldErrors?.description?.[0],
    category: (submitted && !form.category ? "Choose a category." : undefined) || fieldErrors?.category?.[0],
    fundId: (submitted && !form.fundId ? "Choose the fund the money sits in." : undefined) || fieldErrors?.fundId?.[0],
    toFundId:
      submitted && form.type === "transfer"
        ? !form.toFundId
          ? "Choose the fund the money goes to."
          : form.toFundId === form.fundId
            ? "A transfer needs two different funds."
            : undefined
        : fieldErrors?.toFundId?.[0],
    amount: (submitted && (!form.amount || amountValue <= 0) ? "Enter an amount above zero." : undefined) || fieldErrors?.amount?.[0],
    paymentMethod: fieldErrors?.paymentMethod?.[0],
    reference: fieldErrors?.reference?.[0],
  };

  const submitRecord = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    setFormError(null);
    setFieldErrors(undefined);

    if (!form.description.trim() || !form.category || !form.fundId || !form.amount || amountValue <= 0) return;
    if (form.type === "transfer" && (!form.toFundId || form.toFundId === form.fundId)) return;

    try {
      setIsSubmitting(true);
      const input: CreateTransactionInput = {
        type: form.type,
        amount: form.amount.trim(),
        description: form.description.trim(),
        category: form.category.trim() || undefined,
        fundId: form.fundId || undefined,
        toFundId: form.type === "transfer" ? form.toFundId : undefined,
        paymentMethod: form.paymentMethod || undefined,
        reference: form.reference.trim() || undefined,
        transactedAt: form.date ? new Date(form.date).toISOString() : undefined,
      };

      await createTransaction(input);
      notify({
        message: "Transaction recorded",
        description: `${form.type === "income" ? "Income" : form.type === "expense" ? "Expense" : "Transfer"} of ৳${form.amount} booked into the ledger.`,
        tone: "success",
      });

      setRecordOpen(false);
      setSubmitted(false);
      setForm(emptyForm);
      setFieldErrors(undefined);
      refetch();
      refetchSummary();
    } catch (err: any) {
      const fErrors = err?.errors || err?.fieldErrors;
      if (fErrors && typeof fErrors === "object") {
        setFieldErrors(fErrors);
      }
      setFormError(err.message || "Failed to record transaction.");
      notify({
        message: "Unable to record transaction",
        description: err.message || "Some of the details provided are not valid.",
        tone: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoid = async (reason: string) => {
    if (!voidTarget) return;
    try {
      await voidTransaction(voidTarget.id, reason);
      notify({
        message: "Transaction voided",
        description: `Transaction ${voidTarget.id.slice(0, 8)} voided and reversed in the ledger.`,
        tone: "info",
      });
      setVoidTarget(null);
      refetch();
      refetchSummary();
    } catch (err: any) {
      notify({
        message: "Failed to void",
        description: err.message || "Unable to void transaction.",
        tone: "danger",
      });
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-4">
        <MiniStat
          label="Total Entries"
          value={String(summary?.totalTransactions ?? totalCount)}
          hint="All time recorded"
          icon="list"
        />
        <MiniStat
          label="Total Income"
          value={summary ? formatDecimal(summary.incomeTotal) : "৳0.00"}
          hint="Completed income"
          icon="arrow-down-right"
          tone="positive"
        />
        <MiniStat
          label="Total Expenses"
          value={summary ? formatDecimal(summary.expenseTotal) : "৳0.00"}
          hint="Completed expenses"
          icon="arrow-up"
          tone="negative"
        />
        <MiniStat
          label="Net Balance"
          value={summary ? formatDecimal(summary.netBalance) : "৳0.00"}
          hint="Income minus expense"
          icon="chart"
          tone={summary && Number(summary.netBalance) < 0 ? "negative" : "positive"}
        />
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
          search={{
            value: search,
            onChange: (val) => {
              setSearch(val);
              setPage(1);
            },
            placeholder: "Search description, reference, receipt…",
            label: "Search the ledger",
          }}
          filters={filters}
          dateRange={{
            label: "Date",
            from,
            to,
            onFromChange: (val) => {
              setFrom(val);
              setPage(1);
            },
            onToChange: (val) => {
              setTo(val);
              setPage(1);
            },
          }}
          amountRange={{
            label: "Amount",
            from: minAmount,
            to: maxAmount,
            onFromChange: (val) => {
              setMinAmount(val);
              setPage(1);
            },
            onToChange: (val) => {
              setMaxAmount(val);
              setPage(1);
            },
          }}
          activeCount={activeCount}
          onReset={reset}
        />

        {loading ? (
          <TableSkeleton rows={8} />
        ) : error ? (
          <FinanceErrorState
            title="Failed to load ledger"
            description={typeof error === "string" ? error : "An unexpected error occurred while fetching transactions."}
            onRetry={refetch}
          />
        ) : (
          <>
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
              mobileSubtitle={(row) => `${row.id.slice(0, 8)} · ${formatShortDate(row.transactedAt)}`}
              mobileTrailing={(row) => <SignedDecimalMoney value={row.amount} type={row.type} />}
              mobileHiddenKeys={["date", "description", "amount"]}
            />
            {totalPages > 1 ? (
              <PanelFooter>
                <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
              </PanelFooter>
            ) : null}
          </>
        )}
      </Panel>

      {/* ---- Record detail ---- */}
      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? selected.description : "Entry"}
        description={selected ? `${selected.id} · recorded by ${selected.createdBy?.fullName || "System"}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelected(null)}>
              Close
            </Button>
            {selected && selected.status !== "voided" && selected.status !== "cancelled" ? (
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
              {selected.category ? <Chip>{selected.category}</Chip> : null}
            </div>

            <dl className="divide-y divide-[#f0efe6] rounded-md border border-[#e2e1d6] bg-[#faf9f4] px-3.5 py-1">
              <SummaryRow label="Date" value={formatDate(selected.transactedAt)} />
              <SummaryRow
                label="Fund"
                value={selected.toFund ? `${selected.fund?.name || "General"} → ${selected.toFund.name}` : selected.fund?.name || "General"}
              />
              <SummaryRow label="Payment method" value={selected.paymentMethod} />
              {selected.reference ? <SummaryRow label="Reference" value={selected.reference} /> : null}
              {selected.receipt ? <SummaryRow label="Receipt" value={selected.receipt.receiptNumber} /> : null}
              <SummaryRow label="Recorded by" value={selected.createdBy?.fullName || "System"} />
              <SummaryRow label="Amount" value={<SignedDecimalMoney value={selected.amount} type={selected.type} />} emphasis />
            </dl>

            <InlineNotice icon="lock">
              Entries are never edited. If this one is wrong, void it and record a corrected entry so both stay in the books.
            </InlineNotice>
          </div>
        ) : null}
      </Modal>

      {/* ---- Void Dialog ---- */}
      <VoidDialog
        open={Boolean(voidTarget)}
        onClose={() => setVoidTarget(null)}
        recordLabel={voidTarget ? `${voidTarget.id.slice(0, 8)} — ${voidTarget.description}` : ""}
        amount={voidTarget ? Number(voidTarget.amount) : 0}
        details={
          voidTarget
            ? [
                { label: "Date", value: formatDate(voidTarget.transactedAt) },
                { label: "Fund", value: voidTarget.fund?.name || "General" },
              ]
            : []
        }
        onVoid={handleVoid}
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
            <Button variant="secondary" onClick={() => setRecordOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form="record-transaction" icon="check" disabled={isSubmitting}>
              {isSubmitting ? "Recording…" : "Record entry"}
            </Button>
          </>
        }
      >
        <form id="record-transaction" onSubmit={submitRecord} noValidate className="space-y-4">
          {formError ? (
            <InlineNotice tone="danger" icon="alert">
              {formError}
            </InlineNotice>
          ) : null}

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
              label={form.type === "transfer" ? "From fund" : "Fund"}
              required
              placeholder="Choose a fund"
              options={fundOptions}
              value={form.fundId}
              error={errors.fundId}
              onChange={(event) => setForm({ ...form, fundId: event.target.value })}
            />
            {form.type === "transfer" ? (
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
                options={transactionPaymentMethods}
                value={form.paymentMethod}
                error={errors.paymentMethod}
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
            error={errors.reference}
            onChange={(event) => setForm({ ...form, reference: event.target.value })}
          />
          <TextAreaField label="Notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />

          <InlineNotice icon="shield">
            Recording creates an immutable financial transaction in the mosque ledger.
          </InlineNotice>
        </form>
      </Modal>
    </div>
  );
}
