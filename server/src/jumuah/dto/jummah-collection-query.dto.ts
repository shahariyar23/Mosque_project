import { ApiPropertyOptional } from '@nestjs/swagger';
import { JummahCollectionStatus } from '@prisma/client';
import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

import { MAX_PAGE_SIZE } from '../../common/pagination/page';
import { ISO_DATE_PATTERN } from '../../prayer-times/prayer-time.utils';

function parsedBoolean({ value }: TransformFnParams): unknown {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value as unknown;
}

function parsedInt({ value }: TransformFnParams): unknown {
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? value : parsed;
  }
  return value as unknown;
}

export class JummahCollectionQueryDto {
  @ApiPropertyOptional({
    description: 'Earliest Friday collection date to include, `YYYY-MM-DD` (inclusive).',
    example: '2026-08-01',
  })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN, { message: 'from must be a calendar date in YYYY-MM-DD format' })
  from?: string;

  @ApiPropertyOptional({
    description: 'Latest Friday collection date to include, `YYYY-MM-DD` (inclusive).',
    example: '2026-09-30',
  })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN, { message: 'to must be a calendar date in YYYY-MM-DD format' })
  to?: string;

  @ApiPropertyOptional({
    description: 'Filter collections credited to a specific fund UUID.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID(undefined, { message: 'fundId must be a valid UUID' })
  fundId?: string;

  @ApiPropertyOptional({
    description: 'Filter collections linked to a specific Friday schedule UUID.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID(undefined, { message: 'scheduleId must be a valid UUID' })
  scheduleId?: string;

  @ApiPropertyOptional({
    description: 'Filter by collection status (`completed` or `voided`).',
    enum: JummahCollectionStatus,
  })
  @IsOptional()
  @IsEnum(JummahCollectionStatus, { message: 'status must be completed or voided' })
  status?: JummahCollectionStatus;

  @ApiPropertyOptional({
    description: 'Filter by public visibility (`true` or `false`).',
  })
  @IsOptional()
  @Transform(parsedBoolean)
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Page number (1-indexed). Defaults to 1.',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Transform(parsedInt)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Maximum rows per page. Defaults to 20, capped at 100.',
    default: 20,
    minimum: 1,
    maximum: MAX_PAGE_SIZE,
  })
  @IsOptional()
  @Transform(parsedInt)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(MAX_PAGE_SIZE, { message: `limit must not exceed ${MAX_PAGE_SIZE}` })
  limit?: number = 20;
}
