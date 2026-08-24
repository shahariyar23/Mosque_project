import { ForbiddenException, Logger, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

import { AnyPermission, Permissions } from '../decorators/permissions.decorator';
import type { AuthenticatedUser } from '../types/authenticated-user';
import { PermissionsGuard } from './permissions.guard';

/**
 * The authorization decision, tested through the decorators rather than around them.
 *
 * A real `Reflector` reads metadata off real decorated methods, so these cases cover the pipeline the
 * application actually runs: decorator writes metadata, guard reads it, resolver answers. Stubbing the
 * reflector would test the guard's branches while proving nothing about whether `@Permissions()` and
 * `PermissionsGuard` agree on where the metadata lives.
 */
class Routes {
  @Permissions('finance.manage')
  finance(): void {}

  @Permissions('finance.manage', 'report.export')
  both(): void {}

  @AnyPermission('finance.manage', 'user.view')
  either(): void {}

  open(): void {}
}

@Permissions('platform.manage')
class PlatformRoutes {
  @Permissions('user.view')
  directory(): void {}

  everything(): void {}
}

type RouteClass = new () => unknown;

function contextFor(
  user: AuthenticatedUser | undefined,
  cls: RouteClass,
  method: string,
): ExecutionContext {
  const request = user ? { user } : {};
  const handler = (cls.prototype as Record<string, unknown>)[method];

  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => handler,
    getClass: () => cls,
  } as unknown as ExecutionContext;
}

function subject(over: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 'user-1',
    mosqueId: 'mosque-1',
    email: 'person@noor.test',
    role: Role.member,
    permissions: [],
    deniedPermissions: [],
    isActive: true,
    ...over,
  };
}

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let logged: jest.SpyInstance;

  beforeEach(() => {
    guard = new PermissionsGuard(new Reflector());
    // Silenced *and* observed: a refusal has to log its reason somewhere, because the response
    // deliberately does not carry it.
    logged = jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logged.mockRestore();
  });

  it('passes a route that asks for nothing, signed in or not', () => {
    expect(guard.canActivate(contextFor(undefined, Routes, 'open'))).toBe(true);
    expect(guard.canActivate(contextFor(subject(), Routes, 'open'))).toBe(true);
  });

  it('refuses a gated route with no authenticated user', () => {
    // Not a 403: nothing has been judged yet. This is the case that fires today, before the
    // authentication guard is registered, and it is why the assignment endpoints are already closed.
    expect(() => guard.canActivate(contextFor(undefined, Routes, 'finance'))).toThrow(
      UnauthorizedException,
    );
  });

  it('allows a permission the role carries', () => {
    expect(
      guard.canActivate(contextFor(subject({ role: Role.treasurer }), Routes, 'finance')),
    ).toBe(true);
  });

  it('refuses a permission the role does not carry, and says nothing about which', () => {
    const context = contextFor(subject({ role: Role.member }), Routes, 'finance');

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);

    try {
      guard.canActivate(context);
    } catch (error) {
      const response = (error as ForbiddenException).getResponse();

      expect(response).toEqual({
        code: 'FORBIDDEN',
        message: 'You do not have permission to do that.',
      });
      expect(JSON.stringify(response)).not.toContain('finance.manage');
    }

    expect(logged).toHaveBeenCalledWith(expect.stringContaining('finance.manage'));
  });

  it('lets a super admin through anything, because the registry grants it — not because of the name', () => {
    expect(
      guard.canActivate(
        contextFor(subject({ role: Role.super_admin }), PlatformRoutes, 'everything'),
      ),
    ).toBe(true);
  });

  it('refuses a suspended super admin', () => {
    // The case an `if (role === super_admin) return true` shortcut would get wrong: identical on the
    // happy path, and wide open here.
    expect(() =>
      guard.canActivate(
        contextFor(
          subject({ role: Role.super_admin, isActive: false }),
          PlatformRoutes,
          'everything',
        ),
      ),
    ).toThrow(ForbiddenException);
  });

  it('honours a grant on the user row', () => {
    expect(
      guard.canActivate(
        contextFor(subject({ permissions: ['finance.manage'] }), Routes, 'finance'),
      ),
    ).toBe(true);
  });

  it('lets a denial beat the role', () => {
    expect(() =>
      guard.canActivate(
        contextFor(
          subject({ role: Role.treasurer, deniedPermissions: ['finance.manage'] }),
          Routes,
          'finance',
        ),
      ),
    ).toThrow(ForbiddenException);
  });

  it('ignores a grant the registry does not declare', () => {
    // A string nothing in code names cannot open a route. Storing one is refused at the DTO; this is
    // the second line of that defence, for rows written before the check existed.
    expect(() =>
      guard.canActivate(
        contextFor(subject({ permissions: ['finance.*', 'finance.manageAll'] }), Routes, 'finance'),
      ),
    ).toThrow(ForbiddenException);
  });

  it('requires every permission listed on one decorator', () => {
    expect(guard.canActivate(contextFor(subject({ role: Role.treasurer }), Routes, 'both'))).toBe(
      true,
    );

    expect(() =>
      guard.canActivate(contextFor(subject({ permissions: ['finance.manage'] }), Routes, 'both')),
    ).toThrow(ForbiddenException);
  });

  it('requires only one of the permissions on @AnyPermission', () => {
    expect(guard.canActivate(contextFor(subject({ role: Role.secretary }), Routes, 'either'))).toBe(
      true,
    );
    expect(guard.canActivate(contextFor(subject({ role: Role.treasurer }), Routes, 'either'))).toBe(
      true,
    );
    expect(() =>
      guard.canActivate(contextFor(subject({ role: Role.imam }), Routes, 'either')),
    ).toThrow(ForbiddenException);
  });

  it('applies a class-level requirement to a handler that declares none', () => {
    expect(() =>
      guard.canActivate(
        contextFor(subject({ role: Role.mosque_admin }), PlatformRoutes, 'everything'),
      ),
    ).toThrow(ForbiddenException);
  });

  it('lets a handler requirement override the class it sits in', () => {
    // A secretary holds `user.view` and not `platform.manage`, so passing here proves the handler's
    // metadata replaced the class's rather than being added to it.
    expect(
      guard.canActivate(contextFor(subject({ role: Role.secretary }), PlatformRoutes, 'directory')),
    ).toBe(true);
  });
});
