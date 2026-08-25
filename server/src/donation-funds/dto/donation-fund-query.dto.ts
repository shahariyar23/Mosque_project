import { ApiPropertyOptional } from '@nestjs/swagger';
import { FundStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

import { MAX_PAGE_SIZE } from '../../common/pagination/page';
import { DEFAULT_FUND_PAGE_SIZE } from '../types/donation-fund.types';

/**
 * The query string `GET /donation-funds` accepts.
 *
 * `limit` is capped at `MAX_PAGE_SIZE` (100), the same ceiling the volunteers and users lists use, so a
 * caller cannot ask for the whole fund table in one request. The cap is enforced twice — here, as a
 * validation error, and again in the service — because the service is also reached from tests and would
 * otherwise trust its input. Both sides read the same constant, so the two halves cannot disagree.
 *
 * Query parameters arrive as strings and the global pipe runs with `enableImplicitConversion: false`, so
 * the numeric ones opt into coercion with `@Type`.
 *
 * `status` is validated against the Prisma enum rather than a list written out here, so an unknown value
 * is a 400 rather than an empty page — the difference between "no funds are archived" and "you spelled
 * it wrong".
 */
export class DonationFundQueryDto {
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
    default: DEFAULT_FUND_PAGE_SIZE,
    example: DEFAULT_FUND_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE, { message: `limit must not exceed ${MAX_PAGE_SIZE}` })
  limit?: number;

  @ApiPropertyOptional({
    description: 'Case-insensitive substring match across the fund’s name, slug and description.',
    maxLength: 120,
    example: 'zakat',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by fund state; omit to list every fund.',
    enum: FundStatus,
    example: FundStatus.active,
  })
  @IsOptional()
  @IsEnum(FundStatus, {
    message: `status must be one of: ${Object.values(FundStatus).join(', ')}`,
  })
  status?: FundStatus;
}
