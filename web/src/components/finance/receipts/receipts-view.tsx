"use client";

import { useMemo, useState } from "react";
import { Chip, ReceiptStatusBadge } from "@/components/finance/ui/badge";
import { Button, IconButton } from "@/components/finance/ui/button";
import { DataTable, type Column } from "@/components/finance/ui/data-table";
import { FinanceFilters, type SelectFilter } from "@/components/finance/ui/filters";
import { AmountField, SelectField, SummaryRow, TextAreaField, TextField } from "@/components/finance/ui/form-field";
import { Icon } from "@/components/finance/ui/icon";
import { Modal } from "@/components/finance/ui/modal";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { FinanceEmptyState, FinanceErrorState, InlineNotice, NoAccessState } from "@/components/finance/ui/states";
import { MiniStat } from "@/components/finance/ui/summary-card";
import { TableSkeleton } from "@/components/finance/ui/skeleton";
import { Pagination } from "@/components/finance/ui/data-table";
import { VoidDialog } from "@/components/finance/void-dialog";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import { useToast } from "@/components/ui/toast";
import { useApiList } from "@/hooks/use-api";
import { formatAmount, formatDate, formatShortDate } from "@/lib/finance/format";
import {
  fetchReceipts,
  fetchReceipt,
  createReceipt,
  voidReceipt,
  type Receipt,
  type ReceiptQuery,
  type CreateReceiptInput,
} from "@/services/receiptsService";
import { fetchDonationFunds } from "@/services/donationFundsService";
import { fetchUsers } from "@/services/userService";
import { fetchTransactions, type Transaction } from "@/services/transactionsService";

const receiptStatusFilterOptions = [
  { value: "all", label: "All receipts" },
  { value: "issued", label: "Issued" },
  { value: "voided", label: "Voided" },
];

/** The sheet that goes to the payer. Everything outside it is marked no-print. */
function ReceiptSheet({ receipt, mosqueName }: { receipt: Receipt; mosqueName: string }) {
  const payerName = receipt.donor?.fullName || receipt.donation?.donorName || "General Contributor";
  const payerRef = receipt.donor?.email || receipt.donation?.donorEmail || "";
  const fundName = receipt.fund?.name || "General Fund";
  const paymentMethod = receipt.donation?.paymentMethod || "Cash";
  const transactionId = receipt.donation?.id || "Direct Receipt";
  const amountNumber = parseFloat(receipt.amount);

  return (
    <div className="finance-print-sheet px-5 py-6 sm:px-7">
      <header className="text-center">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-full border border-[#e3ce9d] bg-[#f7f0df] text-[#835811]">
          <Icon name="mosque" size={20} />
        </span>
        <h3 className="mt-3 text-[17px] font-semibold tracking-[-.01em] text-[#073a2d]">{mosqueName}</h3>
        <p className="mt-0.5 text-[13px] text-[#4d564f]">নূর কেন্দ্রীয় জামে মসজিদ</p>
        <p className="mt-1.5 text-[11.5px] leading-5 text-[#69726d]">
          Official Mosque Register
          <br />
          Verified Monetary Receipt
        </p>
      </header>

      <div className="my-5 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-[#e2e1d6]" />
        <span className="text-[10.5px] font-bold uppercase tracking-[.16em] text-[#a97b23]">Money receipt</span>
        <span className="h-px flex-1 bg-[#e2e1d6]" />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div>
          <dt className="text-[10.5px] font-bold uppercase tracking-[.06em] text-[#8b938d]">Receipt no.</dt>
          <dd className="mt-0.5 font-mono text-[13px] font-semibold text-[#17211d]">{receipt.receiptNumber}</dd>
        </div>
        <div className="text-right">
          <dt className="text-[10.5px] font-bold uppercase tracking-[.06em] text-[#8b938d]">Date</dt>
          <dd className="mt-0.5 text-[13px] font-semibold tabular-nums text-[#17211d]">{formatDate(receipt.issuedAt)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-[10.5px] font-bold uppercase tracking-[.06em] text-[#8b938d]">Received with thanks from</dt>
          <dd className="mt-0.5 text-[14px] font-semibold text-[#17211d]">{payerName}</dd>
          {payerRef ? <dd className="text-[11.5px] text-[#69726d]">{payerRef}</dd> : null}
        </div>
        <div>
          <dt className="text-[10.5px] font-bold uppercase tracking-[.06em] text-[#8b938d]">On account of</dt>
          <dd className="mt-0.5 text-[13px] text-[#3d453f]">{receipt.donation ? "Donation" : "Receipt"}</dd>
        </div>
        <div className="text-right">
          <dt className="text-[10.5px] font-bold uppercase tracking-[.06em] text-[#8b938d]">Credited to</dt>
          <dd className="mt-0.5 text-[13px] text-[#3d453f]">{fundName}</dd>
        </div>
        <div>
          <dt className="text-[10.5px] font-bold uppercase tracking-[.06em] text-[#8b938d]">Paid by</dt>
          <dd className="mt-0.5 text-[13px] text-[#3d453f] capitalize">{paymentMethod}</dd>
        </div>
        <div className="text-right">
          <dt className="text-[10.5px] font-bold uppercase tracking-[.06em] text-[#8b938d]">Ledger entry</dt>
          <dd className="mt-0.5 font-mono text-[12px] text-[#3d453f] truncate max-w-[150px] ml-auto">{transactionId}</dd>
        </div>
      </dl>

      <div className="mt-5 flex items-baseline justify-between gap-4 rounded-md border border-[#cfd4cd] bg-[#f1f4ef] px-4 py-3">
        <span className="text-[11px] font-bold uppercase tracking-[.08em] text-[#3d453f]">Amount received</span>
        <span className="text-[20px] font-semibold tabular-nums text-[#0b4634]">{formatAmount(amountNumber)}</span>
      </div>

      {receipt.status === "voided" ? (
        <p className="mt-4 rounded-md border border-[#ebc8c4] bg-[#fbeceb] px-3.5 py-2.5 text-[12px] font-semibold text-[#94291f]">
          This receipt has been voided and does not stand as proof of payment.
          {receipt.voidReason ? <span className="mt-1 block font-normal text-[11.5px]">Reason: {receipt.voidReason}</span> : null}
        </p>
      ) : null}

      <div className="mt-8 grid grid-cols-2 gap-6">
        <div>
          <p className="border-t border-dashed border-[#d5d3c6] pt-1.5 text-[11px] text-[#69726d]">Status</p>
          <p className="text-[12.5px] font-medium text-[#3d453f] capitalize">{receipt.status}</p>
        </div>
        <div className="text-right">
          <p className="border-t border-dashed border-[#d5d3c6] pt-1.5 text-[11px] text-[#69726d]">For the mosque committee</p>
          <p className="text-[12.5px] text-[#9aa19c]">Signature and seal</p>
        </div>
      </div>

      <p className="mt-6 text-center text-[10.5px] leading-4 text-[#8b938d]">
        Please keep this receipt. Zakat and other restricted gifts are held in their own fund and spent only on what they were
        given for.
      </p>
    </div>
  );
}

export function ReceiptsView() {
  const { user, can } = useDashboardSession();
  const { notify } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [fundId, setFundId] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [voidTarget, setVoidTarget] = useState<Receipt | null>(null);
  const [issueOpen, setIssueOpen] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState<string>("");
  const [txSearch, setTxSearch] = useState<string>("");
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>(undefined);

  // Fetch live funds for dropdown & filter
  const { rows: fundList } = useApiList(fetchDonationFunds, { limit: 100 }, { enabled: can("receipt.view") || can("fund.view") });
  // Fetch users for donor selection
  const { rows: userList } = useApiList(fetchUsers, { limit: 100 }, { enabled: can("receipt.issue") && can("user.view") });

  // Fetch verified income transactions for receipt generation
  const { rows: completedTransactions, loading: loadingTransactions } = useApiList(
    fetchTransactions,
    { type: "income", status: "completed", limit: 100 },
    { enabled: issueOpen }
  );

  const sortedTransactions = useMemo(() => {
    return [...completedTransactions].sort((a, b) => {
      const aIssued = Boolean(a.receiptId);
      const bIssued = Boolean(b.receiptId);
      if (!aIssued && bIssued) return -1; // unissued (available) transactions appear first at top
      if (aIssued && !bIssued) return 1;  // already issued receipts go down to bottom
      return new Date(b.transactedAt || b.createdAt).getTime() - new Date(a.transactedAt || a.createdAt).getTime();
    });
  }, [completedTransactions]);

  const chosenTx = useMemo(
    () => sortedTransactions.find((t) => t.id === selectedTxId) || null,
    [sortedTransactions, selectedTxId]
  );

  const query: ReceiptQuery = {
    page,
    limit: 12,
    search: search || undefined,
    status: status !== "all" ? (status as any) : undefined,
    fundId: fundId !== "all" ? fundId : undefined,
    from: from || undefined,
    to: to || undefined,
  };

  const { rows, meta, loading, error, refetch } = useApiList(
    fetchReceipts,
    query,
    { enabled: can("receipt.view") || can("receipt.viewOwn") }
  );

  const selected = useMemo(() => {
    if (!rows.length) return null;
    return rows.find((r) => r.id === selectedId) ?? rows[0];
  }, [rows, selectedId]);

  const activeCount = [status !== "all", fundId !== "all", Boolean(from || to)].filter(Boolean).length;

  const reset = () => {
    setStatus("all");
    setFundId("all");
    setFrom("");
    setTo("");
    setPage(1);
  };

  const fundFilterOptions = useMemo(() => {
    return [
      { value: "all", label: "All funds" },
      ...fundList.map((f) => ({ value: f.id, label: f.name })),
    ];
  }, [fundList]);

  const filters: SelectFilter[] = [
    { id: "fund", label: "Fund", value: fundId, options: fundFilterOptions, onChange: (val) => { setFundId(val); setPage(1); } },
    { id: "status", label: "State", value: status, options: receiptStatusFilterOptions, onChange: (val) => { setStatus(val); setPage(1); } },
  ];

  const handleIssueReceipt = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!chosenTx) {
      notify({
        message: "No transaction selected",
        description: "Please select an existing completed payment transaction to issue a receipt.",
        tone: "danger",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setFieldErrors(undefined);

      const input: CreateReceiptInput = {
        transactionId: chosenTx.id,
        donationId: chosenTx.donationId || undefined,
      };

      const created = await createReceipt(input);
      setIssueOpen(false);
      setSelectedTxId("");
      refetch();
      setSelectedId(created.id);
      notify({
        message: "Receipt issued",
        description: `Receipt ${created.receiptNumber} was issued successfully for ${formatAmount(parseFloat(created.amount))}.`,
        tone: "success",
      });
    } catch (err: any) {
      const fErrors = err?.fieldErrors || err?.errors;
      if (fErrors && typeof fErrors === "object") {
        setFieldErrors(fErrors);
      }
      notify({
        message: "Unable to issue receipt",
        description: err.message || "Failed to create receipt",
        tone: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewExistingReceipt = (receiptId: string) => {
    setSelectedId(receiptId);
    setIssueOpen(false);
    setSelectedTxId("");
    notify({
      message: "Showing Existing Receipt",
      description: "Loaded the existing receipt from the register.",
      tone: "info",
    });
  };

  const handleVoidReceipt = async (reason: string) => {
    if (!voidTarget) return;

    try {
      await voidReceipt(voidTarget.id, reason);
      const number = voidTarget.receiptNumber;
      setVoidTarget(null);
      refetch();
      notify({
        message: "Receipt voided",
        description: `${number} was voided with reason: "${reason}".`,
        tone: "info",
      });
    } catch (err: any) {
      notify({
        message: "Void failed",
        description: err.message || "Could not void receipt",
        tone: "danger",
      });
    }
  };

  const columns: Column<Receipt>[] = [
    {
      key: "receiptNumber",
      header: "Receipt",
      cell: (row) => (
        <button
          type="button"
          onClick={() => setSelectedId(row.id)}
          aria-pressed={row.id === selected?.id}
          className={`rounded font-mono text-[12.5px] font-semibold underline-offset-2 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b] ${
            row.id === selected?.id ? "text-[#0d4d3b]" : "text-[#17211d]"
          }`}
        >
          {row.receiptNumber}
        </button>
      ),
      sortValue: (row) => row.receiptNumber,
    },
    {
      key: "payerName",
      header: "Issued to",
      cell: (row) => {
        const name = row.donor?.fullName || row.donation?.donorName || "General Contributor";
        const ref = row.donor?.email || row.donation?.donorEmail || (row.donation ? "Donation" : "Receipt");
        return (
          <div className="min-w-0">
            <p className="font-medium text-[#17211d]">{name}</p>
            <p className="mt-0.5 text-[12px] text-[#8b938d]">{ref}</p>
          </div>
        );
      },
      sortValue: (row) => row.donor?.fullName || row.donation?.donorName || "",
    },
    {
      key: "fund",
      header: "Fund",
      cell: (row) => <span className="text-[13px]">{row.fund?.name || "General"}</span>,
      secondary: true,
    },
    {
      key: "date",
      header: "Date",
      cell: (row) => <span className="whitespace-nowrap tabular-nums">{formatShortDate(row.issuedAt)}</span>,
      sortValue: (row) => row.issuedAt,
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      cell: (row) => (
        <span
          className={`font-semibold tabular-nums ${
            row.status === "voided" ? "text-[#9aa19c] line-through" : "text-[#17211d]"
          }`}
        >
          {formatAmount(parseFloat(row.amount))}
        </span>
      ),
      sortValue: (row) => parseFloat(row.amount),
    },
    {
      key: "status",
      header: "State",
      cell: (row) => <ReceiptStatusBadge status={row.status} />,
      sortValue: (row) => row.status,
    },
    {
      key: "actions",
      header: "Show receipt",
      headerHidden: true,
      align: "right",
      cell: (row) => <IconButton icon="receipt" label={`Show ${row.receiptNumber}`} onClick={() => setSelectedId(row.id)} />,
    },
  ];

  if (loading && !rows.length) return <TableSkeleton />;
  if (error) return <FinanceErrorState description={error} onRetry={refetch} />;

  const issuedCount = meta?.total ?? rows.length;
  const totalValue = rows.filter((r) => r.status === "issued").reduce((sum, r) => sum + parseFloat(r.amount), 0);
  const voidedCount = rows.filter((r) => r.status === "voided").length;
  const mosqueName = user?.mosqueName || "NOOR Central Mosque";

  return (
    <div className="space-y-5">
      {notice ? (
        <div className="finance-no-print">
          <InlineNotice tone="gold" icon="info">
            {notice}
          </InlineNotice>
        </div>
      ) : null}

      {!can("receipt.view") && can("receipt.viewOwn") ? (
        <div className="finance-no-print">
          <InlineNotice icon="lock">
            You are seeing receipts issued to you. Which receipts are yours is decided by the finance API, not by this page.
          </InlineNotice>
        </div>
      ) : (
        <div className="finance-no-print grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MiniStat label="Total receipts" value={String(issuedCount)} hint="In the mosque register" icon="receipt" />
          <MiniStat label="Value receipted (page)" value={formatAmount(totalValue)} hint="Active issued receipts" icon="coins" tone="positive" />
          <MiniStat
            label="Voided receipts"
            value={String(voidedCount)}
            hint="Kept for unbroken sequence"
            icon="rotate"
            tone={voidedCount > 0 ? "warning" : "neutral"}
          />
          <MiniStat label="Next sequence" value="Auto" hint="Allocated server-side" icon="badge" />
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-5">
        {/* ---- Register ---- */}
        <div className="finance-no-print xl:col-span-3">
          <Panel>
            <PanelHeader
              title={!can("receipt.view") && can("receipt.viewOwn") ? "Your receipts" : "Receipt register"}
              description="Numbers run in one unbroken sequence, voided ones included"
              icon="receipt"
              actions={
                <Can permission="receipt.issue">
                  <Button size="sm" icon="plus" onClick={() => setIssueOpen(true)}>
                    Issue a receipt
                  </Button>
                </Can>
              }
            />
            <FinanceFilters
              search={{ value: search, onChange: setSearch, placeholder: "Search receipt number, name, donor…", label: "Search receipts" }}
              filters={filters}
              dateRange={{ label: "Date", from, to, onFromChange: setFrom, onToChange: setTo }}
              activeCount={activeCount}
              onReset={reset}
            />
            <DataTable
              rows={rows}
              columns={columns}
              getRowKey={(row) => row.id}
              caption="Receipts issued by the mosque"
              emptyState={
                <FinanceEmptyState
                  icon="receipt"
                  title="No receipts match"
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
              footNote="A voided receipt keeps its number. The replacement gets the next one, so the sequence never has a gap."
              mobileTitle={(row) => row.donor?.fullName || row.donation?.donorName || "General Contributor"}
              mobileSubtitle={(row) => `${row.receiptNumber} · ${formatShortDate(row.issuedAt)}`}
              mobileTrailing={(row) => <span className="font-semibold tabular-nums text-[#17211d]">{formatAmount(parseFloat(row.amount))}</span>}
              mobileHiddenKeys={["receiptNumber", "payerName", "amount", "date"]}
            />
            {meta && meta.totalPages > 1 && (
              <div className="border-t border-[#e7e6dc] px-5 py-4">
                <Pagination page={meta.page} totalPages={meta.totalPages} onChange={setPage} />
              </div>
            )}
          </Panel>
        </div>

        {/* ---- The sheet itself ---- */}
        <div className="xl:col-span-2">
          <div className="xl:sticky xl:top-6">
            <Panel>
              <div className="finance-no-print">
                <PanelHeader
                  title="Receipt"
                  description={selected ? `Prepared for ${selected.donor?.fullName || selected.donation?.donorName || "Contributor"}` : "Pick a receipt from the register"}
                  icon="printer"
                  actions={
                    selected ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" variant="secondary" icon="printer" onClick={() => window.print()}>
                          Print
                        </Button>
                        {selected.status === "issued" ? (
                          <Can permission="transaction.void">
                            <Button size="sm" variant="ghost" icon="rotate" onClick={() => setVoidTarget(selected)}>
                              Void
                            </Button>
                          </Can>
                        ) : null}
                      </div>
                    ) : undefined
                  }
                />
              </div>

              {selected ? (
                <ReceiptSheet receipt={selected} mosqueName={mosqueName} />
              ) : (
                <PanelBody>
                  <FinanceEmptyState icon="receipt" title="Nothing selected" description="Choose a receipt number on the left and it will be laid out here ready to print." />
                </PanelBody>
              )}

              <div className="finance-no-print">
                <PanelFooter>
                  <p className="text-[12px] text-[#69726d]">
                    A receipt is issued when a payment is verified, never when it is first written down. That is why the person who
                    recorded the money is not the person who confirms it.
                  </p>
                </PanelFooter>
              </div>
            </Panel>
          </div>
        </div>
      </div>

      {/* ---- Void dialog ---- */}
      <VoidDialog
        open={Boolean(voidTarget)}
        onClose={() => setVoidTarget(null)}
        recordLabel={voidTarget ? `Receipt ${voidTarget.receiptNumber}` : ""}
        amount={voidTarget ? parseFloat(voidTarget.amount) : 0}
        details={
          voidTarget
            ? [
                { label: "Issued to", value: voidTarget.donor?.fullName || voidTarget.donation?.donorName || "Contributor" },
                { label: "Date", value: formatDate(voidTarget.issuedAt) },
                { label: "Receipt Number", value: voidTarget.receiptNumber },
              ]
            : []
        }
        onVoid={handleVoidReceipt}
      />

      {/* ---- Issue a receipt modal ---- */}
      <Modal
        open={issueOpen}
        onClose={() => !isSubmitting && setIssueOpen(false)}
        title="Issue a receipt"
        description="Select an existing completed payment transaction to issue a proof-of-payment receipt."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIssueOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="issue-receipt-form"
              icon="receipt"
              disabled={isSubmitting || !chosenTx || Boolean(chosenTx.receiptId)}
            >
              {isSubmitting ? "Issuing..." : "Issue receipt"}
            </Button>
          </>
        }
      >
        <form id="issue-receipt-form" onSubmit={handleIssueReceipt} noValidate className="space-y-4">
          <div className="space-y-3">
            <SelectField
              label="Select completed income transaction"
              name="transactionId"
              required
              placeholder={loadingTransactions ? "Loading verified transactions..." : "Pick a completed transaction…"}
              value={selectedTxId}
              onChange={(e) => setSelectedTxId(e.target.value)}
              options={[
                {
                  value: "",
                  label: loadingTransactions
                    ? "-- Loading transactions... --"
                    : sortedTransactions.length === 0
                    ? "-- No completed transactions found --"
                    : "-- Choose a verified payment --",
                },
                ...sortedTransactions.map((tx) => ({
                  value: tx.id,
                  label: tx.receiptId
                    ? `🔒 [Already Issued] ${formatShortDate(tx.transactedAt)} · ৳${formatAmount(parseFloat(tx.amount))} ${tx.currency} — ${tx.donation?.donorName || tx.createdBy?.fullName || tx.description || "General Income"} (${tx.fund?.name || "General Fund"})`
                    : `🟢 [Available] ${formatShortDate(tx.transactedAt)} · ৳${formatAmount(parseFloat(tx.amount))} ${tx.currency} — ${tx.donation?.donorName || tx.createdBy?.fullName || tx.description || "General Income"} (${tx.fund?.name || "General Fund"})`,
                })),
              ]}
              error={fieldErrors?.transactionId?.[0]}
            />
          </div>

          {!loadingTransactions && completedTransactions.length === 0 && (
            <div className="rounded-lg border border-[#e2e1d6] bg-[#faf9f4] p-4 text-[13px] text-[#69726d]">
              <p className="font-semibold text-[#17211d]">No completed income payments found</p>
              <p className="mt-1 text-[12px]">
                Receipts can only represent existing completed transactions. When a payment is recorded under{" "}
                <span className="font-medium text-[#17211d]">Finance → Contributions</span> or{" "}
                <span className="font-medium text-[#17211d]">Finance → Donations</span>, it will be listed in this dropdown.
              </p>
            </div>
          )}

          {chosenTx ? (
            <div className="space-y-3 rounded-lg border border-[#e2e1d6] bg-[#faf9f4] p-4 text-[13px]">
              <div className="flex items-center justify-between border-b border-[#e7e6dc] pb-2">
                <span className="font-medium text-[#17211d]">Verified Transaction Details</span>
                <span className="inline-flex items-center rounded-full bg-[#e3f4e9] px-2.5 py-0.5 text-[11px] font-semibold text-[#0d4d3b]">
                  {chosenTx.status.toUpperCase()}
                </span>
              </div>

              {chosenTx.receiptId && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-md border border-[#f5c6cb] bg-[#f8d7da] p-3 text-[12px] text-[#721c24]">
                  <div>
                    ⚠️ <strong>Notice:</strong> A receipt has already been issued for this transaction (Receipt #{chosenTx.receipt?.receiptNumber || chosenTx.receiptId}).
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => handleViewExistingReceipt(chosenTx.receipt?.id || chosenTx.receiptId!)}
                  >
                    View existing receipt
                  </Button>
                </div>
              )}

              <dl className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div>
                  <dt className="text-[11.5px] font-medium text-[#69726d]">Verified Amount (Read-only)</dt>
                  <dd className="mt-0.5 text-[14px] font-bold text-[#0d4d3b]">
                    ৳ {formatAmount(parseFloat(chosenTx.amount))} {chosenTx.currency}
                  </dd>
                </div>

                <div>
                  <dt className="text-[11.5px] font-medium text-[#69726d]">Credited Fund (Read-only)</dt>
                  <dd className="mt-0.5 font-medium text-[#17211d]">{chosenTx.fund?.name || "General Fund"}</dd>
                </div>

                <div>
                  <dt className="text-[11.5px] font-medium text-[#69726d]">Donor / Member (Read-only)</dt>
                  <dd className="mt-0.5 font-medium text-[#17211d]">
                    {chosenTx.donation?.donorName || chosenTx.createdBy?.fullName || "Walk-in Contributor"}
                  </dd>
                </div>

                <div>
                  <dt className="text-[11.5px] font-medium text-[#69726d]">Payment Method (Read-only)</dt>
                  <dd className="mt-0.5 font-medium uppercase text-[#17211d]">{chosenTx.paymentMethod || "Cash"}</dd>
                </div>

                <div>
                  <dt className="text-[11.5px] font-medium text-[#69726d]">Payment Date (Read-only)</dt>
                  <dd className="mt-0.5 font-medium text-[#17211d]">{formatDate(chosenTx.transactedAt)}</dd>
                </div>

                <div>
                  <dt className="text-[11.5px] font-medium text-[#69726d]">Category / Purpose</dt>
                  <dd className="mt-0.5 font-medium text-[#17211d]">{chosenTx.category || chosenTx.description || "General Income"}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-[#d5d4c7] p-5 text-center text-[12.5px] text-[#69726d]">
              Please select a completed transaction from the list above. Receipts can only document real, completed payments.
            </div>
          )}

          <dl className="divide-y divide-[#f0efe6] rounded-md border border-[#e2e1d6] bg-[#faf9f4] px-3.5 py-1">
            <SummaryRow label="Issued by" value={user?.name ?? "Treasurer"} />
            <SummaryRow label="Mosque" value={mosqueName} />
            <SummaryRow label="Receipt sequence" value="Generated on submit (REC-YYYY-NNNNN)" emphasis />
          </dl>

          <InlineNotice icon="shield">
            Receipts are proof documents and do not modify fund or account balances. Balance is recorded when the transaction is completed.
          </InlineNotice>
        </form>
      </Modal>
    </div>
  );
}
