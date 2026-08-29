import { ApiProperty } from '@nestjs/swagger';
import { TransactionStatus } from '@prisma/client';

/**
 * Fund balance response DTOs.
 * All money values are exact decimal strings, never floats.
 */

export class FundBalanceDto {
  @ApiProperty({ format: 'uuid', description: 'The fund ID' })
  fundId!: string;

  @ApiProperty({ example: 'Zakat', description: 'The fund name' })
  fundName!: string;

  @ApiProperty({ example: '10000.00', description: 'Opening balance before any transactions' })
  openingBalance!: string;

  @ApiProperty({ example: '50000.00', description: 'Total completed income allocated to this fund' })
  totalIncome!: string;

  @ApiProperty({ example: '15000.00', description: 'Total completed expenses allocated to this fund' })
  totalExpenses!: string;

  @ApiProperty({ example: '5000.00', description: 'Total completed incoming transfers to this fund' })
  incomingTransfers!: string;

  @ApiProperty({ example: '2000.00', description: 'Total completed outgoing transfers from this fund' })
  outgoingTransfers!: string;

  @ApiProperty({ example: '48000.00', description: 'Available balance = openingBalance + income - expenses + transfersIn - transfersOut' })
  availableBalance!: string;
}

export class FundBalanceSummaryDto {
  @ApiProperty({ type: [FundBalanceDto] })
  funds!: FundBalanceDto[];

  @ApiProperty({ example: '125000.00', description: 'Sum of available balances across all funds' })
  totalAvailableBalance!: string;
}

export class StatusTotalDto {
  @ApiProperty({ enum: TransactionStatus, example: TransactionStatus.completed })
  status!: string;

  @ApiProperty({ example: '25000.00' })
  total!: string;

  @ApiProperty({ example: 12 })
  count!: number;
}

export class PaymentMethodTotalDto {
  @ApiProperty({ example: 'cash' })
  paymentMethod!: string;

  @ApiProperty({ example: '18000.00' })
  total!: string;

  @ApiProperty({ example: 8 })
  count!: number;
}

export class CategoryTotalDto {
  @ApiProperty({ example: 'Utilities' })
  category!: string;

  @ApiProperty({ example: '12000.00' })
  total!: string;

  @ApiProperty({ example: 5 })
  count!: number;
}

export class FundIncomeDto {
  @ApiProperty({ example: '50000.00' })
  total!: string;

  @ApiProperty({ example: 10 })
  count!: number;

  @ApiProperty({ type: [StatusTotalDto] })
  byStatus!: StatusTotalDto[];

  @ApiProperty({ type: [PaymentMethodTotalDto] })
  byPaymentMethod!: PaymentMethodTotalDto[];
}

export class FundExpensesDto {
  @ApiProperty({ example: '15000.00' })
  total!: string;

  @ApiProperty({ example: 8 })
  count!: number;

  @ApiProperty({ type: [StatusTotalDto] })
  byStatus!: StatusTotalDto[];

  @ApiProperty({ type: [CategoryTotalDto] })
  byCategory!: CategoryTotalDto[];
}

export class FundTransfersDto {
  @ApiProperty({ example: '5000.00' })
  total!: string;

  @ApiProperty({ example: 3 })
  count!: number;

  @ApiProperty({ type: [StatusTotalDto] })
  byStatus!: StatusTotalDto[];
}

export class FundFinancialSummaryDto {
  @ApiProperty({ format: 'uuid' })
  fundId!: string;

  @ApiProperty({ example: 'Zakat' })
  fundName!: string;

  @ApiProperty({ example: '10000.00' })
  openingBalance!: string;

  @ApiProperty({ example: 'BDT' })
  currency!: string;

  @ApiProperty({ type: FundIncomeDto })
  income!: FundIncomeDto;

  @ApiProperty({ type: FundExpensesDto })
  expenses!: FundExpensesDto;

  @ApiProperty({ type: FundTransfersDto })
  transfersIn!: FundTransfersDto;

  @ApiProperty({ type: FundTransfersDto })
  transfersOut!: FundTransfersDto;

  @ApiProperty({ example: '48000.00', description: 'Available balance = openingBalance + income - expenses + transfersIn - transfersOut' })
  availableBalance!: string;
}

export class SufficientFundsDto {
  @ApiProperty({ format: 'uuid' })
  fundId!: string;

  @ApiProperty({ example: 'Zakat' })
  fundName!: string;

  @ApiProperty({ example: '48000.00' })
  availableBalance!: string;

  @ApiProperty({ example: '5000.00' })
  requestedAmount!: string;

  @ApiProperty({ example: true, description: 'Whether the fund has sufficient balance for the requested amount' })
  sufficient!: boolean;
}

/** Envelope responses */

export class FundBalanceEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Fund balance retrieved successfully' })
  message!: string;

  @ApiProperty({ type: FundBalanceDto })
  data!: FundBalanceDto;
}

export class FundBalanceSummaryEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Fund balances retrieved successfully' })
  message!: string;

  @ApiProperty({ type: FundBalanceSummaryDto })
  data!: FundBalanceSummaryDto;
}

export class FundFinancialSummaryEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Fund financial summary retrieved successfully' })
  message!: string;

  @ApiProperty({ type: FundFinancialSummaryDto })
  data!: FundFinancialSummaryDto;
}

export class SufficientFundsEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Fund sufficient funds check completed' })
  message!: string;

  @ApiProperty({ type: SufficientFundsDto })
  data!: SufficientFundsDto;
}