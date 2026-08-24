import { Injectable, Logger, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { Permission } from '../constants/permissions';
import { effectivePermissions, hasAllPermissions, hasAnyPermission } from '../constants/roles';
import { ANY_PERMISSION_KEY, PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { forbidden, handlerName, subjectOf, unauthenticated } from './authorization';

/**
 * Enforces `@Permissions()` and `@AnyPermission()`. The authorization decision for the whole API.
 *
 * No database access. `effectivePermissions` resolves the request against the compile-time registry
 * from columns the token already produced, so a permission check is a set lookup rather than a query —
 * which is what makes it affordable to check on every route.
 *
 * The super-admin rule is central without being a special case: `ROLE_PERMISSIONS.super_admin` is
 * `ALL_PERMISSIONS`, so the resolver grants that role everything and no guard needs to know the name.
 * That is the whole reason the exemption is expressed as data. A shortcut here — `if (role ===
 * super_admin) return true` — would look identical on the happy path and be wrong in the case that
 * matters: it would let a *suspended* super admin through, where the resolver correctly gives an
 * inactive account nothing at all.
 *
 * A route with neither decorator passes through, so this guard can be global from the start and a
 * requirement is opt-in per handler.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];

    const requireAll =
      this.reflector.getAllAndOverride<Permission[] | undefined>(PERMISSIONS_KEY, targets) ?? [];
    const requireAny =
      this.reflector.getAllAndOverride<Permission[] | undefined>(ANY_PERMISSION_KEY, targets) ?? [];

    if (requireAll.length === 0 && requireAny.length === 0) return true;

    const user = subjectOf(context);

    if (!user) throw unauthenticated();

    // The single source of what this person may do: role map, explicit grants, denies, and the
    // complete revocation an inactive account gets.
    const granted = effectivePermissions(user);

    const missing = requireAll.filter((permission) => !granted.includes(permission));

    if (!hasAllPermissions(granted, requireAll)) {
      this.refuse(context, user.id, `missing ${missing.join(', ')}`);
    }

    if (requireAny.length > 0 && !hasAnyPermission(granted, requireAny)) {
      this.refuse(context, user.id, `holds none of ${requireAny.join(', ')}`);
    }

    return true;
  }

  /** Logs why, then refuses without saying why. */
  private refuse(context: ExecutionContext, userId: string, reason: string): never {
    this.logger.debug(`${handlerName(context)} refused: ${userId} ${reason}`);
    throw forbidden();
  }
}
