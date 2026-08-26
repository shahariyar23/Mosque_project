import type { ReactNode } from "react";
import {
  budgetStatusTone,
  contributionPlanStatusTone,
  contributionStatusTone,
  donationStatusTone,
  expenseStatusTone,
  fundStatusTone,
  receiptStatusTone,
  recurringStatusTone,
  salaryStatusTone,
  staffStatusTone,
  toneBadgeClass,
  toneDotClass,
  transactionStatusTone,
  transactionTypeTone,
  type Tone,
} from "@/lib/finance/status";
import type {
  ContributionPlanStatus,
  ContributionStatus,
  DonationStatus,
  ExpenseStatus,
  FundStatus,
  ReceiptStatus,
  RecurringStatus,
  SalaryStatus,
  StaffStatus,
  TransactionStatus,
  TransactionType,
} from "@/lib/finance/types";

type BadgeProps = { tone: Tone; children: ReactNode; dot?: boolean; className?: string };

/** Status is always carried by the label, with the dot and tint as reinforcement only. */
export function Badge({ tone, children, dot = true, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[11px] font-semibold whitespace-nowrap ${toneBadgeClass[tone]} ${className}`}
    >
      {dot ? <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${toneDotClass[tone]}`} /> : null}
      {children}
    </span>
  );
}

const transactionStatusLabels: Record<string, string> = {
  pending: "Pending",
  completed: "Completed",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
  voided: "Voided",
  Pending: "Pending",
  Completed: "Completed",
  Approved: "Approved",
  Rejected: "Rejected",
  Cancelled: "Cancelled",
};

export function TransactionStatusBadge({ status }: { status: any }) {
  const tone = transactionStatusTone[status] ?? "neutral";
  const label = transactionStatusLabels[status] ?? status;
  return <Badge tone={tone}>{label}</Badge>;
}

const transactionTypeLabels: Record<string, string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
  Income: "Income",
  Expense: "Expense",
  Transfer: "Transfer",
};

export function TransactionTypeBadge({ type }: { type: any }) {
  const tone = transactionTypeTone[type] ?? "neutral";
  const label = transactionTypeLabels[type] ?? type;
  return (
    <Badge tone={tone} dot={false}>
      {label}
    </Badge>
  );
}

const donationStatusLabels: Record<string, string> = {
  pending: "Pending",
  completed: "Completed",
  cancelled: "Cancelled",
  failed: "Failed",
  Recorded: "Recorded",
  Verified: "Verified",
  Voided: "Voided",
};

export function DonationStatusBadge({ status }: { status: any }) {
  const tone = donationStatusTone[status] ?? "neutral";
  const label = donationStatusLabels[status] ?? status;
  return <Badge tone={tone}>{label}</Badge>;
}

export function ContributionStatusBadge({ status }: { status: ContributionStatus }) {
  return <Badge tone={contributionStatusTone[status]}>{status}</Badge>;
}

export function ContributionPlanStatusBadge({ status }: { status: ContributionPlanStatus }) {
  return <Badge tone={contributionPlanStatusTone[status]}>{status}</Badge>;
}

const fundStatusLabels: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  completed: "Completed",
  archived: "Archived",
};

export function FundStatusBadge({ status }: { status: any }) {
  const tone = fundStatusTone[status] ?? "neutral";
  const label = fundStatusLabels[status] ?? status;
  return <Badge tone={tone}>{label}</Badge>;
}

const expenseStatusLabels: Record<string, string> = {
  pending: "Pending Approval",
  approved: "Approved",
  paid: "Paid",
  cancelled: "Cancelled",
  draft: "Draft",
};

export function ExpenseStatusBadge({ status }: { status: any }) {
  const tone = expenseStatusTone[status] ?? "neutral";
  const label = expenseStatusLabels[status] ?? status;
  return <Badge tone={tone}>{label}</Badge>;
}

const salaryStatusLabels: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  cancelled: "Cancelled",
};

export function SalaryStatusBadge({ status }: { status: any }) {
  const tone = salaryStatusTone[status] ?? "neutral";
  const label = salaryStatusLabels[status] ?? status;
  return <Badge tone={tone}>{label}</Badge>;
}

export function RecurringStatusBadge({ status }: { status: RecurringStatus }) {
  return <Badge tone={recurringStatusTone[status]}>{status}</Badge>;
}

const budgetStatusLabels: Record<string, string> = {
  draft: "Draft",
  active: "Active",
  closed: "Closed",
  cancelled: "Cancelled",
};

export function BudgetStatusBadge({ status }: { status: any }) {
  const tone = budgetStatusTone[status] ?? "neutral";
  const label = budgetStatusLabels[status] ?? status;
  return <Badge tone={tone}>{label}</Badge>;
}

const receiptStatusLabels: Record<string, string> = {
  issued: "Issued",
  voided: "Voided",
  Issued: "Issued",
  Void: "Voided",
};

export function ReceiptStatusBadge({ status }: { status: any }) {
  const tone = receiptStatusTone[status] ?? "neutral";
  const label = receiptStatusLabels[status] ?? status;
  return <Badge tone={tone}>{label}</Badge>;
}

/** Neutral chip for categories, funds, payment methods — anything that is not a status. */
export function Chip({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border border-[#e2e1d6] bg-[#f8f7f1] px-2 py-[3px] text-[11px] font-medium text-[#4d564f] whitespace-nowrap ${className}`}
    >
      {children}
    </span>
  );
}
