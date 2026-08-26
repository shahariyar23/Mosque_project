import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, ReceiptStatus } from '@prisma/client';

import { fromMoney } from '../../common/utils/money';
import type { SelectedReceipt } from '../types/receipt.types';

export class ReceiptDonorRefDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Abdul Karim' })
  fullName!: string;

  @ApiPropertyOptional({ example: 'karim@example.com' })
  email?: string | null;
}

export class ReceiptFundRefDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Zakat Fund' })
  name!: string;

  @ApiProperty({ example: 'zakat-fund' })
  slug!: string;
}

export class ReceiptDonationRefDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: '1500.00' })
  amount!: string;

  @ApiProperty({ example: 'BDT' })
  currency!: string;

  @ApiPropertyOptional({ example: 'Cash Donor' })
  donorName?: string | null;

  @ApiPropertyOptional({ example: 'donor@example.com' })
  donorEmail?: string | null;

  @ApiProperty({ enum: PaymentMethod })
  paymentMethod!: PaymentMethod;

  @ApiProperty({ format: 'date-time' })
  donatedAt!: string;
}

export class ReceiptResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'REC-2026-00001' })
  receiptNumber!: string;

  @ApiProperty({ example: '1500.00' })
  amount!: string;

  @ApiProperty({ example: 'BDT' })
  currency!: string;

  @ApiProperty({ enum: ReceiptStatus })
  status!: ReceiptStatus;

  @ApiProperty({ format: 'date-time', example: '2026-08-26T12:00:00.000Z' })
  issuedAt!: string;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  voidedAt!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Entered against wrong donor' })
  voidReason!: string | null;

  @ApiPropertyOptional({ type: () => ReceiptDonorRefDto, nullable: true })
  donor!: ReceiptDonorRefDto | null;

  @ApiPropertyOptional({ type: () => ReceiptFundRefDto, nullable: true })
  fund!: ReceiptFundRefDto | null;

  @ApiPropertyOptional({ type: () => ReceiptDonationRefDto, nullable: true })
  donation!: ReceiptDonationRefDto | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  static from(row: SelectedReceipt): ReceiptResponseDto {
    const dto = new ReceiptResponseDto();
    dto.id = row.id;
    dto.receiptNumber = row.receiptNumber;
    dto.amount = fromMoney(row.amount);
    dto.currency = row.currency;
    dto.status = row.status;
    dto.issuedAt = row.issuedAt.toISOString();
    dto.voidedAt = row.voidedAt ? row.voidedAt.toISOString() : null;
    dto.voidReason = row.voidReason ?? null;
    dto.donor = row.donor
      ? {
          id: row.donor.id,
          fullName: row.donor.fullName,
          email: row.donor.email ?? null,
        }
      : null;
    dto.fund = row.fund
      ? {
          id: row.fund.id,
          name: row.fund.name,
          slug: row.fund.slug,
        }
      : null;
    dto.donation = row.donation
      ? {
          id: row.donation.id,
          amount: fromMoney(row.donation.amount),
          currency: row.donation.currency,
          donorName: row.donation.donorName ?? null,
          donorEmail: row.donation.donorEmail ?? null,
          paymentMethod: row.donation.paymentMethod,
          donatedAt: row.donation.donatedAt.toISOString(),
        }
      : null;
    dto.createdAt = row.createdAt.toISOString();
    dto.updatedAt = row.updatedAt.toISOString();
    return dto;
  }
}

export class ReceiptListMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;
}

export class ReceiptEnvelopeDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Receipt retrieved successfully' })
  message!: string;

  @ApiProperty({ type: ReceiptResponseDto })
  data!: ReceiptResponseDto;
}

export class ReceiptListEnvelopeDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Receipts retrieved successfully' })
  message!: string;

  @ApiProperty({ type: [ReceiptResponseDto] })
  data!: ReceiptResponseDto[];

  @ApiProperty({ type: ReceiptListMetaDto })
  meta!: ReceiptListMetaDto;
}
