import { Injectable, Logger, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@prisma/client';

import { ROLES_KEY } from '../decorators/roles.decorator';
import { forbidden, handlerName, subjectOf, unauthenticated } from './authorization';

/**
 * Enforces `@Roles()`.
 *
 * A route with no `@Roles()` metadata is not this guard's business, and it passes through untouched —
 * denying by default here would make the guard impossible to register globally, and would mean adding
 * it later broke every existing route at once.
 *
 * There is no super-admin exemption. `@Roles()` names roles, so it means the roles it names: a
 * super admin is not a treasurer, and a route that should admit both asks for a capability with
 * `@Permissions()` instead. Predictability matters more here than convenience — a decorator that
 * silently admits someone it does not list is the kind of surprise that gets discovered in production.
 *
 * An inactive account is refused even when its role matches, which keeps this guard consistent with
 * `effectivePermissions`: suspending an account revokes everything, so it cannot leave a role-gated
 * route open.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    const user = subjectOf(context);

    // No user on a route that names roles means authentication has not run, or ran and found nobody.
    // Either way the request cannot be judged, so it is refused rather than waved through.
    if (!user) throw unauthenticated();

    if (!user.isActive || !required.includes(user.role)) {
      this.logger.debug(
        `${handlerName(context)} refused: ${user.id} is ${user.role}` +
          `${user.isActive ? '' : ' (inactive)'}, needs one of ${required.join(', ')}`,
      );
      throw forbidden();
    }

    return true;
  }
}
