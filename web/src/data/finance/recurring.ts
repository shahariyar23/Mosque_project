import type { RecurringContribution, RecurringStatus } from "@/lib/finance/types";

/**
 * Mock recurring contribution mandates. Swap for `GET /api/finance/recurring`.
 *
 * A mandate is a standing arrangement, not a payment. It says what a member agreed to give, how
 * often, into which fund, and when the next one falls due. The payments it produces live in
 * `contributions.ts`; `paymentsMade` and `totalPaid` are the running totals of those.
 *
 * `Paused` and `Cancelled` are kept apart deliberately. Paused is temporary and reversible, so the
 * arrangement keeps its history and can be resumed on the same terms. Cancelled is final. Nothing
 * here is ever deleted: a member who stopped giving three years ago is still part of the record of
 * how the mosque was funded.
 *
 * No payment processing is wired up. Pausing, resuming or cancelling changes what is shown; the API
 * will do the real thing later, and will check the permission again when it does.
 */

export const recurringContributions: RecurringContribution[] = [
  {
    id: "REC-M-001",
    memberId: "MEM-001",
    memberCode: "NCM-0001",
    memberName: "Abdullah Rahman",
    amount: 1000,
    frequency: "Monthly",
    startDate: "2021-07-01",
    fundId: "FND-001",
    fundName: "General Fund",
    nextDueDate: "2026-09-05",
    lastPaidDate: "2026-08-03",
    paymentMethod: "Mobile Banking",
    status: "Active",
    paymentsMade: 62,
    totalPaid: 62000,
  },
  {
    id: "REC-M-002",
    memberId: "MEM-011",
    memberCode: "NCM-0011",
    memberName: "Nusrat Jahan",
    amount: 1000,
    frequency: "Monthly",
    startDate: "2023-01-01",
    fundId: "FND-001",
    fundName: "General Fund",
    nextDueDate: "2026-09-05",
    lastPaidDate: "2026-08-06",
    paymentMethod: "Bank Transfer",
    status: "Active",
    paymentsMade: 44,
    totalPaid: 44000,
  },
  {
    id: "REC-M-003",
    memberId: "MEM-025",
    memberCode: "NCM-0025",
    memberName: "Tanvir Ahmed",
    amount: 1500,
    frequency: "Quarterly",
    startDate: "2024-02-01",
    fundId: "FND-002",
    fundName: "Imam Salary Fund",
    nextDueDate: "2026-11-10",
    lastPaidDate: "2026-08-09",
    paymentMethod: "Bank Transfer",
    status: "Active",
    paymentsMade: 11,
    totalPaid: 16500,
  },
  {
    id: "REC-M-004",
    memberId: "MEM-041",
    memberCode: "NCM-0041",
    memberName: "Sabina Akter",
    amount: 1000,
    frequency: "Monthly",
    startDate: "2022-04-01",
    fundId: "FND-001",
    fundName: "General Fund",
    nextDueDate: "2026-09-02",
    lastPaidDate: "2026-08-02",
    paymentMethod: "Card",
    status: "Active",
    paymentsMade: 53,
    totalPaid: 53000,
  },
  {
    id: "REC-M-005",
    memberId: "MEM-063",
    memberCode: "NCM-0063",
    memberName: "Masud Parvez",
    amount: 1000,
    frequency: "Monthly",
    startDate: "2024-06-01",
    fundId: "FND-001",
    fundName: "General Fund",
    nextDueDate: "2026-09-05",
    lastPaidDate: "2026-08-08",
    paymentMethod: "Bank Transfer",
    status: "Active",
    paymentsMade: 27,
    totalPaid: 27000,
  },
  {
    id: "REC-M-006",
    memberId: "MEM-052",
    memberCode: "NCM-0052",
    memberName: "Ruhul Amin",
    amount: 500,
    frequency: "Monthly",
    startDate: "2023-08-01",
    fundId: "FND-001",
    fundName: "General Fund",
    nextDueDate: "2026-09-05",
    lastPaidDate: "2026-08-07",
    paymentMethod: "Mobile Banking",
    status: "Active",
    paymentsMade: 37,
    totalPaid: 18500,
  },
  {
    id: "REC-M-007",
    memberId: "MEM-018",
    memberCode: "NCM-0018",
    memberName: "Ayesha Siddiqua",
    amount: 200,
    frequency: "Monthly",
    startDate: "2025-02-01",
    fundId: "FND-001",
    fundName: "General Fund",
    nextDueDate: "2026-09-05",
    lastPaidDate: "2026-08-05",
    paymentMethod: "Mobile Banking",
    status: "Active",
    paymentsMade: 19,
    totalPaid: 3800,
  },
  {
    id: "REC-M-008",
    memberId: "MEM-022",
    memberCode: "NCM-0022",
    memberName: "Mahbub Alam",
    amount: 200,
    frequency: "Monthly",
    startDate: "2025-09-01",
    fundId: "FND-001",
    fundName: "General Fund",
    nextDueDate: "2026-10-05",
    lastPaidDate: "2026-06-08",
    paymentMethod: "Cash",
    status: "Paused",
    paymentsMade: 9,
    totalPaid: 1800,
  },
  {
    id: "REC-M-009",
    memberId: "MEM-037",
    memberCode: "NCM-0037",
    memberName: "Rezaul Karim",
    amount: 500,
    frequency: "Monthly",
    startDate: "2022-11-01",
    fundId: "FND-001",
    fundName: "General Fund",
    nextDueDate: "2026-09-05",
    lastPaidDate: "2026-05-04",
    paymentMethod: "Cash",
    status: "Paused",
    paymentsMade: 42,
    totalPaid: 21000,
  },
  {
    id: "REC-M-010",
    memberId: "MEM-070",
    memberCode: "NCM-0070",
    memberName: "Hasina Parvin",
    amount: 2500,
    frequency: "Yearly",
    startDate: "2023-02-01",
    endDate: "2026-04-01",
    fundId: "FND-007",
    fundName: "Ramadan Iftar Fund",
    nextDueDate: "2027-02-01",
    lastPaidDate: "2026-03-12",
    paymentMethod: "Bank Transfer",
    status: "Completed",
    paymentsMade: 4,
    totalPaid: 10000,
  },
  {
    id: "REC-M-011",
    memberId: "MEM-078",
    memberCode: "NCM-0078",
    memberName: "Kamrul Hasan",
    amount: 1000,
    frequency: "Monthly",
    startDate: "2021-03-01",
    endDate: "2026-01-31",
    fundId: "FND-006",
    fundName: "Construction Fund",
    nextDueDate: "2026-02-05",
    lastPaidDate: "2026-01-04",
    paymentMethod: "Bank Transfer",
    status: "Completed",
    paymentsMade: 59,
    totalPaid: 59000,
  },
  {
    id: "REC-M-012",
    memberId: "MEM-084",
    memberCode: "NCM-0084",
    memberName: "Ashraful Alam",
    amount: 500,
    frequency: "Monthly",
    startDate: "2024-01-01",
    endDate: "2026-06-30",
    fundId: "FND-001",
    fundName: "General Fund",
    nextDueDate: "2026-07-05",
    lastPaidDate: "2026-06-03",
    paymentMethod: "Mobile Banking",
    status: "Cancelled",
    paymentsMade: 30,
    totalPaid: 15000,
  },
];

export const activeRecurring = recurringContributions.filter((row) => row.status === "Active");

/** Mandates whose next payment is closest, for the "due soon" panel. */
export const recurringDueSoon = activeRecurring
  .slice()
  .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));

export function getRecurringContribution(id: string): RecurringContribution | undefined {
  return recurringContributions.find((row) => row.id === id);
}

/**
 * `expectedMonthly` is what the Active monthly and quarterly mandates come to in a normal month:
 * the six active monthly mandates at 1,000, 1,000, 1,000, 1,000, 500 and 200, plus a quarterly
 * 1,500 spread across three months. Paused money is deliberately excluded — it is not expected.
 */
export const recurringSummary = {
  activeCount: 7,
  pausedCount: 2,
  completedCount: 2,
  cancelledCount: 1,
  expectedMonthly: 5200,
  collectedLifetime: 331600,
  dueThisWeek: 0,
  dueNextMonth: 7,
};

export const recurringStatusFilterOptions: ReadonlyArray<{ value: RecurringStatus | "all"; label: string }> = [
  { value: "all", label: "All states" },
  { value: "Active", label: "Active" },
  { value: "Paused", label: "Paused" },
  { value: "Completed", label: "Completed" },
  { value: "Cancelled", label: "Cancelled" },
];

export const recurringFrequencyFilterOptions = [
  { value: "all", label: "All frequencies" },
  { value: "Monthly", label: "Monthly" },
  { value: "Quarterly", label: "Quarterly" },
  { value: "Yearly", label: "Yearly" },
];
