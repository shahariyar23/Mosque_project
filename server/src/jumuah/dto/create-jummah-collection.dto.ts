import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JummahCollectionStatus } from '@prisma/client';
import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

import { CURRENCY_MESSAGE, CURRENCY_PATTERN, normalizeCurrency } from '../../common/utils/currency';
import { ISO_DATE_PATTERN } from '../../prayer-times/prayer-time.utils';
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

export class CreateJummahCollectionDto {
  @ApiProperty({
    description: 'The Friday this collection was gathered on, `YYYY-MM-DD`. Must fall on a Friday.',
    example: '2026-09-04',
  })
  @Matches(ISO_DATE_PATTERN, { message: 'date must be a calendar date in YYYY-MM-DD format' })
  date!: string;

  @ApiProperty({
    description: 'The designated fund receiving this collection. Must belong to the caller’s mosque.',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID(undefined, { message: 'fundId must be a valid UUID' })
  fundId!: string;

  @ApiPropertyOptional({
    description: 'Optional link to a specific Friday schedule / jamaat session of this mosque.',
    format: 'uuid',
    nullable: true,
  })
  @IsOptional()
  @IsUUID(undefined, { message: 'scheduleId must be a valid UUID' })
  scheduleId?: string | null;

  @ApiProperty({
    description: 'The collected cash amount as a positive decimal string with up to 2 decimal places.',
    example: '10000.00',
  })
  @Transform(normalizedMoney)
  @Matches(POSITIVE_MONEY_PATTERN, { message: `amount ${POSITIVE_MONEY_MESSAGE}` })
  amount!: string;

  @ApiPropertyOptional({
    description:
      'ISO 4217 currency code. Defaults to the mosque’s configured currency if omitted.',
    example: 'BDT',
  })
  @IsOptional()
  @Transform(normalizedCurrency)
  @Matches(CURRENCY_PATTERN, { message: `currency ${CURRENCY_MESSAGE}` })
  currency?: string;

  @ApiPropertyOptional({
    description: 'Collection status. Defaults to `completed`.',
    enum: JummahCollectionStatus,
    default: JummahCollectionStatus.completed,
  })
  @IsOptional()
  @IsEnum(JummahCollectionStatus, { message: 'status must be completed or voided' })
  status?: JummahCollectionStatus;

  @ApiPropertyOptional({
    description: 'Optional reference handle (e.g. box identifier, count sheet number).',
    maxLength: 120,
    example: 'BOX-01-MAIN-HALL',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string | null;

  @ApiPropertyOptional({
    description: 'Optional remarks or counting notes.',
    example: 'Counted by committee members Brother Ahmed and Brother Kabir',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiPropertyOptional({
    description: 'Whether this collection appears in the public Jummah collection history. Defaults to true.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
