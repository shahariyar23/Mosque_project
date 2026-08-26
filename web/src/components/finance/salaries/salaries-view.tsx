"use client";

import { useMemo, useState } from "react";
import { Chip, SalaryStatusBadge } from "@/components/finance/ui/badge";
import { Button, IconButton } from "@/components/finance/ui/button";
import { DataTable, type Column } from "@/components/finance/ui/data-table";
import { ConfirmDialog } from "@/components/finance/ui/dialogs";
import { FinanceFilters, SegmentedControl, type SelectFilter } from "@/components/finance/ui/filters";
import { AmountField, SelectField, SummaryRow, TextAreaField, TextField } from "@/components/finance/ui/form-field";
import { Modal } from "@/components/finance/ui/modal";
import { Money } from "@/components/finance/ui/money";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { FinanceEmptyState, FinanceErrorState, InlineNotice, NoAccessState } from "@/components/finance/ui/states";
import { MiniStat } from "@/components/finance/ui/summary-card";
import { TableSkeleton } from "@/components/finance/ui/skeleton";
import { Pagination } from "@/components/finance/ui/data-table";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import { useToast } from "@/components/ui/toast";
import { useApiList, useApiResource } from "@/hooks/use-api";
import { 
  fetchSalaryRecords, 
  createSalaryRecord, 
  updateSalaryRecord, 
  markSalaryPaid, 
  cancelSalaryRecord, 
  type SalaryRecord, 
  type SalaryRecordQuery, 
  type CreateSalaryRecordInput 
} from "@/services/salariesService";
import { fetchSalaryReport } from "@/services/financialReportsService";
import { fetchUsers } from "@/services/userService";
import { formatAmount, formatOptionalDate } from "@/lib/finance/format";
import type { SalaryStatus } from "@/services/enums";

const CURRENT_SALARY_PERIOD = new Date().toISOString().slice(0, 7);

const salaryPeriodOptions = [
  { value: "all", label: "All periods" },
  { value: "2026-09", label: "September 2026" },
  { value: "2026-08", label: "August 2026" },
  { value: "2026-07", label: "July 2026" },
];

const salaryStatusFilterOptions = [
  { value: "all", label: "Any state" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" },
];

function PaymentDetail({ payment }: { payment: SalaryRecord }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <SalaryStatusBadge status={payment.status as any} />
        <Chip>{payment.payPeriod}</Chip>
      </div>

      <dl className="divide-y divide-[#f0efe6] rounded-md border border-[#e2e1d6] bg-[#faf9f4] px-3.5 py-1">
        <SummaryRow label="Paid to" value={payment.user.fullName} />
        <SummaryRow label="Period" value={payment.payPeriod} />
        <SummaryRow label="Payment date" value={formatOptionalDate(payment.paymentDate)} />
        <SummaryRow label="Amount" value={<Money value={parseFloat(payment.amount)} />} emphasis />
      </dl>

      {payment.notes ? <p className="text-[13px] leading-6 text-[#4d564f]">{payment.notes}</p> : null}
    </div>
  );
}

export function SalariesView() {
  const { can, scope } = useDashboardSession();
  const { notify } = useToast();
  const reach = scope("salary.view", "salary.viewOwn");

  const [period, setPeriod] = useState(CURRENT_SALARY_PERIOD);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<SalaryStatus | "all">("all");
  const [selected, setSelected] = useState<SalaryRecord | null>(null);
  const [cancelTarget, setCancelTarget] = useState<SalaryRecord | null>(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>(undefined);

  const query: SalaryRecordQuery = {
    page,
    limit: 12,
    payPeriod: period !== "all" ? period : undefined,
    status: status !== "all" ? status : undefined,
  };

  const { rows, meta, loading, error, refetch } = useApiList(fetchSalaryRecords, query, { enabled: reach !== "none" });
  const { data: report, refetch: refetchReport } = useApiResource(() => fetchSalaryReport(), [], { enabled: can("finance.view") });
  const { data: usersData, refetch: refetchUsers } = useApiResource(() => fetchUsers({ limit: 100 }), []);

  const refreshAll = () => {
    refetch();
    refetchReport();
  };

  const activeCount = [status !== "all", period !== "all"].filter(Boolean).length;

  const handleCreateSalary = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      setIsSubmitting(true);
      setCreateError(null);
      setFieldErrors(undefined);

      const input: CreateSalaryRecordInput = {
        userId: formData.get("userId") as string,
        amount: (formData.get("amount") as string).replace(/,/g, ""),
        payPeriod: formData.get("payPeriod") as string,
        paymentDate: formData.get("paymentDate") as string,
        status: (formData.get("status") as SalaryStatus) || "pending",
        notes: (formData.get("notes") as string) || null,
      };

      await createSalaryRecord(input);
      setRecordOpen(false);
      refreshAll();
      notify({
        message: "Salary record created",
        description: `Disbursement record booked for ${input.payPeriod}.`,
        tone: "success",
      });
    } catch (err: any) {
      const fieldErr = err?.fieldErrors || err?.errors;
      let detailedMsg = err.message || "Failed to record salary";
      if (fieldErr && typeof fieldErr === "object") {
        setFieldErrors(fieldErr);
        const detailList = Object.values(fieldErr).flat().filter(Boolean).join(". ");
        if (detailList) detailedMsg = detailList;
      } else {
        setFieldErrors(undefined);
      }
      setCreateError(detailedMsg);
      notify({
        message: "Unable to record salary",
        description: detailedMsg,
        tone: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkPaid = async (record: SalaryRecord) => {
    try {
      await markSalaryPaid(record.id);
      setSelected(null);
      refreshAll();
      notify({
        message: "Salary marked as Paid",
        description: `Disbursement to ${record.user.fullName} (${formatAmount(parseFloat(record.amount))}) is now Paid.`,
        tone: "success",
      });
    } catch (err: any) {
      notify({
        message: "Action failed",
        description: err.message || "Could not update salary record",
        tone: "danger",
      });
    }
  };

  const handleCancelRecord = async () => {
    if (!cancelTarget) return;
    try {
      await cancelSalaryRecord(cancelTarget.id);
      const name = cancelTarget.user.fullName;
      setCancelTarget(null);
      setSelected(null);
      refreshAll();
      notify({
        message: "Salary record cancelled",
        description: `Record for ${name} has been cancelled.`,
        tone: "info",
      });
    } catch (err: any) {
      notify({
        message: "Action failed",
        description: err.message || "Could not cancel record",
        tone: "danger",
      });
    }
  };

  const paymentColumns: Column<SalaryRecord>[] = [
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
            {row.user.fullName}
          </button>
          <p className="mt-0.5 text-[12px] text-[#8b938d]">
            {row.id}
          </p>
        </div>
      ),
    },
    { key: "period", header: "Period", cell: (row) => <span className="whitespace-nowrap">{row.payPeriod}</span> },
    {
      key: "paymentDate",
      header: "Paid on",
      cell: (row) => <span className="whitespace-nowrap tabular-nums">{formatOptionalDate(row.paymentDate)}</span>,
      secondary: true,
    },
    { key: "amount", header: "Amount", align: "right", cell: (row) => <Money value={parseFloat(row.amount)} /> },
    { key: "status", header: "State", cell: (row) => <SalaryStatusBadge status={row.status as any} /> },
    {
      key: "actions",
      header: "Open payment",
      headerHidden: true,
      align: "right",
      cell: (row) => <IconButton icon="eye" label={`Open ${row.id}`} onClick={() => setSelected(row)} />,
    },
  ];

  if (reach === "none") return <NoAccessState area="Salaries" />;

  if (reach === "own") {
    if (loading && !rows.length) return <TableSkeleton />;
    if (error) return <FinanceErrorState description={error} onRetry={refetch} />;

    return (
      <div className="space-y-5">
        <Panel>
          <PanelHeader title="Your salary" description="What is on record for you" icon="wallet" />
          <DataTable
            rows={rows}
            columns={paymentColumns.filter((column) => column.key !== "staffName")}
            getRowKey={(row) => row.id}
            caption="Your salary payments"
            emptyState={<FinanceEmptyState icon="inbox" title="No payments recorded yet" description="Payments appear here as soon as the treasurer records them." />}
          />
          {meta && meta.totalPages > 1 && (
            <div className="border-t border-[#e7e6dc] px-5 py-4">
              <Pagination page={meta.page} totalPages={meta.totalPages} onChange={setPage} />
            </div>
          )}
          <PanelFooter>
            <p className="text-[12px] text-[#69726d]">
              You are seeing your own record only.
            </p>
          </PanelFooter>
        </Panel>

        <Modal
          open={Boolean(selected)}
          onClose={() => setSelected(null)}
          title={selected ? `${selected.payPeriod} salary` : "Salary payment"}
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

  // Full payroll
  if (loading && !rows.length) return <TableSkeleton />;
  if (error) return <FinanceErrorState description={error} onRetry={refetch} />;

  const paidTotal = report?.byStatus.find(s => s.status === "paid")?.total ?? "0.00";
  const pendingTotal = report?.byStatus.find(s => s.status === "pending")?.total ?? "0.00";

  return (
    <div className="space-y-5">
      {report && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MiniStat label="Total Payroll" value={formatAmount(parseFloat(report.total))} hint={`${report.count} records`} icon="wallet" tone="positive" />
          <MiniStat label="Paid" value={formatAmount(parseFloat(paidTotal))} hint="Money disbursed" icon="check-circle" tone="positive" />
          <MiniStat label="Pending" value={formatAmount(parseFloat(pendingTotal))} hint="Owed" icon="clock" tone="warning" />
        </div>
      )}

      <Panel>
        <PanelHeader
          title="Payroll run"
          description="Who gets paid, and the progress of each payment"
          icon="wallet"
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <SegmentedControl label="Period" size="sm" value={period} onChange={(v) => { setPeriod(v); setPage(1); }} options={salaryPeriodOptions} />
              <Can permission="salary.manage">
                <Button size="sm" icon="plus" onClick={() => { refetchUsers(); setRecordOpen(true); }}>
                  Record Salary
                </Button>
              </Can>
            </div>
          }
        />
        <FinanceFilters
          filters={[{ id: "status", label: "State", value: status, options: salaryStatusFilterOptions, onChange: (v) => { setStatus(v as any); setPage(1); } }]}
          activeCount={activeCount}
          onReset={() => { setStatus("all"); setPeriod("all"); setPage(1); }}
        />

        <DataTable
          rows={rows}
          columns={paymentColumns}
          getRowKey={(row) => row.id}
          caption="Payroll payments"
          pageSize={12}
          emptyState={<FinanceEmptyState icon="wallet" title="Nobody is on the payroll yet" description="Records will appear here." />}
          mobileTitle={(row) => row.user.fullName}
          mobileSubtitle={(row) => row.payPeriod}
          mobileTrailing={(row) => <Money value={parseFloat(row.amount)} />}
          mobileHiddenKeys={["period", "amount"]}
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
        title={selected ? `${selected.payPeriod} salary — ${selected.user.fullName}` : "Salary payment"}
        footer={
          selected && can("salary.manage") ? (
            <div className="flex flex-wrap items-center justify-between w-full gap-2">
              {selected.status !== "cancelled" ? (
                <Button variant="danger" size="sm" icon="close" onClick={() => setCancelTarget(selected)}>
                  Cancel Record
                </Button>
              ) : null}

              <div className="flex items-center gap-2 ml-auto">
                {selected.status === "pending" && (
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
        {selected ? <PaymentDetail payment={selected} /> : null}
      </Modal>

      {/* Record Salary Modal */}
      <Modal
        open={recordOpen}
        onClose={() => !isSubmitting && setRecordOpen(false)}
        title="Record Salary Payment"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRecordOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form="create-salary-form" disabled={isSubmitting}>
              {isSubmitting ? "Recording..." : "Record Salary"}
            </Button>
          </>
        }
      >
        <form id="create-salary-form" onSubmit={handleCreateSalary} className="space-y-4">
          {createError && <InlineNotice icon="close" tone="danger">{createError}</InlineNotice>}

          <SelectField
            label="Staff / Employee (User)"
            name="userId"
            required
            error={fieldErrors?.userId?.[0]}
            placeholder={usersData?.rows?.length ? "Select a staff member..." : "No users available"}
            options={usersData?.rows.map((u) => ({ value: u.id, label: `${u.fullName} (${u.role})` })) || []}
          />

          <AmountField 
            label="Monthly Salary Amount (BDT)" 
            name="amount" 
            required 
            error={fieldErrors?.amount?.[0]} 
          />

          <div className="grid grid-cols-2 gap-4">
            <TextField 
              label="Pay Period (YYYY-MM)" 
              name="payPeriod" 
              required 
              defaultValue={CURRENT_SALARY_PERIOD}
              placeholder="e.g. 2026-08"
              error={fieldErrors?.payPeriod?.[0]} 
            />

            <TextField 
              label="Payment Date" 
              name="paymentDate" 
              type="date" 
              required 
              defaultValue={new Date().toISOString().split("T")[0]}
              error={fieldErrors?.paymentDate?.[0]} 
            />
          </div>

          <SelectField
            label="Status"
            name="status"
            required
            error={fieldErrors?.status?.[0]}
            options={[
              { value: "pending", label: "Pending (Owed)" },
              { value: "paid", label: "Paid (Disbursed)" },
            ]}
          />

          <TextAreaField label="Notes (Internal)" name="notes" placeholder="Optional notes regarding allowances or deductions..." />
        </form>
      </Modal>

      {/* Cancel Record Confirmation */}
      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancelRecord}
        title="Cancel Salary Record"
        description={`Are you sure you want to cancel the salary record of ${cancelTarget ? formatAmount(parseFloat(cancelTarget.amount)) : ""} for ${cancelTarget?.user.fullName}? The record will be marked as cancelled in the ledger.`}
        confirmLabel="Cancel Record"
        tone="danger"
        icon="alert"
      />
    </div>
  );
}
