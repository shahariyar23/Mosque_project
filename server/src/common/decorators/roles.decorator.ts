import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'authorization:roles';

/**
 * Restricts a route to a named set of roles.
 *
 * Metadata only — the decision is `RolesGuard`'s. Nothing here reads a request.
 *
 * Prefer `@Permissions()`. A role is *how* someone came to hold a capability, and checking it asks a
 * question the answer to which changes whenever the role map does: `@Roles(Role.treasurer)` on a
 * finance route silently excludes the admin who was granted `finance.manage` individually, and keeps
 * including a treasurer whose `finance.manage` has been denied. Reach for this only where the
 * organisational role genuinely *is* the subject — and note that there is no super-admin exemption,
 * so a listed set means exactly the roles listed.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
