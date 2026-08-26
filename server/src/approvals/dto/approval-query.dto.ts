import { ApiPropertyOptional } from '@nestjs/swagger';
import { ApprovalStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { MAX_PAGE_SIZE } from '../../common/pagination/page';
import { DATE_MESSAGE } from '../../donation-funds/dto/create-donation-fund.dto';
import { ISO_DATE_PATTERN } from '../../prayer-times/prayer-time.utils';
import {
  APPROVAL_ENTITIES,
  DEFAULT_APPROVAL_PAGE_SIZE,
  type ApprovalEntity,
} from '../types/approval.types';

/**
 * The query string `GET /approvals` accepts.
 *
 * No `mosqueId`: it comes from the token.
 *
 * `entity` and `entityId` together answer the question a module asks before letting an operation
 * through — "is there anything outstanding against this row?" — and are served by the
 * `[entity, entityId, status]` index rather than by a scan. `from` and `to` filter on when the request
 * was raised, not on when it was decided; a queue is read by age.
 */
export class ApprovalQueryDto {
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
    default: DEFAULT_APPROVAL_PAGE_SIZE,
    example: DEFAULT_APPROVAL_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE, { message: `limit must not exceed ${MAX_PAGE_SIZE}` })
  limit?: number;

  @ApiPropertyOptional({
    description:
      'Filter by state; omit to list every request. `pending` is what a reviewer wants, and is ' +
      'already first in the default ordering without it.',
    enum: ApprovalStatus,
    example: ApprovalStatus.pending,
  })
  @IsOptional()
  @IsEnum(ApprovalStatus, {
    message: `status must be one of: ${Object.values(ApprovalStatus).join(', ')}`,
  })
  status?: ApprovalStatus;

  @ApiPropertyOptional({
    description: 'Filter by the kind of thing under review.',
    enum: APPROVAL_ENTITIES,
    example: 'expense',
  })
  @IsOptional()
  @IsIn(APPROVAL_ENTITIES, {
    message: `entity must be one of: ${APPROVAL_ENTITIES.join(', ')}`,
  })
  entity?: ApprovalEntity;

  @ApiPropertyOptional({
    description:
      'Filter to one target row. Most useful with `entity` and `status=pending`, which is how a ' +
      'module checks whether the thing it is about to change is already awaiting a decision.',
    maxLength: 64,
    example: '9f1c2e3d-4a5b-6c7d-8e9f-0a1b2c3d4e5f',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  entityId?: string;

  @ApiPropertyOptional({
    description: 'Only requests raised on or after this day. Inclusive.',
    example: '2026-08-01',
  })
  @IsOptional()
  @IsString()
  @Matches(ISO_DATE_PATTERN, { message: `from ${DATE_MESSAGE}` })
  from?: string;

  @ApiPropertyOptional({
    description: 'Only requests raised on or before this day. Inclusive.',
    example: '2026-08-31',
  })
  @IsOptional()
  @IsString()
  @Matches(ISO_DATE_PATTERN, { message: `to ${DATE_MESSAGE}` })
  to?: string;
}
