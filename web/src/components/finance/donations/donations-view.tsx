"use client";

import { useState } from "react";
import { Chip, DonationStatusBadge } from "@/components/finance/ui/badge";
import { Button, IconButton } from "@/components/finance/ui/button";
import { DataTable, type Column } from "@/components/finance/ui/data-table";
import { ConfirmDialog } from "@/components/finance/ui/dialogs";
import { FinanceFilters, type SelectFilter } from "@/components/finance/ui/filters";
import { AmountField, SelectField, SummaryRow, TextAreaField, TextField } from "@/components/finance/ui/form-field";
import { Icon } from "@/components/finance/ui/icon";
import { Modal } from "@/components/finance/ui/modal";
import { Money } from "@/components/finance/ui/money";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { FinanceEmptyState, FinanceErrorState, InlineNotice } from "@/components/finance/ui/states";
import { MiniStat } from "@/components/finance/ui/summary-card";
import { WorkflowSteps } from "@/components/finance/ui/workflow";
import { VoidDialog } from "@/components/finance/void-dialog";
import { TableSkeleton } from "@/components/finance/ui/skeleton";
import { Pagination } from "@/components/finance/ui/data-table";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import { useToast } from "@/components/ui/toast";
import { useApiList, useApiResource } from "@/hooks/use-api";
import { fetchDonations, type Donation, type DonationQuery } from "@/services/donationsService";
import { fetchDonationReport } from "@/services/financialReportsService";
import { fetchDonationFunds } from "@/services/donationFundsService";
import { formatAmount, formatShortDate } from "@/lib/finance/format";
import { donationWorkflow } from "@/lib/finance/status";
import { PAYMENT_METHODS, type DonationStatus, type PaymentMethod } from "@/services/enums";
import { createDonation, updateDonation, type CreateDonationInput } from "@/services/donationsService";

const donationStatusFilterOptions = [
  { value: "all", label: "Any state" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export function DonationsView() {
  const { can, user } = useDashboardSession();
  const { notify } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<DonationStatus | "all">("all");
  const [fundId, setFundId] = useState("all");

  const [selected, setSelected] = useState<Donation | null>(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const [verifyTarget, setVerifyTarget] = useState<Donation | null>(null);
  const [voidTarget, setVoidTarget] = useState<Donation | null>(null);

  const query: DonationQuery = {
    page,
    limit: 10,
    search: search || undefined,
    status: status !== "all" ? status as any : undefined,
    fundId: fundId !== "all" ? fundId : undefined,
  };

  const { rows, meta, loading, error, refetch } = useApiList(fetchDonations, query, { enabled: can("donation.view") || can("donation.viewOwn") });
  const { rows: pendingRows, refetch: refetchPending } = useApiList(fetchDonations, { limit: 50, status: "pending" as any }, { enabled: can("donation.verify") });
  const { data: report, refetch: refetchReport } = useApiResource(() => fetchDonationReport(), [], { enabled: can("finance.view") });
  const { data: funds, refetch: refetchFunds } = useApiResource(() => fetchDonationFunds({ limit: 100 }), []);

  const refreshAll = () => {
    refetch();
    refetchPending();
    refetchReport();
  };

  const activeCount = [status !== "all", fundId !== "all"].filter(Boolean).length;

  const reset = () => {
    setStatus("all");
    setFundId("all");
    setPage(1);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>(undefined);

  const handleCreateDonation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      setIsSubmitting(true);
      setCreateError(null);
      setFieldErrors(undefined);
      
      const input: CreateDonationInput = {
        fundId: formData.get("fundId") as string,
        amount: (formData.get("amount") as string).replace(/,/g, ''),
        paymentMethod: formData.get("paymentMethod") as any,
        donorName: formData.get("donorName") as string || null,
        donorEmail: formData.get("donorEmail") as string || null,
        reference: formData.get("reference") as string || null,
        notes: formData.get("notes") as string || null,
        status: "pending", 
      };

      await createDonation(input);
      setRecordOpen(false);
      refreshAll();
      notify({
        message: "Donation recorded successfully",
        description: "The donation is now in the queue waiting to be verified.",
        tone: "info",
      });
    } catch (err: any) {
      const fieldErr = err?.fieldErrors || err?.errors;
      let detailedMsg = err.message || "Failed to record donation";
      if (fieldErr && typeof fieldErr === "object") {
        setFieldErrors(fieldErr);
        const detailList = Object.values(fieldErr).flat().filter(Boolean).join(". ");
        if (detailList) detailedMsg = detailList;
      } else {
        setFieldErrors(undefined);
      }
      setCreateError(detailedMsg);
      notify({
        message: "Unable to record donation",
        description: detailedMsg,
        tone: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async () => {
    if (!verifyTarget) return;
    try {
      await updateDonation(verifyTarget.id, { status: "completed" });
      const donor = verifyTarget.donor?.fullName ?? verifyTarget.donorName ?? "Anonymous";
      setVerifyTarget(null);
      refreshAll();
      notify({
        message: "Donation verified",
        description: `Donation from ${donor} (${formatAmount(parseFloat(verifyTarget.amount))}) is now Completed.`,
        tone: "success",
      });
    } catch (err: any) {
      notify({
        message: "Verification failed",
        description: err.message || "Could not verify donation",
        tone: "danger",
      });
    }
  };

  const handleVoid = async (reason: string) => {
    if (!voidTarget) return;
    try {
      await updateDonation(voidTarget.id, { status: "cancelled", notes: reason });
      const donor = voidTarget.donor?.fullName ?? voidTarget.donorName ?? "Anonymous";
      setVoidTarget(null);
      refreshAll();
      notify({
        message: "Donation voided",
        description: `Donation from ${donor} has been cancelled.`,
        tone: "danger",
      });
    } catch (err: any) {
      notify({
        message: "Failed to void donation",
        description: err.message || "Could not void donation",
        tone: "danger",
      });
    }
  };

  const fundFilterOptions = [
    { value: "all", label: "All funds" },
    ...(funds?.rows.map((f: any) => ({ value: f.id, label: f.name })) || []),
  ];

  const filters: SelectFilter[] = [
    { id: "status", label: "State", value: status, options: donationStatusFilterOptions, onChange: (value) => { setStatus(value as DonationStatus | "all"); setPage(1); } },
    { id: "fund", label: "Fund", value: fundId, options: fundFilterOptions, onChange: (value) => { setFundId(value); setPage(1); } },
  ];

  const columns: Column<Donation>[] = [
    {
      key: "date",
      header: "Date",
      cell: (row: any) => <span className="whitespace-nowrap tabular-nums">{formatShortDate(row.donatedAt || row.date)}</span>,
    },
    {
      key: "donor",
      header: "Donor",
      cell: (row) => (
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => setSelected(row)}
            className="flex items-center gap-1.5 rounded text-left font-medium text-[#17211d] underline-offset-2 transition-colors hover:text-[#0d4d3b] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
          >
            {!row.donor && !row.donorName ? <Icon name="user" size={14} className="shrink-0 text-[#9aa19c]" /> : null}
            {row.donor?.fullName ?? row.donorName ?? "Anonymous"}
          </button>
          <p className="mt-0.5 text-[12px] text-[#8b938d]">{row.id}</p>
        </div>
      ),
    },
    { key: "fund", header: "Fund", cell: (row: any) => <Chip>{row.fund?.name || row.fundName || "Fund"}</Chip>, secondary: true },
    { key: "method", header: "Method", cell: (row: any) => <span className="text-[13px]">{row.paymentMethod}</span>, secondary: true },
    { key: "amount", header: "Amount", align: "right", cell: (row: any) => <Money value={parseFloat(row.amount)} /> },
    { key: "status", header: "State", cell: (row: any) => <DonationStatusBadge status={row.status as any} /> },
    {
      key: "actions",
      header: "Open donation",
      headerHidden: true,
      align: "right",
      cell: (row: any) => <IconButton icon="eye" label={`Open ${row.id}`} onClick={() => setSelected(row)} />,
    },
  ];

  if (loading && !rows.length) return <TableSkeleton />;
  if (error) return <FinanceErrorState description={error} onRetry={refetch} />;

  const completedCount = report?.byStatus.find(s => s.status === "completed")?.count ?? 0;
  const completedTotal = report?.byStatus.find(s => s.status === "completed")?.total ?? "0.00";
  
  const pendingCount = pendingRows?.length ?? 0;
  const pendingTotal = pendingRows?.reduce((sum: number, r: Donation) => sum + parseFloat(r.amount), 0) ?? 0;
  
  const cancelledCount = report?.byStatus.find(s => s.status === "cancelled")?.count ?? 0;
  const cancelledTotal = report?.byStatus.find(s => s.status === "cancelled")?.total ?? "0.00";

  return (
    <div className="space-y-5">
      {report && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MiniStat label="Total Received" value={formatAmount(parseFloat(report.total))} hint={`${report.count} records total`} icon="gift" tone="positive" />
          <MiniStat label="Completed" value={formatAmount(parseFloat(completedTotal))} hint={`${completedCount} verified`} icon="check-circle" tone="positive" />
          <MiniStat label="Awaiting verification" value={formatAmount(pendingTotal)} hint={`${pendingCount} pending`} icon="clock" tone="warning" />
          <MiniStat label="Cancelled" value={formatAmount(parseFloat(cancelledTotal))} hint={`${cancelledCount} voided`} icon="rotate" tone="neutral" />
        </div>
      )}

      {/* ---- The queue that needs a second pair of hands ---- */}
      {can("donation.verify") && (
        <Panel>
          <PanelHeader
            title="Waiting to be verified"
            description={
              pendingCount === 0
                ? "Nothing is waiting"
                : `${pendingCount} recorded, ${formatAmount(pendingTotal)} in total`
            }
            icon="clock"
          />
          {pendingCount === 0 ? (
            <PanelBody>
              <FinanceEmptyState icon="check-circle" title="Everything is verified" description="Newly recorded donations appear here until confirmed." />
            </PanelBody>
          ) : (
            <ul className="divide-y divide-[#f0efe6]">
              {pendingRows?.map((row: Donation) => {
                return (
                  <li key={row.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-6">
                    <div className="min-w-[180px] flex-1">
                      <p className="text-[13.5px] font-semibold text-[#17211d]">{(row as any).donor?.fullName ?? row.donorName ?? "Anonymous"}</p>
                      <p className="mt-0.5 text-[12px] text-[#69726d]">
                        {row.id} · {(row as any).fund?.name || (row as any).fundName} · on {formatShortDate(row.donatedAt || (row as any).date)}
                      </p>
                    </div>
                    <p className="text-[15px] font-semibold tabular-nums text-[#17211d]">{formatAmount(parseFloat(row.amount))}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" icon="check" onClick={() => setVerifyTarget(row)}>
                        Verify
                      </Button>
                      <Can permission="donation.manage">
                        <Button size="sm" variant="secondary" icon="close" onClick={() => setVoidTarget(row)}>
                          Void
                        </Button>
                      </Can>
                      <IconButton icon="eye" label={`Open ${row.id}`} onClick={() => setSelected(row)} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      )}

      {/* ---- The full register ---- */}
      <Panel>
        <PanelHeader
          title="Donation register"
          description="Every donation recorded, whatever state it is in"
          icon="gift"
          actions={
            <Can permission="donation.record">
              <Button icon="plus" size="sm" onClick={() => { refetchFunds(); setRecordOpen(true); }}>
                Record donation
              </Button>
            </Can>
          }
        />
        <FinanceFilters
          search={{ value: search, onChange: setSearch, placeholder: "Search donations…", label: "Search donations" }}
          filters={filters}
          activeCount={activeCount}
          onReset={reset}
        />

        <DataTable
          rows={rows}
          columns={columns}
          getRowKey={(row) => row.id}
          caption="The register of all donations"
          pageSize={10}
          emptyState={<FinanceEmptyState icon="gift" title="No donations found" description="Nothing matches the filters." action={<Button variant="secondary" icon="close" onClick={() => { reset(); setSearch(""); }}>Clear filters</Button>} />}
          mobileTitle={(row: any) => row.donor?.fullName ?? row.donorName ?? "Anonymous"}
          mobileSubtitle={(row: any) => formatShortDate(row.donatedAt || row.date)}
          mobileTrailing={(row: any) => <DonationStatusBadge status={row.status as any} />}
          mobileHiddenKeys={["date", "donor", "status"]}
        />
        {meta && meta.totalPages > 1 && (
          <div className="border-t border-[#e7e6dc] px-5 py-4">
            <Pagination page={meta.page} totalPages={meta.totalPages} onChange={setPage} />
          </div>
        )}
      </Panel>

      <Modal open={selected !== null} onClose={() => setSelected(null)} title="Donation Details">
        {selected && (
          <div className="space-y-4">
            <p className="font-semibold text-lg">{selected.donor?.fullName ?? selected.donorName ?? "Anonymous"}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Amount</p>
                <p className="font-mono">{formatAmount(parseFloat(selected.amount))} {selected.currency}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p>{formatShortDate(selected.donatedAt || (selected as any).date)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <DonationStatusBadge status={selected.status as any} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Fund</p>
                <p>{selected.fund?.name || (selected as any).fundName}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal 
        open={recordOpen} 
        onClose={() => !isSubmitting && setRecordOpen(false)} 
        title="Record a Donation"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRecordOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" form="record-donation-form" disabled={isSubmitting}>{isSubmitting ? "Recording..." : "Record Donation"}</Button>
          </>
        }
      >
        <form id="record-donation-form" onSubmit={handleCreateDonation} className="space-y-4">
          {createError && (
            <InlineNotice icon="close" tone="danger">{createError}</InlineNotice>
          )}
          
          {(!funds?.rows || funds.rows.length === 0) && (
            <InlineNotice icon="info" tone="gold">
              No donation funds found. Please create a fund first under <strong>Finance → Funds</strong> (or click &ldquo;New Fund&rdquo; in Funds view) before recording donations.
            </InlineNotice>
          )}

          <SelectField 
            label="Fund" 
            name="fundId" 
            required 
            error={fieldErrors?.fundId?.[0]}
            placeholder={funds?.rows?.length ? "Select a fund..." : "No funds available"}
            options={funds?.rows?.map(f => ({ value: f.id, label: f.name })) || []} 
          />
          
          <AmountField 
            label="Amount (BDT)" 
            name="amount" 
            required 
            error={fieldErrors?.amount?.[0]}
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
          
          <div className="grid grid-cols-2 gap-4">
            <TextField label="Donor Name (Optional)" name="donorName" error={fieldErrors?.donorName?.[0]} placeholder="Leave blank for anonymous" />
            <TextField label="Donor Email (Optional)" name="donorEmail" type="email" error={fieldErrors?.donorEmail?.[0]} />
          </div>

          <TextField label="Reference / Cheque No" name="reference" />
          <TextAreaField label="Notes (Internal)" name="notes" />
          
          <InlineNotice icon="info" tone="info">
            Newly recorded donations start as &ldquo;Pending&rdquo; and must be verified before they are counted in completed totals.
          </InlineNotice>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(verifyTarget)}
        onClose={() => setVerifyTarget(null)}
        onConfirm={handleVerify}
        title="Verify donation"
        description={`Are you sure you want to verify this donation of ${verifyTarget ? formatAmount(parseFloat(verifyTarget.amount)) : ""} from ${verifyTarget?.donor?.fullName ?? verifyTarget?.donorName ?? "Anonymous"}? This confirms receipt and changes the status to Completed.`}
        confirmLabel="Verify Donation"
        tone="primary"
        icon="check"
      />

      <VoidDialog
        open={Boolean(voidTarget)}
        onClose={() => setVoidTarget(null)}
        onVoid={handleVoid}
        recordLabel={`Donation ${voidTarget?.id ?? ""}`}
        amount={voidTarget ? parseFloat(voidTarget.amount) : 0}
        details={[
          { label: "Donor", value: voidTarget?.donor?.fullName ?? voidTarget?.donorName ?? "Anonymous" },
          { label: "Fund", value: voidTarget?.fund?.name || (voidTarget as any)?.fundName || "Fund" },
        ]}
      />
    </div>
  );
}
