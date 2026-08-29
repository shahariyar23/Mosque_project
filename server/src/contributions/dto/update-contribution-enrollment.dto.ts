import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContributionFrequency } from '@prisma/client';
import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

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

export class UpdateContributionEnrollmentDto {
  @ApiPropertyOptional({
    description: 'Updated commitment amount.',
    example: '600.00',
  })
  @IsOptional()
  @Transform(normalizedMoney)
  @IsString()
  @Matches(MONEY_PATTERN, { message: MONEY_MESSAGE })
  amount?: string;

  @ApiPropertyOptional({
    description: 'Updated commitment frequency.',
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
    description: 'Updated start date.',
    example: '2026-09-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Updated end date. Can be null for open-ended commitments.',
    example: null,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string | null;
}
