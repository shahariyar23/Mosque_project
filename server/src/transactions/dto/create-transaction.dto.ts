import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, TransactionType } from '@prisma/client';
import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

import { CURRENCY_PATTERN } from '../../common/utils/currency';
import { MONEY_PATTERN } from '../../common/utils/money';

export class CreateTransactionDto {
  @ApiProperty({
    enum: TransactionType,
    description: 'Whether the transaction records income, expense, or fund transfer.',
    example: TransactionType.income,
  })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({
    description: 'Exact decimal money amount above zero.',
    example: '1500.00',
  })
  @Matches(MONEY_PATTERN, {
    message: 'amount must be a decimal string with up to two decimal places (e.g. 1500.00)',
  })
  amount: string;

  @ApiPropertyOptional({
    description: 'ISO 4217 currency code. Defaults to the mosque configured currency.',
    example: 'BDT',
  })
  @IsOptional()
  @Matches(CURRENCY_PATTERN, { message: 'currency must be a 3-letter uppercase ISO 4217 code' })
  currency?: string;

  @ApiProperty({
    description: 'Description of the financial transaction.',
    example: 'Weekly Friday Jummah collection',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  @ApiPropertyOptional({
    description: 'Accounting category (e.g. General Donation, Utilities, Maintenance).',
    example: 'General Donation',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @ApiPropertyOptional({
    description: 'External reference, receipt book number, check number, or bank reference.',
    example: 'REF-2026-081',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @ApiPropertyOptional({
    enum: PaymentMethod,
    description: 'How the money was transferred.',
    example: PaymentMethod.cash,
    default: PaymentMethod.cash,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Fund ID the transaction is credited or debited to.',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4')
  fundId?: string;

  @ApiPropertyOptional({
    description: 'Destination fund ID if this transaction is an inter-fund transfer.',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID('4')
  toFundId?: string;

  @ApiPropertyOptional({
    description: 'Optional underlying donation record ID.',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsOptional()
  @IsUUID('4')
  donationId?: string;

  @ApiPropertyOptional({
    description: 'Optional underlying expense record ID.',
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  @IsOptional()
  @IsUUID('4')
  expenseId?: string;

  @ApiPropertyOptional({
    description: 'Optional linked receipt ID.',
    example: '123e4567-e89b-12d3-a456-426614174004',
  })
  @IsOptional()
  @IsUUID('4')
  receiptId?: string;

  @ApiPropertyOptional({
    description: 'When the financial event occurred (ISO 8601). Defaults to current time.',
    example: '2026-08-27T12:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  transactedAt?: string;
}
