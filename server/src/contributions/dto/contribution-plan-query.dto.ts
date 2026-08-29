import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContributionFrequency } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

import { MAX_PAGE_SIZE } from '../../common/pagination/page';

export class ContributionPlanQueryDto {
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
    description: 'Filter by active status: "active", "inactive", or "all". Default is "all".',
    example: 'active',
  })
  @IsOptional()
  @IsString()
  status?: 'active' | 'inactive' | 'all';

  @ApiPropertyOptional({
    description: 'Filter by frequency: monthly, quarterly, or yearly.',
    enum: ContributionFrequency,
  })
  @IsOptional()
  @IsEnum(ContributionFrequency)
  frequency?: ContributionFrequency;

  @ApiPropertyOptional({
    description: 'Filter by destination fund UUID.',
  })
  @IsOptional()
  @IsUUID('4')
  fundId?: string;

  @ApiPropertyOptional({
    description: 'Search string matching plan name or description.',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
