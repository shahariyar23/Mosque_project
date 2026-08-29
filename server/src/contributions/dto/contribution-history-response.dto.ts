import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { FundSummaryRefDto } from './contribution-plan-response.dto';
import { EnrollmentPlanRefDto, EnrollmentUserRefDto } from './contribution-enrollment-response.dto';

export class ContributionHistoryItemDto {
  @ApiProperty({ example: 'cp-0a80121-7ac0-11d1-898c-00c04fd8d5c0' })
  id!: string;

  @ApiPropertyOptional({ example: 'tx-0a80121-7ac0-11d1-898c-00c04fd8d5c0' })
  transactionId!: string | null;

  @ApiProperty({ type: EnrollmentUserRefDto })
  user!: EnrollmentUserRefDto;

  @ApiProperty({ type: EnrollmentPlanRefDto })
  plan!: EnrollmentPlanRefDto;

  @ApiPropertyOptional({ type: FundSummaryRefDto })
  fund!: FundSummaryRefDto | null;

  @ApiProperty({ example: '500.00' })
  amount!: string;

  @ApiProperty({ example: 'BDT' })
  currency!: string;

  @ApiProperty({ example: 'cash' })
  paymentMethod!: string;

  @ApiPropertyOptional({ example: 'DEP-892341' })
  reference!: string | null;

  @ApiProperty({ example: 'completed' })
  status!: string;

  @ApiProperty({ example: '2026-08-25T14:30:00.000Z' })
  paidAt!: string;

  @ApiProperty({ example: '2026-08-01' })
  periodStart!: string;

  @ApiProperty({ example: '2026-08-31' })
  periodEnd!: string;
}

export class ContributionHistoryListResponseDto {
  @ApiProperty({ type: [ContributionHistoryItemDto] })
  rows!: ContributionHistoryItemDto[];

  @ApiProperty({
    example: { page: 1, limit: 20, total: 1, totalPages: 1 },
  })
  meta!: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
