import { ForbiddenException, Logger, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

import { Roles } from '../decorators/roles.decorator';
import type { AuthenticatedUser } from '../types/authenticated-user';
import { RolesGuard } from './roles.guard';

class Routes {
  @Roles(Role.treasurer, Role.cashier)
  tills(): void {}

  open(): void {}
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

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let logged: jest.SpyInstance;

  beforeEach(() => {
    guard = new RolesGuard(new Reflector());
    logged = jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logged.mockRestore();
  });

  it('passes a route with no @Roles()', () => {
    expect(guard.canActivate(contextFor(undefined, Routes, 'open'))).toBe(true);
  });

  it('refuses a role-gated route with no authenticated user', () => {
    expect(() => guard.canActivate(contextFor(undefined, Routes, 'tills'))).toThrow(
      UnauthorizedException,
    );
  });

  it('admits a listed role', () => {
    expect(guard.canActivate(contextFor(subject({ role: Role.cashier }), Routes, 'tills'))).toBe(
      true,
    );
  });

  it('refuses a role that is not listed', () => {
    expect(() =>
      guard.canActivate(contextFor(subject({ role: Role.secretary }), Routes, 'tills')),
    ).toThrow(ForbiddenException);
  });

  it('refuses a super admin, because @Roles() means the roles it names', () => {
    // Not an oversight. A route that should admit both a super admin and a treasurer asks for a
    // capability with @Permissions(), where the registry already grants super_admin everything.
    expect(() =>
      guard.canActivate(contextFor(subject({ role: Role.super_admin }), Routes, 'tills')),
    ).toThrow(ForbiddenException);
  });

  it('refuses a suspended account whose role does match', () => {
    expect(() =>
      guard.canActivate(
        contextFor(subject({ role: Role.treasurer, isActive: false }), Routes, 'tills'),
      ),
    ).toThrow(ForbiddenException);
  });

  it('logs the reason instead of returning it', () => {
    const context = contextFor(subject({ role: Role.imam }), Routes, 'tills');

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(logged).toHaveBeenCalledWith(expect.stringContaining('imam'));

    try {
      guard.canActivate(context);
    } catch (error) {
      expect((error as ForbiddenException).getResponse()).toEqual({
        code: 'FORBIDDEN',
        message: 'You do not have permission to do that.',
      });
    }
  });
});
