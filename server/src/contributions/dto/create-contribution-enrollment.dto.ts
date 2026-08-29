import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContributionFrequency } from '@prisma/client';
import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
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

export class CreateContributionEnrollmentDto {
  @ApiProperty({
    description: 'Contribution Plan UUID to enroll in. Must be active and belong to caller’s mosque.',
    example: 'c0a80121-7ac0-11d1-898c-00c04fd8d5c0',
  })
  @IsUUID('4')
  planId!: string;

  @ApiPropertyOptional({
    description: 'Target member/donor user UUID. Defaults to caller if not provided.',
    example: 'd0a80121-7ac0-11d1-898c-00c04fd8d5c0',
  })
  @IsOptional()
  @IsUUID('4')
  userId?: string;

  @ApiPropertyOptional({
    description: 'Optional custom pledge amount. Defaults to the plan’s base amount if omitted.',
    example: '500.00',
  })
  @IsOptional()
  @Transform(normalizedMoney)
  @IsString()
  @Matches(MONEY_PATTERN, { message: MONEY_MESSAGE })
  amount?: string;

  @ApiPropertyOptional({
    description: 'Optional commitment frequency. Defaults to the plan’s frequency if omitted.',
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
    description: 'Start date of the contribution commitment. Defaults to current date if omitted.',
    example: '2026-09-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Optional ending date for time-limited commitments.',
    example: '2027-08-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
