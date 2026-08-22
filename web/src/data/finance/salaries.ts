import type { SalaryPayment, SalaryStatus, StaffMember, StaffPosition } from "@/lib/finance/types";

/**
 * Mock staff records and salary runs. Swap for `GET /api/finance/staff` and
 * `GET /api/finance/salaries`.
 *
 * Two things this file is careful about:
 *
 *   1. The August paid rows total 53,000 — Imam 35,000, Muazzin 12,000, Teacher 6,000 — which is
 *      the Salaries line in `expenseFlow` in `overview.ts`. The Caretaker's Pending row and the
 *      Cleaner's Approved row sit outside that total on purpose: neither has been disbursed, so
 *      neither is an expense yet.
 *   2. Exactly one row is `Pending`, matching `pendingApprovals.salaries` in `overview.ts`.
 *
 * A salary is a person's livelihood, so `Failed` is a real state rather than an error toast. A
 * transfer that bounced has to stay visible until somebody pays it another way.
 *
 * This is also the page an imam opens with `salary.viewOwn` alone. That permission answers "may
 * this kind of person see a salary record at all" — it does not say which record is theirs. The
 * narrowing is a query concern: the API will return only the caller's rows. The frontend hiding
 * the rest is presentation, not protection.
 */

export const staff: StaffMember[] = [
  {
    id: "STF-001",
    name: "Imam Abdul Karim",
    position: "Imam",
    monthlySalary: 35000,
    frequency: "Monthly",
    fundId: "FND-002",
    fundName: "Imam Salary Fund",
    paymentMethod: "Bank Transfer",
    status: "Active",
    joinedAt: "2019-03-01",
    phone: "+880 1711 908 442",
  },
  {
    id: "STF-002",
    name: "Nurul Islam",
    position: "Muazzin",
    monthlySalary: 12000,
    frequency: "Monthly",
    fundId: "FND-002",
    fundName: "Imam Salary Fund",
    paymentMethod: "Bank Transfer",
    status: "Active",
    joinedAt: "2020-07-15",
    phone: "+880 1812 334 076",
  },
  {
    id: "STF-003",
    name: "Hafez Saiful Islam",
    position: "Teacher",
    monthlySalary: 6000,
    frequency: "Monthly",
    fundId: "FND-004",
    fundName: "Education Fund",
    paymentMethod: "Cash",
    status: "Active",
    joinedAt: "2022-01-10",
    phone: "+880 1934 552 118",
  },
  {
    id: "STF-004",
    name: "Abdul Mannan",
    position: "Caretaker",
    monthlySalary: 5000,
    frequency: "Monthly",
    fundId: "FND-001",
    fundName: "General Fund",
    paymentMethod: "Cash",
    status: "Active",
    joinedAt: "2021-05-20",
    phone: "+880 1717 660 209",
  },
  {
    id: "STF-005",
    name: "Rahima Begum",
    position: "Cleaner",
    monthlySalary: 3500,
    frequency: "Monthly",
    fundId: "FND-001",
    fundName: "General Fund",
    paymentMethod: "Cash",
    status: "Active",
    joinedAt: "2023-09-01",
    phone: "+880 1912 447 305",
  },
  {
    id: "STF-006",
    name: "Hafez Jubayer Ahmed",
    position: "Teacher",
    monthlySalary: 6000,
    frequency: "Monthly",
    fundId: "FND-004",
    fundName: "Education Fund",
    paymentMethod: "Cash",
    status: "On Leave",
    joinedAt: "2024-02-11",
    phone: "+880 1876 220 914",
  },
];

export const activeStaff = staff.filter((member) => member.status === "Active");

export function getStaffMember(id: string): StaffMember | undefined {
  return staff.find((member) => member.id === id);
}

/** The current period the salary page opens on. */
export const CURRENT_SALARY_PERIOD = "2026-08";

export const salaryPayments: SalaryPayment[] = [
  /* ---- August 2026: the run in progress ---- */
  {
    id: "SAL-2026-08-001",
    staffId: "STF-001",
    staffName: "Imam Abdul Karim",
    position: "Imam",
    period: "2026-08",
    periodLabel: "August 2026",
    amount: 35000,
    fundId: "FND-002",
    fundName: "Imam Salary Fund",
    paymentDate: "2026-08-21",
    paymentMethod: "Bank Transfer",
    status: "Paid",
    receiptNo: "REC-2026-00122",
    submittedBy: "Rafiqul Islam",
    submittedAt: "2026-08-19",
    approvedBy: "Hafiz Mizanur Rahman",
    approvedAt: "2026-08-20",
  },
  {
    id: "SAL-2026-08-002",
    staffId: "STF-002",
    staffName: "Nurul Islam",
    position: "Muazzin",
    period: "2026-08",
    periodLabel: "August 2026",
    amount: 12000,
    fundId: "FND-002",
    fundName: "Imam Salary Fund",
    paymentDate: "2026-08-21",
    paymentMethod: "Bank Transfer",
    status: "Paid",
    receiptNo: "REC-2026-00123",
    submittedBy: "Rafiqul Islam",
    submittedAt: "2026-08-19",
    approvedBy: "Hafiz Mizanur Rahman",
    approvedAt: "2026-08-20",
  },
  {
    id: "SAL-2026-08-003",
    staffId: "STF-003",
    staffName: "Hafez Saiful Islam",
    position: "Teacher",
    period: "2026-08",
    periodLabel: "August 2026",
    amount: 6000,
    fundId: "FND-004",
    fundName: "Education Fund",
    paymentDate: "2026-08-21",
    paymentMethod: "Cash",
    status: "Paid",
    receiptNo: "REC-2026-00124",
    submittedBy: "Rafiqul Islam",
    submittedAt: "2026-08-19",
    approvedBy: "Hafiz Mizanur Rahman",
    approvedAt: "2026-08-20",
  },
  {
    id: "SAL-2026-08-005",
    staffId: "STF-005",
    staffName: "Rahima Begum",
    position: "Cleaner",
    period: "2026-08",
    periodLabel: "August 2026",
    amount: 3500,
    fundId: "FND-001",
    fundName: "General Fund",
    paymentMethod: "Cash",
    status: "Approved",
    submittedBy: "Rafiqul Islam",
    submittedAt: "2026-08-19",
    approvedBy: "Hafiz Mizanur Rahman",
    approvedAt: "2026-08-20",
    notes: "Approved with the rest of the run. She collects in cash on the last working day.",
  },
  {
    id: "SAL-2026-08-004",
    staffId: "STF-004",
    staffName: "Abdul Mannan",
    position: "Caretaker",
    period: "2026-08",
    periodLabel: "August 2026",
    amount: 5000,
    fundId: "FND-001",
    fundName: "General Fund",
    paymentMethod: "Cash",
    status: "Pending",
    submittedBy: "Rafiqul Islam",
    submittedAt: "2026-08-22",
    notes: "Held back while the two days of unpaid leave in the first week are confirmed.",
  },

  /* ---- July 2026: closed ---- */
  {
    id: "SAL-2026-07-001",
    staffId: "STF-001",
    staffName: "Imam Abdul Karim",
    position: "Imam",
    period: "2026-07",
    periodLabel: "July 2026",
    amount: 35000,
    fundId: "FND-002",
    fundName: "Imam Salary Fund",
    paymentDate: "2026-07-22",
    paymentMethod: "Bank Transfer",
    status: "Paid",
    receiptNo: "REC-2026-00098",
    submittedBy: "Rafiqul Islam",
    submittedAt: "2026-07-20",
    approvedBy: "Hafiz Mizanur Rahman",
    approvedAt: "2026-07-21",
  },
  {
    id: "SAL-2026-07-002",
    staffId: "STF-002",
    staffName: "Nurul Islam",
    position: "Muazzin",
    period: "2026-07",
    periodLabel: "July 2026",
    amount: 12000,
    fundId: "FND-002",
    fundName: "Imam Salary Fund",
    paymentDate: "2026-07-24",
    paymentMethod: "Bank Transfer",
    status: "Paid",
    receiptNo: "REC-2026-00101",
    submittedBy: "Rafiqul Islam",
    submittedAt: "2026-07-20",
    approvedBy: "Hafiz Mizanur Rahman",
    approvedAt: "2026-07-21",
    notes: "First transfer failed on a stale account number. Reissued to the corrected account.",
  },
  {
    id: "SAL-2026-07-003",
    staffId: "STF-003",
    staffName: "Hafez Saiful Islam",
    position: "Teacher",
    period: "2026-07",
    periodLabel: "July 2026",
    amount: 6000,
    fundId: "FND-004",
    fundName: "Education Fund",
    paymentDate: "2026-07-22",
    paymentMethod: "Cash",
    status: "Paid",
    receiptNo: "REC-2026-00099",
    submittedBy: "Rafiqul Islam",
    submittedAt: "2026-07-20",
    approvedBy: "Hafiz Mizanur Rahman",
    approvedAt: "2026-07-21",
  },
  {
    id: "SAL-2026-07-004",
    staffId: "STF-004",
    staffName: "Abdul Mannan",
    position: "Caretaker",
    period: "2026-07",
    periodLabel: "July 2026",
    amount: 5000,
    fundId: "FND-001",
    fundName: "General Fund",
    paymentDate: "2026-07-22",
    paymentMethod: "Cash",
    status: "Paid",
    receiptNo: "REC-2026-00100",
    submittedBy: "Rafiqul Islam",
    submittedAt: "2026-07-20",
    approvedBy: "Hafiz Mizanur Rahman",
    approvedAt: "2026-07-21",
  },
  {
    id: "SAL-2026-07-005",
    staffId: "STF-005",
    staffName: "Rahima Begum",
    position: "Cleaner",
    period: "2026-07",
    periodLabel: "July 2026",
    amount: 3500,
    fundId: "FND-001",
    fundName: "General Fund",
    paymentDate: "2026-07-23",
    paymentMethod: "Cash",
    status: "Paid",
    receiptNo: "REC-2026-00102",
    submittedBy: "Rafiqul Islam",
    submittedAt: "2026-07-20",
    approvedBy: "Hafiz Mizanur Rahman",
    approvedAt: "2026-07-21",
  },
];

/** Rows in the period the page opens on, highest salary first so the imam's row leads. */
export const currentSalaryRun = salaryPayments
  .filter((row) => row.period === CURRENT_SALARY_PERIOD)
  .sort((a, b) => b.amount - a.amount);

export const salaryPaymentsAwaitingApproval = salaryPayments.filter((row) => row.status === "Pending");

export function getSalaryPayment(id: string): SalaryPayment | undefined {
  return salaryPayments.find((row) => row.id === id);
}

/** Every payment recorded for one person, newest period first. Used by the staff detail modal. */
export function salaryHistoryFor(staffId: string): SalaryPayment[] {
  return salaryPayments
    .filter((row) => row.staffId === staffId)
    .sort((a, b) => b.period.localeCompare(a.period));
}

/**
 * Headline for the current run. `paid` matches the 53,000 Salaries line in `overview.ts`; the two
 * other figures are money owed, not money spent.
 */
export const salarySummary = {
  period: "2026-08",
  periodLabel: "August 2026",
  monthlyPayroll: 61500,
  paid: 53000,
  approvedNotPaid: 3500,
  pending: 5000,
  staffCount: 6,
  activeStaffCount: 5,
  paidCount: 3,
};

export const salaryPeriodOptions: ReadonlyArray<{ value: string; label: string }> = [
  { value: "2026-08", label: "August 2026" },
  { value: "2026-07", label: "July 2026" },
  { value: "2026-06", label: "June 2026" },
];

export const salaryStatusFilterOptions: ReadonlyArray<{ value: SalaryStatus | "all"; label: string }> = [
  { value: "all", label: "All states" },
  { value: "Pending", label: "Pending" },
  { value: "Approved", label: "Approved" },
  { value: "Paid", label: "Paid" },
  { value: "Failed", label: "Failed" },
];

export const staffPositionFilterOptions: ReadonlyArray<{ value: StaffPosition | "all"; label: string }> = [
  { value: "all", label: "All positions" },
  { value: "Imam", label: "Imam" },
  { value: "Muazzin", label: "Muazzin" },
  { value: "Teacher", label: "Teacher" },
  { value: "Caretaker", label: "Caretaker" },
  { value: "Cleaner", label: "Cleaner" },
  { value: "Other Staff", label: "Other Staff" },
];
