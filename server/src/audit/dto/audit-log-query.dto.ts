import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, Min } from 'class-validator';

import { MAX_PAGE_SIZE } from '../../common/pagination/page';
import { DATE_MESSAGE } from '../../donation-funds/dto/create-donation-fund.dto';
import { ISO_DATE_PATTERN } from '../../prayer-times/prayer-time.utils';
import {
  AUDIT_ACTIONS,
  AUDIT_RESOURCES,
  DEFAULT_AUDIT_LOG_PAGE_SIZE,
  type AuditAction,
  type AuditResource,
} from '../types/audit-log.types';

/**
 * Filtering the audit trail.
 *
 * The parameter names are the brief's — `action`, `entity`, `userId`, `from`, `to` — rather than the
 * schema's. Two of them differ from the column they filter: `entity` reads the `resource` column and
 * `userId` reads `actorId`. The service maps them, and the names stay as the API documents them,
 * because renaming a public query parameter to match an internal column is a breaking change that buys
 * nothing.
 *
 * There is no `mosqueId`, and adding one would be the bug this module is here to prevent: the mosque
 * comes from the token, so a filter here could only ever be an attempt to read another mosque's trail.
 * `forbidNonWhitelisted` turns the attempt into a 400.
 *
 * `action` and `entity` are validated against the writers' own vocabulary rather than accepted as free
 * text. A filter naming something nothing can write would return an empty page, which reads as "this
 * never happened" — the one answer an audit log must not give by accident.
 */
export class AuditLogQueryDto {
  @ApiPropertyOptional({ description: 'Page number, from 1.', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: `Rows per page. Capped at ${MAX_PAGE_SIZE}; the service caps it again.`,
    minimum: 1,
    maximum: MAX_PAGE_SIZE,
    default: DEFAULT_AUDIT_LOG_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Show only one kind of action.',
    enum: AUDIT_ACTIONS,
  })
  @IsOptional()
  @IsIn(AUDIT_ACTIONS, { message: `action must be one of: ${AUDIT_ACTIONS.join(', ')}` })
  action?: AuditAction;

  @ApiPropertyOptional({
    description: 'Show only entries about one kind of thing. Reads the `resource` column.',
    enum: AUDIT_RESOURCES,
  })
  @IsOptional()
  @IsIn(AUDIT_RESOURCES, { message: `entity must be one of: ${AUDIT_RESOURCES.join(', ')}` })
  entity?: AuditResource;

  @ApiPropertyOptional({
    description: 'Show only what this person did. Reads the `actorId` column.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Earliest day to include, inclusive. A calendar date, read in UTC.',
    example: '2026-08-01',
  })
  @IsOptional()
  @IsString()
  @Matches(ISO_DATE_PATTERN, { message: `from ${DATE_MESSAGE}` })
  from?: string;

  @ApiPropertyOptional({
    description:
      'Latest day to include, inclusive — the whole of that day, not the instant it began. Must not ' +
      'fall before `from`.',
    example: '2026-08-26',
  })
  @IsOptional()
  @IsString()
  @Matches(ISO_DATE_PATTERN, { message: `to ${DATE_MESSAGE}` })
  to?: string;
}
