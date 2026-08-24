import { Prisma } from '@prisma/client';

import { USER_SELECT } from '../../users/types/user.types';

/**
 * The shapes the volunteers module shares between its service, controller, DTOs and tests.
 *
 * `VOLUNTEER_SELECT` is the single definition of what a volunteer is over HTTP, and it is why the
 * nested person is safe by construction: it reuses `USER_SELECT` rather than naming user columns over
 * again, so the projection that already leaves out `passwordHash`, both password-reset columns and
 * everything else a credential is the projection these endpoints return. Writing a second list of user
 * columns here would be a second place for one of those to reappear by mistake.
 *
 * There is no status vocabulary defined here, unlike the users module. `VolunteerStatus` is a real
 * Prisma enum — the schema stores the roster state directly — so the enum from the client is the one
 * source, and a hand-written list of the same three strings would only be able to drift from it.
 */

/** Columns a volunteer endpoint may return, with the person read through the relation. */
export const VOLUNTEER_SELECT = {
  id: true,
  userId: true,
  status: true,
  skills: true,
  availability: true,
  notes: true,
  joinedAt: true,
  createdAt: true,
  updatedAt: true,
  user: { select: USER_SELECT },
} satisfies Prisma.VolunteerSelect;

/** What Prisma hands back for `VOLUNTEER_SELECT`, derived so the two cannot drift apart. */
export type SelectedVolunteer = Prisma.VolunteerGetPayload<{ select: typeof VOLUNTEER_SELECT }>;

/** Rows per page when the caller does not ask. Capped by `MAX_PAGE_SIZE` from common/pagination. */
export const DEFAULT_VOLUNTEER_PAGE_SIZE = 20;
