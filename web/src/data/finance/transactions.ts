import type { Transaction } from "@/lib/finance/types";

/**
 * Empty ledger data — transactions are loaded dynamically from the API (`/api/v1/transactions`).
 */
export const transactions: Transaction[] = [];

export const recentTransactions: Transaction[] = [];
