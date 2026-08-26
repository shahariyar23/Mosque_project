/**
 * `/mosque` — the mosque's own record, its settings, and its facilities.
 *
 * **This controller is raw: no `{ success, message, data }` envelope.** It returns the row itself, so every
 * call here goes through the `*Raw` helpers. Passing these responses to `apiGet` would throw
 * `MALFORMED_RESPONSE` on a body that is perfectly fine.
 *
 * **There is no `:mosqueId` anywhere.** The mosque is read from the caller's token, so a request cannot ask
 * about someone else's mosque — that is the tenant boundary, and it is why `GET /mosque` takes no argument.
 *
 * Three permissions, one per area: `mosque.view`/`mosque.manage` for the profile,
 * `settings.view`/`settings.manage` for the settings, and `facility.view`/`create`/`update`/`delete` for
 * facilities. `facility.view` is a base permission — every signed-in person can read the facility list.
 *
 * Money is not involved on this module. Coordinates are, and they are `Decimal(9, 6)` on the way out:
 * `latitude` and `longitude` arrive as **strings**, while the update DTO accepts them as **numbers**. That
 * asymmetry is the backend's, not a mistake here — see `UpdateMosqueInput`.
 */

import { apiDeleteRaw, apiGetRaw, apiPatchRaw, apiPostRaw } from "./apiClient";

/* ------------------------------------------------------------------ *
 * The mosque profile
 * ------------------------------------------------------------------ */

/**
 * The mosque, as the row is returned.
 *
 * `slug` is the URL-safe identifier and is stable once issued — it is editable, but renaming it breaks any
 * link that already used it, so the form should treat it as a deliberate act rather than a field to tab past.
 *
 * `latitude` and `longitude` are `Decimal(9, 6)` in Postgres and serialise as decimal **strings**. Six places
 * is about ten centimetres, and the schema's own comment gives the reason: a rounded latitude shifts Fajr.
 * So they must not be round-tripped through a float for display — render the string.
 *
 * `timezone` is an IANA zone and has a default, which is why it is the one non-optional location field: a
 * prayer schedule without one means nothing.
 */
export type Mosque = {
  id: string;
  slug: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  addressLine: string | null;
  city: string | null;
  district: string | null;
  country: string | null;
  postalCode: string | null;
  /** Decimal string, 6 places. Never parse it to a float. */
  latitude: string | null;
  /** Decimal string, 6 places. */
  longitude: string | null;
  /** IANA zone, e.g. `"Asia/Dhaka"`. Defaults on the server. */
  timezone: string;
  establishedYear: number | null;
  description: string | null;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * Every field `UpdateMosqueDto` declares, all optional — and nothing else, because
 * `forbidNonWhitelisted: true` turns one stray key into a 400.
 *
 * `isActive` is **not** here: whether a mosque is live is a platform decision, not one a mosque admin makes
 * about their own tenant. Neither is `id`.
 *
 * `latitude` and `longitude` go out as `number` — the DTO validates them with `@IsLatitude()`/`@IsLongitude()`
 * after `@Type(() => Number)`, so a form holding the string from `Mosque` must convert on submit. This is the
 * one place in this integration where a coordinate touches a float, and it is unavoidable: the DTO asks for
 * one. It is a coordinate, not money.
 */
export type UpdateMosqueInput = {
  /** ≤ 160 characters, trimmed. */
  name?: string;
  /** Lowercase words joined by single hyphens, ≤ 64 characters. Changing it breaks existing links. */
  slug?: string;
  description?: string | null;
  /** ≤ 160 characters, must be a valid address. */
  email?: string | null;
  /** ≤ 32 characters. */
  phone?: string | null;
  /** Absolute URL, ≤ 255 characters. */
  website?: string | null;
  addressLine?: string | null;
  city?: string | null;
  district?: string | null;
  country?: string | null;
  postalCode?: string | null;
  /** IANA zone, ≤ 64 characters. */
  timezone?: string;
  /** −90 to 90. */
  latitude?: number | null;
  /** −180 to 180. */
  longitude?: number | null;
  /** Integer, 1–9999. */
  establishedYear?: number | null;
  /** Absolute URL, ≤ 500 characters. */
  logoUrl?: string | null;
};

/** The caller's own mosque. `mosque.view`. */
export function fetchMosque(): Promise<Mosque> {
  return apiGetRaw<Mosque>("/mosque");
}

/** `mosque.manage`. A `slug` already taken by another mosque is a `409`. */
export function updateMosque(input: UpdateMosqueInput): Promise<Mosque> {
  return apiPatchRaw<Mosque>("/mosque", input);
}

/* ------------------------------------------------------------------ *
 * Settings
 * ------------------------------------------------------------------ */

/**
 * The settings row.
 *
 * **Eight of these nineteen fields are readable but not writable.** `UpdateMosqueSettingsDto` declares only
 * the eight in `UpdateMosqueSettingsInput`; `currency`, the five notification toggles, `twoFactorRequired`
 * and `theme` are on the row and come back on every read, but sending any of them is a **400**. So the
 * settings screen must render them as current values rather than as controls — a toggle that always fails is
 * worse than no toggle.
 *
 * `GET /mosque/settings` never 404s: if no row exists it is created with the schema defaults and returned.
 */
export type MosqueSettings = {
  id: string;
  mosqueId: string;
  /** Editable. */
  defaultLanguage: string;
  /** Read-only. `"BDT"` by default — every amount in this API is in it. */
  currency: string;
  /** Editable. */
  dateFormat: string;
  /** Read-only. */
  emailNotifications: boolean;
  /** Read-only. */
  smsNotifications: boolean;
  /** Read-only. */
  pushNotifications: boolean;
  /** Read-only. */
  prayerReminders: boolean;
  /** Read-only. */
  eventReminders: boolean;
  /** Editable. The prayer-time calculation method, e.g. `"MuslimWorldLeague"`. */
  calculationMethod: string;
  /** Editable. `"Standard"` or `"Hanafi"`. */
  asrMethod: string;
  /** Editable. Minutes added to each calculated time before it is published as the jamaat time. */
  iqamahOffset: number;
  /** Read-only. */
  twoFactorRequired: boolean;
  /** Editable. */
  sessionTimeoutMins: number;
  /** Editable. */
  passwordMinLength: number;
  /** Read-only. `"system"`, `"light"` or `"dark"`. */
  theme: string;
  /** Editable. */
  primaryColor: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * The eight settings that may be changed. All optional; the request upserts, so a partial patch is fine.
 *
 * `passwordMinLength` has a floor of 8 on the server — it cannot be weakened below that from here, whatever
 * the form offers.
 */
export type UpdateMosqueSettingsInput = {
  /** ≤ 8 characters, e.g. `"en"`, `"bn"`. */
  defaultLanguage?: string;
  /** ≤ 24 characters, e.g. `"DD/MM/YYYY"`. */
  dateFormat?: string;
  /** ≤ 48 characters. */
  calculationMethod?: string;
  /** ≤ 24 characters. */
  asrMethod?: string;
  /** Integer, 0–120 minutes. */
  iqamahOffset?: number;
  /** Integer, 1–1440 minutes. */
  sessionTimeoutMins?: number;
  /** Integer, 8–128. The server will not accept less than 8. */
  passwordMinLength?: number;
  /** ≤ 16 characters, e.g. `"#0f766e"`. */
  primaryColor?: string | null;
};

/** `settings.view`. Creates the row with defaults if the mosque has none yet, so it always answers. */
export function fetchMosqueSettings(): Promise<MosqueSettings> {
  return apiGetRaw<MosqueSettings>("/mosque/settings");
}

/** `settings.manage`. Upserts, so this works on a mosque whose settings row does not exist yet. */
export function updateMosqueSettings(input: UpdateMosqueSettingsInput): Promise<MosqueSettings> {
  return apiPatchRaw<MosqueSettings>("/mosque/settings", input);
}

/* ------------------------------------------------------------------ *
 * Facilities
 * ------------------------------------------------------------------ */

/**
 * One facility — a room, a wudu area, a car park.
 *
 * **Four fields is all there is.** The services screen was designed around a richer idea of a facility
 * (category, coordinator, fee, booking counts); none of that exists in this schema, and because
 * `forbidNonWhitelisted: true` rejects undeclared keys, sending any of it is a 400 rather than a field the
 * server quietly drops. The wired form carries these four.
 *
 * `isAvailable` is the whole of the status vocabulary: available, or not. There is no maintenance state.
 */
export type Facility = {
  id: string;
  mosqueId: string;
  name: string;
  description: string | null;
  isAvailable: boolean;
  /** People. `null` when it does not apply — a car park counts cars, not worshippers. */
  capacity: number | null;
  createdAt: string;
  updatedAt: string;
};

/** `name` is the only required field. `isAvailable` defaults to `true`, `capacity` to `null`. */
export type CreateFacilityInput = {
  /** ≤ 160 characters. */
  name: string;
  description?: string | null;
  isAvailable?: boolean;
  /** Integer ≥ 0. */
  capacity?: number | null;
};

/** The same four, all optional. */
export type UpdateFacilityInput = {
  name?: string;
  description?: string | null;
  isAvailable?: boolean;
  capacity?: number | null;
};

/**
 * Every facility, newest first. `facility.view` — a base permission, so any signed-in person can read this.
 *
 * **Unpaginated**: the route takes no `page` or `limit` and returns the whole list, so this resolves to a
 * plain array and the screen must not render pagination controls for it.
 */
export function fetchFacilities(): Promise<Facility[]> {
  return apiGetRaw<Facility[]>("/mosque/facilities");
}

/** `facility.view`. A facility belonging to another mosque answers `404`, not `403`. */
export function fetchFacility(id: string): Promise<Facility> {
  return apiGetRaw<Facility>(`/mosque/facilities/${id}`);
}

/** `facility.create`. */
export function createFacility(input: CreateFacilityInput): Promise<Facility> {
  return apiPostRaw<Facility>("/mosque/facilities", input);
}

/** `facility.update`. */
export function updateFacility(id: string, input: UpdateFacilityInput): Promise<Facility> {
  return apiPatchRaw<Facility>(`/mosque/facilities/${id}`, input);
}

/**
 * A hard delete — the row is gone. `facility.delete`, answers `200` with the deleted row.
 *
 * Unlike a user, a facility has no `deletedAt`, so this cannot be undone. Where a facility is only
 * temporarily out of use, patch `isAvailable: false` instead. Nothing needs the returned row, so this
 * resolves to `void`.
 */
export function deleteFacility(id: string): Promise<void> {
  return apiDeleteRaw(`/mosque/facilities/${id}`);
}
