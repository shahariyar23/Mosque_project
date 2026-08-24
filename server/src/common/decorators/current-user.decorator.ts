import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { AuthenticatedUser } from '../types/authenticated-user';

/**
 * The authenticated user, or one field of it.
 *
 *     async update(@CurrentUser() actor: AuthenticatedUser) {}
 *     async mine(@CurrentUser('id') actorId: string) {}
 *
 * Reads what the authentication guard put on the request and nothing else — it verifies no token and
 * makes no access decision, so a route that only takes this parameter is not thereby protected.
 *
 * Resolves to `undefined` on an unauthenticated request rather than throwing. Whether a request is
 * allowed to be unauthenticated is `@Public()`'s business, and duplicating that judgement in a
 * parameter decorator would put it in two places. Any handler that needs a real user carries a
 * `@Permissions()` or `@Roles()` requirement, and those guards refuse a request with no user before a
 * parameter is ever resolved.
 */
export const CurrentUser = createParamDecorator(
  (property: keyof AuthenticatedUser | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) return undefined;

    return property === undefined ? user : user[property];
  },
);
