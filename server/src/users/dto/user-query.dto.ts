import { ApiPropertyOptional } from '@nestjs/swagger';
import { Position, Role } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

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
 *
 * `role` and `position` are validated against the Prisma enums rather than against a list written out
 * here, so adding a committee post to the schema makes it filterable without touching this file — and
 * a query for a role or post the schema does not define is a 400 rather than an empty page, which is
 * the difference between "nobody holds that" and "you spelled it wrong".
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

  @ApiPropertyOptional({
    description: 'Filter by role — what the person may do. Exactly one role per account.',
    enum: Role,
    example: Role.secretary,
  })
  @IsOptional()
  @IsEnum(Role, { message: `role must be one of: ${Object.values(Role).join(', ')}` })
  role?: Role;

  @ApiPropertyOptional({
    description:
      'Filter by committee post — what the person is called. A user holds any number of posts, so ' +
      'this matches anyone whose posts include the one named. A position grants nothing and filtering ' +
      'on one is not an authority question.',
    enum: Position,
    example: Position.president,
  })
  @IsOptional()
  @IsEnum(Position, { message: `position must be one of: ${Object.values(Position).join(', ')}` })
  position?: Position;

  @ApiPropertyOptional({
    description:
      'When true, returns only soft-deleted users. Requires `user.viewDeleted`. ' +
      'Silently ignored when the authenticated actor does not hold the permission.',
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  deleted?: boolean;
}
