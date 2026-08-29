import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

import { MONEY_MESSAGE, MONEY_PATTERN, normalizeMoney } from '../../common/utils/money';

function normalizedMoney({ value }: TransformFnParams): unknown {
  return normalizeMoney(value as unknown);
}

function normalizedMethod({ value }: TransformFnParams): unknown {
  if (typeof value === 'string') {
    return value.toLowerCase();
  }
  return value;
}

export class PayContributionDto {
  @ApiPropertyOptional({
    description: 'Payment amount to record. If omitted, pays the full remaining unpaid amount.',
    example: '500.00',
  })
  @IsOptional()
  @Transform(normalizedMoney)
  @IsString()
  @Matches(MONEY_PATTERN, { message: MONEY_MESSAGE })
  amount?: string;

  @ApiPropertyOptional({
    description: 'Payment method used: cash, bank_transfer, card, online, other. Defaults to cash.',
    enum: PaymentMethod,
    example: PaymentMethod.cash,
  })
  @IsOptional()
  @Transform(normalizedMethod)
  @IsEnum(PaymentMethod, {
    message: 'paymentMethod must be one of: cash, bank_transfer, card, online, other',
  })
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    description: 'When the payment was received. Defaults to current timestamp.',
    example: '2026-08-29T10:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiPropertyOptional({
    description: 'Payment reference code, check number, or bank deposit reference.',
    example: 'DEP-892341',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @ApiPropertyOptional({
    description: 'Destination donation fund UUID. Defaults to the plan’s destination fund.',
    example: 'f0a80121-7ac0-11d1-898c-00c04fd8d5c0',
  })
  @IsOptional()
  @IsUUID('4')
  fundId?: string;

  @ApiPropertyOptional({
    description: 'Optional note or memo for the payment record.',
    example: 'Collected during Friday Jamaat',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
