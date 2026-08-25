import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { PrayerKey } from '../prayer-times.constants';

/**
 * The normalized prayer-time response — the NOOR contract, not AlAdhan's.
 *
 * Nothing upstream sends reaches a client through here. That indirection is the point of the whole
 * module: AlAdhan's reply is keyed `Fajr`, formats times as `"04:35 (+06)"`, carries `Firstthird` and
 * `Lastthird` nobody asked for, and has no concept of the mosque's own adjustments. A frontend built
 * against that shape would break the day upstream changed any of it, and would have to know how to
 * apply an offset to be correct.
 *
 * Each timing is reported three ways — what was calculated, what the mosque adds, what it therefore
 * announces. A single figure would be enough to print, but not enough to answer the question an imam
 * actually asks, which is "why does this say 04:40 when the calculation says 04:35".
 */

export class PrayerTimeDto {
  @ApiProperty({ description: 'What the calculation returned, `HH:mm`.', example: '04:35' })
  calculated!: string;

  @ApiProperty({
    description: 'Minutes this mosque adds to the calculated time. Negative moves it earlier.',
    example: 5,
  })
  adjustment!: number;

  @ApiProperty({
    description: 'The time this mosque publishes: `calculated` plus `adjustment`.',
    example: '04:40',
  })
  time!: string;
}

export class PrayerTimingsDto implements Record<PrayerKey, PrayerTimeDto> {
  @ApiProperty({ type: PrayerTimeDto }) imsak!: PrayerTimeDto;
  @ApiProperty({ type: PrayerTimeDto }) fajr!: PrayerTimeDto;
  @ApiProperty({ type: PrayerTimeDto }) sunrise!: PrayerTimeDto;
  @ApiProperty({ type: PrayerTimeDto }) dhuhr!: PrayerTimeDto;
  @ApiProperty({ type: PrayerTimeDto }) asr!: PrayerTimeDto;
  @ApiProperty({ type: PrayerTimeDto }) sunset!: PrayerTimeDto;
  @ApiProperty({ type: PrayerTimeDto }) maghrib!: PrayerTimeDto;
  @ApiProperty({ type: PrayerTimeDto }) isha!: PrayerTimeDto;
  @ApiProperty({ type: PrayerTimeDto }) midnight!: PrayerTimeDto;
}

export class HijriDateDto {
  @ApiPropertyOptional({ nullable: true, example: '12-09-1447' }) date!: string | null;
  @ApiPropertyOptional({ nullable: true, example: 12 }) day!: number | null;
  @ApiPropertyOptional({ nullable: true, example: 9 }) month!: number | null;
  @ApiPropertyOptional({ nullable: true, example: 'Ramaḍān' }) monthName!: string | null;
  @ApiPropertyOptional({ nullable: true, example: 1447 }) year!: number | null;
}

export class CoordinatesDto {
  @ApiProperty({ example: 23.810331 }) latitude!: number;
  @ApiProperty({ example: 90.412521 }) longitude!: number;
}

export class NamedIdDto {
  @ApiProperty({ example: 3 }) id!: number;
  @ApiProperty({ example: 'Muslim World League' }) name!: string;
}

export class PrayerTimesResponseDto {
  @ApiProperty({ description: 'The day these times are for, `YYYY-MM-DD`.', example: '2026-03-01' })
  date!: string;

  @ApiProperty({ type: HijriDateDto, nullable: true })
  hijri!: HijriDateDto | null;

  @ApiProperty({
    description: 'The IANA zone these times are wall-clock in.',
    example: 'Asia/Dhaka',
  })
  timezone!: string;

  @ApiProperty({ type: CoordinatesDto })
  coordinates!: CoordinatesDto;

  @ApiProperty({ type: NamedIdDto, description: 'Calculation method used.' })
  method!: NamedIdDto;

  @ApiProperty({ type: NamedIdDto, description: 'Asr school used.' })
  school!: NamedIdDto;

  @ApiProperty({ type: PrayerTimingsDto })
  timings!: PrayerTimingsDto;

  @ApiProperty({
    description:
      'Where the calculation came from, and whether this request reached it. `cache` means the same calculation was already held in memory; the mosque’s adjustments are applied fresh either way.',
    enum: ['aladhan', 'cache'],
    example: 'aladhan',
  })
  source!: 'aladhan' | 'cache';

  @ApiProperty({
    description:
      'True when any timing carries a non-zero adjustment, so a client can label the schedule as the mosque’s own rather than purely calculated.',
    example: true,
  })
  adjusted!: boolean;
}

/**
 * The saved configuration, read back.
 *
 * Reports both halves of every setting: `method` is what the mosque has overridden (null if nothing),
 * `effectiveMethod` is what will actually be used. Returning only the first would leave a settings
 * screen unable to show what the defaults resolve to; returning only the second would make it
 * impossible to tell a deliberate choice from an inherited one, and so impossible to clear it.
 */
export class PrayerSettingsResponseDto {
  @ApiProperty({ nullable: true, example: 3 }) method!: number | null;
  @ApiProperty({ nullable: true, example: 0 }) school!: number | null;
  @ApiProperty({ nullable: true, example: null }) latitude!: number | null;
  @ApiProperty({ nullable: true, example: null }) longitude!: number | null;
  @ApiProperty({ nullable: true, example: null }) timezone!: string | null;

  @ApiProperty({ type: NamedIdDto, description: 'The method that will be used, override or not.' })
  effectiveMethod!: NamedIdDto;

  @ApiProperty({ type: NamedIdDto, description: 'The school that will be used, override or not.' })
  effectiveSchool!: NamedIdDto;

  @ApiProperty({
    type: CoordinatesDto,
    nullable: true,
    description:
      'The coordinates that will be used. Null when the mosque has none recorded, in which case prayer times cannot be calculated until they are.',
  })
  effectiveCoordinates!: CoordinatesDto | null;

  @ApiProperty({ example: 'Asia/Dhaka' })
  effectiveTimezone!: string;

  @ApiProperty({
    description: 'Minutes added to each calculated time.',
    example: {
      imsak: 0,
      fajr: 5,
      sunrise: 0,
      dhuhr: 0,
      asr: 0,
      sunset: 0,
      maghrib: 0,
      isha: 0,
      midnight: 0,
    },
  })
  offsets!: Record<PrayerKey, number>;

  @ApiProperty({
    nullable: true,
    description: 'When the overrides were last changed. Null if never.',
  })
  updatedAt!: string | null;
}
