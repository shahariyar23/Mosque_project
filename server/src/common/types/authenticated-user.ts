import type { Role } from '@prisma/client';

import type { PermissionSubject } from '../constants/roles';

/**
 * The person behind a request, once a token has been verified.
 *
 * This is what `request.user` holds and what `@CurrentUser()` hands a route. It extends
 * `PermissionSubject` on purpose: the guards pass it straight to `effectivePermissions` rather than
 * copying fields into a second shape, so there is one definition of what a permission decision is
 * made from.
 *
 * Deliberately small. A name, an avatar and a phone number are not inputs to an access decision, so
 * they are not carried on every request — a route that needs them reads the user.
 */
export interface AuthenticatedUser extends PermissionSubject {
  id: string;
  /** The mosque whose records this request may reach. */
  mosqueId: string;
  email: string;
  role: Role;
  /** Granted on top of the role. Plain strings: anything outside the registry is ignored. */
  permissions: string[];
  /** Removed after everything else. A deny always wins. */
  deniedPermissions: string[];
  /** False resolves to no permissions at all, base ones included. */
  isActive: boolean;
}
