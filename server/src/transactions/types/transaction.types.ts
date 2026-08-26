import { Prisma } from '@prisma/client';

export const DEFAULT_TRANSACTION_PAGE_SIZE = 20;

export const TRANSACTION_SELECT = {
  id: true,
  mosqueId: true,
  type: true,
  status: true,
  amount: true,
  currency: true,
  description: true,
  category: true,
  reference: true,
  paymentMethod: true,
  fundId: true,
  toFundId: true,
  donationId: true,
  expenseId: true,
  receiptId: true,
  transactedAt: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  fund: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  toFund: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  donation: {
    select: {
      id: true,
      amount: true,
      currency: true,
      donorName: true,
      donorEmail: true,
      paymentMethod: true,
      donatedAt: true,
    },
  },
  expense: {
    select: {
      id: true,
      category: true,
      description: true,
      amount: true,
      currency: true,
      expenseDate: true,
      status: true,
    },
  },
  receipt: {
    select: {
      id: true,
      receiptNumber: true,
      status: true,
      issuedAt: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
} as const satisfies Prisma.TransactionSelect;

export type SelectedTransaction = Prisma.TransactionGetPayload<{
  select: typeof TRANSACTION_SELECT;
}>;
