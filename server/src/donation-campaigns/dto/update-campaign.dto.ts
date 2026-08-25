import { ApiPropertyOptional } from '@nestjs/swagger';
import { CampaignStatus } from '@prisma/client';
import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

import { MONEY_MESSAGE, MONEY_PATTERN, normalizeMoney } from '../../common/utils/money';
import {
  DATE_MESSAGE,
  SLUG_MESSAGE,
  SLUG_PATTERN,
} from '../../donation-funds/dto/create-donation-fund.dto';
import { ISO_DATE_PATTERN } from '../../prayer-times/prayer-time.utils';

/**
 * Every field optional, and each one keeps its three-way meaning: absent leaves the column alone, an
 * explicit `null` clears it, a value sets it. That is why the nullable fields are typed `| null` and
 * validated with `@IsOptional()`, which admits both absent and null.
 *
 * `targetAmount`, `startDate` and `endDate` are optional *here* but not nullable — they are required
 * columns, so a patch may change them and may not remove them. Sending `null` for one of those is a 400.
 *
 * `mosqueId` is absent, so moving a campaign to another mosque is not expressible. `fundId` may be changed
 * or cleared, but the service checks the new fund belongs to the caller's mosque first.
 *
 * `slug` is editable and never re-derived: renaming a campaign leaves the slug alone, because a public
 * page or a shared link may already point at it.
 *
 * Two of these fields need more than `campaign.manage`. Setting `isPublic` to true, or moving `status`
 * away from `draft`, additionally requires `campaign.publish` — putting an appeal with a money target in
 * front of the public is a different act of authority from drafting one. Withdrawing is not gated: setting
 * `isPublic` to false or returning to `draft` needs only `campaign.manage`, because someone who can see a
 * bad campaign should never have to wait for a second person in order to take it down.
 */
function normalizedMoney({ value }: TransformFnParams): unknown {
  return normalizeMoney(value as unknown);
}

/**
 * "Validate this field whenever it was sent, including when it was sent as `null`."
 *
 * The three required columns below need this instead of `@IsOptional()`. `@IsOptional()` skips every
 * validator when the value is `null` as well as when it is absent, which would let `"targetAmount": null`
 * past validation and into the service — where it would try to build a `Decimal` from nothing. These
 * predicates let the null through to `@IsString()` / `@Matches`, which reject it with a field-level 400
 * instead.
 */
const sentTargetAmount = (dto: UpdateCampaignDto): boolean => dto.targetAmount !== undefined;
const sentStartDate = (dto: UpdateCampaignDto): boolean => dto.startDate !== undefined;
const sentEndDate = (dto: UpdateCampaignDto): boolean => dto.endDate !== undefined;

export class UpdateCampaignDto {
  @ApiPropertyOptional({ example: 'Build the New Mosque Roof', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({
    description: 'Left untouched when omitted — renaming the campaign does not re-derive it.',
    example: 'build-the-new-mosque-roof',
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(SLUG_PATTERN, { message: `slug ${SLUG_MESSAGE}` })
  slug?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @ApiPropertyOptional({
    description:
      'Move the campaign to another fund, or send `null` to detach it. Must be a fund of the caller’s ' +
      'own mosque.',
    format: 'uuid',
    nullable: true,
  })
  @IsOptional()
  @IsUUID(undefined, { message: 'fundId must be a UUID' })
  fundId?: string | null;

  @ApiPropertyOptional({
    description: 'Required column — may be changed, may not be cleared.',
    example: '1500000.00',
  })
  @ValidateIf(sentTargetAmount)
  @Transform(normalizedMoney)
  @IsString()
  @Matches(MONEY_PATTERN, { message: `targetAmount ${MONEY_MESSAGE}` })
  targetAmount?: string;

  @ApiPropertyOptional({
    description: 'Required column — may be changed, may not be cleared.',
    example: '2026-09-01',
  })
  @ValidateIf(sentStartDate)
  @IsString()
  @Matches(ISO_DATE_PATTERN, { message: `startDate ${DATE_MESSAGE}` })
  startDate?: string;

  @ApiPropertyOptional({
    description:
      'Checked against the stored `startDate` when only one end of the window is sent, so a patch ' +
      'cannot leave the campaign ending before it begins.',
    example: '2026-12-31',
  })
  @ValidateIf(sentEndDate)
  @IsString()
  @Matches(ISO_DATE_PATTERN, { message: `endDate ${DATE_MESSAGE}` })
  endDate?: string;

  @ApiPropertyOptional({
    description:
      'Anything other than `draft` requires `campaign.publish`. Returning to `draft` does not — pulling ' +
      'a campaign back needs no extra authority.',
    enum: CampaignStatus,
  })
  @IsOptional()
  @IsEnum(CampaignStatus, {
    message: `status must be one of: ${Object.values(CampaignStatus).join(', ')}`,
  })
  status?: CampaignStatus;

  @ApiPropertyOptional({
    description: 'A URL or reference. Send `null` to remove the image.',
    example: 'https://cdn.example.org/campaigns/roof.jpg',
    maxLength: 500,
    nullable: true,
  })
  @IsOptional()
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'imageUrl must be an http(s) URL' },
  )
  @MaxLength(500)
  imageUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Setting this true requires `campaign.publish`. Setting it false does not.',
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
