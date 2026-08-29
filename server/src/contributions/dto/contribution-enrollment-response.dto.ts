import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContributionEnrollmentStatus, ContributionFrequency } from '@prisma/client';

export class EnrollmentUserRefDto {
  @ApiProperty({ example: 'd0a80121-7ac0-11d1-898c-00c04fd8d5c0' })
  id!: string;

  @ApiProperty({ example: 'Abdullah Al-Mansoor' })
  fullName!: string;

  @ApiProperty({ example: 'abdullah@example.com' })
  email!: string;

  @ApiPropertyOptional({ example: '+8801712345678' })
  phone!: string | null;
}

export class EnrollmentPlanRefDto {
  @ApiProperty({ example: 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0' })
  id!: string;

  @ApiProperty({ example: 'Standard Monthly' })
  name!: string;

  @ApiProperty({ enum: ContributionFrequency, example: ContributionFrequency.monthly })
  frequency!: ContributionFrequency;

  @ApiPropertyOptional({ example: 'f0a80121-7ac0-11d1-898c-00c04fd8d5c0' })
  fundId!: string | null;
}

export class ContributionEnrollmentResponseDto {
  @ApiProperty({ example: 'e0a80121-7ac0-11d1-898c-00c04fd8d5c0' })
  id!: string;

  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111' })
  mosqueId!: string;

  @ApiProperty({ example: 'd0a80121-7ac0-11d1-898c-00c04fd8d5c0' })
  userId!: string;

  @ApiProperty({ type: EnrollmentUserRefDto })
  user!: EnrollmentUserRefDto;

  @ApiProperty({ example: 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0' })
  planId!: string;

  @ApiProperty({ type: EnrollmentPlanRefDto })
  plan!: EnrollmentPlanRefDto;

  @ApiProperty({ example: '500.00' })
  amount!: string;

  @ApiProperty({ example: 'BDT' })
  currency!: string;

  @ApiProperty({ enum: ContributionFrequency, example: ContributionFrequency.monthly })
  frequency!: ContributionFrequency;

  @ApiProperty({ example: '2026-09-01T00:00:00.000Z' })
  startDate!: string;

  @ApiPropertyOptional({ example: '2027-08-31T23:59:59.000Z' })
  endDate!: string | null;

  @ApiProperty({
    enum: ContributionEnrollmentStatus,
    example: ContributionEnrollmentStatus.active,
  })
  status!: ContributionEnrollmentStatus;

  @ApiProperty({ example: '2026-08-29T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-08-29T10:00:00.000Z' })
  updatedAt!: string;
}

export class ContributionEnrollmentListResponseDto {
  @ApiProperty({ type: [ContributionEnrollmentResponseDto] })
  rows!: ContributionEnrollmentResponseDto[];

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
