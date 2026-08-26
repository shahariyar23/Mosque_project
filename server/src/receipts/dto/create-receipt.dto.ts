import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

import { CURRENCY_PATTERN } from '../../common/utils/currency';
import { MONEY_PATTERN } from '../../common/utils/money';

export class CreateReceiptDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'The donation this receipt is issued against, if any.',
  })
  @IsOptional()
  @IsUUID('4', { message: 'donationId must be a valid UUID v4' })
  donationId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Which fund the money was filed under, if any.',
  })
  @IsOptional()
  @IsUUID('4', { message: 'fundId must be a valid UUID v4' })
  fundId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Who the receipt is made out to, when they have an account.',
  })
  @IsOptional()
  @IsUUID('4', { message: 'userId must be a valid UUID v4' })
  userId?: string;

  @ApiProperty({
    example: '1500.00',
    description: 'A non-negative decimal amount with at most 2 decimal places.',
  })
  @IsNotEmpty({ message: 'amount is required' })
  @IsString({ message: 'amount must be a string' })
  @Matches(MONEY_PATTERN, {
    message: 'amount must be a non-negative amount with at most 2 decimal places, for example "1500.00"',
  })
  amount!: string;

  @ApiPropertyOptional({
    example: 'BDT',
    description: 'ISO 4217, 3 letters uppercase. Defaults to the mosque currency.',
  })
  @IsOptional()
  @IsString({ message: 'currency must be a string' })
  @Matches(CURRENCY_PATTERN, {
    message: 'currency must be a 3-letter uppercase ISO 4217 code, for example "BDT"',
  })
  currency?: string;

  @ApiPropertyOptional({
    format: 'date-time',
    example: '2026-08-26T12:00:00.000Z',
    description: 'When the receipt was issued. Defaults to now.',
  })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'issuedAt must be an ISO 8601 timestamp' })
  issuedAt?: string;
}
