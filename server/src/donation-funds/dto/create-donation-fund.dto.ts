import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FundStatus } from '@prisma/client';
import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { MONEY_MESSAGE, MONEY_PATTERN, normalizeMoney } from '../../common/utils/money';
import { ISO_DATE_PATTERN } from '../../prayer-times/prayer-time.utils';

/**
 * Creating a fund: the standing purpose a donation can be directed to.
 *
 * There is no `mosqueId` on this DTO, and that is the whole cross-mosque guarantee for the write path.
 * The mosque comes from the access token; because the global pipe runs with `forbidNonWhitelisted`, a
 * request that sends a `mosqueId` is rejected with a 400 rather than having it quietly dropped — so an
 * attempt to write into another mosque's funds fails loudly instead of appearing to succeed.
 *
 * Nothing in this file enumerates fund *names*. "Zakat", "Sadaqah" and the rest are rows a mosque
 * creates, not values the API knows about: the set differs between mosques, and a hard-coded list would
 * be a permanent argument about whose categories are the real ones.
 */

/** The slug form both funds and campaigns use, and what `slugify` produces. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const SLUG_MESSAGE =
  'must be lower-case letters and digits separated by single hyphens, e.g. "zakat-1447"';

export const DATE_MESSAGE = 'must be a calendar date in YYYY-MM-DD format';

/**
 * A money field, normalised to the decimal string `MONEY_PATTERN` checks.
 *
 * Declared as a named function rather than an inline arrow for the reason the other DTOs in this
 * codebase give: `value` is `any`, and naming the parameter and return type is what stops that `any`
 * spreading into the DTO. The cast to `unknown` is the same move `parsedBoolean` makes in the Jumu'ah
 * DTO — the helper takes `unknown` and decides for itself what the value is.
 */
function normalizedMoney({ value }: TransformFnParams): unknown {
  return normalizeMoney(value as unknown);
}

export class CreateDonationFundDto {
  @ApiProperty({
    description: 'What the mosque calls this fund. Its own wording — nothing here is a fixed list.',
    example: 'Zakat',
    maxLength: 160,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({
    description:
      'URL-safe identifier, unique within the mosque. Derived from `name` when omitted. Stable once ' +
      'issued: a public page may link to it.',
    example: 'zakat',
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(SLUG_PATTERN, { message: `slug ${SLUG_MESSAGE}` })
  slug?: string;

  @ApiPropertyOptional({ description: 'What the fund is for, in the mosque’s own words.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional({
    description: 'Defaults to `active`. See the enum for what each state means.',
    enum: FundStatus,
    default: FundStatus.active,
  })
  @IsOptional()
  @IsEnum(FundStatus, {
    message: `status must be one of: ${Object.values(FundStatus).join(', ')}`,
  })
  status?: FundStatus;

  @ApiPropertyOptional({
    description:
      'What the mosque hopes to raise, as a decimal string. Omit for an open-ended fund, which is ' +
      'normal for Zakat and for a general fund. Never sent or returned as a float.',
    example: '500000.00',
    nullable: true,
  })
  @IsOptional()
  @Transform(normalizedMoney)
  @IsString()
  @Matches(MONEY_PATTERN, { message: `targetAmount ${MONEY_MESSAGE}` })
  targetAmount?: string | null;

  @ApiPropertyOptional({
    description: 'When collection opens. Omit for a standing fund with no window.',
    example: '2026-03-01',
    nullable: true,
  })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN, { message: `startDate ${DATE_MESSAGE}` })
  startDate?: string | null;

  @ApiPropertyOptional({
    description: 'When collection closes. Must not fall before `startDate`.',
    example: '2026-03-31',
    nullable: true,
  })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN, { message: `endDate ${DATE_MESSAGE}` })
  endDate?: string | null;

  @ApiPropertyOptional({
    description:
      'Whether the public website may show this fund. Defaults to false — a new fund stays in the ' +
      'back office until someone says otherwise.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
