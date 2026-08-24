import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { env, type AppConfig } from '../../config/app.config';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { refreshTokenFrom } from '../refresh-cookie';
import type { RefreshTokenPayload } from '../types/auth.types';
import { resolveSubject } from './resolve-subject';

/**
 * Verifies the refresh cookie.
 *
 * Registered as `jwt-refresh` so it is a second, separate strategy rather than a mode of the first. The
 * two differ in every respect that matters: a different secret, a different lifetime, and a different
 * place to look. Reusing the access-token strategy here would mean either accepting refresh tokens on
 * the `Authorization` header — where a client would have to read the token to send it, defeating
 * `httpOnly` — or accepting access tokens as refresh tokens, so a fifteen-minute credential could be
 * traded for an unlimited supply of new ones.
 *
 * A distinct secret is what enforces that separation cryptographically: an access token presented to
 * this strategy fails its signature check, and vice versa. `env.validation` refuses to boot if the two
 * secrets are equal, so the property cannot be lost by configuration either.
 *
 * This strategy answers "is this cookie a genuine, unexpired token belonging to a live account". It
 * does *not* answer "has this token already been used" — that is a question about stored state, and it
 * belongs with the rotation logic in `AuthService.refresh`.
 */
@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    // The generic on `AppConfig` is a compile-time view over `get()` and cannot be attached to the
    // injection token, so the token is named explicitly and the parameter carries the typed alias.
    @Inject(ConfigService) config: AppConfig,
    private readonly prisma: PrismaService,
  ) {
    const cookieName = env.refreshCookieName(config);

    super({
      // The cookie, and only the cookie. There is deliberately no header or body fallback: the token
      // is `httpOnly` precisely so that no client code ever holds it, and an extractor that accepted
      // it from somewhere a script can reach would quietly undo that.
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => refreshTokenFrom(request, cookieName),
      ]),
      // An expired refresh token is not a valid one. Never relax this.
      ignoreExpiration: false,
      secretOrKey: env.refreshSecret(config),
    });
  }

  async validate(payload: RefreshTokenPayload): Promise<AuthenticatedUser> {
    return resolveSubject(this.prisma, payload.sub);
  }
}
