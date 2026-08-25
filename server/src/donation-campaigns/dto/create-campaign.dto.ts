import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
} from 'class-validator';

import { MONEY_MESSAGE, MONEY_PATTERN, normalizeMoney } from '../../common/utils/money';
import {
  DATE_MESSAGE,
  SLUG_MESSAGE,
  SLUG_PATTERN,
} from '../../donation-funds/dto/create-donation-fund.dto';
import { ISO_DATE_PATTERN } from '../../prayer-times/prayer-time.utils';

/**
 * Creating a campaign: a specific fundraising appeal, such as "Build the New Mosque Roof".
 *
 * There is no `mosqueId` here, and that is the whole cross-mosque guarantee for the write path. The mosque
 * comes from the access token, and because the global pipe runs with `forbidNonWhitelisted`, a request
 * that sends a `mosqueId` is rejected with a 400 rather than having it quietly dropped.
 *
 * `fundId` *is* accepted, because a campaign has to be able to say which fund it collects into — but the
 * service checks that the fund belongs to the caller's mosque before writing, so a fund id borrowed from
 * another mosque is a 400 and not a cross-mosque link.
 *
 * Where the fund DTO makes the target and the dates optional, this one requires all three. A fund is a
 * standing category and may well have no deadline and no goal; an appeal that has neither is not an
 * appeal. Requiring both ends also makes `endDate >= startDate` an unconditional rule for campaigns.
 *
 * `imageUrl` is a URL, and only a URL. Image bytes do not go in PostgreSQL: a row is read on every list
 * request, and a few hundred kilobytes of JPEG per row would be paid for on every one of them.
 */

/**
 * A money field, normalised to the decimal string `MONEY_PATTERN` checks.
 *
 * A named function rather than an inline arrow, following the other DTOs: `value` is `any`, and naming
 * the parameter and return type is what stops that `any` spreading into the DTO.
 */
function normalizedMoney({ value }: TransformFnParams): unknown {
  return normalizeMoney(value as unknown);
}

export class CreateCampaignDto {
  @ApiProperty({
    description: 'What the appeal is called, in the mosque’s own words.',
    example: 'Build the New Mosque Roof',
    maxLength: 200,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({
    description:
      'URL-safe identifier, unique within the mosque. Derived from `title` when omitted. Stable once ' +
      'issued: a public page may link to it.',
    example: 'build-the-new-mosque-roof',
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(SLUG_PATTERN, { message: `slug ${SLUG_MESSAGE}` })
  slug?: string;

  @ApiPropertyOptional({
    description: 'The appeal itself — what the money is for and why it is needed.',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @ApiPropertyOptional({
    description:
      'The fund this campaign collects into. Must be a fund of the caller’s own mosque — one belonging ' +
      'to another mosque is a 400. Omit for an appeal that is not filed under any fund.',
    format: 'uuid',
    nullable: true,
  })
  @IsOptional()
  @IsUUID(undefined, { message: 'fundId must be a UUID' })
  fundId?: string | null;

  @ApiProperty({
    description:
      'What the appeal is asking for, as a decimal string. Required — an appeal without a goal is not ' +
      'an appeal. Never sent or returned as a float.',
    example: '1500000.00',
  })
  @Transform(normalizedMoney)
  @IsString()
  @Matches(MONEY_PATTERN, { message: `targetAmount ${MONEY_MESSAGE}` })
  targetAmount!: string;

  @ApiProperty({ description: 'When the appeal opens.', example: '2026-09-01' })
  @Matches(ISO_DATE_PATTERN, { message: `startDate ${DATE_MESSAGE}` })
  startDate!: string;

  @ApiProperty({
    description: 'When the appeal closes. Must not fall before `startDate`.',
    example: '2026-12-31',
  })
  @Matches(ISO_DATE_PATTERN, { message: `endDate ${DATE_MESSAGE}` })
  endDate!: string;

  @ApiPropertyOptional({
    description:
      'Defaults to `draft`, so a new campaign is not live merely because it was created. Anything other ' +
      'than `draft` additionally requires `campaign.publish`.',
    enum: CampaignStatus,
    default: CampaignStatus.draft,
  })
  @IsOptional()
  @IsEnum(CampaignStatus, {
    message: `status must be one of: ${Object.values(CampaignStatus).join(', ')}`,
  })
  status?: CampaignStatus;

  @ApiPropertyOptional({
    description:
      'A link to the campaign image. A URL or reference only — image bytes are not stored in the ' +
      'database.',
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
    description:
      'Whether the public website may show this campaign. Defaults to false, and setting it true ' +
      'requires `campaign.publish` in addition to `campaign.manage`.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
