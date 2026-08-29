import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContributionFrequency } from '@prisma/client';
import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { CURRENCY_PATTERN } from '../../common/utils/currency';
import { MONEY_MESSAGE, MONEY_PATTERN, normalizeMoney } from '../../common/utils/money';

function normalizedMoney({ value }: TransformFnParams): unknown {
  return normalizeMoney(value as unknown);
}

function normalizedFrequency({ value }: TransformFnParams): unknown {
  if (typeof value === 'string') {
    return value.toLowerCase();
  }
  return value;
}

export class UpdateContributionPlanDto {
  @ApiPropertyOptional({
    description: 'Updated name of the contribution plan',
    example: 'Executive Monthly Supporter',
    maxLength: 160,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated description',
    example: 'Special support for community education initiatives',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated recurring commitment amount. Must be a positive decimal string.',
    example: '1000.00',
  })
  @IsOptional()
  @Transform(normalizedMoney)
  @IsString()
  @Matches(MONEY_PATTERN, { message: MONEY_MESSAGE })
  amount?: string;

  @ApiPropertyOptional({
    description: 'Currency code, e.g. "BDT".',
    example: 'BDT',
  })
  @IsOptional()
  @IsString()
  @Matches(CURRENCY_PATTERN, { message: 'must be a 3-letter currency code' })
  currency?: string;

  @ApiPropertyOptional({
    description: 'Updated frequency: monthly, quarterly, or yearly.',
    enum: ContributionFrequency,
    example: ContributionFrequency.monthly,
  })
  @IsOptional()
  @Transform(normalizedFrequency)
  @IsEnum(ContributionFrequency, {
    message: 'frequency must be one of: monthly, quarterly, yearly',
  })
  frequency?: ContributionFrequency;

  @ApiPropertyOptional({
    description: 'Destination donation fund ID.',
    example: 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0',
  })
  @IsOptional()
  @IsUUID('4')
  fundId?: string;

  @ApiPropertyOptional({
    description: 'Whether this plan is active.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
