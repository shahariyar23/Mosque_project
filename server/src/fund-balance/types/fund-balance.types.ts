import { Prisma } from '@prisma/client';

/**
 * Fund balance calculation result.
 * All money values are exact decimal strings, never floats.
 */
export interface FundBalanceDto {
  fundId: string;
  fundName: string;
  openingBalance: string;
  totalIncome: string;
  totalExpenses: string;
  incomingTransfers: string;
  outgoingTransfers: string;
  availableBalance: string;
}

/** Summary list of all fund balances for a mosque. */
export interface FundBalanceSummaryDto {
  funds: FundBalanceDto[];
  totalAvailableBalance: string;
}

/** Result of checking if a fund has sufficient balance for an amount. */
export interface SufficientFundsDto {
  fundId: string;
  fundName: string;
  availableBalance: string;
  requestedAmount: string;
  sufficient: boolean;
}

/**
 * Detailed financial summary for a single fund, including breakdowns by status and payment method.
 */
export interface FundFinancialSummaryDto {
  fundId: string;
  fundName: string;
  openingBalance: string;
  currency: string;

  // Completed transactions (what counts toward available balance)
  income: {
    total: string;
    count: number;
    byStatus: { status: string; total: string; count: number }[];
    byPaymentMethod: { paymentMethod: string; total: string; count: number }[];
  };
  expenses: {
    total: string;
    count: number;
    byStatus: { status: string; total: string; count: number }[];
    byCategory: { category: string; total: string; count: number }[];
  };
  transfersIn: {
    total: string;
    count: number;
    byStatus: { status: string; total: string; count: number }[];
  };
  transfersOut: {
    total: string;
    count: number;
    byStatus: { status: string; total: string; count: number }[];
  };

  // Computed available balance
  availableBalance: string;
}