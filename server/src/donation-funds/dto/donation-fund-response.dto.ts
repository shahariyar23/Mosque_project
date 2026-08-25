import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FundStatus } from '@prisma/client';

import { fromDateOnly } from '../../common/utils/date-only';
import { fromMoney } from '../../common/utils/money';
import type { SelectedDonationFund } from '../types/donation-fund.types';

/**
 * The fund, as the API returns it.
 *
 * A declared class rather than the Prisma row, for the same reasons the other response DTOs give: it
 * documents itself in Swagger, and `from()` builds the object field by field, so a column added to the
 * schema later is invisible here until someone chooses to expose it.
 *
 * Three conversions happen in `from()` that a raw row would get wrong.
 *
 * `targetAmount` becomes an exact decimal *string*, not a number. `Prisma.Decimal.toNumber()` would put
 * the value back into binary floating point on the way out and undo the reason the column is a
 * `Decimal` at all; `"500000.00"` survives JSON, survives the client, and can be handed to any decimal
 * library on the far side unchanged.
 *
 * The two dates are calendar days, served as `YYYY-MM-DD` rather than as midnight-UTC timestamps, so a
 * fund that opens on the 1st does not read as the 31st to a reader west of Greenwich.
 *
 * And `mosqueId` is dropped. A caller can only ever read their own mosque's funds, so echoing its id
 * adds an internal identifier to every element of every list in exchange for nothing.
 *
 * There is no `raised`, `balance` or `donationCount` field. A fund is a category; the money that
 * references it is a later part's business, and this response cannot leak a figure it never reads.
 */
export class DonationFundResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Zakat' })
  name!: string;

  @ApiProperty({
    example: 'zakat',
    description: 'Unique within the mosque. Two mosques may each have a `zakat`.',
  })
  slug!: string;

  @ApiPropertyOptional({ nullable: true, example: 'Obligatory annual charity, distributed locally.' })
  description!: string | null;

  @ApiProperty({ enum: FundStatus })
  status!: FundStatus;

  @ApiPropertyOptional({
    nullable: true,
    example: '500000.00',
    description:
      'A decimal string, never a float. Null for an open-ended fund. This is a goal, not a total ' +
      'raised — no endpoint in this part reports money received.',
  })
  targetAmount!: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'date', example: '2026-03-01' })
  startDate!: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'date', example: '2026-03-31' })
  endDate!: string | null;

  @ApiProperty({ description: 'Whether the public website may show this fund.' })
  isPublic!: boolean;

  @ApiProperty({
    example: 2,
    description:
      'How many campaigns collect into this fund. A row count, not a financial figure — it is also ' +
      'what makes a fund refuse deletion while it is still in use.',
  })
  campaignCount!: number;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  /** Builds the response from a row read with `DONATION_FUND_SELECT`. The only way one of these is made. */
  static from(fund: SelectedDonationFund): DonationFundResponseDto {
    return {
      id: fund.id,
      name: fund.name,
      slug: fund.slug,
      description: fund.description,
      status: fund.status,
      targetAmount: fromMoney(fund.targetAmount),
      startDate: fund.startDate ? fromDateOnly(fund.startDate) : null,
      endDate: fund.endDate ? fromDateOnly(fund.endDate) : null,
      isPublic: fund.isPublic,
      campaignCount: fund._count.campaigns,
      createdAt: fund.createdAt.toISOString(),
      updatedAt: fund.updatedAt.toISOString(),
    };
  }
}

/** Paging figures that accompany a list response. */
export class DonationFundListMetaDto {
  @ApiProperty({ example: 1, description: '1-based, echoing what was asked for.' })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 7, description: 'Rows matching the filter, ignoring paging.' })
  total!: number;

  @ApiProperty({ example: 1, description: 'Zero when nothing matches.' })
  totalPages!: number;
}

/** The envelope every funds endpoint returns. `success` is always true — failures go to the filter. */
export class DonationFundEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Donation fund retrieved successfully' })
  message!: string;

  @ApiProperty({ type: DonationFundResponseDto })
  data!: DonationFundResponseDto;
}

export class DonationFundListEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Donation funds retrieved successfully' })
  message!: string;

  @ApiProperty({ type: [DonationFundResponseDto] })
  data!: DonationFundResponseDto[];

  @ApiProperty({ type: DonationFundListMetaDto })
  meta!: DonationFundListMetaDto;
}

/** What a delete reports back: enough for a client to say what it removed, and nothing more. */
export class DeletedDonationFundDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Zakat' })
  name!: string;

  @ApiProperty({
    example: 'zakat',
    description: 'Free again once the fund is gone — a new fund may take this slug.',
  })
  slug!: string;
}

export class DeletedDonationFundEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Donation fund deleted successfully' })
  message!: string;

  @ApiProperty({ type: DeletedDonationFundDto })
  data!: DeletedDonationFundDto;
}
