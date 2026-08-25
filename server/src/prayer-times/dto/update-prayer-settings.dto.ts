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
}
