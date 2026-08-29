"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  createContributionEnrollment,
  createContributionPlan,
  fetchContributionDue,
  fetchContributionMembers,
  fetchContributionPlans,
  fetchContributionSummary,
  recordContributionPayment,
  updateContributionPlanStatus,
  type ContributionFrequency,
  type ContributionMemberItem,
  type ContributionPeriod,
  type ContributionPlan,
  type ContributionSummary,
} from "@/services/contributionsService";
import { fetchDonationFunds, type DonationFund } from "@/services/donationFundsService";
import { fetchUsers, type User } from "@/services/userService";
import {
  formatAmount,
  formatCollectionRate,
  formatDate,
  formatMonth,
} from "@/lib/finance/format";
import type { PaymentMethod } from "@/services/enums";

const PAYMENT_METHOD_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "online", label: "Mobile Banking / Online" },
  { value: "other", label: "Other" },
];

/**
 * Generates rolling period options (current month + past 5 months).
 */
function generatePeriodOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth() - i, 1));
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const value = `${year}-${month}`;
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
    options.push({ value, label, year, month: d.getUTCMonth() + 1 });
  }
  return options;
}

const PERIOD_OPTIONS = generatePeriodOptions();
const CURRENT_PERIOD = PERIOD_OPTIONS[0].value;

type PayForm = {
  amount: string;
  paymentMethod: PaymentMethod;
  paidDate: string;
  reference: string;
  notes: string;
};

const emptyPayForm: PayForm = {
  amount: "",
  paymentMethod: "cash",
  paidDate: new Date().toISOString().split("T")[0],
  reference: "",
  notes: "",
};

type CreatePlanForm = {
  name: string;
  description: string;
  amount: string;
  frequency: ContributionFrequency;
  fundId: string;
};

const emptyCreatePlanForm: CreatePlanForm = {
  name: "",
  description: "",
  amount: "500.00",
  frequency: "monthly",
  fundId: "",
};

type EnrollForm = {
  userId: string;
  planId: string;
  amount: string;
  frequency: ContributionFrequency;
  startDate: string;
};

const emptyEnrollForm: EnrollForm = {
  userId: "",
  planId: "",
  amount: "",
  frequency: "monthly",
  startDate: new Date().toISOString().split("T")[0],
};

export function ContributionsView() {
  const { can } = useDashboardSession();

  const [period, setPeriod] = useState(CURRENT_PERIOD);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [planId, setPlanId] = useState("all");
  const [page, setPage] = useState(1);

  // Live Data States
  const [summary, setSummary] = useState<ContributionSummary | null>(null);
  const [plans, setPlans] = useState<ContributionPlan[]>([]);
  const [dues, setDues] = useState<ContributionPeriod[]>([]);
  const [dueMeta, setDueMeta] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [members, setMembers] = useState<ContributionMemberItem[]>([]);
  const [funds, setFunds] = useState<DonationFund[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals
  const [selectedMember, setSelectedMember] = useState<ContributionMemberItem | null>(null);
  const [payTarget, setPayTarget] = useState<ContributionPeriod | null>(null);
  const [payForm, setPayForm] = useState<PayForm>(emptyPayForm);

  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);
  const [createPlanForm, setCreatePlanForm] = useState<CreatePlanForm>(emptyCreatePlanForm);

  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [enrollForm, setEnrollForm] = useState<EnrollForm>(emptyEnrollForm);

  // Parse current selected period dates
  const currentPeriodMeta = useMemo(() => {
    const [y, m] = period.split("-").map(Number);
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return {
      year: y,
      month: m,
      from: `${period}-01`,
      to: `${period}-${String(lastDay).padStart(2, "0")}`,
    };
  }, [period]);

  // Load live data from backend
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [summaryRes, plansRes, duesRes, membersRes, fundsRes] = await Promise.all([
        fetchContributionSummary({
          month: currentPeriodMeta.month,
          year: currentPeriodMeta.year,
          planId: planId !== "all" ? planId : undefined,
        }),
        fetchContributionPlans({ limit: 50 }),
        fetchContributionDue({
          from: currentPeriodMeta.from,
          to: currentPeriodMeta.to,
          planId: planId !== "all" ? planId : undefined,
          status: status !== "all" ? status : undefined,
          search: search.trim() || undefined,
          page,
          limit: 12,
        }),
        fetchContributionMembers({
          month: currentPeriodMeta.month,
          year: currentPeriodMeta.year,
          planId: planId !== "all" ? planId : undefined,
          limit: 100,
        }),
        fetchDonationFunds({ limit: 50 }),
      ]);

      setSummary(summaryRes);
      setPlans(plansRes.rows);
      setDues(duesRes.rows);
      setDueMeta(duesRes.meta);
      setMembers(membersRes.rows);
      setFunds(fundsRes.rows);
    } catch (err: any) {
      setError(err?.message || "Failed to load contribution data from the server.");
    } finally {
      setIsLoading(false);
    }
  }, [currentPeriodMeta, planId, status, search, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load users list for enrollment
  useEffect(() => {
    if (isEnrollModalOpen && usersList.length === 0) {
      fetchUsers({ limit: 100 })
        .then((res) => setUsersList(res.rows))
        .catch(() => {});
    }
  }, [isEnrollModalOpen, usersList.length]);

  const activeCount = [status !== "all", planId !== "all"].filter(Boolean).length;

  const resetFilters = () => {
    setStatus("all");
    setPlanId("all");
    setSearch("");
    setPage(1);
  };

  const planFilterOptions = useMemo(() => {
    return [{ value: "all", label: "All plans" }, ...plans.map((p) => ({ value: p.id, label: p.name }))];
  }, [plans]);

  const statusFilterOptions = [
    { value: "all", label: "All states" },
    { value: "paid", label: "Paid" },
    { value: "partial", label: "Partial" },
    { value: "pending", label: "Pending" },
    { value: "overdue", label: "Overdue" },
    { value: "waived", label: "Waived" },
  ];

  const filters: SelectFilter[] = [
    { id: "status", label: "State", value: status, options: statusFilterOptions, onChange: (value) => { setStatus(value); setPage(1); } },
    { id: "plan", label: "Plan", value: planId, options: planFilterOptions, onChange: (value) => { setPlanId(value); setPage(1); } },
  ];

  // Calculations from backend summary
  const expected = summary ? Number(summary.expectedAmount) : 0;
  const collected = summary ? Number(summary.collectedAmount) : 0;
  const outstanding = summary ? Number(summary.outstandingAmount) : 0;
  const overdueCount = summary ? summary.overdueCount : 0;
  const enrolledCount = summary ? summary.enrolledMembers : members.length;
  const paidCount = summary ? summary.paidMembers : 0;

  // Open profile modal
  const openMemberProfile = (userId: string) => {
    const found = members.find((m) => m.id === userId);
    if (found) {
      setSelectedMember(found);
    }
  };

  // Columns for Member Due Register
  const columns: Column<ContributionPeriod>[] = [
    {
      key: "member",
      header: "Member",
      cell: (row) => (
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => openMemberProfile(row.userId)}
            className="rounded text-left font-medium text-[#17211d] underline-offset-2 transition-colors hover:text-[#0d4d3b] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
          >
            {row.user?.fullName || "Member"}
          </button>
          <p className="mt-0.5 text-[12px] text-[#8b938d]">{row.user?.email || row.user?.phone || "—"}</p>
        </div>
      ),
      sortValue: (row) => row.user?.fullName ?? "",
    },
    {
      key: "plan",
      header: "Plan",
      cell: (row) => <Chip>{row.plan?.name || "Plan"}</Chip>,
      sortValue: (row) => row.plan?.name ?? "",
    },
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
        row.paidAt ? (
          <span className="whitespace-nowrap text-[13px] tabular-nums">
            {formatDate(row.paidAt)}
            <span className="block text-[12px] text-[#8b938d]">
              {formatAmount(Number(row.paidAmount))} / {formatAmount(Number(row.expectedAmount))}
            </span>
          </span>
        ) : (
          <span className="text-[12px] text-[#9aa19c]">Not yet</span>
        ),
      sortValue: (row) => row.paidAt ?? "",
      secondary: true,
    },
    {
      key: "receipt",
      header: "Transaction Ref",
      cell: (row) =>
        row.transaction?.reference ? (
          <span className="font-mono text-[12px] text-[#3d453f]">{row.transaction.reference}</span>
        ) : (
          <span className="text-[12px] text-[#9aa19c]">—</span>
        ),
      secondary: true,
    },
    {
      key: "amount",
      header: "Expected",
      align: "right",
      cell: (row) => <Money value={Number(row.expectedAmount)} />,
      sortValue: (row) => Number(row.expectedAmount),
    },
    {
      key: "status",
      header: "State",
      cell: (row) => <ContributionStatusBadge status={row.status} />,
      sortValue: (row) => row.status,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-2">
          {row.status !== "paid" && row.status !== "waived" && can("contribution.record") ? (
            <Button
              size="sm"
              icon="check"
              onClick={() => {
                const remaining = Math.max(0, Number(row.expectedAmount) - Number(row.paidAmount));
                setPayForm({
                  ...emptyPayForm,
                  amount: remaining.toFixed(2),
                });
                setPayTarget(row);
              }}
            >
              Record payment
            </Button>
          ) : null}
          <IconButton icon="eye" label={`Open ${row.user?.fullName || "member"}'s record`} onClick={() => openMemberProfile(row.userId)} />
        </div>
      ),
    },
  ];

  // Submit Payment Handler
  const submitPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!payTarget) return;

    setIsSubmitting(true);
    try {
      const res = await recordContributionPayment(payTarget.id, {
        amount: payForm.amount || undefined,
        paymentMethod: payForm.paymentMethod,
        paymentDate: payForm.paidDate ? new Date(payForm.paidDate).toISOString() : undefined,
        reference: payForm.reference.trim() || undefined,
        notes: payForm.notes.trim() || undefined,
      });

      setNotice(
        `Payment recorded successfully: ${formatAmount(Number(res.transaction.amount))} received for ${payTarget.plan.name} (${payTarget.user.fullName}). Ledger transaction created.`,
      );
      setPayTarget(null);
      await loadData();
    } catch (err: any) {
      setNotice(`Error recording payment: ${err?.message || "Failed to process payment."}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Create Plan
  const submitCreatePlan = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await createContributionPlan({
        name: createPlanForm.name.trim(),
        description: createPlanForm.description.trim() || null,
        amount: createPlanForm.amount,
        frequency: createPlanForm.frequency,
        fundId: createPlanForm.fundId || null,
        isActive: true,
      });

      setNotice(`Contribution plan "${createPlanForm.name}" created successfully.`);
      setCreatePlanForm(emptyCreatePlanForm);
      setIsPlansModalOpen(false);
      await loadData();
    } catch (err: any) {
      setNotice(`Error creating plan: ${err?.message || "Failed to create plan."}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Plan Status
  const togglePlanStatus = async (plan: ContributionPlan) => {
    setIsSubmitting(true);
    try {
      await updateContributionPlanStatus(plan.id, !plan.isActive);
      setNotice(`Plan "${plan.name}" is now ${!plan.isActive ? "Active" : "Paused"}.`);
      await loadData();
    } catch (err: any) {
      setNotice(`Failed to update plan status: ${err?.message || "Error occurred."}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Member Enrollment
  const submitEnrollment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!enrollForm.userId || !enrollForm.planId) return;

    setIsSubmitting(true);
    try {
      await createContributionEnrollment({
        userId: enrollForm.userId,
        planId: enrollForm.planId,
        amount: enrollForm.amount || undefined,
        frequency: enrollForm.frequency,
        startDate: enrollForm.startDate ? new Date(enrollForm.startDate).toISOString() : undefined,
      });

      setNotice("Member successfully enrolled in recurring contribution plan.");
      setEnrollForm(emptyEnrollForm);
      setIsEnrollModalOpen(false);
      await loadData();
    } catch (err: any) {
      setNotice(`Error enrolling member: ${err?.message || "Failed to enroll."}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {notice ? (
        <InlineNotice tone="gold" icon="info">
          {notice}
        </InlineNotice>
      ) : null}

      {error ? (
        <InlineNotice tone="danger" icon="alert">
          <div className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <Button size="sm" variant="secondary" onClick={loadData}>
              Retry
            </Button>
          </div>
        </InlineNotice>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <SegmentedControl
          label="Period"
          value={period}
          onChange={(newPeriod) => {
            setPeriod(newPeriod);
            setPage(1);
          }}
          options={PERIOD_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
        <div className="flex items-center gap-3">
          <p className="text-[12.5px] text-[#69726d]">
            {enrolledCount} members enrolled in <span className="font-semibold text-[#3d453f]">{formatMonth(period)}</span>
          </p>
          {can("contribution.manage") ? (
            <Button size="sm" icon="plus" onClick={() => setIsEnrollModalOpen(true)}>
              Enroll Member
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat label="Expected" value={formatAmount(expected)} hint={`${enrolledCount} active members`} icon="scale" />
        <MiniStat label="Collected" value={formatAmount(collected)} hint={`${paidCount} members paid`} icon="check-circle" tone="positive" />
        <MiniStat label="Outstanding" value={formatAmount(outstanding)} hint={`${Math.max(0, enrolledCount - paidCount)} to follow up`} icon="clock" tone="warning" />
        <MiniStat
          label="Overdue"
          value={String(overdueCount)}
          hint={overdueCount === 0 ? "Nobody has passed the due date" : `${overdueCount} periods overdue`}
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
              <Button size="sm" variant="secondary" icon="settings" onClick={() => setIsPlansModalOpen(true)}>
                Manage Plans
              </Button>
            ) : null
          }
        />
        <PanelBody>
          {plans.length === 0 && !isLoading ? (
            <FinanceEmptyState icon="repeat" title="No Contribution Plans" description="Create a recurring contribution plan template for your community." />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {plans.map((plan) => (
                <li key={plan.id} className="rounded-lg border border-[#e2e1d6] bg-[#fbfaf5] p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13.5px] font-semibold text-[#17211d]">{plan.name}</p>
                      <ContributionPlanStatusBadge status={plan.isActive ? "Active" : "Paused"} />
                    </div>
                    <p className="mt-2 text-[19px] font-semibold tabular-nums text-[#0b4634]">{formatAmount(Number(plan.amount))}</p>
                    <p className="text-[12px] text-[#69726d]">{plan.frequency}, into {plan.fund?.name || "General Fund"}</p>
                    <p className="mt-2.5 text-[12px] leading-5 text-[#69726d]">{plan.description || "Recurring community contribution."}</p>
                  </div>
                  {can("contribution.manage") ? (
                    <div className="mt-4 pt-3 border-t border-[#eceae0] flex items-center justify-between">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => togglePlanStatus(plan)}
                        disabled={isSubmitting}
                      >
                        {plan.isActive ? "Pause Plan" : "Activate Plan"}
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </PanelBody>
        <PanelFooter>
          <p className="text-[12px] text-[#69726d]">
            A member sits on one plan at a time. Changing a plan changes what is expected from next period, never what is already recorded.
          </p>
        </PanelFooter>
      </Panel>

      {/* ---- Collection & Unpaid Follow Up ---- */}
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
                max={Math.max(expected, 1)}
                tone="success"
                label={`${formatCollectionRate(collected, expected)} collected for ${formatMonth(period)}`}
                showValue
              />
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.08em] text-[#8b938d]">Enrollment Overview</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-[#e2e1d6] bg-[#faf9f4] p-3.5">
                  <p className="text-[12px] text-[#69726d]">Paid Members</p>
                  <p className="text-[18px] font-semibold text-[#0b4634]">{paidCount} of {enrolledCount}</p>
                  <p className="text-[11px] text-[#8b938d]">Settled their full contribution</p>
                </div>
                <div className="rounded-lg border border-[#e2e1d6] bg-[#faf9f4] p-3.5">
                  <p className="text-[12px] text-[#69726d]">Pending / Overdue</p>
                  <p className="text-[18px] font-semibold text-[#a13228]">{Math.max(0, enrolledCount - paidCount)}</p>
                  <p className="text-[11px] text-[#8b938d]">Awaiting collection</p>
                </div>
              </div>
            </div>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Who to follow up" description="Unpaid in this period, largest first" icon="users" />
          {dues.filter((row) => row.status !== "paid" && row.status !== "waived").length === 0 && !isLoading ? (
            <PanelBody>
              <FinanceEmptyState icon="check-circle" title="Everybody has paid" description="Nothing outstanding for this period." />
            </PanelBody>
          ) : (
            <ul className="divide-y divide-[#f0efe6]">
              {dues
                .filter((row) => row.status !== "paid" && row.status !== "waived")
                .sort((a, b) => Number(b.expectedAmount) - Number(a.expectedAmount))
                .slice(0, 6)
                .map((row) => (
                  <li key={row.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => openMemberProfile(row.userId)}
                        className="block truncate rounded text-left text-[13.5px] font-semibold text-[#17211d] underline-offset-2 hover:text-[#0d4d3b] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
                      >
                        {row.user?.fullName || "Member"}
                      </button>
                      <p className="mt-0.5 text-[12px] text-[#8b938d]">
                        {row.plan?.name} · due {formatDate(row.dueDate)}
                      </p>
                    </div>
                    <p className="shrink-0 text-[13.5px] font-semibold tabular-nums text-[#17211d]">
                      {formatAmount(Number(row.expectedAmount) - Number(row.paidAmount))}
                    </p>
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
          search={{
            value: search,
            onChange: (val) => {
              setSearch(val);
              setPage(1);
            },
            placeholder: "Search member, email, phone…",
            label: "Search the register",
          }}
          filters={filters}
          activeCount={activeCount}
          onReset={resetFilters}
        />
        <DataTable
          rows={dues}
          columns={columns}
          getRowKey={(row) => row.id}
          caption={`Member contributions for ${formatMonth(period)}`}
          initialSort={{ key: "status", direction: "asc" }}
          serverPage={{
            page: dueMeta.page,
            pageSize: dueMeta.limit,
            total: dueMeta.total,
            totalPages: dueMeta.totalPages,
            onPageChange: (p) => setPage(p),
          }}
          emptyState={
            <FinanceEmptyState
              icon="search"
              title="No records found"
              description="Clear a filter, or choose another period."
              action={
                activeCount > 0 ? (
                  <Button variant="secondary" size="sm" icon="close" onClick={resetFilters}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          }
          mobileTitle={(row) => row.user?.fullName || "Member"}
          mobileSubtitle={(row) => `${row.plan?.name} · due ${formatDate(row.dueDate)}`}
          mobileTrailing={(row) => <Money value={Number(row.expectedAmount)} />}
          mobileHiddenKeys={["member", "amount"]}
        />
      </Panel>

      {/* ---- Member Profile Modal ---- */}
      <Modal
        open={Boolean(selectedMember)}
        onClose={() => setSelectedMember(null)}
        title={selectedMember ? selectedMember.fullName : "Member Profile"}
        description={selectedMember ? `${selectedMember.email || selectedMember.phone || "Enrolled Member"}` : undefined}
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setSelectedMember(null)}>
            Close
          </Button>
        }
      >
        {selectedMember ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <ContributionStatusBadge status={selectedMember.currentPeriodStatus} />
              {selectedMember.activePlans.map((p) => (
                <Chip key={p.id}>{p.name} ({formatAmount(Number(p.amount))})</Chip>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <MiniStat label="Pledged / Exp." value={formatAmount(Number(selectedMember.totalExpected))} hint="Cumulative Expected" icon="repeat" />
              <MiniStat label="Paid to date" value={formatAmount(Number(selectedMember.totalPaid))} hint="Across all periods" icon="check-circle" tone="positive" />
              <MiniStat
                label="Outstanding"
                value={formatAmount(Number(selectedMember.totalOutstanding))}
                hint={Number(selectedMember.totalOutstanding) === 0 ? "Nothing owed" : "Owed across periods"}
                icon="clock"
                tone={Number(selectedMember.totalOutstanding) > 0 ? "warning" : "neutral"}
              />
            </div>

            <dl className="divide-y divide-[#f0efe6] rounded-md border border-[#e2e1d6] bg-[#faf9f4] px-3.5 py-1">
              <SummaryRow label="Email" value={selectedMember.email} />
              <SummaryRow label="Phone" value={selectedMember.phone || "—"} />
              <SummaryRow label="Last Payment" value={selectedMember.lastPaymentDate ? formatDate(selectedMember.lastPaymentDate) : "No payments recorded yet"} />
            </dl>

            <InlineNotice icon="lock">
              A member&rsquo;s own history is shown here for authorized mosque leadership. Members only see their own record on their profile page.
            </InlineNotice>
          </div>
        ) : null}
      </Modal>

      {/* ---- Record Payment Modal ---- */}
      <Modal
        open={Boolean(payTarget)}
        onClose={() => setPayTarget(null)}
        title="Record a contribution payment"
        description="Records the payment and automatically deposits funds into the plan's designated fund ledger."
        footer={
          <>
            <Button variant="secondary" onClick={() => setPayTarget(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form="record-contribution" icon="check" disabled={isSubmitting}>
              {isSubmitting ? "Recording..." : "Record payment"}
            </Button>
          </>
        }
      >
        {payTarget ? (
          <form id="record-contribution" onSubmit={submitPayment} noValidate className="space-y-4">
            <dl className="divide-y divide-[#f0efe6] rounded-md border border-[#e2e1d6] bg-[#faf9f4] px-3.5 py-1">
              <SummaryRow label="Member" value={payTarget.user?.fullName || "Member"} />
              <SummaryRow label="Period" value={formatMonth(payTarget.periodStart)} />
              <SummaryRow label="Plan" value={payTarget.plan?.name} />
              <SummaryRow label="Destination Fund" value={payTarget.plan?.fund?.name || "General Fund"} />
              <SummaryRow label="Amount due" value={formatAmount(Number(payTarget.expectedAmount) - Number(payTarget.paidAmount))} emphasis />
            </dl>

            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Payment Amount"
                type="number"
                step="0.01"
                required
                value={payForm.amount}
                onChange={(event) => setPayForm({ ...payForm, amount: event.target.value })}
              />
              <SelectField
                label="Payment method"
                required
                options={PAYMENT_METHOD_OPTIONS}
                value={payForm.paymentMethod}
                onChange={(event) => setPayForm({ ...payForm, paymentMethod: event.target.value as PaymentMethod })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Date collected"
                type="date"
                required
                value={payForm.paidDate}
                onChange={(event) => setPayForm({ ...payForm, paidDate: event.target.value })}
              />
              <TextField
                label="Reference code"
                placeholder="REC-108 / Bank Ref"
                value={payForm.reference}
                onChange={(event) => setPayForm({ ...payForm, reference: event.target.value })}
              />
            </div>

            <TextAreaField
              label="Notes"
              hint="Who handed it over, or reason for partial payment."
              value={payForm.notes}
              onChange={(event) => setPayForm({ ...payForm, notes: event.target.value })}
            />

            <InlineNotice icon="shield">
              Recording this payment creates ONE completed income transaction in the financial ledger and atomically updates the fund balance.
            </InlineNotice>
          </form>
        ) : null}
      </Modal>

      {/* ---- Manage Plans Modal ---- */}
      <Modal
        open={isPlansModalOpen}
        onClose={() => setIsPlansModalOpen(false)}
        title="Create New Contribution Plan"
        description="Define a new recurring pledge template for donors."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsPlansModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form="create-plan-form" icon="plus" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Plan"}
            </Button>
          </>
        }
      >
        <form id="create-plan-form" onSubmit={submitCreatePlan} noValidate className="space-y-4">
          <TextField
            label="Plan Name"
            placeholder="e.g. Standard Monthly, Supporter Pledge"
            required
            value={createPlanForm.name}
            onChange={(event) => setCreatePlanForm({ ...createPlanForm, name: event.target.value })}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Default Amount (BDT)"
              type="number"
              step="0.01"
              required
              value={createPlanForm.amount}
              onChange={(event) => setCreatePlanForm({ ...createPlanForm, amount: event.target.value })}
            />
            <SelectField
              label="Billing Frequency"
              required
              options={[
                { value: "monthly", label: "Monthly" },
                { value: "quarterly", label: "Quarterly" },
                { value: "yearly", label: "Yearly" },
              ]}
              value={createPlanForm.frequency}
              onChange={(event) => setCreatePlanForm({ ...createPlanForm, frequency: event.target.value as ContributionFrequency })}
            />
          </div>

          <SelectField
            label="Destination Donation Fund"
            options={[
              { value: "", label: "Mosque General Fund (Default)" },
              ...funds.map((f) => ({ value: f.id, label: f.name })),
            ]}
            value={createPlanForm.fundId}
            onChange={(event) => setCreatePlanForm({ ...createPlanForm, fundId: event.target.value })}
          />

          <TextAreaField
            label="Plan Description"
            placeholder="Describe what this contribution supports..."
            value={createPlanForm.description}
            onChange={(event) => setCreatePlanForm({ ...createPlanForm, description: event.target.value })}
          />
        </form>
      </Modal>

      {/* ---- Enroll Member Modal ---- */}
      <Modal
        open={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        title="Enroll Member in Contribution Plan"
        description="Bind a member to a recurring contribution schedule."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsEnrollModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form="enroll-member-form" icon="check" disabled={isSubmitting}>
              {isSubmitting ? "Enrolling..." : "Enroll Member"}
            </Button>
          </>
        }
      >
        <form id="enroll-member-form" onSubmit={submitEnrollment} noValidate className="space-y-4">
          <SelectField
            label="Select Member / User"
            required
            options={[
              { value: "", label: "Choose a member..." },
              ...usersList.map((u) => ({ value: u.id, label: `${u.fullName} (${u.email})` })),
            ]}
            value={enrollForm.userId}
            onChange={(event) => setEnrollForm({ ...enrollForm, userId: event.target.value })}
          />

          <SelectField
            label="Select Contribution Plan"
            required
            options={[
              { value: "", label: "Choose a plan..." },
              ...plans.filter((p) => p.isActive).map((p) => ({ value: p.id, label: `${p.name} — ${formatAmount(Number(p.amount))}/${p.frequency}` })),
            ]}
            value={enrollForm.planId}
            onChange={(event) => {
              const selected = plans.find((p) => p.id === event.target.value);
              setEnrollForm({
                ...enrollForm,
                planId: event.target.value,
                amount: selected ? selected.amount : enrollForm.amount,
                frequency: selected ? selected.frequency : enrollForm.frequency,
              });
            }}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Custom Pledged Amount (Optional)"
              placeholder="Leave blank to use plan default"
              type="number"
              step="0.01"
              value={enrollForm.amount}
              onChange={(event) => setEnrollForm({ ...enrollForm, amount: event.target.value })}
            />
            <TextField
              label="Start Date"
              type="date"
              required
              value={enrollForm.startDate}
              onChange={(event) => setEnrollForm({ ...enrollForm, startDate: event.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
