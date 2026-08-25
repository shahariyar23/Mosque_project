import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CampaignStatus } from '@prisma/client';

import { fromDateOnly } from '../../common/utils/date-only';
import { fromMoney } from '../../common/utils/money';
import type { SelectedCampaign } from '../types/campaign.types';

/**
 * The campaign, as the API returns it.
 *
 * Same three conversions the fund response makes, for the same reasons: `targetAmount` leaves as an exact
 * decimal string rather than a float, the two dates leave as `YYYY-MM-DD` calendar days rather than
 * midnight-UTC timestamps, and `mosqueId` is dropped because a caller can only ever read their own
 * mosque's campaigns.
 *
 * The one addition is `fund` — which fund this appeal collects into, as an id, a name and a slug. It is
 * nullable, because a campaign is allowed to stand on its own without being filed under a fund.
 *
 * There is no `raised`, `progress` or `donationCount`. A campaign here is the appeal, not the money that
 * answers it; donations arrive in Part 20, and a response that never reads them cannot report a figure
 * that has not been reconciled.
 */
export class CampaignResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Build the New Mosque Roof' })
  title!: string;

  @ApiProperty({
    example: 'build-the-new-mosque-roof',
    description: 'Unique within the mosque. Two mosques may each run a `ramadan-iftar`.',
  })
  slug!: string;

  @ApiPropertyOptional({
    nullable: true,
    example: 'The roof has leaked through two monsoons and needs replacing before the next.',
  })
  description!: string | null;

  @ApiProperty({ enum: CampaignStatus })
  status!: CampaignStatus;

  @ApiProperty({
    example: '1500000.00',
    description:
      'A decimal string, never a float. This is what the appeal asks for — no endpoint in this part ' +
      'reports what has come in.',
  })
  targetAmount!: string;

  @ApiProperty({ format: 'date', example: '2026-09-01' })
  startDate!: string;

  @ApiProperty({ format: 'date', example: '2026-12-31' })
  endDate!: string;

  @ApiPropertyOptional({
    nullable: true,
    example: 'https://cdn.example.org/campaigns/roof.jpg',
    description: 'A URL or reference. Image bytes are not stored in the database.',
  })
  imageUrl!: string | null;

  @ApiProperty({ description: 'Whether the public website may show this campaign.' })
  isPublic!: boolean;

  @ApiPropertyOptional({
    nullable: true,
    type: () => CampaignFundRefDto,
    description: 'The fund this appeal collects into, or null when it is filed under none.',
  })
  fund!: CampaignFundRefDto | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  /** Builds the response from a row read with `CAMPAIGN_SELECT`. The only way one of these is made. */
  static from(campaign: SelectedCampaign): CampaignResponseDto {
    return {
      id: campaign.id,
      title: campaign.title,
      slug: campaign.slug,
      description: campaign.description,
      status: campaign.status,
      targetAmount: fromMoney(campaign.targetAmount),
      startDate: fromDateOnly(campaign.startDate),
      endDate: fromDateOnly(campaign.endDate),
      imageUrl: campaign.imageUrl,
      isPublic: campaign.isPublic,
      fund: campaign.fund
        ? { id: campaign.fund.id, name: campaign.fund.name, slug: campaign.fund.slug }
        : null,
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
    };
  }
}

/**
 * Just enough of the fund to name it.
 *
 * Deliberately not the whole fund. The fund's own target, dates and visibility are readable from
 * `/donation-funds/:id`; copying them into every campaign row would be a second version of the same record
 * that drifts from the first.
 */
export class CampaignFundRefDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Mosque Construction' })
  name!: string;

  @ApiProperty({ example: 'mosque-construction' })
  slug!: string;
}

/** Paging figures that accompany a list response. */
export class CampaignListMetaDto {
  @ApiProperty({ example: 1, description: '1-based, echoing what was asked for.' })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 3, description: 'Rows matching the filter, ignoring paging.' })
  total!: number;

  @ApiProperty({ example: 1, description: 'Zero when nothing matches.' })
  totalPages!: number;
}

/** The envelope every campaigns endpoint returns. `success` is always true — failures go to the filter. */
export class CampaignEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Campaign retrieved successfully' })
  message!: string;

  @ApiProperty({ type: CampaignResponseDto })
  data!: CampaignResponseDto;
}

export class CampaignListEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Campaigns retrieved successfully' })
  message!: string;

  @ApiProperty({ type: [CampaignResponseDto] })
  data!: CampaignResponseDto[];

  @ApiProperty({ type: CampaignListMetaDto })
  meta!: CampaignListMetaDto;
}

/** What a delete reports back: enough for a client to say what it removed, and nothing more. */
export class DeletedCampaignDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Build the New Mosque Roof' })
  title!: string;

  @ApiProperty({
    example: 'build-the-new-mosque-roof',
    description: 'Free again once the campaign is gone — a new campaign may take this slug.',
  })
  slug!: string;
}

export class DeletedCampaignEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Campaign deleted successfully' })
  message!: string;

  @ApiProperty({ type: DeletedCampaignDto })
  data!: DeletedCampaignDto;
}
