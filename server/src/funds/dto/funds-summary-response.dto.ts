import { ApiProperty } from '@nestjs/swagger';
import { FundDetailsResponseDto } from './fund-details-response.dto';

export class FundsSummaryResponseDto {
  @ApiProperty({ example: 'BDT' })
  currency!: string;

  @ApiProperty({ example: '15000.00', description: 'Total available balance across all funds' })
  totalAvailableBalance!: string;

  @ApiProperty({ example: '5000.00', description: 'Total opening balance across all funds' })
  totalOpeningBalance!: string;

  @ApiProperty({ example: '20000.00', description: 'Total completed income across all funds' })
  totalIncome!: string;

  @ApiProperty({ example: '10000.00', description: 'Total completed expenses across all funds' })
  totalExpenses!: string;

  @ApiProperty({ example: '3000.00', description: 'Total fund-to-fund transfers executed' })
  totalTransfers!: string;

  @ApiProperty({ example: 4, description: 'Number of active funds' })
  fundCount!: number;

  @ApiProperty({ type: [FundDetailsResponseDto] })
  funds!: FundDetailsResponseDto[];
}
