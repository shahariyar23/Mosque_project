import type { Expense, ExpenseStatus } from "@/lib/finance/types";

/**
 * Mock expense register. Swap for `GET /api/finance/expenses`.
 *
 * Two rules the rows are written to keep, because the pages depend on them:
 *
 *   1. Exactly two rows sit at `Pending Approval`, matching `pendingApprovals.expenses` in
 *      `overview.ts`. If you add a third, update that count too or the overview starts lying.
 *   2. Only `Paid` rows have reached the ledger. The August paid rows sum to the 87,500 expense
 *      figure in `overview.ts` — 53,000 salaries, 17,000 utilities, 17,500 upkeep, education and
 *      office. A Draft, Pending or Approved row is money the mosque has not spent yet, so it is
 *      never counted as an expense.
 *
 * `requiresApproval` is a property of the expense, not of the person recording it. Small routine
 * bills clear on their own; anything above the threshold or outside the routine categories needs a
 * second signature. The frontend uses it to decide which pipeline to draw. The API decides again.
 */

/** Anything at or above this amount needs approval regardless of category. */
export const APPROVAL_THRESHOLD = 10000;

export const expenses: Expense[] = [
  {
    id: "EXP-2026-00184",
    date: "2026-08-21",
    category: "Salary",
    description: "Imam salary – August 2026",
    fundId: "FND-002",
    fundName: "Imam Salary Fund",
    amount: 35000,
    paymentMethod: "Bank Transfer",
    reference: "SAL-2026-08-001",
    submittedBy: "Rafiqul Islam",
    submittedAt: "2026-08-19",
    approvedBy: "Hafiz Mizanur Rahman",
    approvedAt: "2026-08-20",
    status: "Paid",
    requiresApproval: true,
  },
  {
    id: "EXP-2026-00183",
    date: "2026-08-21",
    category: "Salary",
    description: "Muazzin salary – August 2026",
    fundId: "FND-002",
    fundName: "Imam Salary Fund",
    amount: 12000,
    paymentMethod: "Bank Transfer",
    reference: "SAL-2026-08-002",
    submittedBy: "Rafiqul Islam",
    submittedAt: "2026-08-19",
    approvedBy: "Hafiz Mizanur Rahman",
    approvedAt: "2026-08-20",
    status: "Paid",
    requiresApproval: true,
  },
  {
    id: "EXP-2026-00182",
    date: "2026-08-21",
    category: "Salary",
    description: "Maktab teacher salary – August 2026",
    fundId: "FND-004",
    fundName: "Education Fund",
    amount: 6000,
    paymentMethod: "Cash",
    reference: "SAL-2026-08-003",
    submittedBy: "Rafiqul Islam",
    submittedAt: "2026-08-19",
    approvedBy: "Hafiz Mizanur Rahman",
    approvedAt: "2026-08-20",
    status: "Paid",
    requiresApproval: false,
  },
  {
    id: "EXP-2026-00181",
    date: "2026-08-18",
    category: "Electricity",
    description: "Electricity bill – July billing cycle",
    fundId: "FND-001",
    fundName: "General Fund",
    amount: 9500,
    paymentMethod: "Online Payment",
    vendor: "Dhaka Power Distribution",
    reference: "DPDC-8841207",
    attachmentName: "dpdc-july-2026.pdf",
    submittedBy: "Shahed Alam",
    submittedAt: "2026-08-17",
    approvedBy: "Rafiqul Islam",
    approvedAt: "2026-08-18",
    status: "Paid",
    requiresApproval: false,
  },
  {
    id: "EXP-2026-00180",
    date: "2026-08-16",
    category: "Internet",
    description: "Broadband and CCTV line – August",
    fundId: "FND-001",
    fundName: "General Fund",
    amount: 5000,
    paymentMethod: "Mobile Banking",
    vendor: "Link3 Technologies",
    reference: "L3-2026-08-0912",
    submittedBy: "Shahed Alam",
    submittedAt: "2026-08-16",
    approvedBy: "Rafiqul Islam",
    approvedAt: "2026-08-16",
    status: "Paid",
    requiresApproval: false,
  },
  {
    id: "EXP-2026-00179",
    date: "2026-08-14",
    category: "Maintenance",
    description: "Wudu area tap replacement and drain clearing",
    fundId: "FND-003",
    fundName: "Maintenance Fund",
    amount: 6500,
    paymentMethod: "Cash",
    vendor: "Karim Plumbing Works",
    attachmentName: "plumbing-invoice-0814.jpg",
    submittedBy: "Jamil Hossain",
    submittedAt: "2026-08-13",
    approvedBy: "Rafiqul Islam",
    approvedAt: "2026-08-14",
    status: "Paid",
    requiresApproval: false,
  },
  {
    id: "EXP-2026-00178",
    date: "2026-08-12",
    category: "Education",
    description: "Maktab textbooks and Qur'an sets for the new term",
    fundId: "FND-004",
    fundName: "Education Fund",
    amount: 4500,
    paymentMethod: "Cash",
    vendor: "Islamic Foundation Bookshop",
    submittedBy: "Shahed Alam",
    submittedAt: "2026-08-11",
    approvedBy: "Rafiqul Islam",
    approvedAt: "2026-08-12",
    status: "Paid",
    requiresApproval: false,
  },
  {
    id: "EXP-2026-00177",
    date: "2026-08-10",
    category: "Cleaning",
    description: "Prayer hall carpet cleaning – monthly service",
    fundId: "FND-001",
    fundName: "General Fund",
    amount: 3000,
    paymentMethod: "Cash",
    vendor: "Shine Care Services",
    submittedBy: "Jamil Hossain",
    submittedAt: "2026-08-10",
    approvedBy: "Rafiqul Islam",
    approvedAt: "2026-08-10",
    status: "Paid",
    requiresApproval: false,
  },
  {
    id: "EXP-2026-00176",
    date: "2026-08-08",
    category: "Water",
    description: "WASA water bill – July",
    fundId: "FND-001",
    fundName: "General Fund",
    amount: 2500,
    paymentMethod: "Online Payment",
    vendor: "Dhaka WASA",
    reference: "WASA-552118",
    submittedBy: "Shahed Alam",
    submittedAt: "2026-08-08",
    approvedBy: "Rafiqul Islam",
    approvedAt: "2026-08-08",
    status: "Paid",
    requiresApproval: false,
  },
  {
    id: "EXP-2026-00175",
    date: "2026-08-06",
    category: "Events",
    description: "Refreshments for the monthly tafsir gathering",
    fundId: "FND-001",
    fundName: "General Fund",
    amount: 2000,
    paymentMethod: "Cash",
    vendor: "Bismillah Sweets",
    submittedBy: "Jamil Hossain",
    submittedAt: "2026-08-06",
    approvedBy: "Rafiqul Islam",
    approvedAt: "2026-08-06",
    status: "Paid",
    requiresApproval: false,
  },
  {
    id: "EXP-2026-00174",
    date: "2026-08-04",
    category: "Office",
    description: "Receipt books, register and stationery",
    fundId: "FND-001",
    fundName: "General Fund",
    amount: 1500,
    paymentMethod: "Cash",
    vendor: "Al-Amin Stationers",
    submittedBy: "Shahed Alam",
    submittedAt: "2026-08-04",
    approvedBy: "Rafiqul Islam",
    approvedAt: "2026-08-04",
    status: "Paid",
    requiresApproval: false,
  },

  /* ---- not yet money out of the door ---- */

  {
    id: "EXP-2026-00187",
    date: "2026-08-22",
    category: "Maintenance",
    description: "Air conditioning overhaul – prayer hall, four units",
    fundId: "FND-003",
    fundName: "Maintenance Fund",
    amount: 28000,
    paymentMethod: "Bank Transfer",
    vendor: "Cool Breeze Engineering",
    reference: "QUOTE-CB-2291",
    attachmentName: "cool-breeze-quotation.pdf",
    notes: "Two units are beyond repair. Quotation covers replacement compressors and a service on the other two.",
    submittedBy: "Jamil Hossain",
    submittedAt: "2026-08-22",
    status: "Pending Approval",
    requiresApproval: true,
  },
  {
    id: "EXP-2026-00186",
    date: "2026-08-22",
    category: "Other",
    description: "Sound system upgrade – outdoor speakers for Jumu'ah overflow",
    fundId: "FND-003",
    fundName: "Maintenance Fund",
    amount: 18500,
    paymentMethod: "Bank Transfer",
    vendor: "Ahad Electronics",
    reference: "QUOTE-AE-7710",
    notes: "Requested after the Eid overflow. Awaiting the President's sign-off.",
    submittedBy: "Shahed Alam",
    submittedAt: "2026-08-21",
    status: "Pending Approval",
    requiresApproval: true,
  },
  {
    id: "EXP-2026-00185",
    date: "2026-08-20",
    category: "Maintenance",
    description: "Roof waterproofing before the monsoon",
    fundId: "FND-003",
    fundName: "Maintenance Fund",
    amount: 45000,
    paymentMethod: "Bank Transfer",
    vendor: "Sheltech Waterproofing",
    reference: "QUOTE-SW-3320",
    submittedBy: "Rafiqul Islam",
    submittedAt: "2026-08-15",
    approvedBy: "Hafiz Mizanur Rahman",
    approvedAt: "2026-08-19",
    notes: "Approved. Work scheduled for the last week of August, payment on completion.",
    status: "Approved",
    requiresApproval: true,
  },
  {
    id: "EXP-2026-00188",
    date: "2026-08-22",
    category: "Office",
    description: "Second office desk and filing cabinet",
    fundId: "FND-001",
    fundName: "General Fund",
    amount: 7200,
    paymentMethod: "Cash",
    vendor: "Hatil Furniture",
    notes: "Draft — waiting for a second quotation before submitting.",
    submittedBy: "Shahed Alam",
    submittedAt: "2026-08-22",
    status: "Draft",
    requiresApproval: false,
  },
  {
    id: "EXP-2026-00172",
    date: "2026-08-02",
    category: "Other",
    description: "Decorative lighting for the front gate",
    fundId: "FND-001",
    fundName: "General Fund",
    amount: 16000,
    paymentMethod: "Cash",
    vendor: "Noor Lighting House",
    submittedBy: "Jamil Hossain",
    submittedAt: "2026-08-01",
    approvedBy: "Rafiqul Islam",
    approvedAt: "2026-08-02",
    rejectionReason:
      "Not a priority while the roof waterproofing is outstanding. Resubmit after the monsoon work is paid for.",
    status: "Rejected",
    requiresApproval: true,
  },
];

/** The approval queue, oldest submission first — the one that has waited longest is acted on first. */
export const expensesAwaitingApproval = expenses
  .filter((expense) => expense.status === "Pending Approval")
  .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));

export const recentExpenses = [...expenses].sort((a, b) =>
  a.date === b.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date),
);

export function getExpense(id: string): Expense | undefined {
  return expenses.find((expense) => expense.id === id);
}

/**
 * Month-to-date expense headline for the whole book. `paidThisMonth` matches the 87,500 expense
 * card in `overview.ts`; the committed figure is Approved but not yet paid, which is money the
 * mosque owes rather than money it has spent.
 */
export const expenseSummary = {
  paidThisMonth: 87500,
  awaitingApproval: 46500,
  awaitingApprovalCount: 2,
  committed: 45000,
  largestCategory: "Salary",
  largestCategoryAmount: 53000,
  vendorCount: 11,
};

/** Category split of the paid August rows, for the breakdown panel. */
export const expenseByCategory: ReadonlyArray<{ label: string; amount: number; hint: string }> = [
  { label: "Salary", amount: 53000, hint: "Imam, Muazzin, Teacher" },
  { label: "Electricity", amount: 9500, hint: "July billing cycle" },
  { label: "Maintenance", amount: 6500, hint: "Wudu area repairs" },
  { label: "Internet", amount: 5000, hint: "Broadband and CCTV" },
  { label: "Education", amount: 4500, hint: "Maktab materials" },
  { label: "Cleaning", amount: 3000, hint: "Carpet service" },
  { label: "Water", amount: 2500, hint: "WASA bill" },
  { label: "Events", amount: 2000, hint: "Tafsir gathering" },
  { label: "Office", amount: 1500, hint: "Stationery" },
];

export const expenseCategoryFilterOptions = [
  { value: "all", label: "All categories" },
  { value: "Salary", label: "Salary" },
  { value: "Electricity", label: "Electricity" },
  { value: "Water", label: "Water" },
  { value: "Internet", label: "Internet" },
  { value: "Cleaning", label: "Cleaning" },
  { value: "Maintenance", label: "Maintenance" },
  { value: "Events", label: "Events" },
  { value: "Education", label: "Education" },
  { value: "Office", label: "Office" },
  { value: "Other", label: "Other" },
];

export const expenseStatusFilterOptions: ReadonlyArray<{ value: ExpenseStatus | "all"; label: string }> = [
  { value: "all", label: "All states" },
  { value: "Draft", label: "Draft" },
  { value: "Pending Approval", label: "Pending Approval" },
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
  { value: "Paid", label: "Paid" },
];
