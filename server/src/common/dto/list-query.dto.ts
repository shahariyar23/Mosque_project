import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, type SortDirection } from '../pagination/page';

/**
 * The query string every list endpoint accepts.
 *
 * Mirrors `ListQuery` in `web/src/services/query.ts` — page, pageSize, sortBy, sortDir, search, from,
 * to — so a frontend service can forward its query object as a query string without translation.
 *
 * `sortBy` is intentionally *not* validated here. Each resource allows a different set of sort
 * fields, and accepting an arbitrary string at this level would let a caller sort by a column they
 * cannot see. Subclasses narrow it to an allow-list with `@IsIn`, which is the same allow-list the
 * frontend's `applySort` comparator map enumerates.
 */
export class ListQueryDto {
  @ApiPropertyOptional({ description: '1-based page number.', minimum: 1, default: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Rows per page.',
    minimum: 1,
    maximum: MAX_PAGE_SIZE,
    default: DEFAULT_PAGE_SIZE,
    example: DEFAULT_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize?: number;

  @ApiPropertyOptional({
    description: 'Sort direction. Ignored unless sortBy is given.',
    enum: ['asc', 'desc'],
    default: 'asc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: SortDirection;

  @ApiPropertyOptional({
    description: 'Case-insensitive substring match across the resource’s searchable fields.',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({
    description: 'Inclusive start of the date range, YYYY-MM-DD.',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'from must be an ISO date, e.g. 2026-01-01' })
  from?: string;

  @ApiPropertyOptional({
    description: 'Inclusive end of the date range, YYYY-MM-DD.',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'to must be an ISO date, e.g. 2026-12-31' })
  to?: string;
}
