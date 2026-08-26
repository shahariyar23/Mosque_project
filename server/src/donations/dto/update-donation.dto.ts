import { ApiPropertyOptional } from '@nestjs/swagger';
import { DonationStatus, PaymentMethod } from '@prisma/client';
import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

import { CURRENCY_MESSAGE, CURRENCY_PATTERN, normalizeCurrency } from '../../common/utils/currency';
import { INSTANT_MESSAGE, INSTANT_PATTERN } from '../../common/utils/instant';
import {
  POSITIVE_MONEY_MESSAGE,
  POSITIVE_MONEY_PATTERN,
  normalizeMoney,
} from '../../common/utils/money';

/**
 * Correcting a donation.
 *
 * Every field is optional and keeps its three-way meaning: absent leaves the column, an explicit `null`
 * clears a nullable one, a value sets it. That is why the nullable fields use `@IsOptional()`, which admits
 * both absent and null, and the required columns use `@ValidateIf` instead — see below.
 *
 * `mosqueId` is absent, so moving a donation to another mosque is not expressible. `fundId`, `campaignId`
 * and `userId` may all be changed, and the service checks each against the caller's own mosque first; when
 * the patch leaves the donation with both a fund and a campaign, they still have to agree.
 *
 * **There is no delete, and this is the substitute.** A donation entered in error is corrected here, or
 * withdrawn with `status: cancelled`; the row stays either way. A financial record that can vanish is a
 * financial record nobody can audit, and the status column exists so nothing has to.
 *
 * **Nothing here settles anything.** Moving `status` to `completed` records that the money is in — it does
 * not capture a payment, credit a fund, or touch a balance. There is no such thing to touch yet.
 */
function normalizedMoney({ value }: TransformFnParams): unknown {
  return normalizeMoney(value as unknown);
}

function normalizedCurrency({ value }: TransformFnParams): unknown {
  return normalizeCurrency(value as unknown);
}

/**
 * "Validate this field whenever it was sent, including when it was sent as `null`."
 *
 * The required columns below need this rather than `@IsOptional()`, which skips every validator when the
 * value is null as well as when it is absent — letting `"amount": null` past validation and into the
 * service, where it would try to build a `Decimal` from nothing. These predicates let the null through to
 * `@IsString()` / `@Matches`, which reject it with a field-level 400 instead.
 */
const sentFundId = (dto: UpdateDonationDto): boolean => dto.fundId !== undefined;
const sentAmount = (dto: UpdateDonationDto): boolean => dto.amount !== undefined;
const sentCurrency = (dto: UpdateDonationDto): boolean => dto.currency !== undefined;
const sentPaymentMethod = (dto: UpdateDonationDto): boolean => dto.paymentMethod !== undefined;
const sentStatus = (dto: UpdateDonationDto): boolean => dto.status !== undefined;
const sentDonatedAt = (dto: UpdateDonationDto): boolean => dto.donatedAt !== undefined;

export class UpdateDonationDto {
  @ApiPropertyOptional({
    description:
      'Required column — may be changed, may not be cleared. Must be a fund of this mosque.',
    format: 'uuid',
  })
  @ValidateIf(sentFundId)
  @IsUUID(undefined, { message: 'fundId must be a UUID' })
  fundId?: string;

  @ApiPropertyOptional({
    description:
      'Attach the donation to an appeal, or send `null` to detach it. When the donation ends up with ' +
      'both a fund and a campaign, the campaign must collect into that fund.',
    format: 'uuid',
    nullable: true,
  })
  @IsOptional()
  @IsUUID(undefined, { message: 'campaignId must be a UUID' })
  campaignId?: string | null;

  @ApiPropertyOptional({
    description:
      'Attribute the donation to a member’s account, or send `null` to make it anonymous. Must be a ' +
      'user of this mosque.',
    format: 'uuid',
    nullable: true,
  })
  @IsOptional()
  @IsUUID(undefined, { message: 'userId must be a UUID' })
  userId?: string | null;

  @ApiPropertyOptional({ example: 'Abdul Karim', maxLength: 160, nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  donorName?: string | null;

  @ApiPropertyOptional({ example: 'karim@example.com', maxLength: 160, nullable: true })
  @IsOptional()
  @IsEmail({}, { message: 'donorEmail must be a valid email address' })
  @MaxLength(160)
  donorEmail?: string | null;

  @ApiPropertyOptional({
    description:
      'Required column — may be corrected, may not be cleared. Must be greater than zero.',
    example: '500.00',
  })
  @ValidateIf(sentAmount)
  @Transform(normalizedMoney)
  @IsString()
  @Matches(POSITIVE_MONEY_PATTERN, { message: `amount ${POSITIVE_MONEY_MESSAGE}` })
  amount?: string;

  @ApiPropertyOptional({
    description: 'Required column — may be corrected, may not be cleared.',
    example: 'BDT',
  })
  @ValidateIf(sentCurrency)
  @Transform(normalizedCurrency)
  @IsString()
  @Matches(CURRENCY_PATTERN, { message: `currency ${CURRENCY_MESSAGE}` })
  currency?: string;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @ValidateIf(sentPaymentMethod)
  @IsEnum(PaymentMethod, {
    message: `paymentMethod must be one of: ${Object.values(PaymentMethod).join(', ')}`,
  })
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    description:
      'How this donation is withdrawn: `cancelled` retires it without removing the record, which is ' +
      'what the absence of a delete endpoint is for.',
    enum: DonationStatus,
  })
  @ValidateIf(sentStatus)
  @IsEnum(DonationStatus, {
    message: `status must be one of: ${Object.values(DonationStatus).join(', ')}`,
  })
  status?: DonationStatus;

  @ApiPropertyOptional({
    description: 'Required column — may be corrected, may not be cleared.',
    example: '2026-08-21T14:30:00Z',
  })
  @ValidateIf(sentDonatedAt)
  @IsString()
  @Matches(INSTANT_PATTERN, { message: `donatedAt ${INSTANT_MESSAGE}` })
  donatedAt?: string;

  @ApiPropertyOptional({ example: 'RCP-2026-00412', maxLength: 120, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string | null;

  @ApiPropertyOptional({ maxLength: 2000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}
