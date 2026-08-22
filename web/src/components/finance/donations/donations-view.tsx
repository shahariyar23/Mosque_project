"use client";

import { useMemo, useState } from "react";
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
import { FinanceEmptyState, InlineNotice } from "@/components/finance/ui/states";
import { MiniStat } from "@/components/finance/ui/summary-card";
import { WorkflowSteps } from "@/components/finance/ui/workflow";
import { VoidDialog } from "@/components/finance/void-dialog";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import {
  donationKindFilterOptions,
  donationStatusFilterOptions,
  donationSummary,
  donations,
  donationsAwaitingVerification,
} from "@/data/finance/donations";
import { activeFunds, fundFilterOptions, fundOptions } from "@/data/finance/funds";
import { formatAmount, formatDate, formatShortDate, sumAmount } from "@/lib/finance/format";
import { donationWorkflow } from "@/lib/finance/status";
import {
  donationKinds,
  paymentMethods,
  type Donation,
  type DonationKind,
  type DonationStatus,
} from "@/lib/finance/types";

/**
 * Donations. The screen closest to the actual box on the wall, so the two-pair-of-hands rule is the
 * whole shape of it: a donation is *recorded* by whoever took the money, and *verified* later by
 * somebody else against the cash count or the bank line. The receipt only exists after that second
 * step, because a receipt is a promise the mosque stands behind.
 *
 * Recording and verifying are therefore separate permissions and separate actions here, never one
 * button. The API enforces the same separation, including that the verifier is not the recorder.
 */

const kindLabels: Record<DonationKind, string> = {
  General: "General donation, spendable on anything",
  Zakat: "Zakat, restricted to those eligible to receive it",
  Sadaqah: "Sadaqah, voluntary charity",
  Fitrah: "Fitrah, collected before Eid al-Fitr",
  Qurbani: "Qurbani, for the sacrifice",
  Sponsorship: "Sponsorship of a student, project or event",
};

const donorModeOptions = [
  { value: "named", label: "Named donor" },
  { value: "anonymous", label: "Anonymous, do not print a name" },
];

type FormState = {
  donorMode: "named" | "anonymous";
  donorName: string;
  donorPhone: string;
  kind: DonationKind;
  amount: string;
  fundId: string;
  paymentMethod: string;
  date: string;
  notes: string;
};

const emptyForm: FormState = {
  donorMode: "named",
  donorName: "",
  donorPhone: "",
  kind: "General",
  amount: "",
  fundId: "",
  paymentMethod: "Cash",
  date: "2026-08-22",
  notes: "",
};

export function DonationsView() {
  const { can, user } = useDashboardSession();

  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<DonationKind | "all">("all");
  const [status, setStatus] = useState<DonationStatus | "all">("all");
  const [fundId, setFundId] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [selected, setSelected] = useState<Donation | null>(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const [verifyTarget, setVerifyTarget] = useState<Donation | null>(null);
  const [voidTarget, setVoidTarget] = useState<Donation | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitted, setSubmitted] = useState(false);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return donations.filter((row) => {
      if (
        term &&
        ![row.id, row.donorName, row.fundName, row.kind, row.receiptNo ?? "", row.donorPhone ?? "", row.recordedBy].some((value) =>
          value.toLowerCase().includes(term),
        )
      ) {
        return false;
      }
      if (kind !== "all" && row.kind !== kind) return false;
      if (status !== "all" && row.status !== status) return false;
      if (fundId !== "all" && row.fundId !== fundId) return false;
      if (from && row.date < from) return false;
      if (to && row.date > to) return false;
      return true;
    });
  }, [search, kind, status, fundId, from, to]);

  const activeCount = [kind !== "all", status !== "all", fundId !== "all", Boolean(from || to)].filter(Boolean).length;

  const reset = () => {
    setKind("all");
    setStatus("all");
    setFundId("all");
    setFrom("");
    setTo("");
  };

  const filters: SelectFilter[] = [
    { id: "kind", label: "Kind", value: kind, options: donationKindFilterOptions, onChange: (value) => setKind(value as DonationKind | "all") },
    { id: "status", label: "State", value: status, options: donationStatusFilterOptions, onChange: (value) => setStatus(value as DonationStatus | "all") },
    { id: "fund", label: "Fund", value: fundId, options: fundFilterOptions, onChange: setFundId },
  ];

  const awaitingTotal = sumAmount(donationsAwaitingVerification, (row) => row.amount);

  const columns: Column<Donation>[] = [
    {
      key: "date",
      header: "Date",
      cell: (row) => <span className="whitespace-nowrap tabular-nums">{formatShortDate(row.date)}</span>,
      sortValue: (row) => row.date,
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
            {row.anonymous ? <Icon name="user" size={14} className="shrink-0 text-[#9aa19c]" /> : null}
            {row.donorName}
          </button>
          <p className="mt-0.5 text-[12px] text-[#8b938d]">{row.id}</p>
        </div>
      ),
      sortValue: (row) => row.donorName,
    },
    { key: "kind", header: "Kind", cell: (row) => <Chip>{row.kind}</Chip>, sortValue: (row) => row.kind },
    { key: "fund", header: "Fund", cell: (row) => <span className="text-[13px]">{row.fundName}</span>, secondary: true },
    { key: "method", header: "Method", cell: (row) => <span className="text-[13px]">{row.paymentMethod}</span>, secondary: true },
    {
      key: "receipt",
      header: "Receipt",
      cell: (row) =>
        row.receiptNo ? (
          <span className="font-mono text-[12px] text-[#3d453f]">{row.receiptNo}</span>
        ) : (
          <span className="text-[12px] text-[#9aa19c]">Not issued</span>
        ),
      secondary: true,
    },
    { key: "amount", header: "Amount", align: "right", cell: (row) => <Money value={row.amount} />, sortValue: (row) => row.amount },
    { key: "status", header: "State", cell: (row) => <DonationStatusBadge status={row.status} />, sortValue: (row) => row.status },
    {
      key: "actions",
      header: "Open donation",
      headerHidden: true,
      align: "right",
      cell: (row) => <IconButton icon="eye" label={`Open ${row.id}`} onClick={() => setSelected(row)} />,
    },
  ];

  const chosenFund = activeFunds.find((fund) => fund.id === form.fundId);
  const zakatMismatch = form.kind === "Zakat" && Boolean(chosenFund) && chosenFund?.purpose !== "Zakat";
  const amountValue = Number(form.amount);
  const errors = {
    donorName: submitted && form.donorMode === "named" && !form.donorName.trim() ? "Enter the donor's name, or record it as anonymous." : undefined,
    amount: submitted && (!form.amount || amountValue <= 0) ? "Enter an amount above zero." : undefined,
    fundId: submitted && !form.fundId ? "Choose the fund this donation belongs to." : undefined,
  };

  const submitRecord = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (form.donorMode === "named" && !form.donorName.trim()) return;
    if (!form.amount || amountValue <= 0 || !form.fundId) return;
    const donor = form.donorMode === "anonymous" ? "an anonymous donor" : form.donorName.trim();
    setRecordOpen(false);
    setSubmitted(false);
    setForm(emptyForm);
    setNotice(
      `Checked and ready: ${formatAmount(amountValue)} ${form.kind.toLowerCase()} donation from ${donor}. It would be saved as Recorded and wait for a second person to verify it — nothing was saved, the finance API is not connected yet.`,
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
        <MiniStat label="Received in August" value={formatAmount(donationSummary.monthTotal)} hint={`${donationSummary.donorCount} donors`} icon="gift" tone="positive" />
        <MiniStat label="Verified" value={formatAmount(donationSummary.verified)} hint="Receipt issued" icon="check-circle" tone="positive" />
        <MiniStat label="Awaiting verification" value={formatAmount(donationSummary.awaitingVerification)} hint={`${donationsAwaitingVerification.length} records`} icon="clock" tone="warning" />
        <MiniStat label="Voided" value={formatAmount(donationSummary.voided)} hint="Kept in the register with a reason" icon="rotate" tone="neutral" />
      </div>

      {/* ---- The queue that needs a second pair of hands ---- */}
      <Panel>
        <PanelHeader
          title="Waiting to be verified"
          description={
            donationsAwaitingVerification.length === 0
              ? "Nothing is waiting"
              : `${donationsAwaitingVerification.length} recorded, ${formatAmount(awaitingTotal)} in total, no receipt issued yet`
          }
          icon="clock"
        />
        {donationsAwaitingVerification.length === 0 ? (
          <PanelBody>
            <FinanceEmptyState icon="check-circle" title="Everything is verified" description="Newly recorded donations appear here until a second person confirms them." />
          </PanelBody>
        ) : (
          <ul className="divide-y divide-[#f0efe6]">
            {donationsAwaitingVerification.map((row) => {
              const isRecorder = row.recordedBy === user?.name;
              return (
                <li key={row.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-6">
                  <div className="min-w-[180px] flex-1">
                    <p className="text-[13.5px] font-semibold text-[#17211d]">{row.donorName}</p>
                    <p className="mt-0.5 text-[12px] text-[#69726d]">
                      {row.id} · {row.kind} · {row.fundName} · recorded by {row.recordedBy} on {formatShortDate(row.recordedAt)}
                    </p>
                  </div>
                  <p className="text-[15px] font-semibold tabular-nums text-[#17211d]">{formatAmount(row.amount)}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Can permission="donation.verify">
                      <Button size="sm" icon="check" disabled={isRecorder} onClick={() => setVerifyTarget(row)}>
                        Verify
                      </Button>
                    </Can>
                    <Can permission="donation.manage">
                      <Button size="sm" variant="secondary" icon="close" onClick={() => setVoidTarget(row)}>
                        Void
                      </Button>
                    </Can>
                    <IconButton icon="eye" label={`Open ${row.id}`} onClick={() => setSelected(row)} />
                  </div>
                  {isRecorder && can("donation.verify") ? (
                    <p className="w-full text-[12px] text-[#8b938d]">
                      You recorded this one, so somebody else has to verify it. That is the point of the second check.
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        <PanelFooter>
          <p className="text-[12px] text-[#69726d]">A receipt number is generated when a donation is verified, never when it is recorded.</p>
        </PanelFooter>
      </Panel>

      {/* ---- The full register ---- */}
      <Panel>
        <PanelHeader
          title="Donation register"
          description="Every donation recorded, whatever state it is in"
          icon="gift"
          actions={
            <Can permission="donation.record">
              <Button icon="plus" size="sm" onClick={() => setRecordOpen(true)}>
                Record donation
              </Button>
            </Can>
          }
        />
        <FinanceFilters
          search={{ value: search, onChange: setSearch, placeholder: "Search donor, receipt, phone…", label: "Search donations" }}
          filters={filters}
          dateRange={{ label: "Date", from, to, onFromChange: setFrom, onToChange: setTo }}
          activeCount={activeCount}
          onReset={reset}
        />
        <DataTable
          rows={rows}
          columns={columns}
          getRowKey={(row) => row.id}
          caption="Donations, filtered by the controls above"
          initialSort={{ key: "date", direction: "desc" }}
          pageSize={12}
          emptyState={
            <FinanceEmptyState
              icon="search"
              title="No donations match"
              description="Clear a filter or widen the dates to see more of the register."
              action={
                activeCount > 0 ? (
                  <Button variant="secondary" size="sm" icon="close" onClick={reset}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          }
          footNote="Anonymous donations are recorded without a name. The amount is still counted in every total and report."
          mobileTitle={(row) => row.donorName}
          mobileSubtitle={(row) => `${row.id} · ${formatShortDate(row.date)}`}
          mobileTrailing={(row) => <Money value={row.amount} />}
          mobileHiddenKeys={["date", "donor", "amount"]}
        />
      </Panel>

      {/* ---- Donation detail ---- */}
      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? selected.donorName : "Donation"}
        description={selected ? `${selected.id} · ${selected.kind}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelected(null)}>
              Close
            </Button>
            {selected?.status === "Recorded" ? (
              <Can permission="donation.verify">
                <Button
                  icon="check"
                  disabled={selected.recordedBy === user?.name}
                  onClick={() => {
                    setVerifyTarget(selected);
                    setSelected(null);
                  }}
                >
                  Verify
                </Button>
              </Can>
            ) : null}
            {selected && selected.status !== "Voided" ? (
              <Can permission="donation.manage">
                <Button
                  variant="danger"
                  icon="rotate"
                  onClick={() => {
                    setVoidTarget(selected);
                    setSelected(null);
                  }}
                >
                  Void
                </Button>
              </Can>
            ) : null}
          </>
        }
      >
        {selected ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <DonationStatusBadge status={selected.status} />
              <Chip>{selected.kind}</Chip>
              {selected.anonymous ? <Chip>Anonymous</Chip> : null}
            </div>

            <WorkflowSteps
              steps={donationWorkflow}
              current={selected.status === "Voided" ? "Recorded" : selected.status}
              label="Donation progress"
              terminal={selected.status === "Voided" ? { label: "Voided", reason: selected.voidReason } : null}
            />

            <dl className="divide-y divide-[#f0efe6] rounded-md border border-[#e2e1d6] bg-[#faf9f4] px-3.5 py-1">
              <SummaryRow label="Date received" value={formatDate(selected.date)} />
              <SummaryRow label="Fund" value={selected.fundName} />
              <SummaryRow label="Payment method" value={selected.paymentMethod} />
              {selected.donorPhone ? <SummaryRow label="Phone" value={selected.donorPhone} /> : null}
              <SummaryRow label="Recorded by" value={`${selected.recordedBy}, ${formatDate(selected.recordedAt)}`} />
              {selected.verifiedBy ? <SummaryRow label="Verified by" value={`${selected.verifiedBy}, ${formatDate(selected.verifiedAt ?? "")}`} /> : null}
              {selected.receiptNo ? <SummaryRow label="Receipt" value={selected.receiptNo} /> : null}
              {selected.transactionId ? <SummaryRow label="Ledger entry" value={selected.transactionId} /> : null}
              {selected.voidedBy ? <SummaryRow label="Voided by" value={`${selected.voidedBy}, ${formatDate(selected.voidedAt ?? "")}`} /> : null}
              <SummaryRow label="Amount" value={<Money value={selected.amount} />} emphasis />
            </dl>

            {selected.notes ? <p className="text-[13px] leading-6 text-[#4d564f]">{selected.notes}</p> : null}

            {selected.status === "Recorded" ? (
              <InlineNotice tone="gold" icon="clock">
                No receipt exists for this donation yet. One is issued the moment somebody other than {selected.recordedBy} verifies it.
              </InlineNotice>
            ) : null}
          </div>
        ) : null}
      </Modal>

      {/* ---- Verify ---- */}
      <ConfirmDialog
        open={Boolean(verifyTarget)}
        onClose={() => setVerifyTarget(null)}
        onConfirm={() => {
          const target = verifyTarget;
          setVerifyTarget(null);
          setNotice(
            `Verification prepared for ${target?.id}. On a live system this issues the receipt and posts the entry to the ledger — nothing was saved, the finance API is not connected yet.`,
          );
        }}
        title="Verify this donation"
        description="Confirm you have checked this amount against the cash count or the bank line. Verifying issues the receipt, and the receipt cannot be unissued."
        tone="primary"
        icon="check-circle"
        confirmLabel="Verify and issue receipt"
        details={
          verifyTarget ? (
            <dl className="divide-y divide-[#f0efe6]">
              <SummaryRow label="Donor" value={verifyTarget.donorName} />
              <SummaryRow label="Kind" value={verifyTarget.kind} />
              <SummaryRow label="Fund" value={verifyTarget.fundName} />
              <SummaryRow label="Recorded by" value={verifyTarget.recordedBy} />
              <SummaryRow label="Amount" value={formatAmount(verifyTarget.amount)} emphasis />
            </dl>
          ) : undefined
        }
      />

      {/* ---- Void ---- */}
      <VoidDialog
        open={Boolean(voidTarget)}
        onClose={() => setVoidTarget(null)}
        recordLabel={voidTarget ? `${voidTarget.id} — ${voidTarget.donorName}` : ""}
        amount={voidTarget?.amount ?? 0}
        details={
          voidTarget
            ? [
                { label: "Kind", value: voidTarget.kind },
                { label: "Fund", value: voidTarget.fundName },
                { label: "Receipt", value: voidTarget.receiptNo ?? "Not issued" },
              ]
            : []
        }
        onVoid={(reason) => {
          const target = voidTarget;
          setVoidTarget(null);
          setNotice(
            `Void prepared for ${target?.id} with the reason "${reason}". Nothing changed in the register — the finance API is not connected yet.`,
          );
        }}
      />

      {/* ---- Record a donation ---- */}
      <Modal
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
        title="Record a donation"
        description="For money already in hand. It is saved as Recorded and waits for somebody else to verify it."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRecordOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="record-donation" icon="check">
              Record donation
            </Button>
          </>
        }
      >
        <form id="record-donation" onSubmit={submitRecord} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Donor"
              required
              options={donorModeOptions}
              value={form.donorMode}
              onChange={(event) => setForm({ ...form, donorMode: event.target.value as "named" | "anonymous" })}
            />
            <TextField
              label="Donor name"
              required={form.donorMode === "named"}
              disabled={form.donorMode === "anonymous"}
              placeholder={form.donorMode === "anonymous" ? "Recorded as Anonymous" : "Abdur Rahman"}
              value={form.donorMode === "anonymous" ? "" : form.donorName}
              error={errors.donorName}
              onChange={(event) => setForm({ ...form, donorName: event.target.value })}
            />
            <SelectField
              label="Kind"
              required
              hint={kindLabels[form.kind]}
              options={donationKinds}
              value={form.kind}
              onChange={(event) => setForm({ ...form, kind: event.target.value as DonationKind })}
            />
            <AmountField label="Amount" required value={form.amount} error={errors.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
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
            <TextField label="Date received" type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
            <TextField
              label="Phone"
              type="tel"
              hint="Only if the donor wants the receipt sent to them."
              disabled={form.donorMode === "anonymous"}
              value={form.donorMode === "anonymous" ? "" : form.donorPhone}
              onChange={(event) => setForm({ ...form, donorPhone: event.target.value })}
            />
          </div>

          {zakatMismatch ? (
            <InlineNotice tone="gold" icon="alert">
              Zakat may only be spent on those eligible to receive it. Putting it in {chosenFund?.name} mixes it with money that
              has no such restriction. Use the Zakat fund unless the committee has decided otherwise.
            </InlineNotice>
          ) : null}

          <TextAreaField
            label="Notes"
            hint="Anything the treasurer should know when verifying — which collection, which envelope, who handed it over."
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
          />

          <InlineNotice icon="shield">
            You are recording, not confirming. No receipt is issued and no money is counted as verified until a second person
            checks it, and the API applies that rule again.
          </InlineNotice>
        </form>
      </Modal>
    </div>
  );
}
