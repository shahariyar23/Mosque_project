/**
 * `/fund-transfers` — moves money between mosque funds atomically.
 */

import { apiPost } from "./apiClient";

export type CreateFundTransferInput = {
  fromFundId: string;
  toFundId: string;
  amount: string;
  description?: string;
  reference?: string;
  currency?: string;
};

export type FundTransferResult = {
  id: string;
  transferReference: string;
  fromFundId: string;
  fromFundName: string;
  toFundId: string;
  toFundName: string;
  amount: string;
  currency: string;
  description: string;
  reference?: string;
  transactedAt: string;
  fromFundRemainingBalance: string;
  toFundNewBalance: string;
};

/** Executes an atomic transfer between two funds belonging to the mosque. */
export function createFundTransfer(input: CreateFundTransferInput): Promise<FundTransferResult> {
  return apiPost<FundTransferResult>("/fund-transfers", input);
}
