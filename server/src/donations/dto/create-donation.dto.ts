import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
} from 'class-validator';

import { CURRENCY_MESSAGE, CURRENCY_PATTERN, normalizeCurrency } from '../../common/utils/currency';
import { INSTANT_MESSAGE, INSTANT_PATTERN } from '../../common/utils/instant';
import {
  POSITIVE_MONEY_MESSAGE,
  POSITIVE_MONEY_PATTERN,
  normalizeMoney,
} from '../../common/utils/money';

/**
 * Recording a donation: money the mosque has received, or has been promised.
 *
 * There is no `mosqueId` here, and that is the whole cross-mosque guarantee for the write path. The mosque
 * comes from the access token; because the global pipe runs with `forbidNonWhitelisted`, a request that
 * sends a `mosqueId` is rejected with a 400 rather than having it quietly dropped, so an attempt to write
 * into another mosque's books fails loudly instead of appearing to succeed.
 *
 * `userId`, `fundId` and `campaignId` are the three identifiers a client may supply that point at other
 * rows, and the service checks every one of them against the caller's own mosque before writing. A
 * campaign additionally has to be one that collects into the named fund.
 *
 * **The donor.** Three shapes are all legitimate. A registered giver is `userId`, and their name comes off
 * their account. Someone with no account is `donorName` — and `donorEmail` if a receipt is going out.
 * A genuinely anonymous gift, the Friday collection box, is neither: no id and no name, which is why every
 * one of those fields is optional and why `userId` is nullable in the schema.
 *
 * **No payment is taken.** Nothing in this application talks to a card processor or a mobile wallet.
 * `paymentMethod: online` records that money arrived through one; it does not make it happen, and a
 * donation created with `status: completed` is somebody asserting the money is in, not the system checking.
 */
function normalizedMoney({ value }: TransformFnParams): unknown {
  return normalizeMoney(value as unknown);
}

function normalizedCurrency({ value }: TransformFnParams): unknown {
  return normalizeCurrency(value as unknown);
}

export class CreateDonationDto {
  @ApiProperty({
    description:
      'Which fund the money was given to. Required — a donation whose purpose the mosque cannot state ' +
      'is not something this endpoint will record. Must be a fund of the caller’s own mosque.',
    format: 'uuid',
  })
  @IsUUID(undefined, { message: 'fundId must be a UUID' })
  fundId!: string;

  @ApiPropertyOptional({
    description:
      'The appeal this donation answered, when it answered one. Must belong to the caller’s mosque and, ' +
      'when `fundId` is also given, must be a campaign that collects into that fund.',
    format: 'uuid',
    nullable: true,
  })
  @IsOptional()
  @IsUUID(undefined, { message: 'campaignId must be a UUID' })
  campaignId?: string | null;

  @ApiPropertyOptional({
    description:
      'The donor’s account, when the donor has one. Must be a user of the caller’s own mosque. Omit for ' +
      'a walk-in, a cash collection, or a donor who asked not to be named.',
    format: 'uuid',
    nullable: true,
  })
  @IsOptional()
  @IsUUID(undefined, { message: 'userId must be a UUID' })
  userId?: string | null;

  @ApiPropertyOptional({
    description:
      'Who to make the receipt out to, for a donor with no account. Leave both this and `userId` out for ' +
      'an anonymous gift.',
    example: 'Abdul Karim',
    maxLength: 160,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  donorName?: string | null;

  @ApiPropertyOptional({
    description: 'Where a receipt would be sent, for a donor with no account.',
    example: 'karim@example.com',
    maxLength: 160,
    nullable: true,
  })
  @IsOptional()
  @IsEmail({}, { message: 'donorEmail must be a valid email address' })
  @MaxLength(160)
  donorEmail?: string | null;

  @ApiProperty({
    description:
      'The amount given, as a decimal string. Must be greater than zero — a donation of nothing is a ' +
      'mistake, not an event. Never sent or returned as a float.',
    example: '500.00',
  })
  @Transform(normalizedMoney)
  @IsString()
  @Matches(POSITIVE_MONEY_PATTERN, { message: `amount ${POSITIVE_MONEY_MESSAGE}` })
  amount!: string;

  @ApiPropertyOptional({
    description:
      'ISO 4217 code. Defaults to the mosque’s configured currency, and is then stored on the row — ' +
      'changing the mosque’s default later does not restate this donation.',
    example: 'BDT',
    minLength: 3,
    maxLength: 3,
  })
  @IsOptional()
  @Transform(normalizedCurrency)
  @IsString()
  @Matches(CURRENCY_PATTERN, { message: `currency ${CURRENCY_MESSAGE}` })
  currency?: string;

  @ApiProperty({
    description: 'How the money changed hands. Recorded, not processed.',
    enum: PaymentMethod,
  })
  @IsEnum(PaymentMethod, {
    message: `paymentMethod must be one of: ${Object.values(PaymentMethod).join(', ')}`,
  })
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({
    description:
      'Defaults to `pending`. Set `completed` only when the money is actually in — that is the state a ' +
      'later report will count.',
    enum: DonationStatus,
    default: DonationStatus.pending,
  })
  @IsOptional()
  @IsEnum(DonationStatus, {
    message: `status must be one of: ${Object.values(DonationStatus).join(', ')}`,
  })
  status?: DonationStatus;

  @ApiPropertyOptional({
    description:
      'When the money was given, which is not when the row was written — a cash collection entered on ' +
      'Monday was given on Friday. Defaults to now. A bare date is read as midnight UTC; a timestamp ' +
      'must carry a zone.',
    example: '2026-08-21T14:30:00Z',
  })
  @IsOptional()
  @IsString()
  @Matches(INSTANT_PATTERN, { message: `donatedAt ${INSTANT_MESSAGE}` })
  donatedAt?: string;

  @ApiPropertyOptional({
    description:
      'The mosque’s own handle on the transaction: a bank reference, a receipt book number, a gateway ' +
      'id. Not unique — cash donations often have none.',
    example: 'RCP-2026-00412',
    maxLength: 120,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string | null;

  @ApiPropertyOptional({
    description: 'Anything the mosque wants on the record. Internal — not part of a receipt.',
    maxLength: 2000,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}
