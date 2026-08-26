import { ApiPropertyOptional } from '@nestjs/swagger';
import { DonationStatus, PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

import { MAX_PAGE_SIZE } from '../../common/pagination/page';
import { DEFAULT_DONATION_PAGE_SIZE } from '../types/donation.types';

/**
 * The query string `GET /donations` accepts.
 *
 * There is no `mosqueId` and no `userId`. The mosque comes from the token, and *whose* donations a caller
 * sees is decided by their permissions rather than by a parameter: someone with `donation.view` sees the
 * mosque's donations, someone with only `donation.viewOwn` sees their own, and no query string moves that
 * line. A `userId` filter here would be a way to ask for somebody else's giving history.
 *
 * `fundId` and `campaignId` need no ownership check on a read. The `where` clause leads with the caller's
 * mosque, so a fund or campaign belonging to another one simply matches no row — an empty page rather than
 * a 403, which tells the caller nothing either way.
 */
export class DonationQueryDto {
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
    default: DEFAULT_DONATION_PAGE_SIZE,
    example: DEFAULT_DONATION_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE, { message: `limit must not exceed ${MAX_PAGE_SIZE}` })
  limit?: number;

  @ApiPropertyOptional({
    description:
      'Case-insensitive substring match across donor name, donor email and reference. Notes are not ' +
      'searched — they are an internal field, and a search that reaches them turns every remark into a ' +
      'lookup key.',
    maxLength: 120,
    example: 'karim',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by donation state; omit to list every donation.',
    enum: DonationStatus,
    example: DonationStatus.completed,
  })
  @IsOptional()
  @IsEnum(DonationStatus, {
    message: `status must be one of: ${Object.values(DonationStatus).join(', ')}`,
  })
  status?: DonationStatus;

  @ApiPropertyOptional({
    description: 'Filter by how the money changed hands.',
    enum: PaymentMethod,
    example: PaymentMethod.cash,
  })
  @IsOptional()
  @IsEnum(PaymentMethod, {
    message: `paymentMethod must be one of: ${Object.values(PaymentMethod).join(', ')}`,
  })
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Narrow to one fund. A fund from another mosque returns an empty page, not a 403.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID(undefined, { message: 'fundId must be a UUID' })
  fundId?: string;

  @ApiPropertyOptional({
    description: 'Narrow to one campaign. Another mosque’s campaign returns an empty page.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID(undefined, { message: 'campaignId must be a UUID' })
  campaignId?: string;
}
