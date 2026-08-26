import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

import { DATE_MESSAGE } from '../../donation-funds/dto/create-donation-fund.dto';
import { ISO_DATE_PATTERN } from '../../prayer-times/prayer-time.utils';

/**
 * The window every financial report is asked for.
 *
 * Two parameters and nothing else. There is no `mosqueId`: the mosque comes from the access token, and a report is
 * the last place that should be negotiable — a query parameter naming another mosque is rejected outright by
 * `forbidNonWhitelisted`, which is a better answer than being silently ignored.
 *
 * Both bounds are optional and independent. Omitting both reports on everything the mosque has ever recorded, which
 * is what a "since inception" figure is; sending only `from` reports from a date onwards.
 *
 * **Both ends are inclusive**, including `to`. That takes a little care in the service, because the four tables
 * this reads do not store their dates the same way — an expense and a salary are booked to a calendar day, while a
 * donation carries a full timestamp, so `to=2026-09-30` has to include a gift given at 18:40 on the 30th rather
 * than stopping at midnight. The service handles that; a caller sends the same two dates either way.
 */
export class FinancialReportQueryDto {
  @ApiPropertyOptional({
    format: 'date',
    example: '2026-07-01',
    description: 'Inclusive start of the window. Omit to report from the beginning.',
  })
  @IsOptional()
  @IsString()
  @Matches(ISO_DATE_PATTERN, { message: `from ${DATE_MESSAGE}` })
  from?: string;

  @ApiPropertyOptional({
    format: 'date',
    example: '2026-09-30',
    description:
      'Inclusive end of the window — the whole of this day counts, including a donation timestamped in the ' +
      'evening. Omit to report up to the present.',
  })
  @IsOptional()
  @IsString()
  @Matches(ISO_DATE_PATTERN, { message: `to ${DATE_MESSAGE}` })
  to?: string;
}
