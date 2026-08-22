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
import { FinanceEmptyState, InlineNotice, NoAccessState } from "@/components/finance/ui/states";
import { MiniStat } from "@/components/finance/ui/summary-card";
import { VoidDialog } from "@/components/finance/void-dialog";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import { fundOptions } from "@/data/finance/funds";
import {
  nextReceiptNumber,
  receiptIssuer,
  receiptSourceFilterOptions,
  receiptStatusFilterOptions,
  receiptSummary,
  receipts,
} from "@/data/finance/receipts";
import { formatAmount, formatDate, formatShortDate } from "@/lib/finance/format";
import { paymentMethods, receiptSources, type Receipt, type ReceiptSource, type ReceiptStatus } from "@/lib/finance/types";

/**
 * Receipts. The donor's copy of what the mosque says it received, so this page is built around the
 * printed sheet rather than around a table. Pick a receipt on the left and it is laid out on the right
 * exactly as it prints, because a receipt that reads well on screen and badly on paper is no use to
 * anybody.
 *
 * A receipt is never edited. If a number was issued wrongly it is voided with a reason and a new one
 * is issued, and both stay in the register so the sequence has no gaps. The printed sheet carries the
 * mosque's own details, not a generic letterhead.
 */

type FormState = {
  source: ReceiptSource;
  payerName: string;
  payerRef: string;
  amount: string;
  fundId: string;
  paymentMethod: string;
  date: string;
  note: string;
};

const emptyForm: FormState = {
  source: "Donation",
  payerName: "",
  payerRef: "",
  amount: "",
  fundId: "",
  paymentMethod: "Cash",
  date: "2026-08-22",
  note: "",
};

/** The sheet that goes to the payer. Everything outside it is marked no-print. */
function ReceiptSheet({ receipt }: { receipt: Receipt }) {
  return (
    <div className="finance-print-sheet px-5 py-6 sm:px-7">
      <header className="text-center">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-full border border-[#e3ce9d] bg-[#f7f0df] text-[#835811]">
          <Icon name="mosque" size={20} />
        </span>
        <h3 className="mt-3 text-[17px] font-semibold tracking-[-.01em] text-[#073a2d]">{receiptIssuer.name}</h3>
        <p className="mt-0.5 text-[13px] text-[#4d564f]">{receiptIssuer.nameBn}</p>
        <p className="mt-1.5 text-[11.5px] leading-5 text-[#69726d]">
          {receiptIssuer.address}
          <br />
          {receiptIssuer.phone} · {receiptIssuer.registration}
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
          <dd className="mt-0.5 font-mono text-[13px] font-semibold text-[#17211d]">{receipt.id}</dd>
        </div>
        <div className="text-right">
          <dt className="text-[10.5px] font-bold uppercase tracking-[.06em] text-[#8b938d]">Date</dt>
          <dd className="mt-0.5 text-[13px] font-semibold tabular-nums text-[#17211d]">{formatDate(receipt.date)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-[10.5px] font-bold uppercase tracking-[.06em] text-[#8b938d]">Received with thanks from</dt>
          <dd className="mt-0.5 text-[14px] font-semibold text-[#17211d]">{receipt.payerName}</dd>
          {receipt.payerRef ? <dd className="text-[11.5px] text-[#69726d]">{receipt.payerRef}</dd> : null}
        </div>
        <div>
          <dt className="text-[10.5px] font-bold uppercase tracking-[.06em] text-[#8b938d]">On account of</dt>
          <dd className="mt-0.5 text-[13px] text-[#3d453f]">{receipt.source}</dd>
        </div>
        <div className="text-right">
          <dt className="text-[10.5px] font-bold uppercase tracking-[.06em] text-[#8b938d]">Credited to</dt>
          <dd className="mt-0.5 text-[13px] text-[#3d453f]">{receipt.fundName}</dd>
        </div>
        <div>
          <dt className="text-[10.5px] font-bold uppercase tracking-[.06em] text-[#8b938d]">Paid by</dt>
          <dd className="mt-0.5 text-[13px] text-[#3d453f]">{receipt.paymentMethod}</dd>
        </div>
        <div className="text-right">
          <dt className="text-[10.5px] font-bold uppercase tracking-[.06em] text-[#8b938d]">Ledger entry</dt>
          <dd className="mt-0.5 font-mono text-[12px] text-[#3d453f]">{receipt.transactionId}</dd>
        </div>
      </dl>

      <div className="mt-5 flex items-baseline justify-between gap-4 rounded-md border border-[#cfd4cd] bg-[#f1f4ef] px-4 py-3">
        <span className="text-[11px] font-bold uppercase tracking-[.08em] text-[#3d453f]">Amount received</span>
        <span className="text-[20px] font-semibold tabular-nums text-[#0b4634]">{formatAmount(receipt.amount)}</span>
      </div>

      {receipt.status === "Void" ? (
        <p className="mt-4 rounded-md border border-[#ebc8c4] bg-[#fbeceb] px-3.5 py-2.5 text-[12px] font-semibold text-[#94291f]">
          This receipt has been voided and does not stand as proof of payment.
          {receipt.note ? <span className="mt-1 block font-normal">{receipt.note}</span> : null}
        </p>
      ) : receipt.note ? (
        <p className="mt-4 text-[12px] leading-5 text-[#69726d]">{receipt.note}</p>
      ) : null}

      <div className="mt-8 grid grid-cols-2 gap-6">
        <div>
          <p className="border-t border-dashed border-[#d5d3c6] pt-1.5 text-[11px] text-[#69726d]">Received by</p>
          <p className="text-[12.5px] font-medium text-[#3d453f]">{receipt.generatedBy}</p>
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
  const { user, scope } = useDashboardSession();
  const reach = scope("receipt.view", "receipt.viewOwn");

  const [search, setSearch] = useState("");
  const [source, setSource] = useState<ReceiptSource | "all">("all");
  const [status, setStatus] = useState<ReceiptStatus | "all">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const own = reach === "own";
  const visible = useMemo(() => (own ? receipts.filter((row) => row.payerName === user?.name) : receipts), [own, user?.name]);

  const [selectedId, setSelectedId] = useState<string | null>(visible[0]?.id ?? null);
  const [voidTarget, setVoidTarget] = useState<Receipt | null>(null);
  const [issueOpen, setIssueOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitted, setSubmitted] = useState(false);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return visible.filter((row) => {
      if (term && ![row.id, row.payerName, row.transactionId, row.fundName, row.payerRef ?? "", row.generatedBy].some((value) => value.toLowerCase().includes(term))) {
        return false;
      }
      if (source !== "all" && row.source !== source) return false;
      if (status !== "all" && row.status !== status) return false;
      if (from && row.date < from) return false;
      if (to && row.date > to) return false;
      return true;
    });
  }, [visible, search, source, status, from, to]);

  const selected = visible.find((row) => row.id === selectedId) ?? null;
  const activeCount = [source !== "all", status !== "all", Boolean(from || to)].filter(Boolean).length;

  const reset = () => {
    setSource("all");
    setStatus("all");
    setFrom("");
    setTo("");
  };

  const filters: SelectFilter[] = [
    { id: "source", label: "For what", value: source, options: receiptSourceFilterOptions, onChange: (value) => setSource(value as ReceiptSource | "all") },
    { id: "status", label: "State", value: status, options: receiptStatusFilterOptions, onChange: (value) => setStatus(value as ReceiptStatus | "all") },
  ];

  const columns: Column<Receipt>[] = [
    {
      key: "id",
      header: "Receipt",
      cell: (row) => (
        <button
          type="button"
          onClick={() => setSelectedId(row.id)}
          aria-pressed={row.id === selectedId}
          className={`rounded font-mono text-[12.5px] font-semibold underline-offset-2 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b] ${
            row.id === selectedId ? "text-[#0d4d3b]" : "text-[#17211d]"
          }`}
        >
          {row.id}
        </button>
      ),
      sortValue: (row) => row.id,
    },
    {
      key: "payerName",
      header: "Issued to",
      cell: (row) => (
        <div className="min-w-0">
          <p className="font-medium text-[#17211d]">{row.payerName}</p>
          <p className="mt-0.5 text-[12px] text-[#8b938d]">{row.payerRef ?? row.source}</p>
        </div>
      ),
      sortValue: (row) => row.payerName,
    },
    { key: "source", header: "For what", cell: (row) => <Chip>{row.source}</Chip>, secondary: true },
    { key: "fund", header: "Fund", cell: (row) => <span className="text-[13px]">{row.fundName}</span>, secondary: true },
    {
      key: "date",
      header: "Date",
      cell: (row) => <span className="whitespace-nowrap tabular-nums">{formatShortDate(row.date)}</span>,
      sortValue: (row) => row.date,
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      cell: (row) => <span className={`font-semibold tabular-nums ${row.status === "Void" ? "text-[#9aa19c] line-through" : "text-[#17211d]"}`}>{formatAmount(row.amount)}</span>,
      sortValue: (row) => row.amount,
    },
    { key: "status", header: "State", cell: (row) => <ReceiptStatusBadge status={row.status} />, sortValue: (row) => row.status },
    {
      key: "actions",
      header: "Show receipt",
      headerHidden: true,
      align: "right",
      cell: (row) => <IconButton icon="receipt" label={`Show ${row.id}`} onClick={() => setSelectedId(row.id)} />,
    },
  ];

  const amountValue = Number(form.amount);
  const errors = {
    payerName: submitted && !form.payerName.trim() ? "Enter the name that goes on the receipt." : undefined,
    amount: submitted && (!form.amount || amountValue <= 0) ? "Enter an amount above zero." : undefined,
    fundId: submitted && !form.fundId ? "Choose the fund the money was credited to." : undefined,
  };

  const submitIssue = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!form.payerName.trim() || !form.amount || amountValue <= 0 || !form.fundId) return;
    setIssueOpen(false);
    setSubmitted(false);
    const name = form.payerName.trim();
    setForm(emptyForm);
    setNotice(
      `Checked and ready: ${nextReceiptNumber} for ${formatAmount(amountValue)} to ${name}. Nothing was issued, the finance API is not connected yet.`,
    );
  };

  if (reach === "none") {
    return <NoAccessState area="Receipts" />;
  }

  return (
    <div className="space-y-5">
      {notice ? (
        <div className="finance-no-print">
          <InlineNotice tone="gold" icon="info">
            {notice}
          </InlineNotice>
        </div>
      ) : null}

      {own ? (
        <div className="finance-no-print">
          <InlineNotice icon="lock">
            You are seeing receipts issued to you. Which receipts are yours is decided by the finance API, not by this page.
          </InlineNotice>
        </div>
      ) : (
        <div className="finance-no-print grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MiniStat label="Issued this month" value={String(receiptSummary.issuedThisMonth)} hint={`Last was ${receiptSummary.lastIssued}`} icon="receipt" />
          <MiniStat label="Value receipted" value={formatAmount(receiptSummary.valueIssued)} hint="Across every source" icon="coins" tone="positive" />
          <MiniStat
            label="Voided this month"
            value={String(receiptSummary.voidedThisMonth)}
            hint="Replaced by a fresh number"
            icon="rotate"
            tone={receiptSummary.voidedThisMonth > 0 ? "warning" : "neutral"}
          />
          <MiniStat label="Next number" value={nextReceiptNumber} hint={`Issued ${formatShortDate(receiptSummary.lastIssuedAt)} onwards`} icon="badge" />
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-5">
        {/* ---- Register ---- */}
        <div className="finance-no-print xl:col-span-3">
          <Panel>
            <PanelHeader
              title={own ? "Your receipts" : "Receipt register"}
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
              search={{ value: search, onChange: setSearch, placeholder: "Search receipt number, name, ledger entry…", label: "Search receipts" }}
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
              initialSort={{ key: "date", direction: "desc" }}
              pageSize={12}
              emptyState={
                <FinanceEmptyState
                  icon={own ? "receipt" : "search"}
                  title={own ? "No receipts yet" : "No receipts match"}
                  description={own ? "A receipt appears here once a payment of yours has been verified." : "Clear a filter or widen the dates."}
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
              mobileTitle={(row) => row.payerName}
              mobileSubtitle={(row) => `${row.id} · ${formatShortDate(row.date)}`}
              mobileTrailing={(row) => <span className="font-semibold tabular-nums text-[#17211d]">{formatAmount(row.amount)}</span>}
              mobileHiddenKeys={["id", "payerName", "amount", "date"]}
            />
          </Panel>
        </div>

        {/* ---- The sheet itself ---- */}
        <div className="xl:col-span-2">
          <div className="xl:sticky xl:top-6">
            <Panel>
              <div className="finance-no-print">
                <PanelHeader
                  title="Receipt"
                  description={selected ? `Prepared for ${selected.payerName}` : "Pick a receipt from the register"}
                  icon="printer"
                  actions={
                    selected ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" variant="secondary" icon="printer" onClick={() => window.print()}>
                          Print
                        </Button>
                        {selected.status === "Issued" ? (
                          <Can permission="receipt.issue">
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
                <ReceiptSheet receipt={selected} />
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

      {/* ---- Void and reissue ---- */}
      <VoidDialog
        open={Boolean(voidTarget)}
        onClose={() => setVoidTarget(null)}
        recordLabel={voidTarget ? `Receipt ${voidTarget.id}` : ""}
        amount={voidTarget?.amount ?? 0}
        details={
          voidTarget
            ? [
                { label: "Issued to", value: voidTarget.payerName },
                { label: "Date", value: formatDate(voidTarget.date) },
                { label: "Replacement number", value: nextReceiptNumber },
              ]
            : []
        }
        onVoid={(reason) => {
          const target = voidTarget;
          setVoidTarget(null);
          setNotice(
            `${target?.id} would be voided with the reason "${reason}" and ${nextReceiptNumber} issued in its place. Nothing changed, the finance API is not connected yet.`,
          );
        }}
      />

      {/* ---- Issue a receipt ---- */}
      <Modal
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        title="Issue a receipt"
        description={`This would take number ${nextReceiptNumber}. Only issue one for money that has been verified as received.`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIssueOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="issue-receipt" icon="receipt">
              Issue receipt
            </Button>
          </>
        }
      >
        <form id="issue-receipt" onSubmit={submitIssue} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="For what"
              required
              options={receiptSources}
              value={form.source}
              onChange={(event) => setForm({ ...form, source: event.target.value as ReceiptSource })}
            />
            <AmountField label="Amount received" required value={form.amount} error={errors.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
            <TextField
              label="Name on the receipt"
              required
              value={form.payerName}
              error={errors.payerName}
              onChange={(event) => setForm({ ...form, payerName: event.target.value })}
            />
            <TextField
              label="Member or staff code"
              hint="If the payer has one."
              placeholder="MEM-0042"
              value={form.payerRef}
              onChange={(event) => setForm({ ...form, payerRef: event.target.value })}
            />
            <SelectField
              label="Credited to fund"
              required
              placeholder="Choose a fund"
              options={fundOptions}
              value={form.fundId}
              error={errors.fundId}
              onChange={(event) => setForm({ ...form, fundId: event.target.value })}
            />
            <SelectField
              label="Paid by"
              required
              options={paymentMethods}
              value={form.paymentMethod}
              onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })}
            />
          </div>

          <TextField label="Date received" type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
          <TextAreaField
            label="Note on the receipt"
            hint="Printed under the amount. Keep it short."
            value={form.note}
            onChange={(event) => setForm({ ...form, note: event.target.value })}
          />

          <dl className="divide-y divide-[#f0efe6] rounded-md border border-[#e2e1d6] bg-[#faf9f4] px-3.5 py-1">
            <SummaryRow label="Issued by" value={receiptIssuer.name} />
            <SummaryRow label="Registration" value={receiptIssuer.registration} />
            <SummaryRow label="Receipt number" value={nextReceiptNumber} emphasis />
          </dl>

          <InlineNotice icon="shield">
            Receipt numbers are given out in order and never reused. A mistake is voided and reissued rather than corrected, so
            the register always adds up.
          </InlineNotice>
        </form>
      </Modal>
    </div>
  );
}
