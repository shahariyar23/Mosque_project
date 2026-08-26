import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Position, Role } from '@prisma/client';

import {
  USER_STATUSES,
  type SelectedUser,
  type SelectedUserWithDeleted,
} from '../types/user.types';

/**
 * The user, as the API returns it.
 *
 * A declared class rather than the Prisma row for two reasons. It documents itself in Swagger, and —
 * more importantly — it is an allow-list: `from()` builds the object field by field, so a column added
 * to the schema later is invisible here until someone chooses to expose it. Returning the Prisma
 * object would have the opposite default, where a new column ships to every client automatically.
 *
 * `passwordHash` is absent, and is not merely deleted after the fact — `USER_SELECT` never reads it
 * out of the database. There is no refresh-token material on the user row at all; sessions live in
 * their own table.
 *
 * Timestamps are ISO-8601 strings and `dateOfBirth` is a plain `YYYY-MM-DD`, matching the `Date`
 * column it comes from. Serialising a date-only column as a full instant invites a timezone shift that
 * moves someone's birthday by a day.
 */
export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid', description: 'The mosque this account belongs to.' })
  mosqueId!: string;

  @ApiProperty({ example: 'Abdul Karim' })
  fullName!: string;

  @ApiProperty({ example: 'admin@noor.example' })
  email!: string;

  @ApiPropertyOptional({ nullable: true, example: '+8801700000002' })
  phone!: string | null;

  @ApiProperty({ enum: Role, description: 'Assigned elsewhere; this endpoint never changes it.' })
  role!: Role;

  @ApiProperty({ enum: Position, isArray: true, description: 'Committee posts. Display only.' })
  positions!: Position[];

  @ApiProperty({
    type: [String],
    description: 'Permissions granted on top of the role.',
  })
  permissions!: string[];

  @ApiProperty({
    type: [String],
    description: 'Permissions removed after everything else. A deny always wins.',
  })
  deniedPermissions!: string[];

  @ApiProperty({
    description: 'False resolves to no permissions at all, base ones included.',
  })
  isActive!: boolean;

  @ApiProperty({
    enum: USER_STATUSES,
    description:
      'The status vocabulary form of `isActive`, so a client can echo it back as a filter.',
  })
  status!: (typeof USER_STATUSES)[number];

  @ApiPropertyOptional({ nullable: true, example: '1990-04-17', description: 'YYYY-MM-DD.' })
  dateOfBirth!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'male' })
  gender!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Dhaka' })
  city!: string | null;

  @ApiPropertyOptional({ nullable: true })
  avatarUrl!: string | null;

  @ApiProperty()
  newsletter!: boolean;

  @ApiPropertyOptional({ nullable: true, format: 'date-time' })
  emailVerifiedAt!: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'date-time' })
  lastLoginAt!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  @ApiPropertyOptional({
    nullable: true,
    format: 'date-time',
    description: 'Present only when listing deleted users with `user.viewDeleted`.',
  })
  deletedAt?: string | null;

  /** Builds the response from a row read with `USER_SELECT`. The only way one of these is made. */
  static from(user: SelectedUser | SelectedUserWithDeleted): UserResponseDto {
    const dto: UserResponseDto = {
      id: user.id,
      mosqueId: user.mosqueId,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      positions: user.positions,
      permissions: user.permissions,
      deniedPermissions: user.deniedPermissions,
      isActive: user.isActive,
      status: user.isActive ? 'active' : 'inactive',
      dateOfBirth: toDateOnly(user.dateOfBirth),
      gender: user.gender,
      city: user.city,
      avatarUrl: user.avatarUrl,
      newsletter: user.newsletter,
      emailVerifiedAt: toInstant(user.emailVerifiedAt),
      lastLoginAt: toInstant(user.lastLoginAt),
      createdAt: new Date(user.createdAt).toISOString(),
      updatedAt: new Date(user.updatedAt).toISOString(),
    };

    // Only include deletedAt when the row was read with USER_SELECT_WITH_DELETED and the
    // user is actually deleted (deletedAt is a non-null Date). For normal reads, or for rows
    // where deletedAt is null, the field is omitted entirely.
    if ('deletedAt' in user && user.deletedAt != null) {
      dto.deletedAt = toInstant(user.deletedAt as Date);
    }

    return dto;
  }
}

/** Paging figures that accompany a list response. */
export class UserListMetaDto {
  @ApiProperty({ example: 1, description: '1-based, echoing what was asked for.' })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 42, description: 'Rows matching the filter, ignoring paging.' })
  total!: number;

  @ApiProperty({ example: 3, description: 'Zero when nothing matches.' })
  totalPages!: number;
}

/** The envelope every users endpoint returns. `success` is always true — failures go to the filter. */
export class UserEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'User retrieved successfully' })
  message!: string;

  @ApiProperty({ type: UserResponseDto })
  data!: UserResponseDto;
}

export class UserListEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Users retrieved successfully' })
  message!: string;

  @ApiProperty({ type: [UserResponseDto] })
  data!: UserResponseDto[];

  @ApiProperty({ type: UserListMetaDto })
  meta!: UserListMetaDto;
}

/** What a soft delete reports back: enough to confirm the change, and nothing else. */
export class DeletedUserDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'date-time' })
  deletedAt!: string;
}

export class DeletedUserEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'User deleted successfully' })
  message!: string;

  @ApiProperty({ type: DeletedUserDto })
  data!: DeletedUserDto;
}

function toInstant(value: Date | null): string | null {
  return value === null ? null : new Date(value).toISOString();
}

/** `Date` columns come back as UTC midnight, so the first ten characters are the calendar date. */
function toDateOnly(value: Date | null): string | null {
  return value === null ? null : new Date(value).toISOString().slice(0, 10);
}
