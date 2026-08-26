import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, TransactionStatus, TransactionType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { MAX_PAGE_SIZE } from '../../common/pagination/page';
import { MONEY_PATTERN } from '../../common/utils/money';
import { DEFAULT_TRANSACTION_PAGE_SIZE } from '../types/transaction.types';

export class TransactionQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Page size',
    default: DEFAULT_TRANSACTION_PAGE_SIZE,
    minimum: 1,
    maximum: MAX_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit?: number = DEFAULT_TRANSACTION_PAGE_SIZE;

  @ApiPropertyOptional({
    description: 'Search string across description, category, reference, or receipt number.',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    enum: TransactionType,
    description: 'Filter by transaction type (income, expense, transfer).',
  })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiPropertyOptional({
    enum: TransactionStatus,
    description: 'Filter by status (pending, completed, voided, cancelled).',
  })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiPropertyOptional({
    description: 'Filter by fund ID.',
  })
  @IsOptional()
  @IsUUID('4')
  fundId?: string;

  @ApiPropertyOptional({
    enum: PaymentMethod,
    description: 'Filter by payment method.',
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Filter for transactions with amount >= minAmount.',
    example: '500.00',
  })
  @IsOptional()
  @Matches(MONEY_PATTERN, { message: 'minAmount must be a decimal string' })
  minAmount?: string;

  @ApiPropertyOptional({
    description: 'Filter for transactions with amount <= maxAmount.',
    example: '50000.00',
  })
  @IsOptional()
  @Matches(MONEY_PATTERN, { message: 'maxAmount must be a decimal string' })
  maxAmount?: string;

  @ApiPropertyOptional({
    description: 'Earliest transaction date (ISO 8601).',
  })
  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Latest transaction date (ISO 8601).',
  })
  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Alias for dateFrom.',
  })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({
    description: 'Alias for dateTo.',
  })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
