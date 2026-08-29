import { ApiPropertyOptional } from '@nestjs/swagger';
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
import { DATE_MESSAGE, SLUG_MESSAGE, SLUG_PATTERN } from './create-donation-fund.dto';

/**
 * Every field optional, and each one keeps its three-way meaning: absent leaves the column alone, an
 * explicit `null` clears it, a value sets it. That is why the nullable fields are typed `| null` and
 * validated with `@IsOptional()`, which admits both absent and null.
 *
 * `mosqueId` is absent for the same reason it is absent from the create DTO: with
 * `forbidNonWhitelisted` on, a request that sends one is a 400, so moving a fund between mosques is not
 * expressible in the API.
 *
 * `slug` is editable but not derived here. On create an omitted slug is generated from the name; on
 * update an omitted slug is left exactly as it was, because a public page may already link to it and
 * renaming a fund should not silently break that link.
 */
function normalizedMoney({ value }: TransformFnParams): unknown {
  return normalizeMoney(value as unknown);
}

export class UpdateDonationFundDto {
  @ApiPropertyOptional({ example: 'Zakat', maxLength: 160 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional({
    description: 'Left untouched when omitted — renaming the fund does not re-derive it.',
    example: 'zakat',
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(SLUG_PATTERN, { message: `slug ${SLUG_MESSAGE}` })
  slug?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional({
    description:
      'Use `inactive` to stop a fund being offered and `archived` to retire it. Both are reversible ' +
      'and neither loses anything, which is why they exist alongside DELETE.',
    enum: FundStatus,
  })
  @IsOptional()
  @IsEnum(FundStatus, {
    message: `status must be one of: ${Object.values(FundStatus).join(', ')}`,
  })
  status?: FundStatus;

  @ApiPropertyOptional({ example: '500000.00', nullable: true })
  @IsOptional()
  @Transform(normalizedMoney)
  @IsString()
  @Matches(MONEY_PATTERN, { message: `targetAmount ${MONEY_MESSAGE}` })
  targetAmount?: string | null;

  @ApiPropertyOptional({ example: '2026-03-01', nullable: true })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN, { message: `startDate ${DATE_MESSAGE}` })
  startDate?: string | null;

  @ApiPropertyOptional({
    description:
      'Checked against the stored `startDate` when only one end of the window is sent, so a patch ' +
      'cannot leave the fund with an end before its start.',
    example: '2026-03-31',
    nullable: true,
  })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN, { message: `endDate ${DATE_MESSAGE}` })
  endDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Initial opening balance for the fund, as a decimal string.',
    example: '10000.00',
    nullable: true,
  })
  @IsOptional()
  @Transform(normalizedMoney)
  @IsString()
  @Matches(MONEY_PATTERN, { message: `openingBalance ${MONEY_MESSAGE}` })
  openingBalance?: string | null;
}
