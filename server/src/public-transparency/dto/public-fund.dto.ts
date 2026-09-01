import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FundStatus } from '@prisma/client';

export class PublicFundProgressDto {
  @ApiProperty({ format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: 'Mosque Building Fund' })
  name!: string;

  @ApiProperty({ example: 'mosque-building-fund' })
  slug!: string;

  @ApiPropertyOptional({ example: 'Donations for building the second floor prayer hall', nullable: true })
  description?: string | null;

  @ApiProperty({ enum: FundStatus, example: 'active' })
  status!: FundStatus;

  @ApiPropertyOptional({ example: '500000.00', nullable: true, description: 'Target amount or null for open-ended funds.' })
  targetAmount!: string | null;

  @ApiProperty({ example: '325000.00', description: 'Total verified collections and income received.' })
  collectedAmount!: string;

  @ApiPropertyOptional({ example: '175000.00', nullable: true, description: 'Remaining amount needed to reach target.' })
  remainingAmount!: string | null;

  @ApiPropertyOptional({ example: 65.0, nullable: true, description: 'Progress percentage (0-100) or null if no target set.' })
  progressPercentage!: number | null;

  @ApiProperty({ example: 'BDT' })
  currency!: string;

  @ApiPropertyOptional({ example: '2026-01-01', nullable: true })
  startDate?: string | null;

  @ApiPropertyOptional({ example: '2026-12-31', nullable: true })
  endDate?: string | null;
}

export class PublicFundProgressEnvelopeDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Public fund progress retrieved successfully' })
  message!: string;

  @ApiProperty({ type: PublicFundProgressDto })
  data!: PublicFundProgressDto;
}

export class PublicFundListEnvelopeDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Public funds retrieved successfully' })
  message!: string;

  @ApiProperty({ type: [PublicFundProgressDto] })
  data!: PublicFundProgressDto[];
}

export class PublicTransparencySummaryDto {
  @ApiProperty({ example: 'Baitul Mukarram National Mosque' })
  mosqueName!: string;

  @ApiProperty({ example: 'baitul-mukarram' })
  mosqueSlug!: string;

  @ApiProperty({ example: 'BDT' })
  currency!: string;

  @ApiProperty({ example: '1250000.00' })
  totalTargetAmount!: string;

  @ApiProperty({ example: '850000.00' })
  totalCollectedAmount!: string;

  @ApiProperty({ example: '400000.00' })
  totalRemainingAmount!: string;

  @ApiProperty({ example: 68.0 })
  overallProgressPercentage!: number;

  @ApiProperty({ type: [PublicFundProgressDto] })
  funds!: PublicFundProgressDto[];
}

export class PublicTransparencySummaryEnvelopeDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Mosque transparency summary retrieved successfully' })
  message!: string;

  @ApiProperty({ type: PublicTransparencySummaryDto })
  data!: PublicTransparencySummaryDto;
}
