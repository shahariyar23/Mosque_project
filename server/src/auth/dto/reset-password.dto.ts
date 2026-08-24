import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

/** A one-time password-reset token and the replacement password. */
export class ResetPasswordDto {
  @ApiProperty({
    description:
      'The `token` query parameter from the reset link — roughly 43 characters of base64url. ' +
      'Not the 64-character hex value stored in `passwordResetTokenHash`: that column holds a ' +
      'SHA-256 of this token, so posting it back is hashed a second time and refused. In ' +
      'development the whole link is written to the server log, which is the only place the token ' +
      'can be read, because it is never persisted in a recoverable form.',
    example: 'paste-the-token-from-the-reset-link-here',
    writeOnly: true,
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  token!: string;

  @ApiProperty({ writeOnly: true, minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;
}
