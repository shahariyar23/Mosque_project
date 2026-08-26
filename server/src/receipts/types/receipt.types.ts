import { Prisma, ReceiptStatus } from '@prisma/client';

export const DEFAULT_RECEIPT_PAGE_SIZE = 20;

export const RECEIPT_SELECT = {
  id: true,
  receiptNumber: true,
  amount: true,
  currency: true,
  status: true,
  issuedAt: true,
  voidedAt: true,
  voidReason: true,
  createdAt: true,
  updatedAt: true,
  donor: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
  fund: {
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
} as const satisfies Prisma.ReceiptSelect;

export type SelectedReceipt = Prisma.ReceiptGetPayload<{
  select: typeof RECEIPT_SELECT;
}>;
