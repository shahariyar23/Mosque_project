import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContributionEnrollmentStatus, ContributionFrequency } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

import { MAX_PAGE_SIZE } from '../../common/pagination/page';

export class ContributionEnrollmentQueryDto {
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
    description: 'Filter by status: active, paused, cancelled, or all.',
    enum: ContributionEnrollmentStatus,
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by contribution plan UUID.',
  })
  @IsOptional()
  @IsUUID('4')
  planId?: string;

  @ApiPropertyOptional({
    description: 'Filter by enrolled donor user UUID.',
  })
  @IsOptional()
  @IsUUID('4')
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by frequency: monthly, quarterly, yearly.',
    enum: ContributionFrequency,
  })
  @IsOptional()
  @IsEnum(ContributionFrequency)
  frequency?: ContributionFrequency;

  @ApiPropertyOptional({
    description: 'Search string matching donor name or plan name.',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
