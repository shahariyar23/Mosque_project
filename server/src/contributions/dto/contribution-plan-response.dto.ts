import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContributionFrequency } from '@prisma/client';

export class FundSummaryRefDto {
  @ApiProperty({ example: 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0' })
  id!: string;

  @ApiProperty({ example: 'General Fund' })
  name!: string;

  @ApiProperty({ example: 'general-fund' })
  slug!: string;
}

export class ContributionPlanResponseDto {
  @ApiProperty({ example: 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0' })
  id!: string;

  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111' })
  mosqueId!: string;

  @ApiProperty({ example: 'Standard Monthly' })
  name!: string;

  @ApiPropertyOptional({ example: 'Ongoing maintenance support commitment' })
  description!: string | null;

  @ApiProperty({ example: '500.00' })
  amount!: string;

  @ApiProperty({ example: 'BDT' })
  currency!: string;

  @ApiProperty({ enum: ContributionFrequency, example: ContributionFrequency.monthly })
  frequency!: ContributionFrequency;

  @ApiPropertyOptional({ example: 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0' })
  fundId!: string | null;

  @ApiPropertyOptional({ type: FundSummaryRefDto })
  fund!: FundSummaryRefDto | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2026-08-29T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-08-29T10:00:00.000Z' })
  updatedAt!: string;
}

export class ContributionPlanListResponseDto {
  @ApiProperty({ type: [ContributionPlanResponseDto] })
  rows!: ContributionPlanResponseDto[];

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
