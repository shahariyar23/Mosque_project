import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { env, type AppConfig } from '../../config/app.config';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import type { AccessTokenPayload } from '../types/access-token-payload';

/**
 * Turns a verified bearer token into the person it belongs to.
 *
 * Registered under passport's default name for this strategy, `jwt`, which is what
 * `JwtAuthGuard extends AuthGuard('jwt')` looks for.
 *
 * `validate` reads the row rather than trusting the token's claims. That is one indexed lookup per
 * authenticated request — not per permission check, which stays a set operation against the
 * compile-time registry — and it buys the property that matters: a suspended account, a changed role
 * and a revoked permission are all effective immediately, instead of lingering for the lifetime of a
 * token already in someone's hands.
 */

/** The columns an access decision is made from. `passwordHash` is not among them. */
const SUBJECT_SELECT = {
  id: true,
  mosqueId: true,
  email: true,
  role: true,
  permissions: true,
  deniedPermissions: true,
  isActive: true,
} as const;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    // The generic on `AppConfig` is a compile-time view over `get()` and cannot be attached to the
    // injection token, so the token is named explicitly and the parameter carries the typed alias.
    @Inject(ConfigService) config: AppConfig,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // An expired token is not a valid one. Never relax this.
      ignoreExpiration: false,
      secretOrKey: env.accessSecret(config),
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findFirst({
      // A soft-deleted account is gone as far as every read is concerned, authentication included.
      where: { id: payload.sub, deletedAt: null },
      select: SUBJECT_SELECT,
    });

    // Both refusals read the same to the caller. Whether the account was deleted, suspended or never
    // existed is not something an unauthenticated request gets to learn.
    if (!user || !user.isActive) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Please sign in to continue.',
      });
    }

    return user;
  }
}
