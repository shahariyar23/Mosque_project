import { apiGet, apiList, apiPatch, apiPost, type ListResult } from "./apiClient";

export type TransactionType = "income" | "expense" | "transfer";
export type TransactionStatus = "pending" | "completed" | "voided" | "cancelled";

export type TransactionFundRef = {
  id: string;
  name: string;
  slug: string;
};

export type TransactionDonationRef = {
  id: string;
  amount: string;
  currency: string;
  donorName?: string | null;
  donorEmail?: string | null;
  paymentMethod: string;
  donatedAt: string;
};

export type TransactionExpenseRef = {
  id: string;
  category: string;
  description: string;
  amount: string;
  currency: string;
  expenseDate: string;
  status: string;
};

export type TransactionReceiptRef = {
  id: string;
  receiptNumber: string;
  status: string;
  issuedAt: string;
};

export type TransactionUserRef = {
  id: string;
  fullName: string;
  email?: string | null;
};

export type Transaction = {
  id: string;
  mosqueId: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: string;
  currency: string;
  description: string;
  category: string | null;
  reference: string | null;
  paymentMethod: string;
  fundId: string | null;
  fund: TransactionFundRef | null;
  toFundId: string | null;
  toFund: TransactionFundRef | null;
  donationId: string | null;
  donation: TransactionDonationRef | null;
  expenseId: string | null;
  expense: TransactionExpenseRef | null;
  receiptId: string | null;
  receipt: TransactionReceiptRef | null;
  transactedAt: string;
  createdById: string | null;
  createdBy: TransactionUserRef | null;
  createdAt: string;
  updatedAt: string;
};

export type TransactionQuery = {
  page?: number;
  limit?: number;
  search?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  fundId?: string;
  paymentMethod?: string;
  minAmount?: string;
  maxAmount?: string;
  dateFrom?: string;
  dateTo?: string;
  from?: string;
  to?: string;
};

export type CreateTransactionInput = {
  type: TransactionType;
  amount: string;
  currency?: string;
  description: string;
  category?: string;
  reference?: string;
  paymentMethod?: string;
  fundId?: string;
  toFundId?: string;
  donationId?: string;
  expenseId?: string;
  receiptId?: string;
  transactedAt?: string;
};

export type UpdateTransactionInput = {
  description?: string;
  category?: string;
  reference?: string;
  paymentMethod?: string;
  fundId?: string;
  transactedAt?: string;
};

export type TransactionSummary = {
  totalTransactions: number;
  incomeTotal: string;
  expenseTotal: string;
  netBalance: string;
  pendingCount: number;
  voidedCount: number;
};

/**
 * Lists transactions with server-side pagination, search, and multi-field filters.
 */
export function fetchTransactions(query: TransactionQuery = {}): Promise<ListResult<Transaction>> {
  return apiList<Transaction>("/transactions", {
    page: query.page,
    limit: query.limit,
    search: query.search,
    type: query.type,
    status: query.status,
    fundId: query.fundId,
    paymentMethod: query.paymentMethod,
    minAmount: query.minAmount,
    maxAmount: query.maxAmount,
    dateFrom: query.dateFrom || query.from,
    dateTo: query.dateTo || query.to,
  });
}

/**
 * Retrieves full details for a single transaction.
 */
export function fetchTransaction(id: string): Promise<Transaction> {
  return apiGet<Transaction>(`/transactions/${id}`);
}

/**
 * Retrieves whole-mosque aggregated financial ledger figures.
 */
export function fetchTransactionSummary(): Promise<TransactionSummary> {
  return apiGet<TransactionSummary>("/transactions/summary");
}

/**
 * Records a new financial ledger transaction.
 */
export function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  return apiPost<Transaction>("/transactions", input);
}

/**
 * Updates descriptive details of a transaction.
 */
export function updateTransaction(id: string, input: UpdateTransactionInput): Promise<Transaction> {
  return apiPatch<Transaction>(`/transactions/${id}`, input);
}

/**
 * Voids a financial transaction with a mandatory reason.
 */
export function voidTransaction(id: string, voidReason: string): Promise<Transaction> {
  return apiPatch<Transaction>(`/transactions/${id}/void`, { voidReason });
}
