import type { Fund } from "@/lib/finance/types";

/**
 * Mock fund balances. Replace this module with the `GET /api/finance/funds` response —
 * the shape is identical, so nothing that consumes it has to change.
 *
 * balance = openingBalance + collected − spent for every row, and the six active balances sum to
 * the 425,000 "Total Balance" card in `overview.ts`.
 *
 * `collected` and `spent` are lifetime figures for the whole book, so they are larger than anything
 * visible in the `transactions.ts` slice — but never smaller: a fund's `spent` is always at least
 * the sum of its completed disbursements there.
 */
export const funds: Fund[] = [
  {
    id: "FND-001",
    slug: "general",
    name: "General Fund",
    purpose: "Operations",
    description: "Day-to-day running of the mosque — utilities, cleaning, office supplies and small repairs.",
    openingBalance: 0,
    collected: 640000,
    spent: 460000,
    balance: 180000,
    targetAmount: 800000,
    status: "Active",
    updatedAt: "2026-08-22",
  },
  {
    id: "FND-002",
    slug: "imam-salary",
    name: "Imam Salary Fund",
    purpose: "Salary",
    description: "Restricted fund covering the monthly salaries of the Imam, Muazzin and teaching staff.",
    openingBalance: 0,
    collected: 105000,
    spent: 30000,
    balance: 75000,
    targetAmount: 420000,
    status: "Active",
    updatedAt: "2026-08-21",
  },
  {
    id: "FND-003",
    slug: "maintenance",
    name: "Maintenance Fund",
    purpose: "Maintenance",
    description: "Repairs to the prayer hall, wudu area, sound system and air conditioning.",
    openingBalance: 0,
    collected: 120000,
    spent: 75000,
    balance: 45000,
    targetAmount: 200000,
    status: "Active",
    updatedAt: "2026-08-20",
  },
  {
    id: "FND-004",
    slug: "education",
    name: "Education Fund",
    purpose: "Education",
    description: "Maktab classes, Qur'an teaching materials and student sponsorship.",
    openingBalance: 0,
    collected: 95000,
    spent: 35000,
    balance: 60000,
    targetAmount: 300000,
    status: "Active",
    updatedAt: "2026-08-19",
  },
  {
    id: "FND-005",
    slug: "zakat",
    name: "Zakat Fund",
    purpose: "Zakat",
    description: "Held separately and distributed only to eligible recipients as required by Shariah.",
    openingBalance: 0,
    collected: 88000,
    spent: 48000,
    balance: 40000,
    status: "Active",
    updatedAt: "2026-08-18",
  },
  {
    id: "FND-006",
    slug: "construction",
    name: "Construction Fund",
    purpose: "Construction",
    description: "Second-floor extension and the new women's prayer area.",
    openingBalance: 0,
    collected: 150000,
    spent: 125000,
    balance: 25000,
    targetAmount: 2000000,
    status: "Active",
    updatedAt: "2026-08-15",
  },
  {
    id: "FND-007",
    slug: "ramadan-iftar",
    name: "Ramadan Iftar Fund",
    purpose: "Seasonal",
    description: "Seasonal fund for daily iftar meals. Reopens two months before Ramadan.",
    openingBalance: 0,
    collected: 240000,
    spent: 240000,
    balance: 0,
    targetAmount: 250000,
    status: "Inactive",
    updatedAt: "2026-04-02",
  },
];

export const activeFunds = funds.filter((fund) => fund.status === "Active");

export function getFund(slug: string): Fund | undefined {
  return funds.find((fund) => fund.slug === slug || fund.id === slug);
}

/** Options for the fund selects on every finance form and filter. */
export const fundOptions = activeFunds.map((fund) => ({ value: fund.id, label: fund.name }));

export const fundFilterOptions = [{ value: "all", label: "All funds" }, ...fundOptions];
