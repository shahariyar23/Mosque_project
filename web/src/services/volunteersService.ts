/**
 * `/volunteers` — the roster of people who have offered to help.
 *
 * **A volunteer is a user, not a kind of account.** The row here hangs off a `User` and adds four facts
 * about volunteering, so enrolling someone references an existing account rather than creating a second
 * record of a person. There is no `fullName` or `email` on this module: those live on the user, once, and
 * are read back through the relation — correcting a phone number in the directory corrects it here too.
 *
 * Nothing on this module touches a role or a permission. A treasurer who helps at iftar is
 * `role: "treasurer"` with an active roster entry, and taking them off the roster leaves them the
 * treasurer. `status` here grants nothing and is read by nothing that decides anything.
 *
 * `volunteer.view` to read, `volunteer.manage` to change — both held by the secretary.
 */

import { apiDelete, apiGet, apiList, apiPatch, apiPost } from "./apiClient";
import type { ListResult } from "./apiClient";
import type { VolunteerStatus } from "./enums";
import type { User } from "./userService";

/**
 * One roster entry, with the person attached.
 *
 * `userId` is repeated beside `user` so a caller that only needs the id does not have to reach into the
 * nested object. `skills` and `availability` are free text on purpose — the roster is written in the
 * coordinator's own words ("First aid, driving", "weekends after Asr"), which an enum would reject.
 *
 * `notes` is the coordinator's internal note. It is in this response, so it must not be rendered anywhere
 * public.
 */
export type Volunteer = {
  id: string;
  userId: string;
  status: VolunteerStatus;
  skills: string | null;
  availability: string | null;
  notes: string | null;
  /** When they joined the roster, ISO 8601. */
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
  /** The same safe projection the users endpoints use — no hash, no token, no session material. */
  user: User;
};

/** What a delete reports back. `userId` is the confirmation that the *person* was not deleted. */
export type DeletedVolunteer = {
  id: string;
  userId: string;
};

/** Volunteers whose account has been deleted are never listed, whatever the filters say. */
export type VolunteerQuery = {
  page?: number;
  /** Capped at 100. */
  limit?: number;
  /** Matches the person's name, email and phone — the columns on their user account. */
  search?: string;
  status?: VolunteerStatus;
};

/**
 * Enrolment. `userId` is the only required field.
 *
 * An unknown `userId` is a `400` and a second entry for the same person is a `409` — one person, one roster
 * entry. `joinedAt` is accepted here because a volunteer of ten years may be entered today; it records
 * something that happened, which is why no update accepts it.
 */
export type CreateVolunteerInput = {
  userId: string;
  status?: VolunteerStatus;
  /** Free text, ≤ 500 characters. */
  skills?: string | null;
  /** Free text, ≤ 255 characters. */
  availability?: string | null;
  /** Internal, ≤ 2000 characters. */
  notes?: string | null;
  /** ISO 8601 date-time. Defaults to now. */
  joinedAt?: string;
};

/**
 * What may change: `skills`, `availability`, `notes` and `status`.
 *
 * `userId` is rejected with a `400` — an entry belongs to the person it was created for, and moving it
 * would rewrite whose roster history it is. `joinedAt` likewise: it is a record, not a decision.
 *
 * `status` *is* editable here, unlike a user's status. A user's status is an access decision, so it needs
 * its own request; a roster state grants nothing.
 */
export type UpdateVolunteerInput = {
  status?: VolunteerStatus;
  skills?: string | null;
  availability?: string | null;
  notes?: string | null;
};

/** A page of the roster, newest first. `volunteer.view`. */
export function fetchVolunteers(query: VolunteerQuery = {}): Promise<ListResult<Volunteer>> {
  return apiList<Volunteer>("/volunteers", {
    page: query.page,
    limit: query.limit,
    search: query.search,
    status: query.status,
  });
}

export function fetchVolunteer(id: string): Promise<Volunteer> {
  return apiGet<Volunteer>(`/volunteers/${id}`);
}

/** `volunteer.manage`. `400` on an unknown user, `409` if they are already enrolled. */
export function createVolunteer(input: CreateVolunteerInput): Promise<Volunteer> {
  return apiPost<Volunteer>("/volunteers", input);
}

/** `volunteer.manage`. */
export function updateVolunteer(id: string, input: UpdateVolunteerInput): Promise<Volunteer> {
  return apiPatch<Volunteer>(`/volunteers/${id}`, input);
}

/**
 * Sets the roster state and nothing else. `volunteer.manage`.
 *
 * `on_leave` is for someone expected back, so a coordinator does not have to delete the record to say they
 * are away.
 */
export function updateVolunteerStatus(id: string, status: VolunteerStatus): Promise<Volunteer> {
  return apiPatch<Volunteer>(`/volunteers/${id}/status`, { status });
}

/**
 * Removes the roster entry, not the person. `volunteer.manage`, answers `200`.
 *
 * Their account, membership and history are untouched and they can be enrolled again. Prefer a status
 * change when they may return; deleting twice is a `404`.
 */
export function deleteVolunteer(id: string): Promise<void> {
  return apiDelete(`/volunteers/${id}`);
}
