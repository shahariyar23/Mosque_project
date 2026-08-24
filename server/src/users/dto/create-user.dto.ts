import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { USER_GENDERS, USER_STATUSES, type UserGender, type UserStatus } from '../types/user.types';

/**
 * Normalisers for the three fields where the stored form differs from what a form submits.
 *
 * Declared as functions rather than inline arrows so each one can state that it returns `unknown`.
 * `TransformFnParams.value` is `any` — a non-string reaching one of these is a validation error the
 * decorator below is about to raise, so the value is passed through untouched rather than coerced,
 * and the cast keeps that pass-through from spreading `any` into the DTO.
 */
function trimmed({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : (value as unknown);
}

function normalisedEmail({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : (value as unknown);
}

/** Strips the spaces and dashes people type, leaving the E.164 digits the column stores. */
function compactedPhone({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.replace(/[\s-]/g, '') : (value as unknown);
}

/**
 * What a caller may send to create a user.
 *
 * The field set is the writable part of the `User` model and nothing else. `role`, `positions`,
 * `permissions` and `deniedPermissions` are deliberately absent: granting authority is its own
 * operation with its own permission (`role.assign`, `permission.assign`), so a create request cannot
 * be used to mint an administrator. A new user lands on the schema default, `member`.
 *
 * `emailVerifiedAt`, `lastLoginAt` and `deletedAt` are absent for the same reason in reverse — they
 * are records of something having happened, not inputs.
 *
 * The global pipe runs with `whitelist` and `forbidNonWhitelisted`, so anything not declared here is
 * rejected rather than ignored. That is what stops a caller from smuggling `role` into the body.
 */
export class CreateUserDto {
  @ApiProperty({
    description:
      'The mosque this account belongs to. Supplied explicitly for now; once sign-in exists it ' +
      'comes from the authenticated caller instead.',
    format: 'uuid',
    example: '3f1a7c2e-9b4d-4f6a-8c11-2d5e7a9b0c31',
  })
  @IsUUID(undefined, { message: 'mosqueId must be a UUID' })
  mosqueId!: string;

  @ApiProperty({ description: 'Full name, as it should appear on screen.', maxLength: 160 })
  @IsString()
  @Transform(trimmed)
  @MinLength(2)
  @MaxLength(160)
  fullName!: string;

  @ApiProperty({
    description: 'Sign-in address. Stored lowercased, and unique within the mosque.',
    maxLength: 160,
    example: 'imam@noor.example',
  })
  // Lowercased here rather than in the service so the uniqueness pre-check, the insert and the
  // response all agree on one form of the address.
  @Transform(normalisedEmail)
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(160)
  email!: string;

  @ApiPropertyOptional({
    description: 'E.164, e.g. +8801700000000. Unique within the mosque when given.',
    maxLength: 32,
    example: '+8801700000000',
  })
  @IsOptional()
  @IsString()
  @Transform(compactedPhone)
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: 'phone must be in international E.164 form, e.g. +8801700000000',
  })
  @MaxLength(32)
  phone?: string | null;

  @ApiProperty({
    description:
      'Plaintext, used once to derive an Argon2id hash and never stored. The minimum matches the ' +
      'default `passwordMinLength` in mosque settings.',
    minLength: 8,
    maxLength: 128,
    writeOnly: true,
  })
  @IsString()
  @MinLength(8, { message: 'password must be at least 8 characters' })
  // Capped so a request cannot turn the hash function into a CPU sink. Argon2 itself has no limit.
  @MaxLength(128)
  password!: string;

  @ApiPropertyOptional({
    description: 'Whether the account can sign in. Maps to `isActive`; defaults to active.',
    enum: USER_STATUSES,
    default: 'active',
  })
  @IsOptional()
  @IsIn(USER_STATUSES, { message: `status must be one of: ${USER_STATUSES.join(', ')}` })
  status?: UserStatus;

  @ApiPropertyOptional({ description: 'Date of birth, YYYY-MM-DD.', example: '1990-04-17' })
  @IsOptional()
  // Two checks, because each catches what the other allows: the regex rejects a time component the
  // column cannot hold, and IsISO8601 rejects a well-shaped impossibility like 1990-02-31.
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateOfBirth must be a date in YYYY-MM-DD form' })
  @IsISO8601({ strict: true }, { message: 'dateOfBirth must be a real calendar date' })
  dateOfBirth?: string | null;

  @ApiPropertyOptional({ description: 'Optional; omit rather than guess.', enum: USER_GENDERS })
  @IsOptional()
  @IsIn(USER_GENDERS, { message: `gender must be one of: ${USER_GENDERS.join(', ')}` })
  gender?: UserGender | null;

  @ApiPropertyOptional({ description: 'City of residence.', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string | null;

  @ApiPropertyOptional({ description: 'Absolute URL of a profile picture.', maxLength: 500 })
  @IsOptional()
  @IsUrl({ require_protocol: true }, { message: 'avatarUrl must be an absolute URL' })
  @MaxLength(500)
  avatarUrl?: string | null;

  @ApiPropertyOptional({ description: 'Opted in to the mosque newsletter.', default: false })
  @IsOptional()
  @IsBoolean()
  newsletter?: boolean;
}
