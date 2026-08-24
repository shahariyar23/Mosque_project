import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { unauthenticated } from '../common/guards/authorization';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { env, type AppConfig } from '../config/app.config';
import { AuthService } from './auth.service';
import {
  AuthProfileEnvelopeDto,
  AuthSessionEnvelopeDto,
  LogoutEnvelopeDto,
  PasswordRecoveryEnvelopeDto,
  RegisterEnvelopeDto,
} from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { clearRefreshCookie, refreshTokenFrom, setRefreshCookie } from './refresh-cookie';
import type { SessionOrigin } from './types/auth.types';

/**
 * The five credential routes, and nothing else.
 *
 * Under `/api/v1/auth` — the global prefix and the version come from `main.ts`, and the refresh cookie's
 * path is scoped to exactly this segment, so the browser attaches the token to these routes only.
 *
 * The three public ones say so with `@Public()`, which is what steps the global `JwtAuthGuard` aside; the
 * two below it carry no such marker and are therefore closed by default. That is the whole access model
 * in this file — there is no `if (user.role === ...)` anywhere, because authorization belongs to
 * `RolesGuard` and `PermissionsGuard` and a check here would be a second model nobody audits.
 *
 * Each handler does four things: take a validated DTO, call the service, move the cookie, and wrap the
 * result in the response envelope. The cookie is the only reason `@Res` appears at all, and it is always
 * `passthrough: true` so Nest still serialises the return value — taking over the response object by hand
 * would opt these routes out of the global exception filter and the envelope with it.
 *
 * The rate limits are tighter than the global default because these are the endpoints worth guessing at.
 * Sign-in and registration get five attempts a minute; refresh gets twenty, since a busy tab legitimately
 * rotates far more often than a person types a password.
 */
@ApiTags('Auth')
@ApiTooManyRequestsResponse({ description: 'Too many attempts. Wait and try again.' })
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    // The generic on `AppConfig` is a compile-time view over `get()` and cannot be attached to the
    // injection token, so the token is named explicitly and the parameter carries the typed alias.
    @Inject(ConfigService) private readonly config: AppConfig,
  ) {}

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Create an account.',
    description:
      'Public sign-up. The new account is a `member` — `role`, `permissions` and `status` are not ' +
      'fields of this request, and a body that invents one is rejected outright by the global ' +
      'validation pipe. The password is used once to derive an Argon2id hash and is never returned. ' +
      'Registering does not sign you in: call `POST /auth/login` next.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({ description: 'The account was created.', type: RegisterEnvelopeDto })
  @ApiBadRequestResponse({
    description: 'A field failed validation, or no mosque could be resolved.',
  })
  @ApiConflictResponse({ description: 'The email or phone is already registered.' })
  async register(@Body() dto: RegisterDto): Promise<RegisterEnvelopeDto> {
    return {
      success: true,
      message: 'Account created successfully',
      data: { user: await this.auth.register(dto) },
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Sign in.',
    description:
      'Identify with either `email` or `phone` — one of the two, not both. On success the access token ' +
      'comes back in the body and the refresh token is set as an HttpOnly cookie scoped to ' +
      '`/api/v1/auth`; it is never in the body, so no script can read it. Wrong password, unknown ' +
      'address and disabled account all answer the same 401, on purpose.',
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: 'Signed in.', type: AuthSessionEnvelopeDto })
  @ApiBadRequestResponse({ description: 'Neither identifier was sent, or both were.' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials.' })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSessionEnvelopeDto> {
    const { session, refresh } = await this.auth.login(dto, originOf(request));

    setRefreshCookie(response, this.config, refresh);

    return { success: true, message: 'Signed in successfully', data: session };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Request a password-reset link.',
    description:
      'Always returns the same response, whether the account exists or not. A reset token is stored only as a hash and is never returned by this API.',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiOkResponse({
    description: 'The recovery request was accepted.',
    type: PasswordRecoveryEnvelopeDto,
  })
  @ApiBadRequestResponse({
    description: 'Send either an email address or a phone number, not both.',
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<PasswordRecoveryEnvelopeDto> {
    await this.auth.forgotPassword(dto);

    return {
      success: true,
      message: 'If the account exists, a password reset link has been sent.',
    };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Reset a password with a one-time recovery token.',
    description:
      'A valid token can be used once. On success, the password is replaced and every active refresh session is revoked.',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({ description: 'The password was reset.', type: PasswordRecoveryEnvelopeDto })
  @ApiBadRequestResponse({
    description: 'The token or replacement password has an invalid format.',
  })
  @ApiUnauthorizedResponse({ description: 'The reset token is invalid, expired or already used.' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<PasswordRecoveryEnvelopeDto> {
    await this.auth.resetPassword(dto);

    return { success: true, message: 'Password reset successfully' };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Change the signed-in user’s password.',
    description:
      'Requires the current password and invalidates every refresh-token session after a successful change.',
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiOkResponse({ description: 'The password was changed.', type: PasswordRecoveryEnvelopeDto })
  @ApiBadRequestResponse({
    description:
      'The request is malformed, the new password is weak, or both passwords are the same.',
  })
  @ApiUnauthorizedResponse({
    description: 'No valid access token was sent, or the current password is incorrect.',
  })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<PasswordRecoveryEnvelopeDto> {
    await this.auth.changePassword(user, dto);

    return { success: true, message: 'Password changed successfully' };
  }

  /**
   * Rotation, driven entirely by the cookie.
   *
   * `@Public()` and a guard together look contradictory and are not: the marker steps the *access-token*
   * guard aside, because this is the one route that must work when the access token has expired — that is
   * what it is for. `RefreshTokenGuard` then authenticates the request against the refresh secret and the
   * cookie instead, and it deliberately ignores `@Public()`, so the endpoint is never actually open.
   */
  @Public()
  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Exchange the refresh cookie for a new access token.',
    description:
      'Send no body and no bearer token — the cookie is the credential. Every successful call rotates: ' +
      'the presented token is revoked, a new one replaces the cookie, and presenting the old one again ' +
      'is a 401. Expired, forged, already-spent and belonging-to-a-disabled-account are all the same 401.',
  })
  @ApiOkResponse({ description: 'A new session.', type: AuthSessionEnvelopeDto })
  @ApiUnauthorizedResponse({
    description: 'The refresh token is missing, invalid, expired or spent.',
  })
  async refresh(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSessionEnvelopeDto> {
    // The guard has already read and verified this same cookie, so it is present; the service needs the
    // raw value again to find the row by hash. Narrowed rather than asserted — a non-null assertion here
    // would be a claim about a guard's internals that the type system cannot check.
    const presented = refreshTokenFrom(request, env.refreshCookieName(this.config));
    if (presented === null) throw unauthenticated();

    const { session, refresh } = await this.auth.refresh(user, presented, originOf(request));

    setRefreshCookie(response, this.config, refresh);

    return { success: true, message: 'Session refreshed successfully', data: session };
  }

  /**
   * Ends this session.
   *
   * Authenticated with the access token, not the cookie, so that the revocation is scoped to a user the
   * server has independently identified. The cookie is still read — it names *which* session to revoke —
   * but it is not what proves who is asking.
   *
   * Safe to call twice. The service revokes only a live token and treats matching nothing as success, and
   * clearing an already-cleared cookie is a no-op, so a client that retries gets the same 200.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Sign out.',
    description:
      'Revokes the refresh token in the cookie and clears the cookie. This session only — other ' +
      'devices stay signed in. Idempotent: calling it again is another 200.',
  })
  @ApiOkResponse({ description: 'Signed out.', type: LogoutEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'No valid access token was sent.' })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LogoutEnvelopeDto> {
    await this.auth.logout(user, refreshTokenFrom(request, env.refreshCookieName(this.config)));

    // Unconditional, and after the revocation rather than instead of it. The browser's copy and the
    // server's record are two different things, and only one of them can be missing.
    clearRefreshCookie(response, this.config);

    return { success: true, message: 'Signed out successfully' };
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'The signed-in person’s own profile.',
    description:
      'Read fresh from the database on every call, including `role` and `effectivePermissions`, so a ' +
      'change of authority shows up without waiting for a token to expire. `passwordHash` is not in ' +
      'the select behind this response, and no refresh-token material is on the user row.',
  })
  @ApiOkResponse({ description: 'The profile.', type: AuthProfileEnvelopeDto })
  @ApiUnauthorizedResponse({ description: 'No valid access token was sent.' })
  async me(@CurrentUser() user: AuthenticatedUser): Promise<AuthProfileEnvelopeDto> {
    return {
      success: true,
      message: 'Profile retrieved successfully',
      data: await this.auth.me(user),
    };
  }
}

/**
 * Where a session was created from.
 *
 * Recorded on the refresh-token row so a future session list can say "Chrome on Windows, yesterday". It
 * is never read back for a decision — pinning a session to an IP breaks every mobile network, and a
 * user-agent string is a client-supplied header, so treating either as proof of identity would be
 * trusting the caller to describe themselves honestly.
 */
function originOf(request: Request): SessionOrigin {
  return { userAgent: request.get('user-agent'), ipAddress: request.ip };
}
