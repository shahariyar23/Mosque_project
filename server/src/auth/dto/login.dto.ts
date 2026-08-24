import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

import { compactedPhone, normalisedEmail, trimmed } from './normalisers';

/**
 * What a visitor may send to sign in.
 *
 * `email` *or* `phone`, plus the password. Not a single `identifier` field: the sign-in form already
 * decides which of the two it is sending — see `SigninPayload` in
 * `web/src/components/signin/signin-validation.ts`, where the comment reads "Exactly one of these is
 * set" — and the two identifiers are separate unique columns on the row. Collapsing them into one
 * string here would mean sniffing at the value to guess which column to search, and would be a second,
 * conflicting request format for something the frontend has already settled.
 *
 * Both are optional to `class-validator` because neither is individually required; exactly one must be
 * present, which is a rule about the pair and so is checked in the service. The failure is a 400 with a
 * clear message rather than the generic 401, because a malformed request is not a failed sign-in
 * attempt — nothing about whether an account exists is revealed by saying which fields were expected.
 *
 * There is no `mosqueSlug` on the happy path. Email and phone are unique per mosque rather than
 * globally, so a deployment serving several mosques can in principle hold the same address twice; the
 * service resolves the single match, and asks which mosque only if there really are two.
 */
export class LoginDto {
  @ApiPropertyOptional({
    description: 'Sign in with an email address. Send this or `phone`, not both.',
    maxLength: 160,
    example: 'karim@noor.example',
  })
  @IsOptional()
  @Transform(normalisedEmail)
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(160)
  email?: string;

  @ApiPropertyOptional({
    description: 'Sign in with a phone number, E.164. Send this or `email`, not both.',
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
  phone?: string;

  @ApiPropertyOptional({
    description: 'The password. Never logged, and never echoed back.',
    maxLength: 128,
    writeOnly: true,
  })
  // Length is deliberately *not* validated here beyond the cap. A minimum would turn "your password is
  // too short" into a statement about a real account's password, and every wrong password must produce
  // the same answer. The cap stays, so a megabyte of text cannot be sent to argon2.
  @IsString()
  @MaxLength(128)
  password!: string;

  @ApiPropertyOptional({
    description:
      'Which mosque to sign in to, by URL slug. Only needed if the same address exists at more ' +
      'than one mosque in this deployment.',
    maxLength: 64,
    example: 'noor-jame-masjid',
  })
  @IsOptional()
  @IsString()
  @Transform(trimmed)
  @MaxLength(64)
  mosqueSlug?: string;

  @ApiPropertyOptional({
    description:
      'Keep me signed in. Controls only how long the browser *stores* the refresh cookie — a ' +
      'persistent cookie versus a session one. It does not extend the token’s own lifetime, which is ' +
      '`JWT_REFRESH_EXPIRES_IN` either way.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  remember?: boolean;
}
