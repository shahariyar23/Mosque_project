import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

import { MAX_METHOD_ID, MIN_METHOD_ID } from '../prayer-times.constants';

/**
 * How far a single prayer may be moved, in minutes.
 *
 * Bounded because an adjustment is a correction to a calculation, not a replacement for it: a mosque
 * that wants Fajr two hours from where the sun puts it has a coordinate or method problem, and letting
 * that be expressed as an offset would hide it. Half an hour either way covers every real case —
 * rounding to the next five minutes, matching a local council, allowing for the walk to the hall.
 */
export const MAX_OFFSET_MINUTES = 30;

/**
 * The mosque's saved prayer configuration.
 *
 * Every field is optional and every one is nullable, and the difference between the two matters here:
 * omitting a field leaves it as it was, while sending `null` clears it back to the mosque's own value.
 * Without that distinction there would be no way to undo an override once set, short of guessing what
 * the mosque's latitude used to be and typing it in again.
 *
 * There is no `mosqueId`. The mosque comes from the access token, and `forbidNonWhitelisted` means a
 * request that sends one is rejected with a 400 rather than being quietly ignored — so an attempt to
 * write another mosque's settings fails loudly, which is the behaviour worth having.
 */
export class UpdatePrayerSettingsDto {
  @ApiPropertyOptional({
    description:
      'AlAdhan calculation method id. Null falls back to the method named in mosque settings.',
    minimum: MIN_METHOD_ID,
    maximum: MAX_METHOD_ID,
    nullable: true,
    example: 3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(MIN_METHOD_ID)
  @Max(MAX_METHOD_ID)
  method?: number | null;

  @ApiPropertyOptional({
    description: 'Asr school: 0 = Standard, 1 = Hanafi. Null falls back to mosque settings.',
    enum: [0, 1],
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsIn([0, 1], { message: 'school must be 0 (Standard) or 1 (Hanafi)' })
  school?: number | null;

  @ApiPropertyOptional({
    description:
      'Calculate from these coordinates instead of the mosque’s. Null uses the mosque’s.',
    nullable: true,
    example: 23.810331,
  })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude({ message: 'latitude must be between -90 and 90' })
  latitude?: number | null;

  @ApiPropertyOptional({ nullable: true, example: 90.412521 })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude({ message: 'longitude must be between -180 and 180' })
  longitude?: number | null;

  @ApiPropertyOptional({
    description: 'IANA timezone override. Null uses the mosque’s timezone.',
    nullable: true,
    example: 'Asia/Dhaka',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z][A-Za-z0-9+\-_]*(\/[A-Za-z0-9+\-_]+)*$/, {
    message: 'timezone must be an IANA zone name, e.g. Asia/Dhaka',
  })
  timezone?: string | null;

  @ApiPropertyOptional({
    description: 'Minutes added to the calculated Imsak.',
    minimum: -30,
    maximum: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-MAX_OFFSET_MINUTES)
  @Max(MAX_OFFSET_MINUTES)
  imsakOffset?: number;

  @ApiPropertyOptional({
    description: 'Minutes added to the calculated Fajr. The mosque’s published time is the sum.',
    minimum: -30,
    maximum: 30,
    example: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-MAX_OFFSET_MINUTES)
  @Max(MAX_OFFSET_MINUTES)
  fajrOffset?: number;

  @ApiPropertyOptional({ minimum: -30, maximum: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-MAX_OFFSET_MINUTES)
  @Max(MAX_OFFSET_MINUTES)
  sunriseOffset?: number;

  @ApiPropertyOptional({ minimum: -30, maximum: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-MAX_OFFSET_MINUTES)
  @Max(MAX_OFFSET_MINUTES)
  dhuhrOffset?: number;

  @ApiPropertyOptional({ minimum: -30, maximum: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-MAX_OFFSET_MINUTES)
  @Max(MAX_OFFSET_MINUTES)
  asrOffset?: number;

  @ApiPropertyOptional({ minimum: -30, maximum: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-MAX_OFFSET_MINUTES)
  @Max(MAX_OFFSET_MINUTES)
  sunsetOffset?: number;

  @ApiPropertyOptional({ minimum: -30, maximum: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-MAX_OFFSET_MINUTES)
  @Max(MAX_OFFSET_MINUTES)
  maghribOffset?: number;

  @ApiPropertyOptional({ minimum: -30, maximum: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-MAX_OFFSET_MINUTES)
  @Max(MAX_OFFSET_MINUTES)
  ishaOffset?: number;

  @ApiPropertyOptional({ minimum: -30, maximum: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-MAX_OFFSET_MINUTES)
  @Max(MAX_OFFSET_MINUTES)
  midnightOffset?: number;

  @ApiPropertyOptional({ description: 'Manual fixed Fajr adhan time (HH:mm)', example: '04:30', nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'fajrTime must be HH:mm' })
  fajrTime?: string | null;

  @ApiPropertyOptional({ description: 'Manual fixed Sunrise time (HH:mm)', example: '05:35', nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'sunriseTime must be HH:mm' })
  sunriseTime?: string | null;

  @ApiPropertyOptional({ description: 'Manual fixed Dhuhr adhan time (HH:mm)', example: '12:30', nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'dhuhrTime must be HH:mm' })
  dhuhrTime?: string | null;

  @ApiPropertyOptional({ description: 'Manual fixed Asr adhan time (HH:mm)', example: '16:30', nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'asrTime must be HH:mm' })
  asrTime?: string | null;

  @ApiPropertyOptional({ description: 'Manual fixed Maghrib adhan time (HH:mm)', example: '18:32', nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'maghribTime must be HH:mm' })
  maghribTime?: string | null;

  @ApiPropertyOptional({ description: 'Manual fixed Isha adhan time (HH:mm)', example: '20:00', nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'ishaTime must be HH:mm' })
  ishaTime?: string | null;

  @ApiPropertyOptional({ description: 'Manual fixed Fajr iqamah time (HH:mm)', example: '04:45', nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'fajrIqamah must be HH:mm' })
  fajrIqamah?: string | null;

  @ApiPropertyOptional({ description: 'Manual fixed Dhuhr iqamah time (HH:mm)', example: '12:45', nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'dhuhrIqamah must be HH:mm' })
  dhuhrIqamah?: string | null;

  @ApiPropertyOptional({ description: 'Manual fixed Asr iqamah time (HH:mm)', example: '16:45', nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'asrIqamah must be HH:mm' })
  asrIqamah?: string | null;

  @ApiPropertyOptional({ description: 'Manual fixed Maghrib iqamah time (HH:mm)', example: '18:35', nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'maghribIqamah must be HH:mm' })
  maghribIqamah?: string | null;

  @ApiPropertyOptional({ description: 'Manual fixed Isha iqamah time (HH:mm)', example: '20:15', nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'ishaIqamah must be HH:mm' })
  ishaIqamah?: string | null;
}
