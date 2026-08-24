import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { USER_GENDERS, type UserGender } from '../../users/types/user.types';
import { compactedPhone, normalisedEmail, trimmed } from './normalisers';

/**
 * What a visitor may send to create their own account.
 *
 * The field set is the sign-up form in `web/src/components/signup` and nothing else — `fullName`,
 * `phone`, `email`, `password`, and the three optional profile fields it offers. `confirmPassword` and
 * `terms` are absent because they are decisions the form makes about itself, not data the server stores.
 *
 * What is *deliberately* absent is the point of this class. There is no `role`, no `permissions`, no
 * `deniedPermissions`, no `positions`, no `isActive` and no `status`. Self-registration cannot mint an
 * administrator or reactivate a suspended account, and it cannot do so by accident either: the global
 * pipe runs with `whitelist` and `forbidNonWhitelisted`, so a body carrying `"role": "super_admin"` is
 * rejected as malformed rather than quietly stripped. A new account lands on the schema default for
 * `role`, which is `member`.
 *
 * `emailVerifiedAt` and `lastLoginAt` are absent for the mirror-image reason: they record that
 * something happened, so they are never an input.
 *
 * The password rule is length only, 8 to 128, matching `CreateUserDto` and the default
 * `passwordMinLength` in mosque settings. The sign-up form additionally asks for an upper-case letter,
 * a lower-case letter and a digit; that is guidance shown while typing, and duplicating it here as a
 * hard rule would reject a long passphrase the form itself accepts.
 */
export class RegisterDto {
  @ApiProperty({ description: 'Full name, as it should appear on screen.', maxLength: 160 })
  @IsString()
  @Transform(trimmed)
  @MinLength(2)
  @MaxLength(160)
  fullName!: string;

  @ApiProperty({
    description: 'Sign-in address. Stored lowercased, and unique within the mosque.',
    maxLength: 160,
    example: 'karim@noor.example',
  })
  // Lowercased here so the uniqueness check, the insert and the sign-in lookup all agree on one form
  // of the address.
  @Transform(normalisedEmail)
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(160)
  email!: string;

  @ApiProperty({
    description:
      'E.164, e.g. +8801700000000. Required at sign-up because it is a sign-in identifier in its ' +
      'own right, and unique within the mosque.',
    maxLength: 32,
    example: '+8801700000000',
  })
  @IsString()
  @Transform(compactedPhone)
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: 'phone must be in international E.164 form, e.g. +8801700000000',
  })
  @MaxLength(32)
  phone!: string;

  @ApiProperty({
    description: 'Plaintext, used once to derive an Argon2id hash and never stored or returned.',
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
    description:
      'Which mosque to join, by its URL slug. Optional while a deployment serves one mosque: it is ' +
      'resolved to the only active one. Required as soon as there is more than one.',
    maxLength: 64,
    example: 'noor-jame-masjid',
  })
  @IsOptional()
  @IsString()
  @Transform(trimmed)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'mosqueSlug must be lowercase words separated by single hyphens',
  })
  @MaxLength(64)
  mosqueSlug?: string;

  @ApiPropertyOptional({ description: 'Date of birth, YYYY-MM-DD.', example: '1990-04-17' })
  @IsOptional()
  // Two checks, because each catches what the other allows: the regex rejects a time component the
  // column cannot hold, and IsISO8601 rejects a well-shaped impossibility like 1990-02-31.
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateOfBirth must be a date in YYYY-MM-DD form' })
  @IsISO8601({ strict: true }, { message: 'dateOfBirth must be a real calendar date' })
  dateOfBirth?: string;

  @ApiPropertyOptional({ description: 'Optional; omit rather than guess.', enum: USER_GENDERS })
  @IsOptional()
  @IsIn(USER_GENDERS, { message: `gender must be one of: ${USER_GENDERS.join(', ')}` })
  gender?: UserGender;

  @ApiPropertyOptional({ description: 'City of residence.', maxLength: 120 })
  @IsOptional()
  @IsString()
  @Transform(trimmed)
  @MaxLength(120)
  city?: string;

  @ApiPropertyOptional({ description: 'Opted in to the mosque newsletter.', default: false })
  @IsOptional()
  @IsBoolean()
  newsletter?: boolean;
}
