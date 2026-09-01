import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Query parameters for global search.
 */
export class SearchQueryDto {
  @ApiPropertyOptional({
    description: 'Search keyword across accessible resources in the mosque.',
    example: 'Abdullah',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    description: 'Max number of results to return per category (1-20, default 5).',
    example: 5,
    default: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Optional category filter to restrict search to a specific entity type.',
    example: 'transactions',
  })
  @IsOptional()
  @IsString()
  type?: string;
}
