import { ApiPropertyOptional } from '@nestjs/swagger';
import { BudgetStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

import { MAX_PAGE_SIZE } from '../../common/pagination/page';
import { DATE_MESSAGE } from '../../donation-funds/dto/create-donation-fund.dto';
import { ISO_DATE_PATTERN } from '../../prayer-times/prayer-time.utils';
import { DEFAULT_BUDGET_PAGE_SIZE } from '../types/budget.types';

/**
 * The query string `GET /budgets` accepts.
 *
 * There is no `mosqueId`: it comes from the token.
 *
 * **`from` and `to` select budgets whose period *overlaps* the window, not budgets whose period sits inside
 * it.** "Which budgets cover August?" is the question a treasurer asks, and an annual budget covers August
 * without either of its endpoints falling in it — a containment filter would leave it out, which is the one
 * answer that is certainly wrong. Either end may be given alone: `from` alone means "still running on or after
 * this day", `to` alone means "had already started by this day".
 */
export class BudgetQueryDto {
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
    default: DEFAULT_BUDGET_PAGE_SIZE,
    example: DEFAULT_BUDGET_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE, { message: `limit must not exceed ${MAX_PAGE_SIZE}` })
  limit?: number;

  @ApiPropertyOptional({
    description:
      'Case-insensitive substring match across name and category. Notes are not searched — they are an ' +
      'internal field, and a search that reaches them turns every remark into a lookup key.',
    maxLength: 120,
    example: 'utilities',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by budget state; omit to list every budget.',
    enum: BudgetStatus,
    example: BudgetStatus.active,
  })
  @IsOptional()
  @IsEnum(BudgetStatus, {
    message: `status must be one of: ${Object.values(BudgetStatus).join(', ')}`,
  })
  status?: BudgetStatus;

  @ApiPropertyOptional({
    description:
      'Exact category match, case-sensitive — the value stored on the row. Use `search` for a looser ' +
      'match; this is for pulling the lines that govern one category.',
    example: 'Utilities',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @ApiPropertyOptional({
    description: 'Include budgets still running on or after this day. Inclusive.',
    example: '2026-08-01',
  })
  @IsOptional()
  @IsString()
  @Matches(ISO_DATE_PATTERN, { message: `from ${DATE_MESSAGE}` })
  from?: string;

  @ApiPropertyOptional({
    description: 'Include budgets that had already started by this day. Inclusive.',
    example: '2026-08-31',
  })
  @IsOptional()
  @IsString()
  @Matches(ISO_DATE_PATTERN, { message: `to ${DATE_MESSAGE}` })
  to?: string;
}
