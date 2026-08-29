import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateContributionPlanDto {
  @ApiProperty({
    description: 'Name of the contribution plan (e.g., "Standard Monthly", "Supporter", "Student Pledge")',
    example: 'Standard Monthly',
    maxLength: 160,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({
    description: 'Optional description of what this recurring contribution supports',
    example: 'Ongoing mosque utilities and maintenance fund commitment',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: 'Recurring commitment amount. Must be a positive decimal string.',
    example: '500.00',
  })
  @Transform(normalizedMoney)
  @IsString()
  @Matches(MONEY_PATTERN, { message: MONEY_MESSAGE })
  amount!: string;

  @ApiPropertyOptional({
    description: 'Currency code, e.g. "BDT". Defaults to mosque base currency if omitted.',
    example: 'BDT',
  })
  @IsOptional()
  @IsString()
  @Matches(CURRENCY_PATTERN, { message: 'must be a 3-letter currency code' })
  currency?: string;

  @ApiProperty({
    description: 'Frequency of the contribution commitment: monthly, quarterly, or yearly.',
    enum: ContributionFrequency,
    example: ContributionFrequency.monthly,
  })
  @Transform(normalizedFrequency)
  @IsEnum(ContributionFrequency, {
    message: 'frequency must be one of: monthly, quarterly, yearly (or MONTHLY, QUARTERLY, YEARLY)',
  })
  frequency!: ContributionFrequency;

  @ApiPropertyOptional({
    description: 'Destination donation fund ID. Must belong to the caller’s mosque.',
    example: 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0',
  })
  @IsOptional()
  @IsUUID('4')
  fundId?: string;

  @ApiPropertyOptional({
    description: 'Whether this plan is active and can receive new donor pledges. Defaults to true.',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
