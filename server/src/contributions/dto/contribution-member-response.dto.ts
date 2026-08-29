import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MemberEnrolledPlanDto {
  @ApiProperty({ example: 'p0a80121-7ac0-11d1-898c-00c04fd8d5c0' })
  id!: string;

  @ApiProperty({ example: 'Standard Monthly' })
  name!: string;

  @ApiProperty({ example: '500.00' })
  amount!: string;

  @ApiProperty({ example: 'monthly' })
  frequency!: string;

  @ApiProperty({ example: 'active' })
  status!: string;
}

export class ContributionMemberItemDto {
  @ApiProperty({ example: 'u0a80121-7ac0-11d1-898c-00c04fd8d5c0' })
  id!: string;

  @ApiProperty({ example: 'Abdullah Al-Mansoor' })
  fullName!: string;

  @ApiProperty({ example: 'abdullah@example.com' })
  email!: string;

  @ApiPropertyOptional({ example: '+8801712345678' })
  phone!: string | null;

  @ApiProperty({ type: [MemberEnrolledPlanDto] })
  activePlans!: MemberEnrolledPlanDto[];

  @ApiProperty({ example: '500.00' })
  totalExpected!: string;

  @ApiProperty({ example: '500.00' })
  totalPaid!: string;

  @ApiProperty({ example: '0.00' })
  totalOutstanding!: string;

  @ApiProperty({ example: 'paid', description: 'paid, partial, pending, overdue, none' })
  currentPeriodStatus!: string;

  @ApiPropertyOptional({ example: '2026-08-25T10:00:00.000Z' })
  lastPaymentDate!: string | null;
}

export class ContributionMemberListResponseDto {
  @ApiProperty({ type: [ContributionMemberItemDto] })
  rows!: ContributionMemberItemDto[];

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
