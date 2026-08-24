import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { unauthenticated } from '../../common/guards/authorization';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';

/**
 * Guards the one route that authenticates with the refresh cookie instead of the bearer header.
 *
 * Route-scoped, and only on `POST /auth/refresh`. It exists because the global `JwtAuthGuard` looks for
 * an `Authorization` header signed with the access secret, which is exactly what a client asking for a
 * new access token does not have.
 *
 * `POST /auth/refresh` therefore carries both `@Public()` and this guard, which reads like a
 * contradiction and is not: Nest runs global guards first, so `@Public()` is what makes the *access*
 * guard step aside, and this guard then does the real check a moment later. The route is never actually
 * open.
 *
 * Note what is deliberately missing: this guard does not honour `@Public()` itself. If it did, the
 * decorator that gets the global guard out of the way would get this one out of the way too, and the
 * endpoint that issues fresh credentials would answer anonymous requests.
 */
@Injectable()
export class RefreshTokenGuard extends AuthGuard('jwt-refresh') {
  /**
   * Passport's outcome, translated.
   *
   * Every failure reads the same to the caller: no cookie, a forged signature, an expired token and a
   * token belonging to a suspended account are all "sign in again". Saying which one it was would tell
   * someone probing the endpoint how far they got.
   */
  handleRequest<TUser = AuthenticatedUser>(error: unknown, user: TUser | false): TUser {
    if (error || !user) throw unauthenticated();

    return user;
  }
}
