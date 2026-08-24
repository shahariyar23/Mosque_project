import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

import { compactedPhone, normalisedEmail, trimmed } from './normalisers';

/** The account identifier for a password-recovery request. */
export class ForgotPasswordDto {
  @ApiPropertyOptional({ example: 'karim@noor.example', maxLength: 160 })
  @IsOptional()
  @Transform(normalisedEmail)
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(160)
  email?: string;

  @ApiPropertyOptional({ example: '+8801700000000', maxLength: 32 })
  @IsOptional()
  @IsString()
  @Transform(compactedPhone)
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: 'phone must be in international E.164 form, e.g. +8801700000000',
  })
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Required only when the same email or phone belongs to more than one mosque.',
    example: 'noor-jame-masjid',
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @Transform(trimmed)
  @MaxLength(64)
  mosqueSlug?: string;
}
