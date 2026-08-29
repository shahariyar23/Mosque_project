import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FundStatus } from '@prisma/client';

export class FundDetailsResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: 'General Fund' })
  name!: string;

  @ApiProperty({ example: 'general-fund' })
  slug!: string;

  @ApiPropertyOptional({ example: 'General purpose mosque fund', nullable: true })
  description!: string | null;

  @ApiProperty({ enum: FundStatus, example: FundStatus.active })
  status!: FundStatus;

  @ApiProperty({ example: 'BDT' })
  currency!: string;

  @ApiProperty({ example: '1000.00', description: 'Opening balance of the fund' })
  openingBalance!: string;

  @ApiProperty({ example: '5000.00', description: 'Total completed income allocated to this fund' })
  totalIncome!: string;

  @ApiProperty({ example: '2000.00', description: 'Total completed expenses allocated to this fund' })
  totalExpenses!: string;

  @ApiProperty({ example: '1000.00', description: 'Total completed transfers into this fund' })
  incomingTransfers!: string;

  @ApiProperty({ example: '500.00', description: 'Total completed transfers out of this fund' })
  outgoingTransfers!: string;

  @ApiProperty({
    example: '4500.00',
    description: 'Current available balance: opening + income - expenses + inTransfers - outTransfers',
  })
  availableBalance!: string;

  @ApiPropertyOptional({ example: '100000.00', nullable: true })
  targetAmount!: string | null;

  @ApiPropertyOptional({ example: '2026-01-01', nullable: true })
  startDate!: string | null;

  @ApiPropertyOptional({ example: '2026-12-31', nullable: true })
  endDate!: string | null;

  @ApiProperty({ example: true })
  isPublic!: boolean;

  @ApiProperty({ example: 2 })
  campaignCount!: number;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  updatedAt!: string;
}
