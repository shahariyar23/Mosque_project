import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DonationStatus, PaymentMethod } from '@prisma/client';

import { fromMoney } from '../../common/utils/money';
import type { SelectedDonation } from '../types/donation.types';

/**
 * Just enough of the donor to name them.
 *
 * Deliberately not the user record. Their email, phone, address, role and permissions are readable at
 * `/users/:id` by someone entitled to read them; a donation list is not that entitlement, and copying the
 * account into every row would hand out contact details as a side effect of reading the books.
 */
export class DonationDonorRefDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Abdul Karim' })
  fullName!: string;
}

/** Just enough of the fund to name it. The whole record is at `/donation-funds/:id`. */
export class DonationFundRefDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Zakat' })
  name!: string;

  @ApiProperty({ example: 'zakat' })
  slug!: string;
}

/** Just enough of the campaign to name it. The whole record is at `/donation-campaigns/:id`. */
export class DonationCampaignRefDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Build the New Mosque Roof' })
  title!: string;

  @ApiProperty({ example: 'build-the-new-mosque-roof' })
  slug!: string;
}

/**
 * The donation, as the API returns it.
 *
 * `amount` leaves as an exact decimal string rather than a float, for the reason `common/utils/money` gives:
 * the rule that money is `Decimal` and never `Float` is only kept if the value never becomes a JavaScript
 * number on either side of the database either. `currency` travels beside it, because a bare `Decimal` has
 * no unit and a figure without one is not an amount.
 *
 * `mosqueId` is dropped: a caller can only ever read their own mosque's donations.
 *
 * `donor` is an id and a name. It is not the donor's account — no email, no phone, no role — because a
 * treasurer reading the donation list has no need of the giver's contact details and a response that
 * included them would hand them over on every page. `donorEmail` beside it belongs to *this donation*,
 * entered so a receipt for someone with no account has an address to go to.
 *
 * There is no `raised`, `fundBalance` or `runningTotal`. A donation reports itself. Totals are derived from
 * these rows when financial reports arrive in a later part, and a figure published here would be one nobody
 * had reconciled.
 *
 * The three reference classes above are declared before this one because they have to be.
 * `emitDecoratorMetadata` writes an eager `design:type` reference for every decorated property whose type is
 * a single class, so a `fund!: DonationFundRefDto` sitting above `DonationFundRefDto` reads the class inside
 * its temporal dead zone and throws the moment the module loads. The `type: () => X` thunks are for Swagger
 * and do not save it.
 */
export class DonationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    example: '500.00',
    description: 'A decimal string, never a float. Always paired with `currency`.',
  })
  amount!: string;

  @ApiProperty({
    example: 'BDT',
    description: 'ISO 4217, as stored on the row when it was written.',
  })
  currency!: string;

  @ApiProperty({ enum: PaymentMethod })
  paymentMethod!: PaymentMethod;

  @ApiProperty({ enum: DonationStatus })
  status!: DonationStatus;

  @ApiProperty({
    format: 'date-time',
    example: '2026-08-21T14:30:00.000Z',
    description: 'When the money was given, which is not necessarily when the row was written.',
  })
  donatedAt!: string;

  @ApiPropertyOptional({
    nullable: true,
    type: () => DonationDonorRefDto,
    description: 'The donor’s account, or null for an anonymous or unregistered donor.',
  })
  donor!: DonationDonorRefDto | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 'Abdul Karim',
    description: 'The name a receipt is made out to when there is no account behind the gift.',
  })
  donorName!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'karim@example.com' })
  donorEmail!: string | null;

  @ApiProperty({
    type: () => DonationFundRefDto,
    description: 'The fund this donation was given to. Always present.',
  })
  fund!: DonationFundRefDto;

  @ApiPropertyOptional({
    nullable: true,
    type: () => DonationCampaignRefDto,
    description:
      'The appeal this donation answered, or null when it was given straight to the fund.',
  })
  campaign!: DonationCampaignRefDto | null;

  @ApiPropertyOptional({ nullable: true, example: 'RCP-2026-00412' })
  reference!: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Internal. Not part of a receipt.' })
  notes!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  /** Builds the response from a row read with `DONATION_SELECT`. The only way one of these is made. */
  static from(donation: SelectedDonation): DonationResponseDto {
    return {
      id: donation.id,
      amount: fromMoney(donation.amount),
      currency: donation.currency,
      paymentMethod: donation.paymentMethod,
      status: donation.status,
      donatedAt: donation.donatedAt.toISOString(),
      donor: donation.donor ? { id: donation.donor.id, fullName: donation.donor.fullName } : null,
      donorName: donation.donorName,
      donorEmail: donation.donorEmail,
      fund: {
        id: donation.fund.id,
        name: donation.fund.name,
        slug: donation.fund.slug,
      },
      campaign: donation.campaign
        ? {
            id: donation.campaign.id,
            title: donation.campaign.title,
            slug: donation.campaign.slug,
          }
        : null,
      reference: donation.reference,
      notes: donation.notes,
      createdAt: donation.createdAt.toISOString(),
      updatedAt: donation.updatedAt.toISOString(),
    };
  }
}

/** Paging figures that accompany a list response. */
export class DonationListMetaDto {
  @ApiProperty({ example: 1, description: '1-based, echoing what was asked for.' })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 3, description: 'Rows matching the filter, ignoring paging.' })
  total!: number;

  @ApiProperty({ example: 1, description: 'Zero when nothing matches.' })
  totalPages!: number;
}

/** The envelope every donations endpoint returns. `success` is always true — failures go to the filter. */
export class DonationEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Donation retrieved successfully' })
  message!: string;

  @ApiProperty({ type: DonationResponseDto })
  data!: DonationResponseDto;
}

export class DonationListEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Donations retrieved successfully' })
  message!: string;

  @ApiProperty({ type: [DonationResponseDto] })
  data!: DonationResponseDto[];

  @ApiProperty({ type: DonationListMetaDto })
  meta!: DonationListMetaDto;
}
