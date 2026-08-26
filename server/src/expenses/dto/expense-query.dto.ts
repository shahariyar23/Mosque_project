import { ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

import { MAX_PAGE_SIZE } from '../../common/pagination/page';
import { DATE_MESSAGE } from '../../donation-funds/dto/create-donation-fund.dto';
import { ISO_DATE_PATTERN } from '../../prayer-times/prayer-time.utils';
import { DEFAULT_EXPENSE_PAGE_SIZE } from '../types/expense.types';

/**
 * The query string `GET /expenses` accepts.
 *
 * There is no `mosqueId`: it comes from the token. There is no `createdById` either — "show me what Ahmed
 * booked" is a report, and reports are a later part.
 *
 * `from` and `to` filter on `expenseDate`, the day the money was spent, not on when the row was written. That
 * is the question a treasurer reconciling August actually asks. Both ends are inclusive, and either may be
 * given alone.
 */
export class ExpenseQueryDto {
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
    default: DEFAULT_EXPENSE_PAGE_SIZE,
    example: DEFAULT_EXPENSE_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE, { message: `limit must not exceed ${MAX_PAGE_SIZE}` })
  limit?: number;

  @ApiPropertyOptional({
    description:
      'Case-insensitive substring match across category, description and reference. Notes are not ' +
      'searched — they are an internal field, and a search that reaches them turns every remark into a ' +
      'lookup key.',
    maxLength: 120,
    example: 'electricity',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by expense state; omit to list every expense.',
    enum: ExpenseStatus,
    example: ExpenseStatus.paid,
  })
  @IsOptional()
  @IsEnum(ExpenseStatus, {
    message: `status must be one of: ${Object.values(ExpenseStatus).join(', ')}`,
  })
  status?: ExpenseStatus;

  @ApiPropertyOptional({
    description:
      'Exact category match, case-sensitive — the value stored on the row. Use `search` for a looser ' +
      'match; this is for grouping a list the caller already knows the spelling of.',
    example: 'Utilities',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @ApiPropertyOptional({
    description: 'Earliest `expenseDate` to include, inclusive.',
    example: '2026-08-01',
  })
  @IsOptional()
  @IsString()
  @Matches(ISO_DATE_PATTERN, { message: `from ${DATE_MESSAGE}` })
  from?: string;

  @ApiPropertyOptional({
    description: 'Latest `expenseDate` to include, inclusive.',
    example: '2026-08-31',
  })
  @IsOptional()
  @IsString()
  @Matches(ISO_DATE_PATTERN, { message: `to ${DATE_MESSAGE}` })
  to?: string;
}
