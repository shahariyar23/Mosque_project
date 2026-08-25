import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, type TransformFnParams } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

import { ISO_DATE_PATTERN, TIME_PATTERN } from '../../prayer-times/prayer-time.utils';
import { fromDateOnly } from '../../common/utils/date-only';

/**
 * Jumu'ah is not calculated. Unlike the daily prayers, the Friday khutbah and jamaat are times a mosque
 * *decides* — the imam's availability, when people can leave work, how long the hall takes to fill — and
 * no amount of astronomy produces them. So these are plain stored values with no AlAdhan involvement,
 * validated as wall-clock strings and served back exactly as entered.
 *
 * Times are `HH:mm` strings rather than `DateTime` for the reason set out in the schema: a `time`
 * column arrives through Prisma as a `Date` on 1970-01-01, and a `timestamptz` would force inventing a
 * date for a time that recurs. The string is the honest representation of "13:30, local, every Friday".
 */

const TIME_MESSAGE = 'must be a 24-hour time in HH:mm form, e.g. 13:30';

/**
 * `?isActive=true` → `true`.
 *
 * Query strings have no booleans and `enableImplicitConversion` is off globally, so the conversion is
 * explicit. Anything other than the two recognised spellings is passed through untouched and fails
 * `@IsBoolean` with a 400, rather than being coerced to `false` and quietly changing the answer.
 *
 * Declared as a function rather than an inline arrow for the reason the user DTOs give: `value` is `any`,
 * and naming the return type is what stops that `any` spreading into the DTO.
 */
function parsedBoolean({ value }: TransformFnParams): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;

  return value as unknown;
}

export class CreateJumuahDto {
  @ApiPropertyOptional({
    description:
      'The Friday this applies to, `YYYY-MM-DD`. Omit for the standing weekly schedule — the one that holds for every Friday with no entry of its own.',
    example: '2026-03-06',
    nullable: true,
  })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN, { message: 'date must be a calendar date in YYYY-MM-DD format' })
  date?: string | null;

  @ApiProperty({ description: 'When the khutbah begins.', example: '13:15' })
  @Matches(TIME_PATTERN, { message: `khutbahTime ${TIME_MESSAGE}` })
  khutbahTime!: string;

  @ApiProperty({ description: 'When the jamaat begins.', example: '13:45' })
  @Matches(TIME_PATTERN, { message: `prayerTime ${TIME_MESSAGE}` })
  prayerTime!: string;

  @ApiPropertyOptional({ description: 'Who delivers the khutbah.', maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  imam?: string | null;

  @ApiPropertyOptional({
    description: 'Where it is held, when a mosque runs more than one hall.',
    maxLength: 160,
    example: 'Main Prayer Hall',
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  location?: string | null;

  @ApiPropertyOptional({ description: 'Anything worth telling attendees.' })
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiPropertyOptional({
    description: 'False keeps a record without publishing it. Defaults to true.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * Every field optional. There is no `mosqueId` on either DTO: the mosque comes from the access token,
 * and because `forbidNonWhitelisted` is on, a request that sends one is rejected outright rather than
 * having it quietly dropped — so an attempt to write into another mosque's schedule fails loudly.
 */
export class UpdateJumuahDto {
  @ApiPropertyOptional({ example: '2026-03-06', nullable: true })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN, { message: 'date must be a calendar date in YYYY-MM-DD format' })
  date?: string | null;

  @ApiPropertyOptional({ example: '13:15' })
  @IsOptional()
  @Matches(TIME_PATTERN, { message: `khutbahTime ${TIME_MESSAGE}` })
  khutbahTime?: string;

  @ApiPropertyOptional({ example: '13:45' })
  @IsOptional()
  @Matches(TIME_PATTERN, { message: `prayerTime ${TIME_MESSAGE}` })
  prayerTime?: string;

  @ApiPropertyOptional({ maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  imam?: string | null;

  @ApiPropertyOptional({ maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  location?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** The row shape returned by every Jumu'ah route. `mosqueId` is not among the fields — see `from`. */
export class JumuahDto {
  @ApiProperty() id!: string;

  @ApiProperty({
    nullable: true,
    description: 'The Friday this applies to, or null for the standing weekly schedule.',
    example: '2026-03-06',
  })
  date!: string | null;

  @ApiProperty({ example: '13:15' }) khutbahTime!: string;
  @ApiProperty({ example: '13:45' }) prayerTime!: string;

  @ApiProperty({ nullable: true }) imam!: string | null;
  @ApiProperty({ nullable: true }) location!: string | null;
  @ApiProperty({ nullable: true }) notes!: string | null;
  @ApiProperty() isActive!: boolean;

  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;

  /**
   * Row → response.
   *
   * Two things happen here that a raw row would get wrong. The `date` column is a calendar day and is
   * served as `YYYY-MM-DD` rather than as a midnight-UTC timestamp. And `mosqueId` is dropped — the
   * caller's own mosque is the only one they can ever read, so echoing its id adds an internal
   * identifier to every element of every list in exchange for nothing.
   */
  static from(row: {
    id: string;
    date: Date | null;
    khutbahTime: string;
    prayerTime: string;
    imam: string | null;
    location: string | null;
    notes: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): JumuahDto {
    return {
      id: row.id,
      date: row.date ? fromDateOnly(row.date) : null,
      khutbahTime: row.khutbahTime,
      prayerTime: row.prayerTime,
      imam: row.imam,
      location: row.location,
      notes: row.notes,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

/**
 * The one filter worth having on the list.
 *
 * A mosque keeps old Fridays and cancelled arrangements in this table, and a public prayer-times page
 * wants only what is currently published. Filtering client-side would work at this scale but means
 * every caller reimplements the same predicate, and the two that forget it show a cancelled jamaat.
 */
export class ListJumuahQueryDto {
  @ApiPropertyOptional({
    description:
      'Return only published (`true`) or only unpublished (`false`) entries. Omit for both.',
  })
  @IsOptional()
  @Transform(parsedBoolean)
  @IsBoolean()
  isActive?: boolean;
}
