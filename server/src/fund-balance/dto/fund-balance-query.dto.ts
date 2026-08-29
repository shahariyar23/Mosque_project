import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches } from 'class-validator';

import { ISO_DATE_PATTERN } from '../../prayer-times/prayer-time.utils';

export class FundBalanceQueryDto {
  @ApiPropertyOptional({
    description: 'Inclusive start date (YYYY-MM-DD). Filters transactions on or after this date.',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsString()
  @Matches(ISO_DATE_PATTERN, { message: 'from must be a calendar date in YYYY-MM-DD format' })
  from?: string;

  @ApiPropertyOptional({
    description: 'Inclusive end date (YYYY-MM-DD). Filters transactions on or before this date.',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsString()
  @Matches(ISO_DATE_PATTERN, { message: 'to must be a calendar date in YYYY-MM-DD format' })
  to?: string;
}