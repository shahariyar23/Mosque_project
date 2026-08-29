import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, type TransformFnParams } from 'class-transformer';
import { IsDateString, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

import {
  CURRENCY_MESSAGE,
  CURRENCY_PATTERN,
  normalizeCurrency,
} from '../../common/utils/currency';
import {
  POSITIVE_MONEY_MESSAGE,
  POSITIVE_MONEY_PATTERN,
  normalizeMoney,
} from '../../common/utils/money';

function normalizedMoney({ value }: TransformFnParams): unknown {
  return normalizeMoney(value as unknown);
}

function normalizedCurrency({ value }: TransformFnParams): unknown {
  return normalizeCurrency(value as unknown);
}

export class CreateFundTransferDto {
  @ApiProperty({
    description: 'Source donation fund ID to transfer money out of.',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'fromFundId must be a valid UUID' })
  fromFundId!: string;

  @ApiProperty({
    description: 'Destination donation fund ID to transfer money into.',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID('4', { message: 'toFundId must be a valid UUID' })
  toFundId!: string;

  @ApiProperty({
    description: 'Transfer amount as a positive decimal string. Max 2 decimal places.',
    example: '3000.00',
  })
  @Transform(normalizedMoney)
  @IsString()
  @Matches(POSITIVE_MONEY_PATTERN, { message: `amount ${POSITIVE_MONEY_MESSAGE}` })
  amount!: string;

  @ApiPropertyOptional({
    description: 'ISO 4217 currency code. Defaults to mosque configured currency.',
    example: 'BDT',
  })
  @IsOptional()
  @Transform(normalizedCurrency)
  @IsString()
  @Matches(CURRENCY_PATTERN, { message: `currency ${CURRENCY_MESSAGE}` })
  currency?: string;

  @ApiPropertyOptional({
    description: 'Human-readable description or reason for this transfer.',
    example: 'Reallocate surplus to building renovation fund',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Optional external reference or voucher number.',
    example: 'TRF-2026-0801',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string | null;

  @ApiPropertyOptional({
    description: 'When the transfer took place. ISO date/datetime string.',
    example: '2026-08-29T10:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  transactedAt?: string;
}
