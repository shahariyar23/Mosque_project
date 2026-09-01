import { ApiPropertyOptional } from '@nestjs/swagger';
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

import { ISO_DATE_PATTERN } from '../../prayer-times/prayer-time.utils';
import {
  POSITIVE_MONEY_MESSAGE,
  POSITIVE_MONEY_PATTERN,
  normalizeMoney,
} from '../../common/utils/money';

function normalizedMoney({ value }: TransformFnParams): unknown {
  return normalizeMoney(value as unknown);
}

export class UpdateJummahCollectionDto {
  @ApiPropertyOptional({
    description: 'The Friday this collection was gathered on, `YYYY-MM-DD`. Must fall on a Friday.',
    example: '2026-09-04',
  })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN, { message: 'date must be a calendar date in YYYY-MM-DD format' })
  date?: string;

  @ApiPropertyOptional({
    description: 'The designated fund receiving this collection. Must belong to the caller’s mosque.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID(undefined, { message: 'fundId must be a valid UUID' })
  fundId?: string;

  @ApiPropertyOptional({
    description: 'Optional link to a specific Friday schedule / jamaat session of this mosque.',
    format: 'uuid',
    nullable: true,
  })
  @IsOptional()
  @IsUUID(undefined, { message: 'scheduleId must be a valid UUID' })
  scheduleId?: string | null;

  @ApiPropertyOptional({
    description: 'Corrected cash amount as a positive decimal string with up to 2 decimal places.',
    example: '12000.00',
  })
  @IsOptional()
  @Transform(normalizedMoney)
  @Matches(POSITIVE_MONEY_PATTERN, { message: `amount ${POSITIVE_MONEY_MESSAGE}` })
  amount?: string;

  @ApiPropertyOptional({
    description: 'Collection status (`completed` or `voided`). Voiding atomically reverses the ledger entry.',
    enum: JummahCollectionStatus,
  })
  @IsOptional()
  @IsEnum(JummahCollectionStatus, { message: 'status must be completed or voided' })
  status?: JummahCollectionStatus;

  @ApiPropertyOptional({
    description: 'Reference handle (e.g. box identifier, count sheet number).',
    maxLength: 120,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string | null;

  @ApiPropertyOptional({
    description: 'Remarks or counting notes.',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiPropertyOptional({
    description: 'Whether this collection appears in the public Jummah collection history.',
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
