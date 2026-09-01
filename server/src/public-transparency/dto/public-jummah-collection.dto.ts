import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, type TransformFnParams } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

import { MAX_PAGE_SIZE } from '../../common/pagination/page';
import { ISO_DATE_PATTERN } from '../../prayer-times/prayer-time.utils';

function parsedInt({ value }: TransformFnParams): unknown {
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? value : parsed;
  }
  return value as unknown;
}

export class PublicJummahCollectionDto {
  @ApiProperty({ format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: '2026-09-04', description: 'Friday collection date (YYYY-MM-DD).' })
  date!: string;

  @ApiProperty({ example: '10000.00', description: 'Publicly declared collection amount.' })
  amount!: string;

  @ApiProperty({ example: 'BDT' })
  currency!: string;

  @ApiProperty({ example: 'Mosque Building Fund' })
  fundName!: string;

  @ApiProperty({ example: 'mosque-building-fund' })
  fundSlug!: string;

  @ApiPropertyOptional({ example: 'Friday congregational collection', nullable: true })
  notes?: string | null;
}

export class PublicJummahCollectionQueryDto {
  @ApiPropertyOptional({
    description: 'Earliest Friday date to include, `YYYY-MM-DD` (inclusive).',
    example: '2026-08-01',
  })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN, { message: 'from must be a calendar date in YYYY-MM-DD format' })
  from?: string;

  @ApiPropertyOptional({
    description: 'Latest Friday date to include, `YYYY-MM-DD` (inclusive).',
    example: '2026-09-30',
  })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN, { message: 'to must be a calendar date in YYYY-MM-DD format' })
  to?: string;

  @ApiPropertyOptional({
    description: 'Filter collections by fund slug (e.g. `mosque-building-fund`).',
    example: 'mosque-building-fund',
  })
  @IsOptional()
  @IsString()
  fundSlug?: string;

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

export class PublicJummahCollectionListMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 45 })
  total!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;
}

export class PublicJummahCollectionListEnvelopeDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Public Jummah collections retrieved successfully' })
  message!: string;

  @ApiProperty({ type: [PublicJummahCollectionDto] })
  data!: PublicJummahCollectionDto[];

  @ApiProperty({ type: PublicJummahCollectionListMetaDto })
  meta!: PublicJummahCollectionListMetaDto;
}
