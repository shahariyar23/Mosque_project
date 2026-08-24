import { ApiProperty } from '@nestjs/swagger';

import { effectivePermissions } from '../../common/constants/roles';
import { UserResponseDto } from '../../users/dto/user-response.dto';

/**
 * The signed-in person, as the auth endpoints return them.
 *
 * `UserResponseDto` with one field added, rather than a parallel shape, so the profile a client reads
 * from `/auth/me` is field-for-field the profile it reads from `/users/:id`. Everything the parent
 * class guarantees still holds: it is an allow-list built column by column, `passwordHash` is not in
 * the select that feeds it, and there is no refresh-token material on the user row to leak.
 *
 * `positions` comes from the parent, and is how the President appears — as a committee post held by a
 * `member`, not as a role. Nothing in this file, and nothing in the token, encodes that office.
 *
 * The factory is `of` rather than `from` because it takes an already-mapped profile instead of a row.
 * TypeScript checks the static side of a subclass against its parent, so redeclaring `from` with a
 * different signature would not compile — a useful accident, since two same-named factories taking
 * different things would be a trap anyway.
 */
export class AuthProfileDto extends UserResponseDto {
  @ApiProperty({
    type: [String],
    description:
      'What this account may actually do, once the role, the grants and the denials have been ' +
      'resolved: base ∪ role ∪ `permissions` − `deniedPermissions`, and empty when inactive. Sent so ' +
      'a client can hide what it must not offer — the server never trusts it back.',
  })
  effectivePermissions!: string[];

  /**
   * Wraps a profile the users module has already sanitised.
   *
   * It takes a `UserResponseDto` rather than a Prisma row on purpose: mapping a row to a response is
   * the users module's job and is written once, in `UserResponseDto.from`. Reading the columns again
   * here would be a second allow-list to keep in step with the first.
   *
   * The resolution is done here rather than in `AuthService` so that the service holds no permission
   * logic at all, and so no auth endpoint can return a profile that forgot to include it. The work is a
   * call to the authorization module's existing pure function — a `UserResponseDto` already carries the
   * four fields a `PermissionSubject` needs.
   */
  static of(profile: UserResponseDto): AuthProfileDto {
    return { ...profile, effectivePermissions: effectivePermissions(profile) };
  }
}

/**
 * What a successful sign-in or refresh hands back.
 *
 * The access token is here, in the body, because a client has to attach it to `Authorization` on every
 * request and therefore has to be able to read it. The refresh token is *not* here, in this class or
 * any other: it leaves the server only as an HttpOnly cookie, so no script can read it, and no
 * response body carries it into a log, a proxy cache or `localStorage`.
 */
export class AuthSessionDto {
  @ApiProperty({
    description: 'Send as `Authorization: Bearer <token>`. Short-lived; refresh rather than store.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIuLi4ifQ.signature',
  })
  accessToken!: string;

  @ApiProperty({ example: 'Bearer', description: 'The scheme to use for the header above.' })
  tokenType!: 'Bearer';

  @ApiProperty({
    example: 900,
    description:
      'Seconds until the access token expires, read off the token itself rather than restated, so ' +
      'it cannot disagree with `JWT_ACCESS_EXPIRES_IN`.',
  })
  expiresIn!: number;

  @ApiProperty({ type: AuthProfileDto })
  user!: AuthProfileDto;
}

/** What registration reports: the new account, and no session. Signing in is a separate request. */
export class RegisteredUserDto {
  @ApiProperty({ type: AuthProfileDto })
  user!: AuthProfileDto;
}

export class RegisterEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Account created successfully' })
  message!: string;

  @ApiProperty({ type: RegisteredUserDto })
  data!: RegisteredUserDto;
}

/** Shared by sign-in and refresh, because both end with the same thing: a session. */
export class AuthSessionEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Signed in successfully' })
  message!: string;

  @ApiProperty({ type: AuthSessionDto })
  data!: AuthSessionDto;
}

export class AuthProfileEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Profile retrieved successfully' })
  message!: string;

  @ApiProperty({ type: AuthProfileDto })
  data!: AuthProfileDto;
}

/**
 * Sign-out carries no `data`.
 *
 * Every other envelope in the project has one because there is something to describe. Here the result
 * is the absence of a session, which `success` already says; a `{ "signedOut": true }` payload would be
 * the same fact written twice. The endpoint is also idempotent, so there is nothing to report that
 * would distinguish a first call from a second.
 */
export class LogoutEnvelopeDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Signed out successfully' })
  message!: string;
}
