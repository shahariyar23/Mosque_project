"use client";

import { useMemo, useState } from "react";
import { Chip, FundStatusBadge } from "@/components/finance/ui/badge";
import { Button } from "@/components/finance/ui/button";
import { SegmentedControl } from "@/components/finance/ui/filters";
import { AmountField, SelectField, SummaryRow, TextAreaField, TextField } from "@/components/finance/ui/form-field";
import { Icon } from "@/components/finance/ui/icon";
import { Modal } from "@/components/finance/ui/modal";
import { Money } from "@/components/finance/ui/money";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { ProgressBar } from "@/components/finance/ui/progress";
import { InlineNotice } from "@/components/finance/ui/states";
import { MiniStat } from "@/components/finance/ui/summary-card";
import { activeFunds, funds } from "@/data/finance/funds";
import { formatAmount, formatDate, formatPercent, sumAmount } from "@/lib/finance/format";
import type { Fund } from "@/lib/finance/types";

/**
 * Fund management. A mosque does not have one pot of money, it has several promises: this money was
 * given for the building, that money is zakat, this money pays the imam. Keeping them apart is the
 * whole job of this screen, so a fund is never just a label on a transaction here.
 *
 * Zakat is the strict case. It may only reach people eligible to receive it, so a transfer out of it
 * into a general fund is refused in this form rather than merely discouraged. The API refuses it too;
 * this is here so nobody discovers the rule after the money has moved.
 */

const purposeNotes: Record<string, string> = {
  Zakat: "Restricted by religious rule. May only be spent on those eligible to receive zakat.",
  Salary: "Earmarked for staff pay. Keeps a livelihood from competing with a building project.",
  Construction: "Earmarked for the building work donors gave towards.",
  Education: "Earmarked for the madrasa and its teachers.",
  Maintenance: "Earmarked for upkeep and repairs.",
  Operations: "General running costs. Spendable on anything the committee approves.",
  Seasonal: "Collected for a season, such as Ramadan or Qurbani, and spent within it.",
  Welfare: "For helping families in need.",
};

const scopeOptions = [
  { value: "active", label: "Active funds" },
  { value: "all", label: "Include closed" },
];

type TransferForm = {
  fromId: string;
  toId: string;
  amount: string;
  date: string;
  reason: string;
};

const emptyTransfer: TransferForm = { fromId: "", toId: "", amount: "", date: "2026-08-22", reason: "" };

function FundCard({ fund, total, onOpen, onTransfer }: { fund: Fund; total: number; onOpen: () => void; onTransfer?: () => void }) {
  const share = total > 0 ? (fund.balance / total) * 100 : 0;
  const restricted = fund.purpose === "Zakat";
  return (
    <li className="flex flex-col rounded-lg border border-[#e2e1d6] bg-white p-5 shadow-[0_1px_2px_rgba(7,58,45,.04),0_10px_28px_-24px_rgba(7,58,45,.3)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14.5px] font-semibold text-[#17211d]">{fund.name}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Chip>{fund.purpose}</Chip>
            {restricted ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#e3ce9d] bg-[#f7f0df] px-2 py-0.5 text-[11px] font-semibold text-[#7d5f18]">
                <Icon name="lock" size={11} />
                Restricted
              </span>
            ) : null}
          </div>
        </div>
        <FundStatusBadge status={fund.status} />
      </div>

      <p className="mt-4 text-[22px] font-semibold tabular-nums text-[#0b4634]">{formatAmount(fund.balance)}</p>
      <p className="text-[12px] text-[#69726d]">
        {formatPercent(share)} of everything the mosque holds
      </p>

      {fund.targetAmount ? (
        <div className="mt-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[12px] font-medium text-[#3d453f]">Towards {formatAmount(fund.targetAmount)}</p>
            <p className="text-[12px] font-semibold tabular-nums text-[#3d453f]">{formatPercent((fund.balance / fund.targetAmount) * 100)}</p>
          </div>
          <ProgressBar
            className="mt-1.5"
            value={fund.balance}
            max={fund.targetAmount}
            tone={restricted ? "gold" : "success"}
            label={`${fund.name} has reached ${formatAmount(fund.balance)} of its ${formatAmount(fund.targetAmount)} target`}
          />
        </div>
      ) : null}

      <p className="mt-3.5 text-[12.5px] leading-5 text-[#69726d]">{fund.description}</p>

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[#eceae0] pt-3.5">
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-[.06em] text-[#8b938d]">Collected</dt>
          <dd className="mt-0.5 text-[13.5px] font-semibold tabular-nums text-[#0b4634]">{formatAmount(fund.collected)}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-[.06em] text-[#8b938d]">Spent</dt>
          <dd className="mt-0.5 text-[13.5px] font-semibold tabular-nums text-[#94291f]">{formatAmount(fund.spent)}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2 pt-0.5">
        <Button size="sm" variant="secondary" icon="eye" onClick={onOpen}>
          Details
        </Button>
        {onTransfer ? (
          <Button size="sm" variant="ghost" icon="arrow-right" onClick={onTransfer}>
            Transfer
          </Button>
        ) : null}
        <span className="ml-auto text-[11.5px] text-[#9aa19c]">Updated {formatDate(fund.updatedAt)}</span>
      </div>
    </li>
  );
}

export function FundsView() {
  const [scope, setScope] = useState("active");
  const [selected, setSelected] = useState<Fund | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [form, setForm] = useState<TransferForm>(emptyTransfer);
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const shown = useMemo(() => (scope === "active" ? activeFunds : funds), [scope]);

  const total = sumAmount(activeFunds, (fund) => fund.balance);
  const collected = sumAmount(activeFunds, (fund) => fund.collected);
  const spent = sumAmount(activeFunds, (fund) => fund.spent);
  const restrictedTotal = sumAmount(
    activeFunds.filter((fund) => fund.purpose === "Zakat"),
    (fund) => fund.balance,
  );

  const transferOptions = activeFunds.map((fund) => ({ value: fund.id, label: `${fund.name} — ${formatAmount(fund.balance)}` }));
  const fromFund = activeFunds.find((fund) => fund.id === form.fromId);
  const toFund = activeFunds.find((fund) => fund.id === form.toId);
  const amountValue = Number(form.amount);

  /** Zakat may not be moved into a fund that has no such restriction. */
  const breaksZakatRule = fromFund?.purpose === "Zakat" && Boolean(toFund) && toFund?.purpose !== "Zakat";
  const overdrawn = Boolean(fromFund) && amountValue > (fromFund?.balance ?? 0);

  const errors = {
    fromId: submitted && !form.fromId ? "Choose the fund the money leaves." : undefined,
    toId: submitted && !form.toId ? "Choose the fund the money arrives in." : submitted && form.toId === form.fromId ? "A transfer needs two different funds." : undefined,
    amount: submitted && (!form.amount || amountValue <= 0) ? "Enter an amount above zero." : overdrawn ? `${fromFund?.name} only holds ${formatAmount(fromFund?.balance ?? 0)}.` : undefined,
    reason: submitted && form.reason.trim().length < 10 ? "Say why the money is moving, in at least ten characters." : undefined,
  };

  const openTransfer = (fund?: Fund) => {
    setForm({ ...emptyTransfer, fromId: fund?.id ?? "" });
    setSubmitted(false);
    setTransferOpen(true);
  };

  const submitTransfer = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!form.fromId || !form.toId || form.toId === form.fromId) return;
    if (!form.amount || amountValue <= 0 || overdrawn) return;
    if (form.reason.trim().length < 10) return;
    if (breaksZakatRule) return;
    setTransferOpen(false);
    setSubmitted(false);
    setForm(emptyTransfer);
    setNotice(
      `Checked and ready: ${formatAmount(amountValue)} from ${fromFund?.name} to ${toFund?.name}. It would be posted to the ledger as a Transfer for approval — nothing moved, the finance API is not connected yet.`,
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
        <MiniStat label="Held across funds" value={formatAmount(total)} hint={`${activeFunds.length} active funds`} icon="vault" tone="positive" />
        <MiniStat label="Collected into funds" value={formatAmount(collected)} hint="Since each fund opened" icon="arrow-down-right" />
        <MiniStat label="Spent from funds" value={formatAmount(spent)} hint="Since each fund opened" icon="arrow-up" tone="negative" />
        <MiniStat label="Restricted (zakat)" value={formatAmount(restrictedTotal)} hint="Cannot be spent on general costs" icon="lock" tone="gold" />
      </div>

      <Panel>
        <PanelHeader
          title="Funds"
          description="What the mosque holds, and what each pot is promised to"
          icon="vault"
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <SegmentedControl label="Which funds" size="sm" value={scope} onChange={setScope} options={scopeOptions} />
              <Can permission="fund.manage">
                <Button size="sm" icon="arrow-right" onClick={() => openTransfer()}>
                  Transfer between funds
                </Button>
              </Can>
            </div>
          }
        />
        <PanelBody>
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((fund) => (
              <FundCard
                key={fund.id}
                fund={fund}
                total={total}
                onOpen={() => setSelected(fund)}
                onTransfer={fund.status === "Active" ? () => openTransfer(fund) : undefined}
              />
            ))}
          </ul>
        </PanelBody>
        <PanelFooter>
          <p className="text-[12px] text-[#69726d]">
            Moving money between funds is a transfer, not income and not an expense. It changes which promise the money sits
            under and nothing else, so it never appears in the income statement.
          </p>
        </PanelFooter>
      </Panel>

      {/* ---- Fund detail ---- */}
      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? selected.name : "Fund"}
        description={selected ? purposeNotes[selected.purpose] : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelected(null)}>
              Close
            </Button>
            {selected?.status === "Active" ? (
              <Can permission="fund.manage">
                <Button
                  icon="arrow-right"
                  onClick={() => {
                    const fund = selected;
                    setSelected(null);
                    openTransfer(fund);
                  }}
                >
                  Transfer from this fund
                </Button>
              </Can>
            ) : null}
          </>
        }
      >
        {selected ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <FundStatusBadge status={selected.status} />
              <Chip>{selected.purpose}</Chip>
              <Chip>{selected.slug}</Chip>
            </div>

            <p className="text-[13px] leading-6 text-[#4d564f]">{selected.description}</p>

            <dl className="divide-y divide-[#f0efe6] rounded-md border border-[#e2e1d6] bg-[#faf9f4] px-3.5 py-1">
              <SummaryRow label="Opening balance" value={formatAmount(selected.openingBalance)} />
              <SummaryRow label="Collected" value={formatAmount(selected.collected)} />
              <SummaryRow label="Spent" value={formatAmount(selected.spent)} />
              {selected.targetAmount ? <SummaryRow label="Target" value={formatAmount(selected.targetAmount)} /> : null}
              <SummaryRow label="Last movement" value={formatDate(selected.updatedAt)} />
              <SummaryRow label="Balance now" value={<Money value={selected.balance} />} emphasis />
            </dl>

            {selected.purpose === "Zakat" ? (
              <InlineNotice tone="gold" icon="lock">
                Zakat is held separately for a reason. It may only reach the categories of people entitled to receive it, so it
                cannot be transferred into a general fund or used for running costs.
              </InlineNotice>
            ) : null}
          </div>
        ) : null}
      </Modal>

      {/* ---- Transfer ---- */}
      <Modal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        title="Transfer between funds"
        description="Both sides are recorded as one ledger entry, so the total the mosque holds does not change."
        footer={
          <>
            <Button variant="secondary" onClick={() => setTransferOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="fund-transfer" icon="check" disabled={breaksZakatRule}>
              Record transfer
            </Button>
          </>
        }
      >
        <form id="fund-transfer" onSubmit={submitTransfer} noValidate className="space-y-4">
          <SelectField
            label="From fund"
            required
            placeholder="Choose a fund"
            options={transferOptions}
            value={form.fromId}
            error={errors.fromId}
            onChange={(event) => setForm({ ...form, fromId: event.target.value })}
          />
          <SelectField
            label="To fund"
            required
            placeholder="Choose a fund"
            options={transferOptions}
            value={form.toId}
            error={errors.toId}
            onChange={(event) => setForm({ ...form, toId: event.target.value })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <AmountField
              label="Amount"
              required
              hint={fromFund ? `${fromFund.name} holds ${formatAmount(fromFund.balance)}.` : undefined}
              value={form.amount}
              error={errors.amount}
              onChange={(event) => setForm({ ...form, amount: event.target.value })}
            />
            <TextField label="Date" type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
          </div>
          <TextAreaField
            label="Reason for the transfer"
            required
            hint="Recorded against your name. A committee decision, a shortfall covered, a fund closing."
            placeholder="Committee agreed on 20 August to cover the electricity shortfall from the general fund."
            value={form.reason}
            error={errors.reason}
            onChange={(event) => setForm({ ...form, reason: event.target.value })}
          />

          {breaksZakatRule ? (
            <InlineNotice tone="gold" icon="lock">
              Zakat cannot be moved into {toFund?.name}. That money is owed to those entitled to receive zakat, and a general
              fund has no such restriction. Choose another destination, or spend it directly from the zakat fund.
            </InlineNotice>
          ) : null}

          <InlineNotice icon="shield">
            A transfer needs approval like any other movement of money. It is recorded here and confirmed by somebody else, and
            the API checks that permission again.
          </InlineNotice>
        </form>
      </Modal>
    </div>
  );
}
