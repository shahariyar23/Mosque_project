// Domain types for the mosque finance module.
// Shapes are written to match the Express API responses that will replace the mock data later,
// so every list type is a flat, serialisable row with denormalised display fields.

export type Amount = number;

export type PaymentMethod = "Cash" | "Bank Transfer" | "Mobile Banking" | "Card" | "Online Payment" | "Other";

export const paymentMethods: PaymentMethod[] = ["Cash", "Bank Transfer", "Mobile Banking", "Card", "Online Payment", "Other"];

/* ---------------------------------- funds --------------------------------- */

export type FundStatus = "Active" | "Inactive";
export type FundPurpose = "Operations" | "Salary" | "Maintenance" | "Education" | "Construction" | "Zakat" | "Seasonal" | "Welfare";

export const fundPurposes: FundPurpose[] = ["Operations", "Salary", "Maintenance", "Education", "Construction", "Zakat", "Seasonal", "Welfare"];

export type Fund = {
  id: string;
  slug: string;
  name: string;
  purpose: FundPurpose;
  description: string;
  openingBalance: Amount;
  collected: Amount;
  spent: Amount;
  balance: Amount;
  targetAmount?: Amount;
  status: FundStatus;
  updatedAt: string;
};

/* ------------------------------- transactions ------------------------------ */

export type TransactionType = "Income" | "Expense" | "Transfer";
export type TransactionStatus = "Pending" | "Completed" | "Approved" | "Rejected" | "Cancelled";

export const transactionTypes: TransactionType[] = ["Income", "Expense", "Transfer"];
export const transactionStatuses: TransactionStatus[] = ["Pending", "Completed", "Approved", "Rejected", "Cancelled"];

/** Income is never called a "fee" — these are the accounting sources the mosque recognises. */
export type IncomeSource = "Donation" | "Monthly Contribution" | "Zakat" | "Sadaqah" | "Rent Income" | "Other Income";

export const incomeSources: IncomeSource[] = ["Donation", "Monthly Contribution", "Zakat", "Sadaqah", "Rent Income", "Other Income"];

export type Transaction = {
  id: string;
  date: string;
  type: TransactionType;
  category: string;
  description: string;
  fundId: string;
  fundName: string;
  toFundId?: string;
  toFundName?: string;
  paymentMethod: PaymentMethod;
  amount: Amount;
  status: TransactionStatus;
  reference?: string;
  receiptNo?: string;
  createdBy: string;
  createdByRole: string;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
};

/* -------------------------------- donations ------------------------------- */

export type DonationStatus = "Pending" | "Completed" | "Refunded" | "Cancelled";
export type DonationKind = "General" | "Zakat" | "Sadaqah" | "Fitrah" | "Qurbani" | "Sponsorship";

export const donationStatuses: DonationStatus[] = ["Pending", "Completed", "Refunded", "Cancelled"];
export const donationKinds: DonationKind[] = ["General", "Zakat", "Sadaqah", "Fitrah", "Qurbani", "Sponsorship"];

export type Donation = {
  id: string;
  donorName: string;
  donorPhone?: string;
  anonymous: boolean;
  memberId?: string;
  amount: Amount;
  kind: DonationKind;
  fundId: string;
  fundName: string;
  paymentMethod: PaymentMethod;
  date: string;
  receiptNo?: string;
  status: DonationStatus;
  transactionId?: string;
  recordedBy: string;
  notes?: string;
};

/* ------------------------ monthly member contributions -------------------- */

export type ContributionStatus = "Paid" | "Pending" | "Overdue" | "Skipped";
export type ContributionFrequency = "Monthly" | "Quarterly" | "Yearly";
export type ContributionPlanStatus = "Active" | "Paused" | "Completed" | "Cancelled";

export const contributionStatuses: ContributionStatus[] = ["Paid", "Pending", "Overdue", "Skipped"];
export const contributionFrequencies: ContributionFrequency[] = ["Monthly", "Quarterly", "Yearly"];

export type ContributionPlan = {
  id: string;
  name: string;
  description: string;
  amount: Amount;
  frequency: ContributionFrequency;
  fundId: string;
  fundName: string;
  memberCount: number;
  status: ContributionPlanStatus;
};

export type MemberContribution = {
  id: string;
  memberId: string;
  memberCode: string;
  memberName: string;
  planId: string;
  planName: string;
  amount: Amount;
  fundId: string;
  fundName: string;
  period: string;
  periodLabel: string;
  dueDate: string;
  paidDate?: string;
  paymentMethod?: PaymentMethod;
  receiptNo?: string;
  status: ContributionStatus;
  collectedBy?: string;
};

export type ContributionPeriod = {
  period: string;
  label: string;
  amount: Amount;
  status: ContributionStatus;
  paidDate?: string;
  paymentMethod?: PaymentMethod;
  receiptNo?: string;
};

export type MemberContributionProfile = {
  memberId: string;
  memberCode: string;
  memberName: string;
  phone: string;
  joinedAt: string;
  planId: string;
  planName: string;
  amount: Amount;
  frequency: ContributionFrequency;
  fundId: string;
  fundName: string;
  status: ContributionPlanStatus;
  totalPaid: Amount;
  outstanding: Amount;
  history: ContributionPeriod[];
};

/* -------------------------------- expenses -------------------------------- */

export type ExpenseCategory =
  | "Salary"
  | "Electricity"
  | "Water"
  | "Internet"
  | "Cleaning"
  | "Maintenance"
  | "Events"
  | "Education"
  | "Office"
  | "Other";

export type ExpenseStatus = "Draft" | "Pending Approval" | "Approved" | "Rejected" | "Paid";

export const expenseCategories: ExpenseCategory[] = [
  "Salary",
  "Electricity",
  "Water",
  "Internet",
  "Cleaning",
  "Maintenance",
  "Events",
  "Education",
  "Office",
  "Other",
];

export const expenseStatuses: ExpenseStatus[] = ["Draft", "Pending Approval", "Approved", "Rejected", "Paid"];

export type Expense = {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  fundId: string;
  fundName: string;
  amount: Amount;
  paymentMethod: PaymentMethod;
  vendor?: string;
  reference?: string;
  attachmentName?: string;
  notes?: string;
  submittedBy: string;
  submittedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  status: ExpenseStatus;
  requiresApproval: boolean;
};

/* --------------------------- staff & salaries ----------------------------- */

export type StaffPosition = "Imam" | "Muazzin" | "Teacher" | "Caretaker" | "Cleaner" | "Other Staff";
export type StaffStatus = "Active" | "On Leave" | "Inactive";
export type SalaryStatus = "Pending" | "Approved" | "Paid" | "Failed";

export const staffPositions: StaffPosition[] = ["Imam", "Muazzin", "Teacher", "Caretaker", "Cleaner", "Other Staff"];
export const salaryStatuses: SalaryStatus[] = ["Pending", "Approved", "Paid", "Failed"];

export type StaffMember = {
  id: string;
  name: string;
  position: StaffPosition;
  monthlySalary: Amount;
  frequency: "Monthly" | "Quarterly";
  fundId: string;
  fundName: string;
  paymentMethod: PaymentMethod;
  status: StaffStatus;
  joinedAt: string;
  phone: string;
};

export type SalaryPayment = {
  id: string;
  staffId: string;
  staffName: string;
  position: StaffPosition;
  period: string;
  periodLabel: string;
  amount: Amount;
  fundId: string;
  fundName: string;
  paymentDate?: string;
  paymentMethod: PaymentMethod;
  status: SalaryStatus;
  receiptNo?: string;
  submittedBy: string;
  submittedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
};

/* -------------------------- recurring contributions ----------------------- */

export type RecurringStatus = "Active" | "Paused" | "Completed" | "Cancelled";

export const recurringStatuses: RecurringStatus[] = ["Active", "Paused", "Completed", "Cancelled"];

export type RecurringContribution = {
  id: string;
  memberId: string;
  memberCode: string;
  memberName: string;
  amount: Amount;
  frequency: ContributionFrequency;
  startDate: string;
  endDate?: string;
  fundId: string;
  fundName: string;
  nextDueDate: string;
  lastPaidDate?: string;
  paymentMethod: PaymentMethod;
  status: RecurringStatus;
  paymentsMade: number;
  totalPaid: Amount;
};

/* -------------------------------- receipts -------------------------------- */

export type ReceiptSource = "Donation" | "Monthly Contribution" | "Salary Payment" | "Other Income";
export type ReceiptStatus = "Issued" | "Void";

export const receiptSources: ReceiptSource[] = ["Donation", "Monthly Contribution", "Salary Payment", "Other Income"];

export type Receipt = {
  id: string;
  transactionId: string;
  source: ReceiptSource;
  payerName: string;
  payerRef?: string;
  memberId?: string;
  staffId?: string;
  amount: Amount;
  fundId: string;
  fundName: string;
  paymentMethod: PaymentMethod;
  date: string;
  generatedBy: string;
  status: ReceiptStatus;
  note?: string;
};

/* --------------------------------- reports -------------------------------- */

export type ReportCategory = "Statements" | "Income" | "Spending" | "People";

export type ReportDefinition = {
  id: string;
  name: string;
  description: string;
  category: ReportCategory;
  icon: string;
  lastGenerated?: string;
  rangeHint: string;
};

export type GeneratedReport = {
  id: string;
  name: string;
  reportId: string;
  range: string;
  generatedAt: string;
  generatedBy: string;
  format: "PDF" | "Excel" | "CSV";
  size: string;
};

export type ReportRow = {
  label: string;
  income?: Amount;
  expense?: Amount;
  net?: Amount;
  note?: string;
};

/* -------------------------------- overview -------------------------------- */

export type MetricTone = "positive" | "negative" | "neutral" | "warning" | "gold";

export type ChangeDirection = "up" | "down" | "flat";

export type SummaryMetric = {
  id: string;
  label: string;
  amount: Amount;
  hint: string;
  tone: MetricTone;
  icon: string;
  change?: {
    value: number;
    direction: ChangeDirection;
    label: string;
  };
};

export type FlowPoint = {
  period: string;
  label: string;
  income: Amount;
  expense: Amount;
};

export type FlowLine = {
  label: string;
  amount: Amount;
  hint?: string;
};

export type DateRangeKey = "this-month" | "last-month" | "this-year" | "custom";

export type ChartGrouping = "monthly" | "quarterly" | "yearly";
