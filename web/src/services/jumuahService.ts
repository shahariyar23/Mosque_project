/**
 * `/jummah` — the Friday khutbah and jamaat.
 *
 * **Two things about this module are easy to get wrong.**
 *
 * The path is `jummah` while the permission, the table and the backend directory all use `jumuah`. Both
 * spellings transliterate the same word; the route is spelled the way the specification asked for it. A
 * request to `/jumuah` is a 404.
 *
 * And this controller returns **raw DTOs, with no `{ success, data }` envelope** — one of only four that do
 * (the others are `mosque`, `prayer-times` and `ramadan`). Hence `apiGetRaw` and friends: putting these
 * through the enveloped helpers would throw `MALFORMED_RESPONSE` on every call, since there is no `data`
 * key to find.
 *
 * Jumu'ah times are not calculated. Unlike the daily prayers, the khutbah and jamaat are times a mosque
 * *decides*, so they are stored `HH:mm` wall-clock strings served back exactly as entered.
 */

import { apiDeleteRaw, apiGetRaw, apiPatchRaw, apiPostRaw } from "./apiClient";

/**
 * One schedule row.
 *
 * `date: null` is the **standing weekly schedule** — the one that holds for every Friday with no entry of
 * its own. That is a meaningful value, not a missing one. `mosqueId` is not in the response: the caller's
 * own mosque is the only one they can read, so echoing its id would add an internal identifier to every
 * row in exchange for nothing.
 */
export type Jumuah = {
  id: string;
  /** The Friday this applies to, `YYYY-MM-DD`, or `null` for the standing weekly schedule. */
  date: string | null;
  /** `HH:mm`, 24-hour. */
  khutbahTime: string;
  /** `HH:mm`, 24-hour. */
  prayerTime: string;
  imam: string | null;
  location: string | null;
  notes: string | null;
  /** False keeps a record without publishing it — the alternative to deleting a cancelled arrangement. */
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

/** The one filter the list takes. Omit for both published and unpublished. */
export type JumuahQuery = {
  isActive?: boolean;
};

/**
 * A new schedule. `khutbahTime` and `prayerTime` are the only required fields.
 *
 * Omit `date` for the standing weekly schedule. A date that is not a Friday is a 400, as is a time that is
 * not `HH:mm`.
 */
export type CreateJumuahInput = {
  date?: string | null;
  khutbahTime: string;
  prayerTime: string;
  imam?: string | null;
  location?: string | null;
  notes?: string | null;
  isActive?: boolean;
};

/** Every field optional. There is no `mosqueId` — sending one is a 400, not a silent drop. */
export type UpdateJumuahInput = Partial<CreateJumuahInput>;

/**
 * The list, standing schedule first, then dated Fridays in calendar order.
 *
 * Unpaginated — the controller returns a plain array. `prayer.view`, which every signed-in person holds.
 */
export function fetchJumuahSchedules(query: JumuahQuery = {}): Promise<Jumuah[]> {
  return apiGetRaw<Jumuah[]>("/jummah", { isActive: query.isActive });
}

export function fetchJumuah(id: string): Promise<Jumuah> {
  return apiGetRaw<Jumuah>(`/jummah/${id}`);
}

/** `jumuah.manage`. */
export function createJumuah(input: CreateJumuahInput): Promise<Jumuah> {
  return apiPostRaw<Jumuah>("/jummah", input);
}

/** `jumuah.manage`. */
export function updateJumuah(id: string, input: UpdateJumuahInput): Promise<Jumuah> {
  return apiPatchRaw<Jumuah>(`/jummah/${id}`, input);
}

/**
 * Removes the entry. `jumuah.manage`.
 *
 * The backend answers with the deleted row; nothing needs it, so this resolves to `void`. To keep a record
 * without publishing it, patch `isActive: false` instead.
 */
export function deleteJumuah(id: string): Promise<void> {
  return apiDeleteRaw(`/jummah/${id}`);
}
