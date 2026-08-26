import { ApiPropertyOptional } from '@nestjs/swagger';
import { SalaryStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Matches, Max, Min } from 'class-validator';

import { MAX_PAGE_SIZE } from '../../common/pagination/page';
import { DATE_MESSAGE } from '../../donation-funds/dto/create-donation-fund.dto';
import { ISO_DATE_PATTERN } from '../../prayer-times/prayer-time.utils';
import { PAY_PERIOD_MESSAGE, PAY_PERIOD_PATTERN } from './create-salary-record.dto';

/**
 * Filtering the salary list.
 *
 * There is no `mosqueId` filter, and adding one would be the bug: the mosque comes from the token and the
 * service applies it to every query, so a filter here could only ever be an attempt to read somebody else's
 * payroll. `forbidNonWhitelisted` rejects the attempt with a 400.
 *
 * `from`/`to` filter on `paymentDate` — when money moved — not on `payPeriod`. Those differ: August's salary
 * paid on 3 September is inside a September window and outside an August one. A caller who wants the month
 * the pay was *for* asks for `payPeriod` instead, which is why both filters exist.
 *
 * `userId` is a filter and not a scope. A caller holding only `salary.viewOwn` is narrowed to their own records
 * by the service whatever they put here, so this cannot be used to read another person's pay.
 */
export class SalaryRecordQueryDto {
  @ApiPropertyOptional({ description: 'Page number, from 1.', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: `Rows per page. Capped at ${MAX_PAGE_SIZE}; the service caps it again.`,
    minimum: 1,
    maximum: MAX_PAGE_SIZE,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit?: number;

  @ApiPropertyOptional({
    description:
      'Show only one person’s records. A caller with own-records-only access stays narrowed to themselves ' +
      'regardless of what is sent here.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Show only records in this state.', enum: SalaryStatus })
  @IsOptional()
  @IsEnum(SalaryStatus, {
    message: `status must be one of: ${Object.values(SalaryStatus).join(', ')}`,
  })
  status?: SalaryStatus;

  @ApiPropertyOptional({
    description: 'Show only the month the pay was *for*, as `YYYY-MM`. Matched exactly.',
    example: '2026-08',
  })
  @IsOptional()
  @IsString()
  @Matches(PAY_PERIOD_PATTERN, { message: `payPeriod ${PAY_PERIOD_MESSAGE}` })
  payPeriod?: string;

  @ApiPropertyOptional({
    description: 'Earliest `paymentDate` to include, inclusive.',
    example: '2026-09-01',
  })
  @IsOptional()
  @IsString()
  @Matches(ISO_DATE_PATTERN, { message: `from ${DATE_MESSAGE}` })
  from?: string;

  @ApiPropertyOptional({
    description: 'Latest `paymentDate` to include, inclusive. Must not fall before `from`.',
    example: '2026-09-30',
  })
  @IsOptional()
  @IsString()
  @Matches(ISO_DATE_PATTERN, { message: `to ${DATE_MESSAGE}` })
  to?: string;
}
