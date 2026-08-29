import { ApiProperty } from '@nestjs/swagger';

export class ContributionSummaryResponseDto {
  @ApiProperty({ example: 42, description: 'Count of unique members with active contribution enrollments' })
  enrolledMembers!: number;

  @ApiProperty({ example: 42, description: 'Alias for total enrolled members' })
  totalEnrolledMembers!: number;

  @ApiProperty({ example: '25000.00', description: 'Total expected commitment amount for the period' })
  expectedAmount!: string;

  @ApiProperty({ example: '18500.00', description: 'Actual completed contribution payments collected' })
  collectedAmount!: string;

  @ApiProperty({ example: '6500.00', description: 'Outstanding unpaid commitment amount (Expected - Collected)' })
  outstandingAmount!: string;

  @ApiProperty({ example: 4, description: 'Number of contribution periods currently overdue past due date' })
  overdueCount!: number;

  @ApiProperty({ example: 35, description: 'Count of distinct members who have fully paid their obligation' })
  paidMembers!: number;

  @ApiProperty({ example: 7, description: 'Count of distinct members with unpaid/partial/overdue obligations' })
  unpaidMembers!: number;

  @ApiProperty({ example: 'BDT', description: 'Mosque operating currency' })
  currency!: string;
}
