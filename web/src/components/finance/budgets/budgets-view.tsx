"use client";

import { useState } from "react";
import { Chip, BudgetStatusBadge } from "@/components/finance/ui/badge";
import { Button, IconButton } from "@/components/finance/ui/button";
import { DataTable, type Column } from "@/components/finance/ui/data-table";
import { ConfirmDialog } from "@/components/finance/ui/dialogs";
import { SegmentedControl } from "@/components/finance/ui/filters";
import { AmountField, SelectField, SummaryRow, TextAreaField, TextField } from "@/components/finance/ui/form-field";
import { Modal } from "@/components/finance/ui/modal";
import { Money } from "@/components/finance/ui/money";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { ProgressBar } from "@/components/finance/ui/progress";
import { FinanceEmptyState, FinanceErrorState, InlineNotice } from "@/components/finance/ui/states";
import { TableSkeleton } from "@/components/finance/ui/skeleton";
import { Pagination } from "@/components/finance/ui/data-table";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import { useToast } from "@/components/ui/toast";
import { useApiList, useApiResource } from "@/hooks/use-api";
import { 
  fetchBudgets, 
  createBudget, 
  updateBudget, 
  deleteBudget, 
  cancelBudget, 
  type Budget, 
  type BudgetQuery, 
  type CreateBudgetInput 
} from "@/services/budgetsService";
import { fetchBudgetReport } from "@/services/financialReportsService";
import { formatAmount, formatDate } from "@/lib/finance/format";
import type { BudgetStatus } from "@/services/enums";

const scopeOptions = [
  { value: "active", label: "Active" },
  { value: "all", label: "All budgets" },
];

function BudgetDetail({ budget }: { budget: Budget }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <BudgetStatusBadge status={budget.status as any} />
        <Chip>{budget.category}</Chip>
      </div>

      <dl className="divide-y divide-[#f0efe6] rounded-md border border-[#e2e1d6] bg-[#faf9f4] px-3.5 py-1">
        <SummaryRow label="Name" value={budget.name} />
        <SummaryRow label="Category" value={budget.category} />
        <SummaryRow label="Amount" value={<Money value={parseFloat(budget.amount)} />} emphasis />
        <SummaryRow label="Period" value={`${formatDate(budget.periodStart)} to ${formatDate(budget.periodEnd)}`} />
        <SummaryRow label="Created by" value={budget.createdBy?.fullName ?? "Treasurer"} />
      </dl>

      {budget.notes ? <p className="text-[13px] leading-6 text-[#4d564f]">{budget.notes}</p> : null}
    </div>
  );
}

export function BudgetsView() {
  const { can } = useDashboardSession();
  const { notify } = useToast();

  const [scope, setScope] = useState("active");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Budget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Budget | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>(undefined);

  const query: BudgetQuery = {
    page,
    limit: 12,
    status: scope === "active" ? "active" : undefined,
  };

  const { rows, meta, loading, error, refetch } = useApiList(fetchBudgets, query, { enabled: can("budget.view") });
  const { data: report, refetch: refetchReport } = useApiResource(() => fetchBudgetReport(), [], { enabled: can("finance.view") });

  const refreshAll = () => {
    refetch();
    refetchReport();
  };

  const handleCreateBudget = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      setIsSubmitting(true);
      setCreateError(null);
      setFieldErrors(undefined);

      const input: CreateBudgetInput = {
        name: formData.get("name") as string,
        category: formData.get("category") as string,
        amount: (formData.get("amount") as string).replace(/,/g, ""),
        periodStart: formData.get("periodStart") as string,
        periodEnd: formData.get("periodEnd") as string,
        status: (formData.get("status") as BudgetStatus) || "active",
        notes: (formData.get("notes") as string) || null,
      };

      await createBudget(input);
      setCreateOpen(false);
      refreshAll();
      notify({
        message: "Budget line created",
        description: `"${input.name}" is now in force.`,
        tone: "success",
      });
    } catch (err: any) {
      const fieldErr = err?.fieldErrors || err?.errors;
      let detailedMsg = err.message || "Failed to set budget";
      if (fieldErr && typeof fieldErr === "object") {
        setFieldErrors(fieldErr);
        const detailList = Object.values(fieldErr).flat().filter(Boolean).join(". ");
        if (detailList) detailedMsg = detailList;
      } else {
        setFieldErrors(undefined);
      }
      setCreateError(detailedMsg);
      notify({
        message: "Unable to set budget",
        description: detailedMsg,
        tone: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivate = async (budget: Budget) => {
    try {
      await updateBudget(budget.id, { status: "active" });
      setSelected(null);
      refreshAll();
      notify({
        message: "Budget Activated",
        description: `"${budget.name}" is now active and in force.`,
        tone: "success",
      });
    } catch (err: any) {
      notify({
        message: "Action failed",
        description: err.message || "Could not activate budget",
        tone: "danger",
      });
    }
  };

  const handleCancel = async (budget: Budget) => {
    try {
      await cancelBudget(budget.id);
      setSelected(null);
      refreshAll();
      notify({
        message: "Budget Cancelled",
        description: `"${budget.name}" was marked as cancelled.`,
        tone: "info",
      });
    } catch (err: any) {
      notify({
        message: "Action failed",
        description: err.message || "Could not cancel budget",
        tone: "danger",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteBudget(deleteTarget.id);
      const name = deleteTarget.name;
      setDeleteTarget(null);
      setSelected(null);
      refreshAll();
      notify({
        message: "Budget deleted",
        description: `"${name}" was permanently removed.`,
        tone: "success",
      });
    } catch (err: any) {
      notify({
        message: "Delete failed",
        description: err.message || "Could not delete budget",
        tone: "danger",
      });
    }
  };

  const paymentColumns: Column<Budget>[] = [
    {
      key: "name",
      header: "Budget",
      cell: (row) => (
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => setSelected(row)}
            className="rounded text-left font-medium text-[#17211d] underline-offset-2 transition-colors hover:text-[#0d4d3b] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
          >
            {row.name}
          </button>
          <p className="mt-0.5 text-[12px] text-[#8b938d]">
            {row.category}
          </p>
        </div>
      ),
    },
    { key: "period", header: "Period", cell: (row) => <span className="text-[13px]">{formatDate(row.periodStart)} - {formatDate(row.periodEnd)}</span> },
    { key: "amount", header: "Amount", align: "right", cell: (row) => <Money value={parseFloat(row.amount)} /> },
    { key: "status", header: "State", cell: (row) => <BudgetStatusBadge status={row.status as any} /> },
    {
      key: "actions",
      header: "Open budget",
      headerHidden: true,
      align: "right",
      cell: (row) => <IconButton icon="eye" label={`Open ${row.id}`} onClick={() => setSelected(row)} />,
    },
  ];

  if (loading && !rows.length) return <TableSkeleton />;
  if (error) return <FinanceErrorState description={error} onRetry={refetch} />;

  return (
    <div className="space-y-5">
      {report && report.lines.length > 0 && (
        <Panel>
          <PanelHeader title="Budget Report" description="Budget utilization across active categories" icon="chart" />
          <PanelBody>
            <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {report.lines.map(line => {
                const spent = parseFloat(line.spent);
                const planned = parseFloat(line.planned);
                const remaining = parseFloat(line.remaining);
                const isOverspent = remaining < 0;
                
                return (
                  <li key={line.category} className="flex flex-col rounded-lg border border-[#e2e1d6] bg-white p-5">
                    <p className="text-[14.5px] font-semibold text-[#17211d] mb-1">{line.category}</p>
                    <p className="text-[13px] text-[#69726d] mb-4">
                      Spent {formatAmount(spent)} of {formatAmount(planned)}
                    </p>
                    <ProgressBar
                      value={spent}
                      max={planned || spent || 1}
                      tone={isOverspent ? "danger" : "success"}
                      label={`${line.category} utilization`}
                    />
                    <p className="mt-2 text-[12px] font-medium" style={{ color: isOverspent ? '#94291f' : '#0b4634' }}>
                      {isOverspent ? `Overspent by ${formatAmount(Math.abs(remaining))}` : `${formatAmount(remaining)} remaining`}
                    </p>
                  </li>
                );
              })}
            </ul>
          </PanelBody>
        </Panel>
      )}

      <Panel>
        <PanelHeader
          title="Budgets"
          description="What the mosque intends to spend"
          icon="vault"
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <SegmentedControl label="Which budgets" size="sm" value={scope} onChange={(s) => { setScope(s); setPage(1); }} options={scopeOptions} />
              <Can permission="budget.manage">
                <Button size="sm" icon="plus" onClick={() => setCreateOpen(true)}>
                  New Budget
                </Button>
              </Can>
            </div>
          }
        />

        <DataTable
          rows={rows}
          columns={paymentColumns}
          getRowKey={(row) => row.id}
          caption="Budget lines"
          emptyState={<FinanceEmptyState icon="vault" title="No budgets defined" description="Budgets you create will appear here." />}
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
        title={selected?.name || "Budget"}
        footer={
          selected && can("budget.manage") ? (
            <div className="flex flex-wrap items-center justify-between w-full gap-2">
              <Button variant="danger" size="sm" icon="trash" onClick={() => setDeleteTarget(selected)}>
                Delete
              </Button>

              <div className="flex items-center gap-2 ml-auto">
                {selected.status === "draft" && (
                  <Button size="sm" icon="check" onClick={() => handleActivate(selected)}>
                    Activate Plan
                  </Button>
                )}
                {selected.status === "active" && (
                  <Button variant="secondary" size="sm" icon="close" onClick={() => handleCancel(selected)}>
                    Cancel Line
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
        {selected ? <BudgetDetail budget={selected} /> : null}
      </Modal>

      {/* Create Budget Modal */}
      <Modal
        open={createOpen}
        onClose={() => !isSubmitting && setCreateOpen(false)}
        title="Set New Budget Line"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form="create-budget-form" disabled={isSubmitting}>
              {isSubmitting ? "Setting..." : "Set Budget"}
            </Button>
          </>
        }
      >
        <form id="create-budget-form" onSubmit={handleCreateBudget} className="space-y-4">
          {createError && <InlineNotice icon="close" tone="danger">{createError}</InlineNotice>}

          <TextField 
            label="Budget Name" 
            name="name" 
            required 
            error={fieldErrors?.name?.[0]} 
            placeholder="e.g. Q3 Electricity & Generator" 
          />

          <TextField 
            label="Spending Category" 
            name="category" 
            required 
            error={fieldErrors?.category?.[0]} 
            placeholder="e.g. Utilities, Maintenance, Ramadan" 
          />

          <AmountField 
            label="Planned Budget Amount (BDT)" 
            name="amount" 
            required 
            error={fieldErrors?.amount?.[0]} 
          />

          <div className="grid grid-cols-2 gap-4">
            <TextField 
              label="Period Start Date" 
              name="periodStart" 
              type="date" 
              required 
              defaultValue={new Date().toISOString().split("T")[0]}
              error={fieldErrors?.periodStart?.[0]} 
            />

            <TextField 
              label="Period End Date" 
              name="periodEnd" 
              type="date" 
              required 
              defaultValue={new Date(new Date().getFullYear(), 11, 31).toISOString().split("T")[0]}
              error={fieldErrors?.periodEnd?.[0]} 
            />
          </div>

          <SelectField
            label="Status"
            name="status"
            required
            error={fieldErrors?.status?.[0]}
            options={[
              { value: "active", label: "Active (In Force)" },
              { value: "draft", label: "Draft (Proposal)" },
            ]}
          />

          <TextAreaField label="Notes (Internal)" name="notes" placeholder="Optional notes on how this figure was calculated..." />
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Budget"
        description={`Are you sure you want to permanently delete "${deleteTarget?.name}"? You can also cancel the budget instead to keep a historical record of what was planned.`}
        confirmLabel="Delete Budget"
        tone="danger"
        icon="trash"
      />
    </div>
  );
}
