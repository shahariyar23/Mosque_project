"use client";

import { useMemo, useState } from "react";
import { Chip, ContributionPlanStatusBadge, ContributionStatusBadge } from "@/components/finance/ui/badge";
import { Button, IconButton } from "@/components/finance/ui/button";
import { DataTable, type Column } from "@/components/finance/ui/data-table";
import { FinanceFilters, SegmentedControl, type SelectFilter } from "@/components/finance/ui/filters";
import { SelectField, SummaryRow, TextAreaField, TextField } from "@/components/finance/ui/form-field";
import { Modal } from "@/components/finance/ui/modal";
import { Money } from "@/components/finance/ui/money";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/finance/ui/panel";
import { ProgressBar } from "@/components/finance/ui/progress";
import { FinanceEmptyState, InlineNotice } from "@/components/finance/ui/states";
import { MiniStat } from "@/components/finance/ui/summary-card";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import {
  CURRENT_PERIOD,
  collectionTrend,
  contributionPeriodOptions,
  contributionPlanFilterOptions,
  contributionPlans,
  contributionStatusFilterOptions,
  getMemberProfile,
  memberContributions,
} from "@/data/finance/contributions";
import {
  formatAmount,
  formatCollectionRate,
  formatDate,
  formatMonth,
  formatOptionalDate,
  formatPercent,
  sumAmount,
} from "@/lib/finance/format";
import { paymentMethods, type ContributionStatus, type MemberContribution, type MemberContributionProfile } from "@/lib/finance/types";

/**
 * Monthly member contributions. Not a subscription product: this is the pledge a household makes to
 * its own mosque, collected in cash as often as not, and chased by somebody who knows the family.
 *
 * So the register is built around one period at a time and around who still owes, because that is the
 * list a secretary actually works from on a Friday. Amounts come from the member's plan, never typed
 * in by whoever collects, which is why the record-payment form shows the amount rather than asking
 * for it.
 */

type PayForm = {
  paymentMethod: string;
  paidDate: string;
  notes: string;
};

const emptyPayForm: PayForm = { paymentMethod: "Cash", paidDate: "2026-08-22", notes: "" };

export function ContributionsView() {
  const { can } = useDashboardSession();

  const [period, setPeriod] = useState(CURRENT_PERIOD);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ContributionStatus | "all">("all");
  const [planId, setPlanId] = useState("all");

  const [profile, setProfile] = useState<MemberContributionProfile | null>(null);
  const [payTarget, setPayTarget] = useState<MemberContribution | null>(null);
  const [payForm, setPayForm] = useState<PayForm>(emptyPayForm);
  const [notice, setNotice] = useState<string | null>(null);

  const periodRows = useMemo(() => memberContributions.filter((row) => row.period === period), [period]);

  const expected = sumAmount(periodRows, (row) => row.amount);
  const collected = sumAmount(
    periodRows.filter((row) => row.status === "Paid"),
    (row) => row.amount,
  );
  const outstanding = sumAmount(
    periodRows.filter((row) => row.status === "Pending" || row.status === "Overdue"),
    (row) => row.amount,
  );
  const paidCount = periodRows.filter((row) => row.status === "Paid").length;
  const overdueCount = periodRows.filter((row) => row.status === "Overdue").length;

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return periodRows.filter((row) => {
      if (term && ![row.memberName, row.memberCode, row.planName, row.receiptNo ?? "", row.collectedBy ?? ""].some((value) => value.toLowerCase().includes(term))) {
        return false;
      }
      if (status !== "all" && row.status !== status) return false;
      if (planId !== "all" && row.planId !== planId) return false;
      return true;
    });
  }, [periodRows, search, status, planId]);

  const activeCount = [status !== "all", planId !== "all"].filter(Boolean).length;

  const reset = () => {
    setStatus("all");
    setPlanId("all");
  };

  const filters: SelectFilter[] = [
    { id: "status", label: "State", value: status, options: contributionStatusFilterOptions, onChange: (value) => setStatus(value as ContributionStatus | "all") },
    { id: "plan", label: "Plan", value: planId, options: contributionPlanFilterOptions, onChange: setPlanId },
  ];

  const openProfile = (memberId: string) => {
    const found = getMemberProfile(memberId);
    if (found) setProfile(found);
  };

  const columns: Column<MemberContribution>[] = [
    {
      key: "member",
      header: "Member",
      cell: (row) => (
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => openProfile(row.memberId)}
            className="rounded text-left font-medium text-[#17211d] underline-offset-2 transition-colors hover:text-[#0d4d3b] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
          >
            {row.memberName}
          </button>
          <p className="mt-0.5 text-[12px] text-[#8b938d]">{row.memberCode}</p>
        </div>
      ),
      sortValue: (row) => row.memberName,
    },
    { key: "plan", header: "Plan", cell: (row) => <Chip>{row.planName}</Chip>, sortValue: (row) => row.planName },
    {
      key: "due",
      header: "Due",
      cell: (row) => <span className="whitespace-nowrap tabular-nums">{formatDate(row.dueDate)}</span>,
      sortValue: (row) => row.dueDate,
      secondary: true,
    },
    {
      key: "paid",
      header: "Collected",
      cell: (row) =>
        row.paidDate ? (
          <span className="whitespace-nowrap text-[13px] tabular-nums">
            {formatDate(row.paidDate)}
            {row.collectedBy ? <span className="block text-[12px] text-[#8b938d]">by {row.collectedBy}</span> : null}
          </span>
        ) : (
          <span className="text-[12px] text-[#9aa19c]">Not yet</span>
        ),
      sortValue: (row) => row.paidDate ?? "",
      secondary: true,
    },
    {
      key: "receipt",
      header: "Receipt",
      cell: (row) =>
        row.receiptNo ? <span className="font-mono text-[12px] text-[#3d453f]">{row.receiptNo}</span> : <span className="text-[12px] text-[#9aa19c]">—</span>,
      secondary: true,
    },
    { key: "amount", header: "Amount", align: "right", cell: (row) => <Money value={row.amount} />, sortValue: (row) => row.amount },
    { key: "status", header: "State", cell: (row) => <ContributionStatusBadge status={row.status} />, sortValue: (row) => row.status },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-2">
          {row.status !== "Paid" && can("contribution.record") ? (
            <Button
              size="sm"
              icon="check"
              onClick={() => {
                setPayForm(emptyPayForm);
                setPayTarget(row);
              }}
            >
              Record payment
            </Button>
          ) : null}
          <IconButton icon="eye" label={`Open ${row.memberName}'s record`} onClick={() => openProfile(row.memberId)} />
        </div>
      ),
    },
  ];

  const submitPayment = (event: React.FormEvent) => {
    event.preventDefault();
    const target = payTarget;
    setPayTarget(null);
    setNotice(
      `Checked and ready: ${formatAmount(target?.amount ?? 0)} from ${target?.memberName} for ${formatMonth(period)}, ${payForm.paymentMethod.toLowerCase()}. A receipt would be issued on verification — nothing was saved, the finance API is not connected yet.`,
    );
  };

  return (
    <div className="space-y-5">
      {notice ? (
        <InlineNotice tone="gold" icon="info">
          {notice}
        </InlineNotice>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <SegmentedControl
          label="Period"
          value={period}
          onChange={setPeriod}
          options={contributionPeriodOptions}
        />
        <p className="text-[12.5px] text-[#69726d]">
          {periodRows.length} members enrolled in <span className="font-semibold text-[#3d453f]">{formatMonth(period)}</span>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat label="Expected" value={formatAmount(expected)} hint={`${periodRows.length} members`} icon="scale" />
        <MiniStat label="Collected" value={formatAmount(collected)} hint={`${paidCount} members paid`} icon="check-circle" tone="positive" />
        <MiniStat label="Outstanding" value={formatAmount(outstanding)} hint={`${periodRows.length - paidCount} to follow up`} icon="clock" tone="warning" />
        <MiniStat
          label="Overdue"
          value={String(overdueCount)}
          hint={overdueCount === 0 ? "Nobody has passed the due date" : "Past the due date for this period"}
          icon="alert"
          tone={overdueCount > 0 ? "negative" : "neutral"}
        />
      </div>

      {/* ---- Plans ---- */}
      <Panel>
        <PanelHeader
          title="Contribution plans"
          description="What a household pledges, and how often"
          icon="repeat"
          actions={
            can("contribution.manage") ? (
              <Button size="sm" variant="secondary" icon="settings" onClick={() => setNotice("Plan settings are part of the finance API work. Nothing to change here yet.")}>
                Plan settings
              </Button>
            ) : null
          }
        />
        <PanelBody>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {contributionPlans.map((plan) => (
              <li key={plan.id} className="rounded-lg border border-[#e2e1d6] bg-[#fbfaf5] p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13.5px] font-semibold text-[#17211d]">{plan.name}</p>
                  <ContributionPlanStatusBadge status={plan.status} />
                </div>
                <p className="mt-2 text-[19px] font-semibold tabular-nums text-[#0b4634]">{formatAmount(plan.amount)}</p>
                <p className="text-[12px] text-[#69726d]">{plan.frequency.toLowerCase()}, into {plan.fundName}</p>
                <p className="mt-2.5 text-[12px] leading-5 text-[#69726d]">{plan.description}</p>
                <p className="mt-3 border-t border-[#eceae0] pt-2.5 text-[12px] font-medium text-[#3d453f]">
                  {plan.memberCount} {plan.memberCount === 1 ? "member" : "members"}
                </p>
              </li>
            ))}
          </ul>
        </PanelBody>
        <PanelFooter>
          <p className="text-[12px] text-[#69726d]">
            A member sits on one plan at a time. Changing a plan changes what is expected from next period, never what is
            already recorded.
          </p>
        </PanelFooter>
      </Panel>

      {/* ---- Collection ---- */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader title="Collection this period" description={`${formatCollectionRate(collected, expected)} of what was expected`} icon="gauge" />
          <PanelBody className="space-y-5">
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[13.5px] font-medium text-[#3d453f]">{formatMonth(period)}</p>
                <p className="text-[13.5px] font-semibold tabular-nums text-[#17211d]">
                  {formatAmount(collected)} <span className="font-normal text-[#69726d]">of {formatAmount(expected)}</span>
                </p>
              </div>
              <ProgressBar
                className="mt-2.5"
                value={collected}
                max={expected}
                tone="success"
                label={`${formatCollectionRate(collected, expected)} collected for ${formatMonth(period)}`}
                showValue
              />
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.08em] text-[#8b938d]">Recent periods</p>
              <ul className="mt-3 space-y-3">
                {collectionTrend.map((point) => (
                  <li key={point.period}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-[13px] font-medium text-[#3d453f]">{point.label}</p>
                      <p className="text-[13px] font-semibold tabular-nums text-[#17211d]">{formatPercent(point.rate)}</p>
                    </div>
                    <ProgressBar className="mt-1.5" value={point.rate} max={100} tone={point.rate >= 85 ? "success" : "pending"} label={`${point.label}, ${formatPercent(point.rate)} collected`} />
                  </li>
                ))}
              </ul>
            </div>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Who to follow up" description="Unpaid in this period, largest first" icon="users" />
          {rows.filter((row) => row.status !== "Paid").length === 0 ? (
            <PanelBody>
              <FinanceEmptyState icon="check-circle" title="Everybody has paid" description="Nothing outstanding for this period." />
            </PanelBody>
          ) : (
            <ul className="divide-y divide-[#f0efe6]">
              {[...rows]
                .filter((row) => row.status !== "Paid")
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 6)
                .map((row) => (
                  <li key={row.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => openProfile(row.memberId)}
                        className="block truncate rounded text-left text-[13.5px] font-semibold text-[#17211d] underline-offset-2 hover:text-[#0d4d3b] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
                      >
                        {row.memberName}
                      </button>
                      <p className="mt-0.5 text-[12px] text-[#8b938d]">
                        {row.memberCode} · due {formatDate(row.dueDate)}
                      </p>
                    </div>
                    <p className="shrink-0 text-[13.5px] font-semibold tabular-nums text-[#17211d]">{formatAmount(row.amount)}</p>
                    <ContributionStatusBadge status={row.status} />
                  </li>
                ))}
            </ul>
          )}
          <PanelFooter>
            <p className="text-[12px] text-[#69726d]">Follow up is a conversation, not a dunning email. Ring or visit before marking anybody overdue.</p>
          </PanelFooter>
        </Panel>
      </div>

      {/* ---- Register ---- */}
      <Panel>
        <PanelHeader title="Member register" description={`Contributions for ${formatMonth(period)}`} icon="users" />
        <FinanceFilters
          search={{ value: search, onChange: setSearch, placeholder: "Search member, code, receipt…", label: "Search the register" }}
          filters={filters}
          activeCount={activeCount}
          onReset={reset}
        />
        <DataTable
          rows={rows}
          columns={columns}
          getRowKey={(row) => row.id}
          caption={`Member contributions for ${formatMonth(period)}`}
          initialSort={{ key: "status", direction: "asc" }}
          pageSize={12}
          emptyState={
            <FinanceEmptyState
              icon="search"
              title="Nobody matches"
              description="Clear a filter, or choose another period."
              action={
                activeCount > 0 ? (
                  <Button variant="secondary" size="sm" icon="close" onClick={reset}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          }
          mobileTitle={(row) => row.memberName}
          mobileSubtitle={(row) => `${row.memberCode} · due ${formatDate(row.dueDate)}`}
          mobileTrailing={(row) => <Money value={row.amount} />}
          mobileHiddenKeys={["member", "amount"]}
        />
      </Panel>

      {/* ---- Member history ---- */}
      <Modal
        open={Boolean(profile)}
        onClose={() => setProfile(null)}
        title={profile ? profile.memberName : "Member"}
        description={profile ? `${profile.memberCode} · ${profile.planName}` : undefined}
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setProfile(null)}>
            Close
          </Button>
        }
      >
        {profile ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <ContributionPlanStatusBadge status={profile.status} />
              <Chip>{profile.frequency}</Chip>
              <Chip>{profile.fundName}</Chip>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <MiniStat label="Pledged" value={formatAmount(profile.amount)} hint={profile.frequency.toLowerCase()} icon="repeat" />
              <MiniStat label="Paid to date" value={formatAmount(profile.totalPaid)} hint="Across every period" icon="check-circle" tone="positive" />
              <MiniStat
                label="Outstanding"
                value={formatAmount(profile.outstanding)}
                hint={profile.outstanding === 0 ? "Nothing owed" : "Owed across open periods"}
                icon="clock"
                tone={profile.outstanding > 0 ? "warning" : "neutral"}
              />
            </div>

            <dl className="divide-y divide-[#f0efe6] rounded-md border border-[#e2e1d6] bg-[#faf9f4] px-3.5 py-1">
              <SummaryRow label="Phone" value={profile.phone} />
              <SummaryRow label="Member since" value={formatDate(profile.joinedAt)} />
              <SummaryRow label="Plan" value={`${profile.planName}, ${formatAmount(profile.amount)} ${profile.frequency.toLowerCase()}`} />
            </dl>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.08em] text-[#8b938d]">Payment history</p>
              <ul className="mt-3 divide-y divide-[#f0efe6] rounded-md border border-[#e2e1d6]">
                {profile.history.map((entry) => (
                  <li key={entry.period} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3.5 py-3">
                    <p className="min-w-[110px] flex-1 text-[13px] font-medium text-[#17211d]">{entry.label}</p>
                    <p className="text-[13px] tabular-nums text-[#3d453f]">{formatAmount(entry.amount)}</p>
                    <p className="min-w-[92px] text-[12px] text-[#8b938d]">{formatOptionalDate(entry.paidDate)}</p>
                    {entry.receiptNo ? <span className="font-mono text-[11.5px] text-[#69726d]">{entry.receiptNo}</span> : null}
                    <ContributionStatusBadge status={entry.status} />
                  </li>
                ))}
              </ul>
            </div>

            <InlineNotice icon="lock">
              A member&rsquo;s own history is shown here for whoever collects. Members see only their own record on their account
              page, and the API decides that, not this screen.
            </InlineNotice>
          </div>
        ) : null}
      </Modal>

      {/* ---- Record a payment ---- */}
      <Modal
        open={Boolean(payTarget)}
        onClose={() => setPayTarget(null)}
        title="Record a contribution payment"
        description="The amount comes from the member's plan. If they paid a different amount, record this one and add a note."
        footer={
          <>
            <Button variant="secondary" onClick={() => setPayTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" form="record-contribution" icon="check">
              Record payment
            </Button>
          </>
        }
      >
        {payTarget ? (
          <form id="record-contribution" onSubmit={submitPayment} noValidate className="space-y-4">
            <dl className="divide-y divide-[#f0efe6] rounded-md border border-[#e2e1d6] bg-[#faf9f4] px-3.5 py-1">
              <SummaryRow label="Member" value={`${payTarget.memberName} (${payTarget.memberCode})`} />
              <SummaryRow label="Period" value={payTarget.periodLabel} />
              <SummaryRow label="Plan" value={payTarget.planName} />
              <SummaryRow label="Fund" value={payTarget.fundName} />
              <SummaryRow label="Amount due" value={formatAmount(payTarget.amount)} emphasis />
            </dl>

            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Payment method"
                required
                options={paymentMethods}
                value={payForm.paymentMethod}
                onChange={(event) => setPayForm({ ...payForm, paymentMethod: event.target.value })}
              />
              <TextField label="Date collected" type="date" required value={payForm.paidDate} onChange={(event) => setPayForm({ ...payForm, paidDate: event.target.value })} />
            </div>

            <TextAreaField
              label="Notes"
              hint="Who handed it over, or why the amount differs from the plan."
              value={payForm.notes}
              onChange={(event) => setPayForm({ ...payForm, notes: event.target.value })}
            />

            <InlineNotice icon="shield">
              Recording the payment does not issue the receipt. A second person verifies the collection first, exactly as with
              donations.
            </InlineNotice>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
