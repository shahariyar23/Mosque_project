import { ForbiddenException, UnauthorizedException, type ExecutionContext } from '@nestjs/common';

import type { AuthenticatedUser } from '../types/authenticated-user';

/**
 * The three things both authorization guards need, in one place so they answer identically.
 *
 * The refusals are deliberately uninformative. A 403 that named the missing permission would hand an
 * attacker a map of the permission model one request at a time, so the response says only that the
 * request was refused; the detail goes to the log, where the person debugging can see it and the
 * caller cannot.
 */

/** The verified user on the request, if the authentication guard has run and found one. */
export function subjectOf(context: ExecutionContext): AuthenticatedUser | undefined {
  return context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>().user;
}

export function unauthenticated(): UnauthorizedException {
  return new UnauthorizedException({
    code: 'UNAUTHENTICATED',
    message: 'Please sign in to continue.',
  });
}

export function forbidden(): ForbiddenException {
  return new ForbiddenException({
    code: 'FORBIDDEN',
    message: 'You do not have permission to do that.',
  });
}

/** Identifies the refused handler in the log, as `UsersController.setRole`. */
export function handlerName(context: ExecutionContext): string {
  return `${context.getClass().name}.${context.getHandler().name}`;
}
