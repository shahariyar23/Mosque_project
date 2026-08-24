import { SetMetadata } from '@nestjs/common';

import type { Permission } from '../constants/permissions';

export const PERMISSIONS_KEY = 'authorization:permissions';
export const ANY_PERMISSION_KEY = 'authorization:anyPermission';

/**
 * Requires every listed permission.
 *
 * Metadata only — `PermissionsGuard` makes the decision. The argument type is `Permission`, so a
 * misspelt permission is a compile error rather than a route that can never be reached.
 *
 * This is the decorator to reach for. It asks what the request needs to be able to do, which is a
 * question the registry answers the same way however someone came to hold it.
 */
export const Permissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Requires at least one of the listed permissions.
 *
 * For the `view` / `viewOwn` pairs the registry is full of: a route that serves both the whole ledger
 * and a person's own receipts needs either grant to get in, and then narrows the query with
 * `scopeFor`. Combined with `@Permissions()` on the same handler, both conditions apply.
 */
export const AnyPermission = (...permissions: Permission[]) =>
  SetMetadata(ANY_PERMISSION_KEY, permissions);
