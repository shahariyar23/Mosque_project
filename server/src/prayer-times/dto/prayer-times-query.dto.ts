import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsIn, IsLatitude, IsLongitude, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

import { ISO_DATE_PATTERN } from '../prayer-time.utils';
import { MAX_METHOD_ID, MIN_METHOD_ID } from '../prayer-times.constants';

/**
 * Query parameters for a prayer-time lookup. Every one is optional: with none supplied, the answer is
 * today's schedule for the authenticated user's own mosque, which is what almost every caller wants.
 *
 * A supplied value overrides the mosque's configuration for that request only — nothing here is
 * written to the database. That is what makes these safe to expose to any signed-in reader: the worst
 * a caller can do is calculate a schedule for somewhere else and be told what it is.
 *
 * `@Type(() => Number)` on each numeric field because `enableImplicitConversion` is off globally, so a
 * query string arrives as a string and `@IsInt` would reject it.
 */
export class PrayerTimesQueryDto {
  @ApiPropertyOptional({
    description: 'Date to calculate, `YYYY-MM-DD`. Defaults to today in the mosque’s timezone.',
    example: '2026-03-01',
  })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN, { message: 'date must be in YYYY-MM-DD format' })
  date?: string;

  @ApiPropertyOptional({
    description: 'Override the mosque’s latitude for this request only.',
    example: 23.810331,
  })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude({ message: 'latitude must be between -90 and 90' })
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Override the mosque’s longitude for this request only.',
    example: 90.412521,
  })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude({ message: 'longitude must be between -180 and 180' })
  longitude?: number;

  @ApiPropertyOptional({
    description: 'AlAdhan calculation method id. Defaults to the mosque’s configured method.',
    minimum: MIN_METHOD_ID,
    maximum: MAX_METHOD_ID,
    example: 3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(MIN_METHOD_ID)
  @Max(MAX_METHOD_ID)
  method?: number;

  @ApiPropertyOptional({
    description: 'Asr school: 0 = Standard (Shafi), 1 = Hanafi.',
    enum: [0, 1],
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsIn([0, 1], { message: 'school must be 0 (Standard) or 1 (Hanafi)' })
  school?: number;

  @ApiPropertyOptional({
    description: 'IANA timezone to calculate in. Defaults to the mosque’s timezone.',
    example: 'Asia/Dhaka',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z][A-Za-z0-9+\-_]*(\/[A-Za-z0-9+\-_]+)*$/, {
    message: 'timezone must be an IANA zone name, e.g. Asia/Dhaka',
  })
  timezone?: string;

  /**
   * A one-off adjustment, in AlAdhan's documented `tune` ordering:
   * `imsak,fajr,sunrise,dhuhr,asr,maghrib,sunset,isha,midnight`.
   *
   * Note that this is *not* chronological — maghrib precedes sunset — because it mirrors upstream, and
   * a caller reaching for this parameter will have read upstream's documentation. The mosque's own
   * saved adjustments are applied separately and are not expressed this way.
   */
  @ApiPropertyOptional({
    description:
      'One-off minute offsets in AlAdhan order: imsak,fajr,sunrise,dhuhr,asr,maghrib,sunset,isha,midnight. Applied on top of the mosque’s saved adjustments and never stored.',
    example: '0,5,0,0,0,0,0,0,0',
  })
  @IsOptional()
  @Matches(/^-?\d{1,3}(,-?\d{1,3}){8}$/, {
    message:
      'tune must be nine comma-separated integers in AlAdhan order: imsak,fajr,sunrise,dhuhr,asr,maghrib,sunset,isha,midnight',
  })
  tune?: string;
}

/**
 * The same parameters minus the date, for `GET /prayer-times/:date` and `/today` where the date comes
 * from the path or from the clock. Declared separately rather than reused with the date ignored,
 * because `forbidNonWhitelisted` means an undeclared property is a 400 — so leaving `date` out of the
 * class is how `?date=` on those two routes gets rejected instead of silently doing nothing.
 */
export class PrayerTimesDateQueryDto {
  @ApiPropertyOptional({ example: 23.810331 })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude({ message: 'latitude must be between -90 and 90' })
  latitude?: number;

  @ApiPropertyOptional({ example: 90.412521 })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude({ message: 'longitude must be between -180 and 180' })
  longitude?: number;

  @ApiPropertyOptional({ minimum: MIN_METHOD_ID, maximum: MAX_METHOD_ID, example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(MIN_METHOD_ID)
  @Max(MAX_METHOD_ID)
  method?: number;

  @ApiPropertyOptional({ enum: [0, 1], example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsIn([0, 1], { message: 'school must be 0 (Standard) or 1 (Hanafi)' })
  school?: number;

  @ApiPropertyOptional({ example: 'Asia/Dhaka' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z][A-Za-z0-9+\-_]*(\/[A-Za-z0-9+\-_]+)*$/, {
    message: 'timezone must be an IANA zone name, e.g. Asia/Dhaka',
  })
  timezone?: string;

  @ApiPropertyOptional({ example: '0,5,0,0,0,0,0,0,0' })
  @IsOptional()
  @Matches(/^-?\d{1,3}(,-?\d{1,3}){8}$/, {
    message:
      'tune must be nine comma-separated integers in AlAdhan order: imsak,fajr,sunrise,dhuhr,asr,maghrib,sunset,isha,midnight',
  })
  tune?: string;
}
