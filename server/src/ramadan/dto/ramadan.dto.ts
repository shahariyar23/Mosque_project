import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

import { ISO_DATE_PATTERN, TIME_PATTERN } from '../../prayer-times/prayer-time.utils';
import { fromDateOnly } from '../../common/utils/date-only';

/**
 * A mosque's Ramadan schedule: one row per day of the month.
 *
 * Stored rather than calculated, for the same reason as Jumu'ah. Suhoor and Iftar do follow from Fajr
 * and Maghrib, and the AlAdhan integration in `prayer-times` can already produce both — but Taraweeh is
 * a decision, the times a mosque prints on a card are usually rounded, and a mosque that has published a
 * calendar needs it to stay as published even if a coordinate is corrected later. What is here is what
 * the mosque announced.
 */

const TIME_MESSAGE = 'must be a 24-hour time in HH:mm form, e.g. 04:35';

/**
 * Bounds on the Hijri year. Wide enough for any schedule a mosque would enter — a decade back for
 * records, a decade forward for planning — and narrow enough that a Gregorian year typed in by mistake
 * is caught rather than stored as a year 579 in the future.
 */
export const MIN_HIJRI_YEAR = 1400;
export const MAX_HIJRI_YEAR = 1500;

export class CreateRamadanDto {
  @ApiProperty({
    description: 'Hijri year this schedule belongs to.',
    minimum: MIN_HIJRI_YEAR,
    maximum: MAX_HIJRI_YEAR,
    example: 1447,
  })
  @Type(() => Number)
  @IsInt()
  @Min(MIN_HIJRI_YEAR)
  @Max(MAX_HIJRI_YEAR)
  year!: number;

  @ApiProperty({ description: 'The Gregorian day, `YYYY-MM-DD`.', example: '2026-02-18' })
  @Matches(ISO_DATE_PATTERN, { message: 'date must be a calendar date in YYYY-MM-DD format' })
  date!: string;

  @ApiProperty({ description: 'When the fast begins — the last moment to eat.', example: '04:35' })
  @Matches(TIME_PATTERN, { message: `fastingStart ${TIME_MESSAGE}` })
  fastingStart!: string;

  @ApiProperty({ description: 'When the fast ends.', example: '18:05' })
  @Matches(TIME_PATTERN, { message: `fastingEnd ${TIME_MESSAGE}` })
  fastingEnd!: string;

  @ApiPropertyOptional({
    description:
      'When the mosque serves or announces Suhoor, if that differs from the fast’s start.',
    example: '04:15',
  })
  @IsOptional()
  @Matches(TIME_PATTERN, { message: `suhoorTime ${TIME_MESSAGE}` })
  suhoorTime?: string | null;

  @ApiPropertyOptional({ description: 'When the mosque holds Iftar.', example: '18:05' })
  @IsOptional()
  @Matches(TIME_PATTERN, { message: `iftarTime ${TIME_MESSAGE}` })
  iftarTime?: string | null;

  @ApiPropertyOptional({ description: 'When Taraweeh begins.', example: '20:15' })
  @IsOptional()
  @Matches(TIME_PATTERN, { message: `taraweehTime ${TIME_MESSAGE}` })
  taraweehTime?: string | null;

  @ApiPropertyOptional({ description: 'Anything worth telling attendees about this day.' })
  @IsOptional()
  @IsString()
  notes?: string | null;
}

/**
 * Every field optional. No `mosqueId` on either DTO — the mosque comes from the access token, and
 * `forbidNonWhitelisted` turns an attempt to send one into a 400 rather than a silent no-op.
 */
export class UpdateRamadanDto {
  @ApiPropertyOptional({ minimum: MIN_HIJRI_YEAR, maximum: MAX_HIJRI_YEAR, example: 1447 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(MIN_HIJRI_YEAR)
  @Max(MAX_HIJRI_YEAR)
  year?: number;

  @ApiPropertyOptional({ example: '2026-02-18' })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN, { message: 'date must be a calendar date in YYYY-MM-DD format' })
  date?: string;

  @ApiPropertyOptional({ example: '04:35' })
  @IsOptional()
  @Matches(TIME_PATTERN, { message: `fastingStart ${TIME_MESSAGE}` })
  fastingStart?: string;

  @ApiPropertyOptional({ example: '18:05' })
  @IsOptional()
  @Matches(TIME_PATTERN, { message: `fastingEnd ${TIME_MESSAGE}` })
  fastingEnd?: string;

  @ApiPropertyOptional({ example: '04:15' })
  @IsOptional()
  @Matches(TIME_PATTERN, { message: `suhoorTime ${TIME_MESSAGE}` })
  suhoorTime?: string | null;

  @ApiPropertyOptional({ example: '18:05' })
  @IsOptional()
  @Matches(TIME_PATTERN, { message: `iftarTime ${TIME_MESSAGE}` })
  iftarTime?: string | null;

  @ApiPropertyOptional({ example: '20:15' })
  @IsOptional()
  @Matches(TIME_PATTERN, { message: `taraweehTime ${TIME_MESSAGE}` })
  taraweehTime?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string | null;
}

/** The row shape returned by every Ramadan route. */
export class RamadanDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 1447 }) year!: number;
  @ApiProperty({ description: 'The Gregorian day, `YYYY-MM-DD`.', example: '2026-02-18' })
  date!: string;

  @ApiProperty({ example: '04:35' }) fastingStart!: string;
  @ApiProperty({ example: '18:05' }) fastingEnd!: string;

  @ApiProperty({ nullable: true }) suhoorTime!: string | null;
  @ApiProperty({ nullable: true }) iftarTime!: string | null;
  @ApiProperty({ nullable: true }) taraweehTime!: string | null;
  @ApiProperty({ nullable: true }) notes!: string | null;

  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;

  /**
   * Row → response. `date` becomes `YYYY-MM-DD` rather than the midnight-UTC timestamp a `@db.Date`
   * column serialises to, and `mosqueId` is dropped — the caller can only ever read their own.
   */
  static from(row: {
    id: string;
    year: number;
    date: Date;
    fastingStart: string;
    fastingEnd: string;
    suhoorTime: string | null;
    iftarTime: string | null;
    taraweehTime: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): RamadanDto {
    return {
      id: row.id,
      year: row.year,
      date: fromDateOnly(row.date),
      fastingStart: row.fastingStart,
      fastingEnd: row.fastingEnd,
      suhoorTime: row.suhoorTime,
      iftarTime: row.iftarTime,
      taraweehTime: row.taraweehTime,
      notes: row.notes,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

/**
 * Filtering the list by year.
 *
 * The table grows by about thirty rows a year and never shrinks, so within a few years an unfiltered
 * list is mostly history. A mosque showing this month's calendar wants one year, and the unique
 * constraint is already keyed on `(mosqueId, year, date)`, so this filter is served by an existing index.
 */
export class ListRamadanQueryDto {
  @ApiPropertyOptional({
    description: 'Return only this Hijri year. Omit for every year the mosque has entered.',
    minimum: MIN_HIJRI_YEAR,
    maximum: MAX_HIJRI_YEAR,
    example: 1447,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(MIN_HIJRI_YEAR)
  @Max(MAX_HIJRI_YEAR)
  year?: number;
}
