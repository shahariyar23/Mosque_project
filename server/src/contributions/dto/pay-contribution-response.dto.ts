import { ApiProperty } from '@nestjs/swagger';

import { ContributionPeriodResponseDto } from './contribution-period-response.dto';

export class PaidTransactionSummaryDto {
  @ApiProperty({ example: 't0a80121-7ac0-11d1-898c-00c04fd8d5c0' })
  id!: string;

  @ApiProperty({ example: 'income' })
  type!: string;

  @ApiProperty({ example: 'completed' })
  status!: string;

  @ApiProperty({ example: '500.00' })
  amount!: string;

  @ApiProperty({ example: 'BDT' })
  currency!: string;

  @ApiProperty({ example: 'f0a80121-7ac0-11d1-898c-00c04fd8d5c0' })
  fundId!: string | null;

  @ApiProperty({ example: 'cash' })
  paymentMethod!: string;

  @ApiProperty({ example: 'Monthly Contribution - Standard Monthly (Abdullah)' })
  description!: string;
}

export class PaidReceiptSummaryDto {
  @ApiProperty({ example: 'r0a80121-7ac0-11d1-898c-00c04fd8d5c0' })
  id!: string;

  @ApiProperty({ example: 'REC-2026-00001' })
  receiptNumber!: string;

  @ApiProperty({ example: '500.00' })
  amount!: string;

  @ApiProperty({ example: 'BDT' })
  currency!: string;

  @ApiProperty({ example: 'issued' })
  status!: string;

  @ApiProperty({ example: '2026-08-26T12:00:00.000Z' })
  issuedAt!: string;
}

export class PayContributionResponseDto {
  @ApiProperty({ type: ContributionPeriodResponseDto })
  period!: ContributionPeriodResponseDto;

  @ApiProperty({ type: PaidTransactionSummaryDto })
  transaction!: PaidTransactionSummaryDto;

  @ApiProperty({ type: PaidReceiptSummaryDto, required: false })
  receipt?: PaidReceiptSummaryDto | null;
}
