import { ApiPropertyOptional } from '@nestjs/swagger';
import { VolunteerStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

import { MAX_PAGE_SIZE } from '../../common/pagination/page';
import { DEFAULT_VOLUNTEER_PAGE_SIZE } from '../types/volunteer.types';

/**
 * The query string `GET /volunteers` accepts.
 *
 * `limit` is capped at `MAX_PAGE_SIZE` — the same ceiling the users list uses — so a caller cannot ask
 * for the whole roster in one request. The cap is enforced twice, here as a validation error and again
 * in the service, because the service is also called from tests and would otherwise trust its input.
 *
 * Query parameters arrive as strings, so the numeric ones opt into coercion with `@Type`; the global
 * pipe runs with `enableImplicitConversion: false` and will not do it for them.
 *
 * `search` matches the *person*, not the volunteer row: a coordinator looking for someone types a name
 * or a phone number, and those columns live on `User`. `status` is validated against the Prisma enum
 * rather than a list written out here, so an unknown value is a 400 rather than an empty page — the
 * difference between "nobody is on leave" and "you spelled it wrong".
 */
export class VolunteerQueryDto {
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
    default: DEFAULT_VOLUNTEER_PAGE_SIZE,
    example: DEFAULT_VOLUNTEER_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE, { message: `limit must not exceed ${MAX_PAGE_SIZE}` })
  limit?: number;

  @ApiPropertyOptional({
    description:
      'Case-insensitive substring match across the volunteer’s name, email and phone — the columns on ' +
      'their user account.',
    maxLength: 120,
    example: 'rahim',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by roster state; omit to list every volunteer.',
    enum: VolunteerStatus,
    example: VolunteerStatus.active,
  })
  @IsOptional()
  @IsEnum(VolunteerStatus, {
    message: `status must be one of: ${Object.values(VolunteerStatus).join(', ')}`,
  })
  status?: VolunteerStatus;
}
