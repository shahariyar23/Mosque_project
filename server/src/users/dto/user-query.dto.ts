import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

import { MAX_PAGE_SIZE } from '../../common/pagination/page';
import { DEFAULT_USER_PAGE_SIZE, USER_STATUSES, type UserStatus } from '../types/user.types';

/**
 * The query string `GET /users` accepts.
 *
 * `limit` is capped at `MAX_PAGE_SIZE` — the same ceiling every other list endpoint uses — so a caller
 * cannot ask for the whole directory in one request and turn a list into a denial-of-service lever.
 * The cap is enforced twice, here as a validation error and again in the service, because the service
 * is also called from tests and would otherwise trust its input.
 *
 * Query parameters arrive as strings, so the numeric ones opt into coercion with `@Type`; the global
 * pipe runs with `enableImplicitConversion: false` and will not do it for them.
 */
export class UserQueryDto {
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
    default: DEFAULT_USER_PAGE_SIZE,
    example: DEFAULT_USER_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE, { message: `limit must not exceed ${MAX_PAGE_SIZE}` })
  limit?: number;

  @ApiPropertyOptional({
    description: 'Case-insensitive substring match across name, email and phone.',
    maxLength: 120,
    example: 'karim',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by account status. Maps to `isActive`; omit to list both.',
    enum: USER_STATUSES,
  })
  @IsOptional()
  @IsIn(USER_STATUSES, { message: `status must be one of: ${USER_STATUSES.join(', ')}` })
  status?: UserStatus;
}
