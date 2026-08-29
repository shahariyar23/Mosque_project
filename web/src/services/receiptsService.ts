import { apiGet, apiList, apiPatch, apiPost, type ListResult } from "./apiClient";

export type ReceiptStatus = "issued" | "voided";

export type ReceiptDonorRef = {
  id: string;
  fullName: string;
  email?: string | null;
};

export type ReceiptFundRef = {
  id: string;
  name: string;
  slug: string;
};

export type ReceiptDonationRef = {
  id: string;
  amount: string;
  currency: string;
  donorName?: string | null;
  donorEmail?: string | null;
  paymentMethod: string;
  donatedAt: string;
};

export type Receipt = {
  id: string;
  receiptNumber: string;
  amount: string;
  currency: string;
  status: ReceiptStatus;
  issuedAt: string;
  voidedAt: string | null;
  voidReason: string | null;
  donor: ReceiptDonorRef | null;
  fund: ReceiptFundRef | null;
  donation: ReceiptDonationRef | null;
  createdAt: string;
  updatedAt: string;
};

export type ReceiptQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: ReceiptStatus;
  fundId?: string;
  donationId?: string;
  userId?: string;
  from?: string;
  to?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type CreateReceiptInput = {
  transactionId?: string;
  donationId?: string;
  amount?: string;
  currency?: string;
  fundId?: string;
  userId?: string;
  issuedAt?: string;
};

export type VoidReceiptInput = {
  voidReason: string;
};

/**
 * Lists receipts with pagination, status, fund, search, and date filters.
 */
export function fetchReceipts(query: ReceiptQuery = {}): Promise<ListResult<Receipt>> {
  return apiList<Receipt>("/receipts", {
    page: query.page,
    limit: query.limit,
    search: query.search,
    status: query.status,
    fundId: query.fundId,
    donationId: query.donationId,
    userId: query.userId,
    from: query.from,
    to: query.to,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
  });
}

/**
 * Reads full details for a single receipt.
 */
export function fetchReceipt(id: string): Promise<Receipt> {
  return apiGet<Receipt>(`/receipts/${id}`);
}

/**
 * Issues a new receipt atomically.
 */
export function createReceipt(input: CreateReceiptInput): Promise<Receipt> {
  return apiPost<Receipt>("/receipts", input);
}

/**
 * Voids an issued receipt with a mandatory reason.
 */
export function voidReceipt(id: string, voidReason: string): Promise<Receipt> {
  return apiPatch<Receipt>(`/receipts/${id}/void`, { voidReason });
}
