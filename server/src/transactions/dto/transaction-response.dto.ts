import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, TransactionStatus, TransactionType } from '@prisma/client';

import { fromMoney } from '../../common/utils/money';
import type { SelectedTransaction } from '../types/transaction.types';

export class TransactionFundRefDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;
}

export class TransactionDonationRefDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  amount: string;

  @ApiProperty()
  currency: string;

  @ApiPropertyOptional()
  donorName?: string | null;

  @ApiPropertyOptional()
  donorEmail?: string | null;

  @ApiProperty({ enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @ApiProperty()
  donatedAt: string;
}

export class TransactionExpenseRefDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  amount: string;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  expenseDate: string;

  @ApiProperty()
  status: string;
}

export class TransactionReceiptRefDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  receiptNumber: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  issuedAt: string;
}

export class TransactionUserRefDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fullName: string;

  @ApiPropertyOptional()
  email?: string | null;
}

export class TransactionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  mosqueId: string;

  @ApiProperty({ enum: TransactionType })
  type: TransactionType;

  @ApiProperty({ enum: TransactionStatus })
  status: TransactionStatus;

  @ApiProperty({ description: 'Formatted decimal string (e.g. 1500.00)' })
  amount: string;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  description: string;

  @ApiPropertyOptional()
  category?: string | null;

  @ApiPropertyOptional()
  reference?: string | null;

  @ApiProperty({ enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional()
  fundId?: string | null;

  @ApiPropertyOptional({ type: () => TransactionFundRefDto })
  fund?: TransactionFundRefDto | null;

  @ApiPropertyOptional()
  toFundId?: string | null;

  @ApiPropertyOptional({ type: () => TransactionFundRefDto })
  toFund?: TransactionFundRefDto | null;

  @ApiPropertyOptional()
  donationId?: string | null;

  @ApiPropertyOptional({ type: () => TransactionDonationRefDto })
  donation?: TransactionDonationRefDto | null;

  @ApiPropertyOptional()
  expenseId?: string | null;

  @ApiPropertyOptional({ type: () => TransactionExpenseRefDto })
  expense?: TransactionExpenseRefDto | null;

  @ApiPropertyOptional()
  receiptId?: string | null;

  @ApiPropertyOptional({ type: () => TransactionReceiptRefDto })
  receipt?: TransactionReceiptRefDto | null;

  @ApiProperty()
  transactedAt: string;

  @ApiPropertyOptional()
  createdById?: string | null;

  @ApiPropertyOptional({ type: () => TransactionUserRefDto })
  createdBy?: TransactionUserRefDto | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  static from(row: SelectedTransaction): TransactionResponseDto {
    const dto = new TransactionResponseDto();
    dto.id = row.id;
    dto.mosqueId = row.mosqueId;
    dto.type = row.type;
    dto.status = row.status;
    dto.amount = fromMoney(row.amount);
    dto.currency = row.currency;
    dto.description = row.description;
    dto.category = row.category;
    dto.reference = row.reference;
    dto.paymentMethod = row.paymentMethod;
    dto.fundId = row.fundId;
    dto.fund = row.fund ? { id: row.fund.id, name: row.fund.name, slug: row.fund.slug } : null;
    dto.toFundId = row.toFundId;
    dto.toFund = row.toFund
      ? { id: row.toFund.id, name: row.toFund.name, slug: row.toFund.slug }
      : null;
    dto.donationId = row.donationId;
    dto.donation = row.donation
      ? {
          id: row.donation.id,
          amount: fromMoney(row.donation.amount),
          currency: row.donation.currency,
          donorName: row.donation.donorName,
          donorEmail: row.donation.donorEmail,
          paymentMethod: row.donation.paymentMethod,
          donatedAt: row.donation.donatedAt.toISOString(),
        }
      : null;
    dto.expenseId = row.expenseId;
    dto.expense = row.expense
      ? {
          id: row.expense.id,
          category: row.expense.category,
          description: row.expense.description,
          amount: fromMoney(row.expense.amount),
          currency: row.expense.currency,
          expenseDate: row.expense.expenseDate.toISOString().split('T')[0] ?? '',
          status: row.expense.status,
        }
      : null;
    dto.receiptId = row.receiptId;
    dto.receipt = row.receipt
      ? {
          id: row.receipt.id,
          receiptNumber: row.receipt.receiptNumber,
          status: row.receipt.status,
          issuedAt: row.receipt.issuedAt.toISOString(),
        }
      : null;
    dto.transactedAt = row.transactedAt.toISOString();
    dto.createdById = row.createdById;
    dto.createdBy = row.createdBy
      ? {
          id: row.createdBy.id,
          fullName: row.createdBy.fullName,
          email: row.createdBy.email,
        }
      : null;
    dto.createdAt = row.createdAt.toISOString();
    dto.updatedAt = row.updatedAt.toISOString();
    return dto;
  }
}

export class TransactionListMetaDto {
  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  totalPages: number;
}

export class TransactionEnvelopeDto {
  @ApiProperty({ type: TransactionResponseDto })
  data: TransactionResponseDto;
}

export class TransactionListEnvelopeDto {
  @ApiProperty({ type: [TransactionResponseDto] })
  data: TransactionResponseDto[];

  @ApiProperty({ type: TransactionListMetaDto })
  meta: TransactionListMetaDto;
}

export class TransactionSummaryDto {
  @ApiProperty()
  totalTransactions: number;

  @ApiProperty()
  incomeTotal: string;

  @ApiProperty()
  expenseTotal: string;

  @ApiProperty()
  netBalance: string;

  @ApiProperty()
  pendingCount: number;

  @ApiProperty()
  voidedCount: number;
}

export class TransactionSummaryEnvelopeDto {
  @ApiProperty({ type: TransactionSummaryDto })
  data: TransactionSummaryDto;
}
