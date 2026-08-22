import type { ReactNode } from "react";
import {
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

export function TransactionStatusBadge({ status }: { status: TransactionStatus }) {
  return <Badge tone={transactionStatusTone[status]}>{status}</Badge>;
}

export function TransactionTypeBadge({ type }: { type: TransactionType }) {
  return (
    <Badge tone={transactionTypeTone[type]} dot={false}>
      {type}
    </Badge>
  );
}

export function DonationStatusBadge({ status }: { status: DonationStatus }) {
  return <Badge tone={donationStatusTone[status]}>{status}</Badge>;
}

export function ContributionStatusBadge({ status }: { status: ContributionStatus }) {
  return <Badge tone={contributionStatusTone[status]}>{status}</Badge>;
}

export function ContributionPlanStatusBadge({ status }: { status: ContributionPlanStatus }) {
  return <Badge tone={contributionPlanStatusTone[status]}>{status}</Badge>;
}

export function ExpenseStatusBadge({ status }: { status: ExpenseStatus }) {
  return <Badge tone={expenseStatusTone[status]}>{status}</Badge>;
}

export function SalaryStatusBadge({ status }: { status: SalaryStatus }) {
  return <Badge tone={salaryStatusTone[status]}>{status}</Badge>;
}

export function StaffStatusBadge({ status }: { status: StaffStatus }) {
  return <Badge tone={staffStatusTone[status]}>{status}</Badge>;
}

export function FundStatusBadge({ status }: { status: FundStatus }) {
  return <Badge tone={fundStatusTone[status]}>{status}</Badge>;
}

export function RecurringStatusBadge({ status }: { status: RecurringStatus }) {
  return <Badge tone={recurringStatusTone[status]}>{status}</Badge>;
}

export function ReceiptStatusBadge({ status }: { status: ReceiptStatus }) {
  return <Badge tone={receiptStatusTone[status]}>{status}</Badge>;
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
