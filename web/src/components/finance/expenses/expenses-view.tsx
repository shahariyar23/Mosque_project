"use client";

import { useState } from "react";
import { Chip, ExpenseStatusBadge } from "@/components/finance/ui/badge";
import { Button, IconButton } from "@/components/finance/ui/button";
import { DataTable, type Column } from "@/components/finance/ui/data-table";
import { ApprovalDialog, ConfirmDialog } from "@/components/finance/ui/dialogs";
import { FinanceFilters, type SelectFilter } from "@/components/finance/ui/filters";
import { AmountField, SelectField, SummaryRow, TextAreaField, TextField } from "@/components/finance/ui/form-field";
import { Icon } from "@/components/finance/ui/icon";
import { Modal } from "@/components/finance/ui/modal";
import { Money } from "@/components/finance/ui/money";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { ProgressBar } from "@/components/finance/ui/progress";
import { FinanceEmptyState, FinanceErrorState, InlineNotice } from "@/components/finance/ui/states";
import { MiniStat } from "@/components/finance/ui/summary-card";
import { TableSkeleton } from "@/components/finance/ui/skeleton";
import { Pagination } from "@/components/finance/ui/data-table";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import { useToast } from "@/components/ui/toast";
import { useApiList, useApiResource } from "@/hooks/use-api";
import { 
  fetchExpenses, 
  createExpense, 
  updateExpense, 
  deleteExpense, 
  type Expense, 
  type ExpenseQuery, 
  type CreateExpenseInput 
} from "@/services/expensesService";
import { fetchExpenseReport } from "@/services/financialReportsService";
import { formatAmount, formatPercent, formatShortDate } from "@/lib/finance/format";
import type { ExpenseStatus, PaymentMethod } from "@/services/enums";

const expenseStatusFilterOptions = [
  { value: "all", label: "Any state" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" },
];

export function ExpensesView() {
  const { can, user } = useDashboardSession();
  const { notify } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<ExpenseStatus | "all">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [selected, setSelected] = useState<Expense | null>(null);
  const [decisionTarget, setDecisionTarget] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>(undefined);

  const query: ExpenseQuery = {
    page,
    limit: 12,
    search: search || undefined,
    status: status !== "all" ? status : undefined,
    category: category !== "all" ? category : undefined,
    from: from || undefined,
    to: to || undefined,
  };

  const { rows, meta, loading, error, refetch } = useApiList(fetchExpenses, query, { enabled: can("expense.view") });
  const { rows: pendingRows, refetch: refetchPending } = useApiList(fetchExpenses, { limit: 50, status: "pending" as any }, { enabled: can("expense.manage") });
  const { data: report, refetch: refetchReport } = useApiResource(() => fetchExpenseReport(), [], { enabled: can("finance.view") });

  const refreshAll = () => {
    refetch();
    refetchPending();
    refetchReport();
  };

  const activeCount = [category !== "all", status !== "all", Boolean(from || to)].filter(Boolean).length;

  const reset = () => {
    setCategory("all");
    setStatus("all");
    setFrom("");
    setTo("");
    setPage(1);
  };

  const categoryOptions = [
    { value: "all", label: "All categories" },
    ...(report?.byCategory.map(c => ({ value: c.category, label: c.category })) || []),
  ];

  const filters: SelectFilter[] = [
    { id: "category", label: "Category", value: category, options: categoryOptions, onChange: (val) => { setCategory(val); setPage(1); } },
    { id: "status", label: "State", value: status, options: expenseStatusFilterOptions, onChange: (val) => { setStatus(val as ExpenseStatus | "all"); setPage(1); } },
  ];

  const handleCreateExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      setIsSubmitting(true);
      setCreateError(null);
      setFieldErrors(undefined);

      const input: CreateExpenseInput = {
        category: formData.get("category") as string,
        description: formData.get("description") as string,
        amount: (formData.get("amount") as string).replace(/,/g, ""),
        paymentMethod: (formData.get("paymentMethod") as PaymentMethod) || "cash",
        expenseDate: formData.get("expenseDate") as string,
        status: (formData.get("status") as ExpenseStatus) || "pending",
        reference: (formData.get("reference") as string) || null,
        notes: (formData.get("notes") as string) || null,
      };

      await createExpense(input);
      setRecordOpen(false);
      refreshAll();
      notify({
        message: "Expense recorded",
        description: `"${input.description}" has been booked.`,
        tone: "success",
      });
    } catch (err: any) {
      const fieldErr = err?.fieldErrors || err?.errors;
      let detailedMsg = err.message || "Failed to record expense";
      if (fieldErr && typeof fieldErr === "object") {
        setFieldErrors(fieldErr);
        const detailList = Object.values(fieldErr).flat().filter(Boolean).join(". ");
        if (detailList) detailedMsg = detailList;
      } else {
        setFieldErrors(undefined);
      }
      setCreateError(detailedMsg);
      notify({
        message: "Unable to record expense",
        description: detailedMsg,
        tone: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecision = async (decision: "approved" | "rejected", note: string) => {
    if (!decisionTarget) return;
    try {
      const newStatus: ExpenseStatus = decision === "approved" ? "approved" : "cancelled";
      await updateExpense(decisionTarget.id, { 
        status: newStatus,
        notes: note ? `${decisionTarget.notes ? decisionTarget.notes + " — " : ""}${note}` : undefined,
      });
      const desc = decisionTarget.description;
      setDecisionTarget(null);
      refreshAll();
      notify({
        message: decision === "approved" ? "Expense Approved" : "Expense Rejected",
        description: `"${desc}" was marked as ${newStatus}.`,
        tone: decision === "approved" ? "success" : "danger",
      });
    } catch (err: any) {
      notify({
        message: "Action failed",
        description: err.message || "Could not update expense",
        tone: "danger",
      });
    }
  };

  const handleMarkPaid = async (expense: Expense) => {
    try {
      await updateExpense(expense.id, { status: "paid" });
      setSelected(null);
      refreshAll();
      notify({
        message: "Expense marked as Paid",
        description: `"${expense.description}" marked as paid.`,
        tone: "success",
      });
    } catch (err: any) {
      notify({
        message: "Action failed",
        description: err.message || "Could not update expense",
        tone: "danger",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteExpense(deleteTarget.id);
      const desc = deleteTarget.description;
      setDeleteTarget(null);
      setSelected(null);
      refreshAll();
      notify({
        message: "Expense deleted",
        description: `"${desc}" was removed.`,
        tone: "success",
      });
    } catch (err: any) {
      notify({
        message: "Delete failed",
        description: err.message || "Could not delete expense",
        tone: "danger",
      });
    }
  };

  const columns: Column<Expense>[] = [
    {
      key: "date",
      header: "Date",
      cell: (row: Expense) => <span className="whitespace-nowrap tabular-nums">{formatShortDate(row.expenseDate)}</span>,
    },
    {
      key: "description",
      header: "What it was for",
      cell: (row: Expense) => (
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => setSelected(row)}
            className="rounded text-left font-medium text-[#17211d] underline-offset-2 transition-colors hover:text-[#0d4d3b] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
          >
            {row.description}
          </button>
          <p className="mt-0.5 text-[12px] text-[#8b938d]">{row.id}</p>
        </div>
      ),
    },
    { key: "category", header: "Category", cell: (row: Expense) => <Chip>{row.category}</Chip> },
    { key: "method", header: "Method", cell: (row: Expense) => <span className="text-[13px]">{row.paymentMethod}</span>, secondary: true },
    { key: "amount", header: "Amount", align: "right", cell: (row: Expense) => <Money value={parseFloat(row.amount)} /> },
    { key: "status", header: "State", cell: (row: Expense) => <ExpenseStatusBadge status={row.status as any} /> },
    {
      key: "actions",
      header: "Open expense",
      headerHidden: true,
      align: "right",
      cell: (row: Expense) => <IconButton icon="eye" label={`Open ${row.id}`} onClick={() => setSelected(row)} />,
    },
  ];

  if (loading && !rows.length) return <TableSkeleton />;
  if (error) return <FinanceErrorState description={error} onRetry={refetch} />;

  const paidTotal = report?.byStatus.find(s => s.status === "paid")?.total ?? "0.00";
  const approvedTotal = report?.byStatus.find(s => s.status === "approved")?.total ?? "0.00";
  
  const pendingCount = pendingRows?.length ?? 0;
  const pendingTotal = pendingRows?.reduce((sum: number, r: Expense) => sum + parseFloat(r.amount), 0) ?? 0;

  const categoryTotalAmount = report?.byCategory.reduce((sum, c) => sum + parseFloat(c.total), 0) ?? 0;

  return (
    <div className="space-y-5">
      {report && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MiniStat label="Total Expenses" value={formatAmount(parseFloat(report.total))} hint={`${report.count} records`} icon="receipt-minus" tone="neutral" />
          <MiniStat label="Paid" value={formatAmount(parseFloat(paidTotal))} hint="Money that actually left" icon="arrow-up" tone="negative" />
          <MiniStat label="Waiting for approval" value={formatAmount(pendingTotal)} hint={`${pendingCount} pending`} icon="clock" tone="warning" />
          <MiniStat label="Approved, not yet paid" value={formatAmount(parseFloat(approvedTotal))} hint="Committed" icon="scale" />
        </div>
      )}

      {/* ---- Approval queue ---- */}
      {can("expense.manage") && (
        <Panel>
          <PanelHeader
            title="Waiting for approval"
            description={
              pendingCount === 0
                ? "Nothing is waiting"
                : `${pendingCount} submissions, ${formatAmount(pendingTotal)} in total`
            }
            icon="clock"
          />
          {pendingCount === 0 ? (
            <PanelBody>
              <FinanceEmptyState icon="check-circle" title="The queue is clear" description="Submitted expenses appear here." />
            </PanelBody>
          ) : (
            <ul className="divide-y divide-[#f0efe6]">
              {pendingRows?.map((row: Expense) => {
                return (
                  <li key={row.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-6">
                    <div className="min-w-[200px] flex-1">
                      <p className="text-[13.5px] font-semibold text-[#17211d]">{row.description}</p>
                      <p className="mt-0.5 text-[12px] text-[#69726d]">
                        {row.id} · {row.category} · submitted by {row.createdBy?.fullName ?? "Staff"} on {formatShortDate(row.createdAt)}
                      </p>
                    </div>
                    <p className="text-[15px] font-semibold tabular-nums text-[#17211d]">{formatAmount(parseFloat(row.amount))}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" icon="check" onClick={() => setDecisionTarget(row)}>
                        Review
                      </Button>
                      <IconButton icon="eye" label={`Open ${row.id}`} onClick={() => setSelected(row)} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      )}

      {report && report.byCategory.length > 0 && (
        <Panel>
          <PanelHeader
            title="Spending by category"
            description={`${formatAmount(categoryTotalAmount)} paid out across ${report.byCategory.length} categories`}
            icon="chart"
          />
          <PanelBody>
            <ul className="grid gap-4 sm:grid-cols-2">
              {report.byCategory.map((line) => (
                <li key={line.category}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[13px] font-medium text-[#3d453f]">{line.category}</p>
                    <p className="shrink-0 text-[13px] font-semibold tabular-nums text-[#17211d]">
                      {formatAmount(parseFloat(line.total))}
                      <span className="ml-2 font-normal text-[#8b938d]">{formatPercent((parseFloat(line.total) / (categoryTotalAmount || 1)) * 100)}</span>
                    </p>
                  </div>
                  <ProgressBar
                    className="mt-1.5"
                    value={parseFloat(line.total)}
                    max={categoryTotalAmount}
                    tone="danger"
                    label={`${line.category}`}
                  />
                </li>
              ))}
            </ul>
          </PanelBody>
        </Panel>
      )}

      <Panel>
        <PanelHeader 
          title="Expense register" 
          description="Every submission, whatever state it reached" 
          icon="receipt-minus"
          actions={
            <Can permission="expense.manage">
              <Button size="sm" icon="plus" onClick={() => setRecordOpen(true)}>
                Record Expense
              </Button>
            </Can>
          } 
        />
        <FinanceFilters
          search={{ value: search, onChange: setSearch, placeholder: "Search description, reference…", label: "Search expenses" }}
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
          pageSize={12}
          emptyState={
            <FinanceEmptyState icon="search" title="No expenses match" description="Clear a filter or widen the dates." />
          }
          mobileTitle={(row) => row.description}
          mobileSubtitle={(row) => `${row.id} · ${formatShortDate(row.expenseDate)}`}
          mobileTrailing={(row) => <Money value={parseFloat(row.amount)} />}
          mobileHiddenKeys={["date", "description", "amount"]}
        />
        {meta && meta.totalPages > 1 && (
          <div className="border-t border-[#e7e6dc] px-5 py-4">
            <Pagination page={meta.page} totalPages={meta.totalPages} onChange={setPage} />
          </div>
        )}
      </Panel>

      {/* Details Modal */}
      <Modal 
        open={Boolean(selected)} 
        onClose={() => setSelected(null)} 
        title={selected?.description || "Expense"}
        footer={
          selected && can("expense.manage") ? (
            <div className="flex flex-wrap items-center justify-between w-full gap-2">
              {selected.status === "pending" ? (
                <Button variant="danger" size="sm" icon="trash" onClick={() => setDeleteTarget(selected)}>
                  Delete
                </Button>
              ) : null}

              <div className="flex items-center gap-2 ml-auto">
                {selected.status === "approved" && (
                  <Button size="sm" icon="check" onClick={() => handleMarkPaid(selected)}>
                    Mark as Paid
                  </Button>
                )}
                <Button variant="secondary" size="sm" onClick={() => setSelected(null)}>
                  Close
                </Button>
              </div>
            </div>
          ) : undefined
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <ExpenseStatusBadge status={selected.status as any} />
              <Chip>{selected.category}</Chip>
            </div>
            <dl className="divide-y divide-[#f0efe6] rounded-md border border-[#e2e1d6] bg-[#faf9f4] px-3.5 py-1">
              <SummaryRow label="Date" value={formatShortDate(selected.expenseDate)} />
              <SummaryRow label="Payment method" value={selected.paymentMethod} />
              {selected.reference ? <SummaryRow label="Reference" value={selected.reference} /> : null}
              <SummaryRow label="Submitted by" value={`${selected.createdBy?.fullName ?? "Staff"} on ${formatShortDate(selected.createdAt)}`} />
              <SummaryRow label="Amount" value={<Money value={parseFloat(selected.amount)} />} emphasis />
            </dl>
            {selected.notes ? <p className="text-[13px] leading-6 text-[#4d564f]">{selected.notes}</p> : null}
          </div>
        )}
      </Modal>

      {/* Approval Dialog */}
      <ApprovalDialog
        open={Boolean(decisionTarget)}
        onClose={() => setDecisionTarget(null)}
        title="Review this expense"
        itemLabel={decisionTarget ? `${decisionTarget.id} — ${decisionTarget.description}` : ""}
        amountLabel={formatAmount(parseFloat(decisionTarget?.amount ?? "0"))}
        details={
          decisionTarget ? (
            <dl className="divide-y divide-[#f0efe6]">
              <SummaryRow label="Category" value={decisionTarget.category} />
              <SummaryRow label="Submitted by" value={`${decisionTarget.createdBy?.fullName ?? "Staff"}, ${formatShortDate(decisionTarget.createdAt)}`} />
            </dl>
          ) : undefined
        }
        onDecision={handleDecision}
      />

      {/* Create Expense Modal */}
      <Modal
        open={recordOpen}
        onClose={() => !isSubmitting && setRecordOpen(false)}
        title="Record New Expense"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRecordOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form="create-expense-form" disabled={isSubmitting}>
              {isSubmitting ? "Recording..." : "Record Expense"}
            </Button>
          </>
        }
      >
        <form id="create-expense-form" onSubmit={handleCreateExpense} className="space-y-4">
          {createError && <InlineNotice icon="close" tone="danger">{createError}</InlineNotice>}

          <TextField 
            label="Category" 
            name="category" 
            required 
            error={fieldErrors?.category?.[0]} 
            placeholder="e.g. Utilities, Maintenance, Cleaning" 
          />

          <TextField 
            label="Description / Purpose" 
            name="description" 
            required 
            error={fieldErrors?.description?.[0]} 
            placeholder="e.g. Electricity bill for August" 
          />

          <AmountField 
            label="Amount (BDT)" 
            name="amount" 
            required 
            error={fieldErrors?.amount?.[0]} 
          />

          <div className="grid grid-cols-2 gap-4">
            <TextField 
              label="Expense Date" 
              name="expenseDate" 
              type="date" 
              required 
              defaultValue={new Date().toISOString().split("T")[0]}
              error={fieldErrors?.expenseDate?.[0]} 
            />

            <SelectField
              label="Payment Method"
              name="paymentMethod"
              required
              error={fieldErrors?.paymentMethod?.[0]}
              options={[
                { value: "cash", label: "Cash" },
                { value: "bank_transfer", label: "Bank Transfer" },
                { value: "card", label: "Card" },
                { value: "online", label: "Online Payment" },
                { value: "other", label: "Other" },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="Status"
              name="status"
              required
              options={[
                { value: "pending", label: "Pending Approval" },
                { value: "approved", label: "Approved" },
                { value: "paid", label: "Paid" },
              ]}
            />

            <TextField 
              label="Reference / Invoice No" 
              name="reference" 
              error={fieldErrors?.reference?.[0]} 
              placeholder="Optional" 
            />
          </div>

          <TextAreaField label="Notes (Internal)" name="notes" placeholder="Optional notes for audit..." />
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Expense"
        description={`Are you sure you want to permanently delete "${deleteTarget?.description}"? Note that once approved or paid, an expense cannot be deleted and must be cancelled instead.`}
        confirmLabel="Delete Expense"
        tone="danger"
        icon="trash"
      />
    </div>
  );
}
