import type {
  ContributionPlanStatus,
  ContributionStatus,
  DonationStatus,
  ExpenseStatus,
  FundStatus,
  MetricTone,
  ReceiptStatus,
  RecurringStatus,
  SalaryStatus,
  StaffStatus,
  TransactionStatus,
  TransactionType,
} from "@/lib/finance/types";

/**
 * Six tones cover every financial state in the module. Each tone carries a text colour,
 * a tint and a border so a badge never relies on colour alone — the label and the leading
 * dot always say what the state is.
 */
export type Tone = "success" | "pending" | "danger" | "neutral" | "info" | "gold";

export const toneBadgeClass: Record<Tone, string> = {
  success: "border-[#c2d8cb] bg-[#eaf2ed] text-[#0b4634]",
  pending: "border-[#e6d3a6] bg-[#faf2e0] text-[#835811]",
  danger: "border-[#ebc8c4] bg-[#fbeceb] text-[#94291f]",
  neutral: "border-[#dcdacd] bg-[#f2f1ea] text-[#565f59]",
  info: "border-[#c5dae2] bg-[#ebf2f5] text-[#1d5265]",
  gold: "border-[#e3ce9d] bg-[#f7f0df] text-[#7d5f18]",
};

export const toneDotClass: Record<Tone, string> = {
  success: "bg-[#0d4d3b]",
  pending: "bg-[#c79a45]",
  danger: "bg-[#a13228]",
  neutral: "bg-[#8b938d]",
  info: "bg-[#2c6b80]",
  gold: "bg-[#c79a45]",
};

export const toneTextClass: Record<Tone, string> = {
  success: "text-[#0b4634]",
  pending: "text-[#835811]",
  danger: "text-[#94291f]",
  neutral: "text-[#565f59]",
  info: "text-[#1d5265]",
  gold: "text-[#7d5f18]",
};

export const metricToneClass: Record<MetricTone, { value: string; icon: string }> = {
  positive: { value: "text-[#0b4634]", icon: "border-[#c2d8cb] bg-[#eaf2ed] text-[#0d4d3b]" },
  negative: { value: "text-[#94291f]", icon: "border-[#ebc8c4] bg-[#fbeceb] text-[#a13228]" },
  neutral: { value: "text-[#17211d]", icon: "border-[#dcdacd] bg-[#f2f1ea] text-[#565f59]" },
  warning: { value: "text-[#835811]", icon: "border-[#e6d3a6] bg-[#faf2e0] text-[#a97b23]" },
  gold: { value: "text-[#17211d]", icon: "border-[#e3ce9d] bg-[#f7f0df] text-[#a97b23]" },
};

export const transactionStatusTone: Record<string, Tone> = {
  Pending: "pending",
  Completed: "success",
  Approved: "info",
  Rejected: "danger",
  Cancelled: "neutral",
  pending: "pending",
  completed: "success",
  approved: "info",
  rejected: "danger",
  cancelled: "neutral",
  voided: "danger",
};

export const transactionTypeTone: Record<string, Tone> = {
  Income: "success",
  Expense: "danger",
  Transfer: "info",
  income: "success",
  expense: "danger",
  transfer: "info",
};

export const donationStatusTone: Record<string, Tone> = {
  Recorded: "pending",
  Verified: "success",
  Voided: "danger",
  pending: "pending",
  completed: "success",
  cancelled: "danger",
  failed: "danger",
};

export const contributionStatusTone: Record<ContributionStatus, Tone> = {
  Paid: "success",
  Pending: "pending",
  Overdue: "danger",
  Skipped: "neutral",
};

export const contributionPlanStatusTone: Record<ContributionPlanStatus, Tone> = {
  Active: "success",
  Paused: "pending",
  Completed: "info",
  Cancelled: "neutral",
};

export const expenseStatusTone: Record<string, Tone> = {
  Draft: "neutral",
  "Pending Approval": "pending",
  Approved: "info",
  Rejected: "danger",
  Paid: "success",
  pending: "pending",
  approved: "info",
  paid: "success",
  cancelled: "danger",
};

export const salaryStatusTone: Record<string, Tone> = {
  Pending: "pending",
  Approved: "info",
  Paid: "success",
  Failed: "danger",
  pending: "pending",
  paid: "success",
  cancelled: "danger",
};

export const staffStatusTone: Record<string, Tone> = {
  Active: "success",
  "On Leave": "pending",
  Inactive: "neutral",
  active: "success",
  on_leave: "pending",
  inactive: "neutral",
};

export const fundStatusTone: Record<string, Tone> = {
  Active: "success",
  Inactive: "neutral",
  active: "success",
  inactive: "neutral",
  completed: "info",
  archived: "neutral",
};

export const budgetStatusTone: Record<string, Tone> = {
  Draft: "neutral",
  Active: "success",
  Closed: "neutral",
  Cancelled: "danger",
  draft: "neutral",
  active: "success",
  closed: "neutral",
  cancelled: "danger",
};

export const campaignStatusTone: Record<string, Tone> = {
  draft: "neutral",
  active: "success",
  completed: "info",
  cancelled: "danger",
  archived: "neutral",
};

export const recurringStatusTone: Record<string, Tone> = {
  Active: "success",
  Paused: "pending",
  Completed: "info",
  Cancelled: "neutral",
  active: "success",
  paused: "pending",
  completed: "info",
  cancelled: "neutral",
};

export const receiptStatusTone: Record<string, Tone> = {
  Issued: "success",
  Void: "danger",
  issued: "success",
  voided: "danger",
};

/** Approval pipelines rendered by <WorkflowSteps />. */
export const expenseWorkflow: ExpenseStatus[] = ["Draft", "Pending Approval", "Approved", "Paid"];
export const salaryWorkflow: SalaryStatus[] = ["Pending", "Approved", "Paid"];

/**
 * Donations have their own two-step pipeline (spec 0005), not the expense one. `Voided` is not a
 * step — it is the terminal state a donation can drop to from either step, so it is passed to
 * <WorkflowSteps /> as `terminal` rather than living in this array.
 */
export const donationWorkflow: DonationStatus[] = ["Recorded", "Verified"];
