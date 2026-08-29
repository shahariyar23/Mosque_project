import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContributionDueStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

import { MAX_PAGE_SIZE } from '../../common/pagination/page';

export class ContributionPeriodQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: MAX_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filter by payment status: pending, partial, paid, overdue, waived, or all.',
    enum: ContributionDueStatus,
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by enrollment UUID.',
  })
  @IsOptional()
  @IsUUID('4')
  enrollmentId?: string;

  @ApiPropertyOptional({
    description: 'Filter by plan UUID.',
  })
  @IsOptional()
  @IsUUID('4')
  planId?: string;

  @ApiPropertyOptional({
    description: 'Filter by member user UUID.',
  })
  @IsOptional()
  @IsUUID('4')
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter periods from date (inclusive). YYYY-MM-DD.',
    example: '2026-08-01',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Filter periods to date (inclusive). YYYY-MM-DD.',
    example: '2026-08-31',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    description: 'Search string matching member name or plan name.',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
