import { ApiPropertyOptional } from '@nestjs/swagger';
import { CampaignStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

import { MAX_PAGE_SIZE } from '../../common/pagination/page';
import { DEFAULT_CAMPAIGN_PAGE_SIZE } from '../types/campaign.types';

/**
 * The query string `GET /donation-campaigns` accepts.
 *
 * `fundId` lets a caller narrow by which fund a campaign collects into, which is the natural way to list
 * "all active Ramadan campaigns" or "everything filed under the construction fund". The service checks the
 * fund belongs to the caller's mosque before using it, so supplying a fund id from another mosque returns
 * nothing rather than leaking cross-mosque data.
 *
 * Everything else follows the same rules as the funds query DTO.
 */
export class CampaignQueryDto {
  @ApiPropertyOptional({ description: '1-based page number.', minimum: 1, default: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Rows per page.',
    minimum: 1,
    maximum: MAX_PAGE_SIZE,
    default: DEFAULT_CAMPAIGN_PAGE_SIZE,
    example: DEFAULT_CAMPAIGN_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE, { message: `limit must not exceed ${MAX_PAGE_SIZE}` })
  limit?: number;

  @ApiPropertyOptional({
    description: 'Case-insensitive substring match across title, slug and description.',
    maxLength: 120,
    example: 'roof',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by campaign state; omit to list every campaign.',
    enum: CampaignStatus,
    example: CampaignStatus.active,
  })
  @IsOptional()
  @IsEnum(CampaignStatus, {
    message: `status must be one of: ${Object.values(CampaignStatus).join(', ')}`,
  })
  status?: CampaignStatus;

  @ApiPropertyOptional({
    description:
      'Narrow to campaigns that collect into this fund. Must be a UUID. A fund belonging to another ' +
      'mosque returns an empty result rather than a 403.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID(undefined, { message: 'fundId must be a UUID' })
  fundId?: string;
}
