import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';

import { env, type AppConfig } from '../../config/app.config';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import type { AccessTokenPayload } from '../types/access-token-payload';
import { resolveSubject } from './resolve-subject';

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
 *
 * The lookup itself is `resolveSubject`, shared with the refresh strategy rather than written twice, so
 * the two cannot drift into answering different questions about the same person. `passwordHash` is not
 * in the columns it reads.
 *
 * For platform `super_admin` accounts, honours the `x-mosque-id` request header to allow managing
 * tenant-scoped resources for a specific mosque. Normal accounts remain strictly locked to their
 * own `mosqueId` regardless of headers sent.
 */
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
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    const user = await resolveSubject(this.prisma, payload.sub);

    // Support Super Admin explicit mosque context switching via x-mosque-id header
    const targetMosqueId = req.headers ? (req.headers['x-mosque-id'] as string | undefined) : undefined;
    if (targetMosqueId && user.role === 'super_admin') {
      const exists = await this.prisma.mosque.findUnique({
        where: { id: targetMosqueId },
        select: { id: true },
      });
      if (exists) {
        return {
          ...user,
          mosqueId: exists.id,
        };
      }
    }

    return user;
  }
}
