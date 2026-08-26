import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import type { Prisma, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { AuditLogService } from '../audit/audit-log.service';
import { unauthenticated } from '../common/guards/authorization';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { env, type AppConfig } from '../config/app.config';
import { formatDeviceSummary, formatLoginTime } from '../mail/templates/login-alert.template';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { USER_SELECT } from '../users/types/user.types';
import { UsersService } from '../users/users.service';
import { AuthProfileDto, type AuthSessionDto } from './dto/auth-response.dto';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';
import type { AccessTokenPayload } from './types/access-token-payload';
import {
  CREDENTIAL_SELECT,
  type CredentialRow,
  type IssuedRefreshToken,
  type RefreshTokenPayload,
  type SessionOrigin,
} from './types/auth.types';

/** What the controller needs after a sign-in or a refresh: a body to return, and a cookie to set. */
export interface SessionResult {
  session: AuthSessionDto;
  /** Never serialised into the response. It exists so the controller can write the cookie. */
  refresh: IssuedRefreshToken;
}

/** The two things that distinguish one session-creation from another. */
interface SessionOptions {
  /** Whether the browser should keep the cookie past the end of the browsing session. */
  remember: boolean;
  /** The `RefreshToken` row this one supersedes, when the session is being rotated rather than opened. */
  replaces?: string;
}

/**
 * Everything the auth endpoints do.
 *
 * Six rules run through the whole file.
 *
 * A password is verified here and nowhere else. This is the only class in the project that reads
 * `passwordHash` — through `CREDENTIAL_SELECT`, because the users module's `USER_SELECT` deliberately
 * cannot see the column — and the value never leaves the method that compares it.
 *
 * A refresh token exists as plaintext for the length of one function call. What is stored is its
 * SHA-256, so a leaked database yields no usable sessions; what is returned is a cookie the browser
 * cannot read; and what is logged is a user id, never a token.
 *
 * A refusal says as little as possible. Wrong password, unknown address, disabled account, expired
 * token, reused token and forged token all produce the same 401. Anything more specific is a free
 * answer to someone probing the API.
 *
 * Authority is never read from a request, and never written by one. Registration cannot set a role, a
 * permission or a status, because `UsersService.create` has no way to accept one; a token carries a
 * user id and nothing else; and what a person may do is resolved from their row on every request.
 *
 * Authorization is not this class's business. There is no permission check anywhere in it — that lives
 * in `RolesGuard` and `PermissionsGuard`, and the one place a permission set is computed for a response
 * is `AuthProfileDto.of`.
 *
 * A security event leaves a trace. Sign-ins, refused sign-ins against a known account, and both ways a
 * password can change are recorded through `AuditLogService`. What is recorded is who and when, never
 * what: no method below puts a password, a token or a hash into an audit entry, and the writer redacts
 * anything so named as a second line. The one event that cannot be recorded is a sign-in attempt against
 * an address with no account, which has no mosque to file it under — see `login`.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    // The generic on `AppConfig` is a compile-time view over `get()` and cannot be attached to the
    // injection token, so the token is named explicitly and the parameter carries the typed alias.
    @Inject(ConfigService) private readonly config: AppConfig,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly users: UsersService,
    private readonly audit: AuditLogService,
    private readonly mail: MailService,
  ) {}

  /**
   * Creates an account, and no session.
   *
   * Registering does not sign you in. Two reasons: the client that just registered has the password in
   * hand and can sign in with one more call, and keeping the two apart means every session in the
   * system is created by exactly one code path.
   *
   * The work itself is `UsersService.create`, reused rather than reimplemented. It hashes with argon2id,
   * refuses a duplicate email or phone with a 409, omits `role`, `positions` and `permissions` so the
   * row lands on the schema default of `member`, and maps the result through the project's one
   * sanitiser. A second copy of that here is how a registration endpoint ends up able to mint admins.
   */
  async register(dto: RegisterDto): Promise<AuthProfileDto> {
    const mosqueId = await this.resolveMosque(dto.mosqueSlug);

    const profile = await this.users.create({
      mosqueId,
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone,
      password: dto.password,
      dateOfBirth: dto.dateOfBirth,
      gender: dto.gender,
      city: dto.city,
      newsletter: dto.newsletter,
      // `status` is not passed, so the account is active. `role` cannot be passed: `CreateUserDto` has
      // no such field, and the global pipe rejects a body that invents one.
    });

    this.logger.log(`registered ${profile.id} at mosque ${mosqueId}`);

    return AuthProfileDto.of(profile);
  }

  /**
   * Verifies a password and starts a session.
   *
   * The order is deliberate: find the account, check that it is enabled, then verify the password. The
   * status check comes first and produces the same refusal as a wrong password, so a disabled account is
   * indistinguishable from one that never existed. Checking status *after* the password and saying
   * "account disabled" would be friendlier, and would also let anyone confirm an address is registered.
   */
  async login(dto: LoginDto, origin: SessionOrigin): Promise<SessionResult> {
    const credentials = await this.findCredentials(dto);

    if (!credentials) {
      // Burn the CPU a verification would have cost. Argon2id takes tens of milliseconds by design, so
      // without this the endpoint answers "no such account" visibly faster than "wrong password" and a
      // stopwatch reads what the response body refuses to say.
      //
      // Not audited, and it is the schema that decides so: `AuditLog.mosqueId` is non-null, and an
      // address with no account belongs to no mosque. Filing these under a guessed mosque would put
      // one mosque's trail at the mercy of anyone who can type an email address into a form.
      await argon2.hash(dto.password, { type: argon2.argon2id });
      throw invalidCredentials();
    }

    if (!credentials.isActive) {
      await this.recordLoginFailure(credentials, origin, 'Account is not active.');
      throw invalidCredentials();
    }

    if (!(await verifyPassword(credentials.passwordHash, dto.password))) {
      // The id, so a real lock-out investigation has something to go on. Not the address, not the
      // attempted password, not the hash.
      this.logger.warn(`failed sign-in for ${credentials.id}`);
      await this.recordLoginFailure(credentials, origin, 'Incorrect password.');
      throw invalidCredentials();
    }

    const profile = await this.recordSignIn(credentials.id);
    const result = await this.startSession(profile, origin, { remember: dto.remember === true });

    this.logger.log(`signed in ${credentials.id}`);

    await this.audit.record({
      mosqueId: profile.mosqueId,
      action: 'LOGIN_SUCCESS',
      resource: 'auth',
      resourceId: profile.id,
      actorId: profile.id,
      actorName: profile.fullName,
      actorRole: profile.role,
      ipAddress: origin.ipAddress,
      userAgent: origin.userAgent,
    });

    if (profile.email) {
      const securityUrl = new URL('/forgot-password', env.webUrl(this.config)).toString();
      const device = formatDeviceSummary(origin.userAgent);
      const location = profile.city
        ? `${profile.city}, Bangladesh (approx.)`
        : 'Dhaka, Bangladesh (approx.)';

      this.mail
        .sendLoginAlertEmail(profile.email, {
          device,
          location,
          time: formatLoginTime(),
          securityUrl,
          userName: profile.fullName,
          websiteUrl: env.webUrl(this.config),
        })
        .catch((err: unknown) => {
          this.logger.warn(
            `Failed to dispatch login alert email for ${credentials.id}: ${String(err)}`,
          );
        });
    }

    return result;
  }

  /**
   * Starts password recovery without confirming that an account exists.
   *
   * Dispatches the 03-forgot-password.html email with the secure recovery link.
   * The token only exists in this method and the generated URL, never in a database row or response.
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.findRecoverableUser(dto);
    if (!user) return;

    const token = randomBytes(32).toString('base64url');
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: hashToken(token),
        passwordResetExpiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      },
    });

    const resetUrl = this.passwordResetUrl(token);

    if (user.email) {
      await this.mail.sendPasswordResetEmail(user.email, {
        resetUrl,
        expiresIn: '30 minutes',
        userName: user.fullName,
        mosqueName: user.mosque?.name,
        websiteUrl: env.webUrl(this.config),
        supportEmail: user.mosque?.email || env.emailFrom(this.config),
      });
    }
  }

  /** Replaces the password, consumes the token and revokes all refresh sessions atomically. */
  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const passwordHash = await argon2.hash(dto.newPassword, { type: argon2.argon2id });
    const tokenHash = hashToken(dto.token);
    const now = new Date();

    // Declared out here so the audit entry and confirmation email can be dispatched once the transaction has committed.
    let subject:
      | {
          id: string;
          mosqueId: string;
          email: string;
          fullName: string;
          role: Role;
          mosque: { name: string; email: string | null } | null;
        }
      | undefined;

    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findFirst({
        where: {
          passwordResetTokenHash: tokenHash,
          passwordResetExpiresAt: { gt: now },
          deletedAt: null,
          isActive: true,
        },
        select: {
          id: true,
          mosqueId: true,
          email: true,
          fullName: true,
          role: true,
          mosque: { select: { name: true, email: true } },
        },
      });

      if (!user) throw invalidResetToken();

      // The condition is repeated in the write so two simultaneous submissions cannot both consume
      // the same token. Only the one whose update changes a row may revoke sessions and succeed.
      const consumed = await tx.user.updateMany({
        where: {
          id: user.id,
          passwordResetTokenHash: tokenHash,
          passwordResetExpiresAt: { gt: now },
        },
        data: { passwordHash, passwordResetTokenHash: null, passwordResetExpiresAt: null },
      });

      if (consumed.count !== 1) throw invalidResetToken();

      await tx.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: now },
      });

      subject = user;
    });

    if (!subject) return;

    await this.audit.record({
      mosqueId: subject.mosqueId,
      action: 'PASSWORD_RESET',
      resource: 'auth',
      resourceId: subject.id,
      actorId: subject.id,
      actorName: subject.fullName,
      actorRole: subject.role,
      // What happened, in the two facts worth keeping. Neither password and neither token is one of them.
      changes: { passwordChangedAt: now.toISOString(), sessionsRevoked: true },
      note: 'Reset with a recovery link; all sessions revoked.',
    });

    if (subject.email) {
      const loginUrl = new URL('/login', env.webUrl(this.config)).toString();
      await this.mail.sendPasswordResetSuccessEmail(subject.email, {
        loginUrl,
        userName: subject.fullName,
        mosqueName: subject.mosque?.name,
        websiteUrl: env.webUrl(this.config),
        supportEmail: subject.mosque?.email || env.emailFrom(this.config),
      });
    }
  }

  /**
   * Changes the authenticated person's password and signs every browser session out on its next refresh.
   * The subject comes from the verified JWT, never from a request-body user id.
   */
  async changePassword(user: AuthenticatedUser, dto: ChangePasswordDto): Promise<void> {
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException({
        code: 'PASSWORD_UNCHANGED',
        message: 'The new password must be different from the current password.',
      });
    }

    const credentials = await this.prisma.user.findFirst({
      where: { id: user.id, deletedAt: null, isActive: true },
      select: { passwordHash: true },
    });

    if (!credentials || !(await verifyPassword(credentials.passwordHash, dto.currentPassword))) {
      throw invalidCurrentPassword();
    }

    const passwordHash = await argon2.hash(dto.newPassword, { type: argon2.argon2id });
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      // Guard the write with the hash just verified. A concurrent password reset or change makes this
      // request fail rather than silently replacing a password the caller has not verified against.
      const updated = await tx.user.updateMany({
        where: {
          id: user.id,
          passwordHash: credentials.passwordHash,
          deletedAt: null,
          isActive: true,
        },
        data: { passwordHash },
      });

      if (updated.count !== 1) throw invalidCurrentPassword();

      await tx.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: now },
      });
    });

    await this.audit.record({
      mosqueId: user.mosqueId,
      action: 'PASSWORD_CHANGED',
      resource: 'auth',
      resourceId: user.id,
      actorId: user.id,
      // The token carries an address and not a name, so the address is what names the actor here. It is
      // already in the entry's own subject, which is the point: this action is always self-inflicted.
      actorName: user.email,
      actorRole: user.role,
      changes: { passwordChangedAt: now.toISOString(), sessionsRevoked: true },
    });
  }

  /**
   * Trades a refresh token for a new pair, and burns the one presented.
   *
   * The strategy has already checked the signature, the expiry and the account by the time this runs.
   * What is left is the question only stored state can answer: has this token been spent? Rotation makes
   * every refresh token single-use, which is what turns a stolen cookie from a permanent credential into
   * a race the thief has to win — and, if they lose it, into a reuse the log records.
   */
  async refresh(
    user: AuthenticatedUser,
    presented: string,
    origin: SessionOrigin,
  ): Promise<SessionResult> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(presented) },
      select: { id: true, userId: true, expiresAt: true, revokedAt: true },
    });

    // A signature this server produced with no row behind it: the account was deleted and the rows went
    // with it, or the database was restored to a point before the session existed. Not a session now.
    // The `userId` comparison cannot normally fail — the hash is unique — and is checked anyway, so that
    // a token can only ever act for the person the strategy already resolved.
    if (!stored || stored.userId !== user.id) throw unauthenticated();

    if (stored.revokedAt !== null) {
      // Either a copy of a spent token is being tried, or a client is retrying a refresh whose response
      // it never received. Indistinguishable from here, so both are refused and recorded.
      //
      // The rest of the family is deliberately *not* revoked. Doing so is the textbook response to
      // suspected theft, and in practice it mostly signs out a legitimate user whose network dropped a
      // response — a self-inflicted outage in exchange for a signal this log line already carries.
      this.logger.warn(`refresh token reuse for ${user.id}`);
      throw unauthenticated();
    }

    // Belt and braces: `expiresAt` came from the token's own `exp`, which the strategy has already
    // enforced. It is checked again because the row is the server's own record, and a row is what
    // survives a change of secret or of configured lifetime.
    if (stored.expiresAt.getTime() <= Date.now()) throw unauthenticated();

    // The statement that settles a race, and the reason this needs no lock and no Redis. Two requests
    // arriving with the same cookie both reach here; `revokedAt: null` in the filter means exactly one
    // of them updates a row. The loser sees a count of zero and is refused, so there is no window in
    // which both are handed a session.
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (count !== 1) throw unauthenticated();

    // "Keep me signed in" was answered once, at sign-in, and is carried by the token rather than re-asked
    // — a cookie cannot report its own `Max-Age` back to the server. Decoding without verifying is safe
    // here and only here: the strategy has already checked this exact string's signature, so the claim
    // came from this server.
    const remember = this.jwt.decode<RefreshTokenPayload | null>(presented)?.remember === true;

    const profile = await this.users.findOne(user.id, user);

    return this.startSession(profile, origin, { remember, replaces: stored.id });
  }

  /**
   * Ends this session.
   *
   * This session only. Signing out on a phone should not sign the same person out of the laptop they
   * left at home, so the presented token is revoked and every other one is left alone.
   *
   * Idempotent by construction. `updateMany` with `revokedAt: null` in the filter matches one row the
   * first time and none the second, and matching nothing is not an error — so a client that retries a
   * sign-out, or calls it twice, gets the same 200 both times.
   *
   * Scoped by `userId`, so presenting somebody else's cookie value revokes nothing.
   */
  async logout(user: AuthenticatedUser, presented: string | null): Promise<void> {
    if (presented === null) {
      this.logger.log(`signed out ${user.id} (no cookie presented)`);
      return;
    }

    const { count } = await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, tokenHash: hashToken(presented), revokedAt: null },
      data: { revokedAt: new Date() },
    });

    this.logger.log(`signed out ${user.id}${count === 1 ? '' : ' (no live session)'}`);
  }

  /**
   * The signed-in person's own profile.
   *
   * Read fresh through `UsersService.findOne` rather than assembled from the guard's subject: the
   * strategy reads the seven columns needed to make an authorization decision, and a profile is more
   * than that. It is also the same method `GET /users/:id` uses, so the two cannot disagree.
   *
   * Passing the caller as their own actor scopes the read to their mosque, which for their own row can
   * never exclude it — a token names one mosque and the row it names is in it.
   */
  async me(user: AuthenticatedUser): Promise<AuthProfileDto> {
    return AuthProfileDto.of(await this.users.findOne(user.id, user));
  }

  // ---------------------------------------------------------------------------
  // Sessions
  // ---------------------------------------------------------------------------

  /** The one place a session is created, whether by signing in or by rotating. */
  private async startSession(
    profile: UserResponseDto,
    origin: SessionOrigin,
    options: SessionOptions,
  ): Promise<SessionResult> {
    const access = await this.issueAccessToken(profile.id);
    const refresh = await this.issueRefreshToken(profile.id, origin, options);

    return {
      session: {
        accessToken: access.token,
        tokenType: 'Bearer',
        expiresIn: access.expiresIn,
        user: AuthProfileDto.of(profile),
      },
      refresh,
    };
  }

  /**
   * Signs a short-lived bearer token.
   *
   * The payload is `{ sub }`. No role, no permissions, no mosque — see `AccessTokenPayload` for why:
   * anything about authority baked into a token is a snapshot that outlives the decision to change it.
   *
   * `expiresIn` is read back off the signed token rather than restated from configuration, so the number
   * the client is told cannot disagree with the expiry the token actually carries.
   */
  private async issueAccessToken(userId: string): Promise<{ token: string; expiresIn: number }> {
    const payload: AccessTokenPayload = { sub: userId };

    const token = await this.jwt.signAsync(
      payload,
      signOptions(env.accessSecret(this.config), env.accessExpiresIn(this.config)),
    );

    const { iat, exp } = this.claimsOf(token);

    return { token, expiresIn: exp - iat };
  }

  /**
   * Signs a refresh token and records its hash.
   *
   * `jti` is a fresh UUID on every token, and it is load-bearing: without it two tokens signed for the
   * same person in the same second would be byte-identical, and the second insert would collide on the
   * unique `tokenHash` — a constraint doing precisely the wrong job.
   *
   * What goes into the database is the SHA-256 of the token, hex-encoded, which is why the column is 64
   * characters wide. Someone reading a dump of `refresh_tokens` gets no usable session out of it.
   *
   * `remember` is signed in rather than kept beside the row, because the cookie's lifetime has to be
   * decided again on every rotation and the only thing that survives a rotation is the token itself.
   * Signing it also means a client cannot lengthen its own session by editing a cookie.
   */
  private async issueRefreshToken(
    userId: string,
    origin: SessionOrigin,
    options: SessionOptions,
  ): Promise<IssuedRefreshToken> {
    const payload: RefreshTokenPayload = {
      sub: userId,
      jti: randomUUID(),
      remember: options.remember,
    };

    const token = await this.jwt.signAsync(
      payload,
      signOptions(env.refreshSecret(this.config), env.refreshExpiresIn(this.config)),
    );

    const expiresAt = new Date(this.claimsOf(token).exp * 1000);
    // Generated here rather than by the database, so the row it replaces can be pointed at it in the
    // same transaction instead of in a second round trip.
    const id = randomUUID();

    const data = {
      id,
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      // Truncated to what the columns hold. A client can send a header of any length, and a 500 on a
      // long user-agent string would be an odd way to fail a sign-in.
      userAgent: origin.userAgent?.slice(0, 255),
      ipAddress: origin.ipAddress?.slice(0, 64),
    };

    if (options.replaces === undefined) {
      await this.prisma.refreshToken.create({ data });
    } else {
      // One transaction, so a rotation chain is never half-written: either the new row exists and the
      // spent one points at it, or neither happened.
      await this.prisma.$transaction([
        this.prisma.refreshToken.create({ data }),
        this.prisma.refreshToken.updateMany({
          where: { id: options.replaces },
          data: { replacedById: id },
        }),
      ]);
    }

    return { token, id, expiresAt, remember: options.remember };
  }

  /**
   * The two timing claims off a token this server just signed.
   *
   * Asserted rather than defaulted. Both signers pass `expiresIn`, so both claims are always there; if
   * that ever stopped being true, a fallback would quietly put a wrong lifetime in the response and a
   * wrong `expiresAt` in the database, and neither would look like a bug for a long time.
   */
  private claimsOf(token: string): { iat: number; exp: number } {
    const claims = this.jwt.decode<{ iat?: number; exp?: number } | null>(token);

    if (typeof claims?.iat !== 'number' || typeof claims.exp !== 'number') {
      throw new InternalServerErrorException({
        code: 'SESSION_ISSUE_FAILED',
        message: 'We could not start a session. Please try again.',
      });
    }

    return { iat: claims.iat, exp: claims.exp };
  }

  /** Stamps `lastLoginAt` and returns the profile, in one statement rather than a write then a read. */
  private async recordSignIn(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
      // The users module's select and the users module's mapper. `passwordHash` is in neither.
      select: USER_SELECT,
    });

    return UserResponseDto.from(user);
  }

  /**
   * Records a refused sign-in against an account that exists.
   *
   * `actorName` is the address the attempt was made against, because that is all a failure has: nobody
   * signed in, so there is no session and no profile row to name. `actorId` is still filled in — the
   * account is known, and the whole point of the entry is to make repeated attempts against one account
   * findable.
   *
   * The reason lives in `note`, not in `changes`. Nothing changed, and the difference between "wrong
   * password" and "account suspended" is exactly what the 401 refuses to tell the caller and exactly what
   * an administrator reading the trail needs. The submitted password appears nowhere.
   */
  private async recordLoginFailure(
    credentials: CredentialRow,
    origin: SessionOrigin,
    note: string,
  ): Promise<void> {
    await this.audit.record({
      mosqueId: credentials.mosqueId,
      action: 'LOGIN_FAILED',
      resource: 'auth',
      resourceId: credentials.id,
      actorId: credentials.id,
      actorName: credentials.email,
      note,
      ipAddress: origin.ipAddress,
      userAgent: origin.userAgent,
    });
  }

  // ---------------------------------------------------------------------------
  // Lookups
  // ---------------------------------------------------------------------------

  /**
   * Finds the account behind an email or a phone number.
   *
   * `take: 2` rather than `findUnique`, because neither address is globally unique — the schema makes
   * them unique *within a mosque*, so a deployment serving several can legitimately hold the same
   * address twice. One row is the ordinary case; two means the caller has to say which mosque.
   */
  private async findCredentials(dto: LoginDto): Promise<CredentialRow | null> {
    const where: Prisma.UserWhereInput = {
      // A soft-deleted account cannot sign in. Same filter as every other read in the project.
      deletedAt: null,
      ...identifierOf(dto),
      // Filtered through the relation, so narrowing by mosque costs no extra query.
      ...(dto.mosqueSlug === undefined ? {} : { mosque: { slug: dto.mosqueSlug } }),
    };

    const matches = await this.prisma.user.findMany({
      where,
      select: CREDENTIAL_SELECT,
      take: 2,
    });

    if (matches.length > 1) throw mosqueRequired();

    return matches[0] ?? null;
  }

  /**
   * Looks up a recoverable account without exposing ambiguity, absence or suspension to the caller.
   * A duplicate email or phone without a mosque slug deliberately receives the same generic success
   * response as a missing account, because choosing a tenant would otherwise disclose account data.
   */
  private async findRecoverableUser(dto: ForgotPasswordDto): Promise<{
    id: string;
    email: string;
    fullName: string;
    mosque: { name: string; email: string | null } | null;
  } | null> {
    const matches = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        ...identifierOf(dto),
        ...(dto.mosqueSlug === undefined ? {} : { mosque: { slug: dto.mosqueSlug } }),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        mosque: { select: { name: true, email: true } },
      },
      take: 2,
    });

    return matches.length === 1 ? matches[0] : null;
  }

  /**
   * Builds the link a person clicks, from the configured browser origin.
   *
   * The token exists only in memory for this function call and in the transmitted email link.
   */
  private passwordResetUrl(token: string): string {
    const url = new URL('/reset-password', env.webUrl(this.config));
    url.searchParams.set('token', token);
    return url.toString();
  }

  /**
   * Works out which mosque a new account belongs to.
   *
   * The sign-up form does not ask, because a deployment normally serves one mosque and asking would be a
   * question with one possible answer. So: use the slug if one was sent, otherwise resolve the only
   * active mosque, and insist on being told once there is more than one. Guessing at that point would
   * put someone in the wrong congregation.
   */
  private async resolveMosque(slug?: string): Promise<string> {
    if (slug !== undefined) {
      const mosque = await this.prisma.mosque.findUnique({
        where: { slug },
        select: { id: true, isActive: true },
      });

      // An inactive mosque reads the same as a missing one. Whether it exists but is closed is not
      // something an unauthenticated form submission needs to learn.
      if (!mosque || !mosque.isActive) throw mosqueNotFound();

      return mosque.id;
    }

    const mosques = await this.prisma.mosque.findMany({
      where: { isActive: true },
      select: { id: true },
      take: 2,
    });

    if (mosques.length === 0) throw mosqueNotFound();
    if (mosques.length > 1) throw mosqueRequired();

    return mosques[0].id;
  }
}

/**
 * Turns the sign-in body into the column to search.
 *
 * Exactly one of the two, which is a rule about the pair and so cannot be a decorator on either field.
 * A 400 rather than the generic 401: a request that names neither identifier — or both — is malformed,
 * and saying so reveals nothing about whether any particular account exists.
 */
function identifierOf(dto: Pick<LoginDto, 'email' | 'phone'>): Prisma.UserWhereInput {
  const { email, phone } = dto;

  if (email !== undefined && phone === undefined) return { email };
  if (phone !== undefined && email === undefined) return { phone };

  throw new BadRequestException({
    code: 'IDENTIFIER_REQUIRED',
    message: 'Send either an email address or a phone number, not both and not neither.',
  });
}

/**
 * Compares a password with a stored hash.
 *
 * A hash argon2 cannot parse is a corrupt row, not a correct password, so the throw is swallowed and the
 * answer is `false`. Letting it propagate would turn one bad row into a 500 that confirms the account
 * exists and that something about it is broken.
 */
async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(passwordHash, password);
  } catch {
    return false;
  }
}

/** SHA-256, hex. 64 characters, which is exactly what `RefreshToken.tokenHash` is sized for. */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Sign options for one token, with the secret named explicitly.
 *
 * Named on every call because `JwtModule.register({})` deliberately configures no default. A
 * module-level secret would become the silent fallback for a call that forgot to pass one, and a refresh
 * token signed with the access secret is a refresh token an access token can impersonate.
 *
 * The cast is the one narrowing in this file. `jsonwebtoken` types `expiresIn` as a template-literal
 * union over the units `ms` understands, and an environment variable is a plain `string` — something no
 * compiler can narrow on its own. It is sound because `env.validation` refuses to boot on anything but
 * `\d+(ms|s|m|h|d)`, which is that union; the alternative, importing `ms`'s `StringValue` into the config
 * accessors, would tie the configuration layer to a transitive dependency it does not otherwise use.
 */
function signOptions(secret: string, duration: string): JwtSignOptions {
  return { secret, expiresIn: duration as JwtSignOptions['expiresIn'] };
}

/**
 * The one refusal a failed sign-in ever produces.
 *
 * Unknown address, disabled account and wrong password all come through here. The spec is the whole
 * point: a login endpoint that distinguishes them is a tool for confirming which addresses are
 * registered.
 */
function invalidCredentials(): UnauthorizedException {
  return new UnauthorizedException({
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid credentials.',
  });
}

/** One generic refusal for forged, expired and already-consumed password-reset tokens. */
function invalidResetToken(): UnauthorizedException {
  return new UnauthorizedException({
    code: 'INVALID_RESET_TOKEN',
    message: 'The password reset token is invalid or expired.',
  });
}

/** The current password is wrong, missing from a live account, or changed concurrently. */
function invalidCurrentPassword(): UnauthorizedException {
  return new UnauthorizedException({
    code: 'INVALID_CURRENT_PASSWORD',
    message: 'The current password is incorrect.',
  });
}

const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

function mosqueNotFound(): BadRequestException {
  return new BadRequestException({
    code: 'MOSQUE_NOT_FOUND',
    message: 'We could not find that mosque.',
  });
}

function mosqueRequired(): BadRequestException {
  return new BadRequestException({
    code: 'MOSQUE_REQUIRED',
    message: 'This server hosts more than one mosque. Send `mosqueSlug` to say which one.',
  });
}
