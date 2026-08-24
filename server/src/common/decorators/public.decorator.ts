import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as reachable without a token.
 *
 * The default is the other way round: authentication is applied globally, and a route opts out by
 * saying so here. That ordering matters — if routes were public until someone remembered to guard
 * them, a forgotten decorator would silently expose data. This way a forgotten decorator returns 401
 * and gets noticed immediately.
 *
 * Use it for sign-in, registration, token refresh and the health probes. Nothing else.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
