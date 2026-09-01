/**
 * `/ramadan` — Daily fasting, Iftar and Taraweeh schedules.
 *
 * Like `jumuah`, `mosque`, and `prayer-times`, this controller returns **raw DTOs without the
 * `{ success, data }` envelope**. We use `apiGetRaw`, `apiPostRaw`, `apiPatchRaw`, and `apiDeleteRaw`
 * from `@/services/apiClient`.
 *
 * Ramadan times are wall-clock `HH:mm` strings preserved exactly as entered by the mosque.
 */

import { apiDeleteRaw, apiGetRaw, apiPatchRaw, apiPostRaw } from "./apiClient";

/**
 * One Ramadan schedule row returned by the API.
 */
export type Ramadan = {
  id: string;
  /** Hijri year this schedule belongs to, e.g. 1447. */
  year: number;
  /** The Gregorian day, `YYYY-MM-DD`. */
  date: string;
  /** When the fast begins (Imsak cutoff), `HH:mm` in 24-hour time. */
  fastingStart: string;
  /** When the fast ends (Maghrib / Iftar), `HH:mm` in 24-hour time. */
  fastingEnd: string;
  /** Optional announced Suhoor gathering time, `HH:mm`. */
  suhoorTime: string | null;
  /** Optional announced Iftar gathering time, `HH:mm`. */
  iftarTime: string | null;
  /** Optional Taraweeh prayer start time, `HH:mm`. */
  taraweehTime: string | null;
  /** Special notes or announcements for this day. */
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Query parameters supported by `GET /api/v1/ramadan`.
 */
export type RamadanQuery = {
  /** Return only this Hijri year (1400–1500). Omit for all years entered. */
  year?: number;
};

/**
 * Payload to create a new Ramadan day schedule.
 */
export type CreateRamadanInput = {
  year: number;
  date: string; // YYYY-MM-DD
  fastingStart: string; // HH:mm
  fastingEnd: string; // HH:mm
  suhoorTime?: string | null;
  iftarTime?: string | null;
  taraweehTime?: string | null;
  notes?: string | null;
};

/**
 * Payload to update an existing Ramadan day schedule.
 * All fields are optional.
 */
export type UpdateRamadanInput = Partial<CreateRamadanInput>;

/* -------------------------------------------------------------------------- *
 * Service Functions
 * -------------------------------------------------------------------------- */

/**
 * List Ramadan schedules for the authenticated user's mosque.
 * Ordered by most recent Hijri year first, then calendar date ascending.
 *
 * Permission: `prayer.view`
 */
export function fetchRamadanSchedules(query: RamadanQuery = {}): Promise<Ramadan[]> {
  return apiGetRaw<Ramadan[]>("/ramadan", {
    year: query.year,
  });
}

/**
 * Fetch a single Ramadan schedule row by its UUID.
 *
 * Permission: `prayer.view`
 */
export function fetchRamadan(id: string): Promise<Ramadan> {
  return apiGetRaw<Ramadan>(`/ramadan/${id}`);
}

/**
 * Create a Ramadan schedule for a specific day.
 *
 * Permission: `ramadan.manage`
 */
export function createRamadan(input: CreateRamadanInput): Promise<Ramadan> {
  return apiPostRaw<Ramadan>("/ramadan", input);
}

/**
 * Update an existing Ramadan day schedule.
 *
 * Permission: `ramadan.manage`
 */
export function updateRamadan(id: string, input: UpdateRamadanInput): Promise<Ramadan> {
  return apiPatchRaw<Ramadan>(`/ramadan/${id}`, input);
}

/**
 * Delete a Ramadan day schedule entry.
 *
 * Permission: `ramadan.manage`
 */
export function deleteRamadan(id: string): Promise<void> {
  return apiDeleteRaw(`/ramadan/${id}`);
}

/* -------------------------------------------------------------------------- *
 * Aliases for naming compatibility
 * -------------------------------------------------------------------------- */
export const getRamadanSchedules = fetchRamadanSchedules;
export const getRamadanScheduleById = fetchRamadan;
export const createRamadanSchedule = createRamadan;
export const updateRamadanSchedule = updateRamadan;
export const deleteRamadanSchedule = deleteRamadan;

