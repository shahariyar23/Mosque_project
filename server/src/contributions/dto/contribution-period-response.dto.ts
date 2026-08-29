import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContributionDueStatus } from '@prisma/client';

import { EnrollmentPlanRefDto, EnrollmentUserRefDto } from './contribution-enrollment-response.dto';

export class ContributionPeriodResponseDto {
  @ApiProperty({ example: 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0' })
  id!: string;

  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111' })
  mosqueId!: string;

  @ApiProperty({ example: 'e0a80121-7ac0-11d1-898c-00c04fd8d5c0' })
  enrollmentId!: string;

  @ApiProperty({ example: 'd0a80121-7ac0-11d1-898c-00c04fd8d5c0' })
  userId!: string;

  @ApiProperty({ type: EnrollmentUserRefDto })
  user!: EnrollmentUserRefDto;

  @ApiProperty({ example: 'p0a80121-7ac0-11d1-898c-00c04fd8d5c0' })
  planId!: string;

  @ApiProperty({ type: EnrollmentPlanRefDto })
  plan!: EnrollmentPlanRefDto;

  @ApiProperty({ example: '2026-08-01' })
  periodStart!: string;

  @ApiProperty({ example: '2026-08-31' })
  periodEnd!: string;

  @ApiProperty({ example: '2026-08-10' })
  dueDate!: string;

  @ApiProperty({ example: '500.00' })
  expectedAmount!: string;

  @ApiProperty({ example: '0.00' })
  paidAmount!: string;

  @ApiProperty({ example: 'BDT' })
  currency!: string;

  @ApiProperty({
    enum: ContributionDueStatus,
    example: ContributionDueStatus.pending,
  })
  status!: ContributionDueStatus;

  @ApiPropertyOptional({ example: 't0a80121-7ac0-11d1-898c-00c04fd8d5c0' })
  transactionId!: string | null;

  @ApiPropertyOptional({ example: '2026-08-05T14:30:00.000Z' })
  paidAt!: string | null;

  @ApiProperty({ example: '2026-08-01T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-08-01T00:00:00.000Z' })
  updatedAt!: string;
}

export class ContributionPeriodListResponseDto {
  @ApiProperty({ type: [ContributionPeriodResponseDto] })
  rows!: ContributionPeriodResponseDto[];

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
