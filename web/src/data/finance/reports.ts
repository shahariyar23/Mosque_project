import type { GeneratedReport, ReportCategory, ReportDefinition, ReportRow } from "@/lib/finance/types";
import type { IconName } from "@/components/finance/ui/icon";

/**
 * Mock report catalogue and a worked income statement. Swap for `GET /api/finance/reports`.
 *
 * Nothing here generates a file. Generating is a server job: the API will build the document and
 * hand back a link, because a mosque report has to be reproducible from the ledger months later,
 * which a browser assembling numbers on the fly cannot promise.
 *
 * `icon` is narrowed to `IconName` so a name outside the icon set is a compile error rather than a
 * blank square in the card grid.
 */

type ReportCard = Omit<ReportDefinition, "icon"> & { icon: IconName };

export const reportDefinitions: ReportCard[] = [
  {
    id: "RPT-INCOME-STATEMENT",
    name: "Income & Expense Statement",
    description:
      "Everything received and everything spent for a period, grouped by category, with the net result. The statement the committee reads at the monthly meeting.",
    category: "Statements",
    icon: "scale",
    lastGenerated: "2026-08-01",
    rangeHint: "Any month, quarter or year",
  },
  {
    id: "RPT-FUND-BALANCE",
    name: "Fund Balance Statement",
    description:
      "Opening balance, money in, money out and closing balance for every fund. Shows whether restricted money stayed where it was meant to.",
    category: "Statements",
    icon: "vault",
    lastGenerated: "2026-08-01",
    rangeHint: "As at any date",
  },
  {
    id: "RPT-CASH-BOOK",
    name: "Cash Book",
    description:
      "Every cash movement in date order with a running balance, for reconciling against the cash box.",
    category: "Statements",
    icon: "banknote",
    lastGenerated: "2026-08-22",
    rangeHint: "Any date range",
  },
  {
    id: "RPT-DONATION-SUMMARY",
    name: "Donation Summary",
    description:
      "Donations by kind and by fund, with donor counts. Anonymous gifts are counted but never named.",
    category: "Income",
    icon: "gift",
    lastGenerated: "2026-08-15",
    rangeHint: "Any month or year",
  },
  {
    id: "RPT-ZAKAT-DISTRIBUTION",
    name: "Zakat Collection & Distribution",
    description:
      "Zakat and Fitrah received against Zakat distributed, kept apart from general income because it may only be spent on eligible recipients.",
    category: "Income",
    icon: "coins",
    lastGenerated: "2026-04-10",
    rangeHint: "Ramadan or any year",
  },
  {
    id: "RPT-CONTRIBUTION-COLLECTION",
    name: "Contribution Collection Report",
    description:
      "Expected against collected for a period, by plan, with the collection rate and the list of members still outstanding.",
    category: "Income",
    icon: "repeat",
    lastGenerated: "2026-08-20",
    rangeHint: "Any month",
  },
  {
    id: "RPT-EXPENSE-CATEGORY",
    name: "Expense Report by Category",
    description:
      "Spending grouped by category with the period before it alongside, so a jump in a utility bill is visible.",
    category: "Spending",
    icon: "receipt-minus",
    lastGenerated: "2026-08-05",
    rangeHint: "Any month or quarter",
  },
  {
    id: "RPT-SALARY-REGISTER",
    name: "Salary Register",
    description:
      "Every salary paid for a period, by staff member, with the fund it came from and the receipt number.",
    category: "Spending",
    icon: "badge",
    lastGenerated: "2026-07-25",
    rangeHint: "Any month or year",
  },
  {
    id: "RPT-VENDOR-PAYMENTS",
    name: "Vendor Payment History",
    description:
      "What was paid to each supplier and when, for checking a quotation against what the mosque paid last time.",
    category: "Spending",
    icon: "inbox",
    rangeHint: "Any date range",
  },
  {
    id: "RPT-MEMBER-STATEMENT",
    name: "Member Contribution Statement",
    description:
      "One member's full payment history on mosque letterhead. Members ask for this for their own records.",
    category: "People",
    icon: "user",
    lastGenerated: "2026-08-18",
    rangeHint: "Per member, any period",
  },
  {
    id: "RPT-OUTSTANDING-DUES",
    name: "Outstanding Dues Report",
    description:
      "Members with unpaid periods, oldest first, with the amount owed. Meant for a quiet reminder, not a public list.",
    category: "People",
    icon: "clock",
    lastGenerated: "2026-08-21",
    rangeHint: "As at any date",
  },
  {
    id: "RPT-AUDIT-PACK",
    name: "Annual Audit Pack",
    description:
      "Statements, fund balances, the full ledger and every void with its reason, bundled for the year end audit.",
    category: "Statements",
    icon: "lock",
    lastGenerated: "2026-01-14",
    rangeHint: "Financial year",
  },
];

export const reportCategories: ReadonlyArray<{ value: ReportCategory; label: string }> = [
  { value: "Statements", label: "Statements" },
  { value: "Income", label: "Income" },
  { value: "Spending", label: "Spending" },
  { value: "People", label: "People" },
];

export function getReportDefinition(id: string): ReportCard | undefined {
  return reportDefinitions.find((report) => report.id === id);
}

/** Reports already produced and kept. The API will serve a download link for each. */
export const generatedReports: GeneratedReport[] = [
  {
    id: "GEN-00042",
    name: "Cash Book",
    reportId: "RPT-CASH-BOOK",
    range: "1 – 22 August 2026",
    generatedAt: "2026-08-22",
    generatedBy: "Rafiqul Islam",
    format: "Excel",
    size: "86 KB",
  },
  {
    id: "GEN-00041",
    name: "Outstanding Dues Report",
    reportId: "RPT-OUTSTANDING-DUES",
    range: "As at 21 August 2026",
    generatedAt: "2026-08-21",
    generatedBy: "Shahed Alam",
    format: "PDF",
    size: "142 KB",
  },
  {
    id: "GEN-00040",
    name: "Contribution Collection Report",
    reportId: "RPT-CONTRIBUTION-COLLECTION",
    range: "August 2026",
    generatedAt: "2026-08-20",
    generatedBy: "Shahed Alam",
    format: "PDF",
    size: "198 KB",
  },
  {
    id: "GEN-00039",
    name: "Member Contribution Statement",
    reportId: "RPT-MEMBER-STATEMENT",
    range: "Abdullah Rahman – 2026 to date",
    generatedAt: "2026-08-18",
    generatedBy: "Jamil Hossain",
    format: "PDF",
    size: "64 KB",
  },
  {
    id: "GEN-00038",
    name: "Donation Summary",
    reportId: "RPT-DONATION-SUMMARY",
    range: "1 – 15 August 2026",
    generatedAt: "2026-08-15",
    generatedBy: "Rafiqul Islam",
    format: "PDF",
    size: "221 KB",
  },
  {
    id: "GEN-00037",
    name: "Expense Report by Category",
    reportId: "RPT-EXPENSE-CATEGORY",
    range: "July 2026",
    generatedAt: "2026-08-05",
    generatedBy: "Rafiqul Islam",
    format: "Excel",
    size: "74 KB",
  },
  {
    id: "GEN-00036",
    name: "Income & Expense Statement",
    reportId: "RPT-INCOME-STATEMENT",
    range: "July 2026",
    generatedAt: "2026-08-01",
    generatedBy: "Hafiz Mizanur Rahman",
    format: "PDF",
    size: "168 KB",
  },
  {
    id: "GEN-00035",
    name: "Fund Balance Statement",
    reportId: "RPT-FUND-BALANCE",
    range: "As at 31 July 2026",
    generatedAt: "2026-08-01",
    generatedBy: "Hafiz Mizanur Rahman",
    format: "PDF",
    size: "115 KB",
  },
  {
    id: "GEN-00034",
    name: "Salary Register",
    reportId: "RPT-SALARY-REGISTER",
    range: "July 2026",
    generatedAt: "2026-07-25",
    generatedBy: "Rafiqul Islam",
    format: "CSV",
    size: "12 KB",
  },
];

/**
 * A worked income statement for the current month, shown as a preview so the page is not a wall of
 * buttons. Every figure agrees with `overview.ts`: income 125,000, expenses 87,500, net 37,500.
 */
export const incomeStatementPeriod = "1 – 22 August 2026";

export const incomeStatementIncome: ReportRow[] = [
  { label: "Monthly Contributions", income: 62500, note: "125 of 150 members" },
  { label: "Donations (General & Sadaqah)", income: 17500, note: "General Fund" },
  { label: "Zakat & Fitrah", income: 22500, note: "Zakat Fund, restricted" },
  { label: "Rent & Other Income", income: 22500, note: "Shop rent and misc." },
];

export const incomeStatementExpenses: ReportRow[] = [
  { label: "Salaries", expense: 53000, note: "Imam, Muazzin, Teacher" },
  { label: "Utilities", expense: 17000, note: "Electricity, water, internet" },
  { label: "Maintenance & Cleaning", expense: 9500, note: "Wudu area, carpet service" },
  { label: "Education", expense: 4500, note: "Maktab materials" },
  { label: "Events & Office", expense: 3500, note: "Tafsir gathering, stationery" },
];

export const incomeStatementTotals = {
  income: 125000,
  expense: 87500,
  net: 37500,
};

/** Fund balance preview. The six Active balances come to the 425,000 total on the overview. */
export const fundBalanceRows: ReportRow[] = [
  { label: "General Fund", income: 640000, expense: 460000, net: 180000, note: "Unrestricted" },
  { label: "Imam Salary Fund", income: 105000, expense: 30000, net: 75000, note: "Restricted" },
  { label: "Maintenance Fund", income: 120000, expense: 75000, net: 45000, note: "Restricted" },
  { label: "Education Fund", income: 95000, expense: 35000, net: 60000, note: "Restricted" },
  { label: "Zakat Fund", income: 88000, expense: 48000, net: 40000, note: "Restricted, eligible recipients only" },
  { label: "Construction Fund", income: 150000, expense: 125000, net: 25000, note: "Restricted" },
];

export const reportFormatOptions: ReadonlyArray<{ value: GeneratedReport["format"]; label: string }> = [
  { value: "PDF", label: "PDF" },
  { value: "Excel", label: "Excel" },
  { value: "CSV", label: "CSV" },
];

export const reportRangeOptions: ReadonlyArray<{ value: string; label: string }> = [
  { value: "this-month", label: "This month (1 – 22 August 2026)" },
  { value: "last-month", label: "Last month (July 2026)" },
  { value: "this-quarter", label: "This quarter (July – September 2026)" },
  { value: "this-year", label: "This year (2026 to date)" },
  { value: "last-year", label: "Last year (2025)" },
  { value: "custom", label: "Custom range" },
];
