import { Injectable, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Observable } from 'rxjs';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { AuthenticatedUser } from '../types/authenticated-user';
import { unauthenticated } from './authorization';

/**
 * Verifies the bearer token and puts the person on the request.
 *
 * Does authentication only: it answers "who is this", never "may they". Everything about what a
 * request is allowed to do lives in `RolesGuard` and `PermissionsGuard`, which read the user this
 * guard produced.
 *
 * `@Public()` is honoured here rather than in the authorization guards, because this is the guard that
 * would otherwise refuse an anonymous request outright. A public route still passes through the
 * authorization guards afterwards, so marking a route public does not quietly discard a permission
 * requirement written on the same handler.
 *
 * Registered globally in `app.module.ts`, before the two authorization guards, so authentication is the
 * default and a route opts out of it rather than into it.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // `getAllAndOverride` lets a public route sit inside an otherwise protected controller.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    return super.canActivate(context);
  }

  /**
   * Passport's outcome, translated.
   *
   * Every failure reads the same to the caller: a missing token, a forged signature and an expired one
   * are all "sign in again", and distinguishing them in the response would tell someone probing the
   * API which of the three they achieved. A client does not need to be told: it calls
   * `POST /auth/refresh` on any 401, and finds out from *that* answer whether the session is still alive.
   */
  handleRequest<TUser = AuthenticatedUser>(error: unknown, user: TUser | false): TUser {
    if (error || !user) throw unauthenticated();

    return user;
  }
}
