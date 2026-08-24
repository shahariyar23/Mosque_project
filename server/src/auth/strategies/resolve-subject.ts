import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { unauthenticated } from '../../common/guards/authorization';
import type { PrismaService } from '../../prisma/prisma.service';
import { SUBJECT_SELECT } from '../types/auth.types';

/**
 * Turns a user id from a verified token into the person the request acts as.
 *
 * Shared by both strategies, so the access path and the refresh path cannot end up disagreeing about
 * who counts as a valid subject. If only the access strategy checked `isActive`, a suspended account
 * would still be able to mint itself fresh access tokens indefinitely — the refusal has to happen at
 * both doors, and this is the single place it is written.
 *
 * The row is read on every authenticated request rather than trusted from the token's claims, which is
 * what makes a suspension, a role change or a revoked permission take effect immediately instead of
 * lingering for the lifetime of a token already in someone's hands.
 *
 * The refusal is `unauthenticated()`, the same one the guards raise: deleted, suspended and never
 * existed all read identically to the caller, because which of the three it was is not something an
 * unauthenticated request gets to learn.
 */
export async function resolveSubject(
  prisma: PrismaService,
  userId: string,
): Promise<AuthenticatedUser> {
  const user = await prisma.user.findFirst({
    // A soft-deleted account is gone as far as every read is concerned, authentication included.
    where: { id: userId, deletedAt: null },
    select: SUBJECT_SELECT,
  });

  if (!user || !user.isActive) throw unauthenticated();

  return user;
}
