import type { ChartGrouping, DateRangeKey, FlowLine, FlowPoint, SummaryMetric } from "@/lib/finance/types";

/**
 * Finance overview figures. Swap this module for `GET /api/finance/overview` — the six summary
 * metrics, the flow breakdown and the chart series are all read straight from here.
 *
 * These are month-to-date totals for the whole book. `transactions.ts` holds only a recent slice of
 * the ledger, so the two are not expected to reconcile; see the note there. Read cards from this
 * module rather than summing rows, which is also how the real endpoint will work.
 */

export const dateRangeOptions: ReadonlyArray<{ value: DateRangeKey; label: string }> = [
  { value: "this-month", label: "This Month" },
  { value: "last-month", label: "Last Month" },
  { value: "this-year", label: "This Year" },
  { value: "custom", label: "Custom Range" },
];

export const dateRangeCaptions: Record<DateRangeKey, string> = {
  "this-month": "1 – 22 August 2026",
  "last-month": "1 – 31 July 2026",
  "this-year": "1 January – 22 August 2026",
  custom: "Pick a start and end date",
};

/** Cards 1–6 on the overview, in the order the brief lists them. */
export const summaryMetrics: SummaryMetric[] = [
  {
    id: "total-balance",
    label: "Total Balance",
    amount: 425000,
    hint: "Across 6 active funds",
    tone: "neutral",
    icon: "vault",
  },
  {
    id: "month-income",
    label: "This Month Income",
    amount: 125000,
    hint: "Donations, contributions and rent",
    tone: "positive",
    icon: "trending-up",
    change: { value: 12.5, direction: "up", label: "from last month" },
  },
  {
    id: "month-expenses",
    label: "This Month Expenses",
    amount: 87500,
    hint: "Salaries, utilities and upkeep",
    tone: "negative",
    icon: "trending-down",
    change: { value: 3.2, direction: "up", label: "from last month" },
  },
  {
    id: "net-balance",
    label: "Net Balance",
    amount: 37500,
    hint: "Income minus expenses this month",
    tone: "positive",
    icon: "scale",
  },
  {
    id: "monthly-contributions",
    label: "Monthly Contributions",
    amount: 62500,
    hint: "125 of 150 members paid",
    tone: "gold",
    icon: "repeat",
  },
  {
    id: "pending-contributions",
    label: "Pending Contributions",
    amount: 12500,
    hint: "25 members yet to pay",
    tone: "warning",
    icon: "clock",
  },
];

/*
 * Income → Funds → Expenses flow. Each column sums exactly to its summary card above
 * (125,000 in, 87,500 out), because the two are the same month-to-date figures cut a different way.
 *
 * The buckets are deliberately broad. A narrower cut looks tidier but produces category totals
 * smaller than single entries sitting inside them — the ledger has one 30,000 zakat receipt and one
 * 14,500 maktab purchase, so "Zakat & Sadaqah 12,500" or "Education & Office 4,500" would read as
 * an arithmetic error. Keep every line at or above the largest single entry it contains.
 */

/** Left column of the flow. Sums to this month's income. */
export const incomeFlow: FlowLine[] = [
  { label: "Monthly Contributions", amount: 62500, hint: "125 members" },
  { label: "Donations, Zakat & Sadaqah", amount: 40000, hint: "22 donors" },
  { label: "Rent & Other Income", amount: 22500, hint: "Shop rent and misc." },
];

/** Right column of the flow. Sums to this month's expenses. */
export const expenseFlow: FlowLine[] = [
  { label: "Salaries", amount: 53000, hint: "Imam, Muazzin, Teacher" },
  { label: "Utilities", amount: 17000, hint: "Electricity, water, internet" },
  { label: "Upkeep, Education & Office", amount: 17500, hint: "Repairs, maktab, supplies" },
];

const monthly: FlowPoint[] = [
  { period: "2026-01", label: "Jan", income: 98000, expense: 72500 },
  { period: "2026-02", label: "Feb", income: 104500, expense: 76000 },
  { period: "2026-03", label: "Mar", income: 156000, expense: 92000 },
  { period: "2026-04", label: "Apr", income: 142000, expense: 118000 },
  { period: "2026-05", label: "May", income: 106000, expense: 81000 },
  { period: "2026-06", label: "Jun", income: 112500, expense: 79500 },
  { period: "2026-07", label: "Jul", income: 111100, expense: 84800 },
  { period: "2026-08", label: "Aug", income: 125000, expense: 87500 },
];

const quarterly: FlowPoint[] = [
  { period: "2025-Q3", label: "Q3 25", income: 322000, expense: 268000 },
  { period: "2025-Q4", label: "Q4 25", income: 341000, expense: 279500 },
  { period: "2026-Q1", label: "Q1 26", income: 358500, expense: 240500 },
  { period: "2026-Q2", label: "Q2 26", income: 360500, expense: 278500 },
  { period: "2026-Q3", label: "Q3 26", income: 236100, expense: 172300 },
];

const yearly: FlowPoint[] = [
  { period: "2023", label: "2023", income: 890000, expense: 720000 },
  { period: "2024", label: "2024", income: 1120000, expense: 940000 },
  { period: "2025", label: "2025", income: 1285000, expense: 1065000 },
  { period: "2026", label: "2026", income: 955100, expense: 691300 },
];

export const chartSeries: Record<ChartGrouping, FlowPoint[]> = { monthly, quarterly, yearly };

export const chartGroupingOptions: ReadonlyArray<{ value: ChartGrouping; label: string }> = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

export const chartCaptions: Record<ChartGrouping, string> = {
  monthly: "January – August 2026",
  quarterly: "Last five quarters",
  yearly: "2023 – 2026 (2026 to date)",
};

/** Headline contribution numbers reused on the overview and the contributions page. */
export const contributionSummary = {
  expected: 75000,
  collected: 62500,
  pending: 12500,
  totalMembers: 150,
  paidMembers: 125,
  pendingMembers: 25,
  collectionRate: 83.3,
};

/** Counts driving the "needs your attention" panel on the overview. */
export const pendingApprovals = {
  expenses: 2,
  salaries: 1,
  transactions: 2,
};
