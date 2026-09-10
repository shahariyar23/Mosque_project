/**
 * `/events` — Mosque Community Events and Programmes.
 *
 * Connects frontend views to the NestJS Events API at `/api/v1/events`.
 */

import { apiDeleteRaw, apiGetRaw, apiPatchRaw, apiPostRaw } from "./apiClient";
import type {
  EventCategory,
  EventStatus,
  MosqueEvent,
} from "@/lib/mosque/types";

export type BackendEvent = {
  id: string;
  slug: string;
  title: string;
  category: string;
  status: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string | null;
  timeLabel: string | null;
  location: string;
  speaker: string | null;
  description: string;
  capacity: number;
  registered: number;
  registrationRequired: boolean;
  contribution: number | null;
  imageUrl: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PaginatedEventsResponse = {
  rows: BackendEvent[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type EventQuery = {
  page?: number;
  pageSize?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
  timeframe?: "upcoming" | "this_month" | "completed" | "past" | "all";
  from?: string;
  to?: string;
  all?: boolean;
};

export type CreateEventInput = {
  title: string;
  slug?: string;
  category: string;
  status?: string;
  date: string;
  startTime: string;
  endTime?: string | null;
  timeLabel?: string | null;
  location: string;
  speaker?: string | null;
  description: string;
  capacity?: number;
  registrationRequired?: boolean;
  contribution?: number | null;
  imageUrl?: string | null;
  isPublished?: boolean;
};

export type UpdateEventInput = Partial<CreateEventInput>;

/** Capitalizes first letter to match frontend EventCategory / EventStatus conventions. */
function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

/** Map backend DTO to frontend MosqueEvent model. */
export function toFrontendEvent(backend: BackendEvent): MosqueEvent {
  // Normalize category: "quran" -> "Quran", "education" -> "Education", etc.
  const categoryMap: Record<string, EventCategory> = {
    quran: "Quran",
    education: "Education",
    youth: "Youth",
    community: "Community",
    ramadan: "Ramadan",
    charity: "Charity",
    seminar: "Seminar",
  };

  const statusMap: Record<string, EventStatus> = {
    upcoming: "Upcoming",
    ongoing: "Ongoing",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  const category = categoryMap[backend.category.toLowerCase()] || (capitalize(backend.category) as EventCategory);
  const status = statusMap[backend.status.toLowerCase()] || (capitalize(backend.status) as EventStatus);

  return {
    id: backend.id,
    slug: backend.slug,
    title: backend.title,
    category,
    status,
    date: backend.date,
    startTime: backend.startTime,
    endTime: backend.endTime || undefined,
    timeLabel: backend.timeLabel || undefined,
    location: backend.location,
    speaker: backend.speaker || undefined,
    description: backend.description,
    capacity: backend.capacity,
    registered: backend.registered || 0,
    registrationRequired: backend.registrationRequired,
    contribution: backend.contribution !== null ? backend.contribution : undefined,
    imageUrl: backend.imageUrl || undefined,
  };
}

/** Convert frontend input to backend enum formats. */
function toBackendCategory(category: string): string {
  return category.toLowerCase();
}

function toBackendStatus(status?: string): string | undefined {
  return status ? status.toLowerCase() : undefined;
}

/**
 * Fetch paginated or full event list from `/api/v1/events`.
 */
export async function fetchEvents(
  query: EventQuery = {}
): Promise<{ rows: MosqueEvent[]; total: number; page: number; pageSize: number; pageCount: number }> {
  const params: Record<string, string | number | boolean | undefined> = {
    ...query,
    category: query.category && query.category !== "all" ? toBackendCategory(query.category) : undefined,
    status: query.status && query.status !== "all" ? toBackendStatus(query.status) : undefined,
  };

  const result = await apiGetRaw<PaginatedEventsResponse | BackendEvent[]>("/events", params);

  if (Array.isArray(result)) {
    const rows = result.map(toFrontendEvent);
    return {
      rows,
      total: rows.length,
      page: 1,
      pageSize: rows.length,
      pageCount: 1,
    };
  }

  return {
    rows: (result.rows || []).map(toFrontendEvent),
    total: result.total || 0,
    page: result.page || 1,
    pageSize: result.pageSize || 10,
    pageCount: result.pageCount || 1,
  };
}

/**
 * Fetch a single event by ID or slug.
 */
export async function fetchEvent(idOrSlug: string): Promise<MosqueEvent> {
  const result = await apiGetRaw<BackendEvent>(`/events/${encodeURIComponent(idOrSlug)}`);
  return toFrontendEvent(result);
}

/**
 * Create a new event.
 */
export async function createEvent(input: CreateEventInput): Promise<MosqueEvent> {
  const payload = {
    ...input,
    category: toBackendCategory(input.category),
    ...(input.status && { status: toBackendStatus(input.status) }),
  };

  const result = await apiPostRaw<BackendEvent>("/events", payload);
  return toFrontendEvent(result);
}

/**
 * Update an existing event.
 */
export async function updateEvent(id: string, input: UpdateEventInput): Promise<MosqueEvent> {
  const payload = {
    ...input,
    ...(input.category && { category: toBackendCategory(input.category) }),
    ...(input.status && { status: toBackendStatus(input.status) }),
  };

  const result = await apiPatchRaw<BackendEvent>(`/events/${encodeURIComponent(id)}`, payload);
  return toFrontendEvent(result);
}

/**
 * Delete an event (soft-delete / cancel).
 */
export async function deleteEvent(id: string): Promise<MosqueEvent> {
  const result = await apiDeleteRaw<BackendEvent>(`/events/${encodeURIComponent(id)}`);
  return toFrontendEvent(result);
}

/* ------------------------------------------------------------------ *
 * Authenticated user's event registrations
 * ------------------------------------------------------------------ */

export type BackendMyRegistration = {
  registrationId: string;
  registrationStatus: string;
  guests: number;
  registeredAt: string;
  isPast: boolean;
  isCheckedIn?: boolean;
  checkedInAt?: string | null;
  checkedInByName?: string | null;
  event: BackendEvent;
};

export type TicketVerificationResult = {
  valid: boolean;
  message: string;
  registrationId: string;
  participantName: string;
  participantEmail?: string | null;
  guests: number;
  status: string;
  registeredAt: string;
  isCheckedIn: boolean;
  checkedInAt?: string | null;
  checkedInByName?: string | null;
  event: BackendEvent;
};

export type CheckInResult = {
  success: boolean;
  alreadyCheckedIn: boolean;
  message: string;
  checkedInAt: string;
  checkedInByName: string;
  registrationId: string;
  participantName: string;
  eventTitle: string;
};

export type MyRegistrationsQuery = {
  status?: string;
  timeframe?: "upcoming" | "past" | "all";
  page?: number;
  pageSize?: number;
  limit?: number;
  all?: boolean;
};

/**
 * Fetch the authenticated user's own event registrations from the backend.
 * Ownership and mosque tenancy are enforced server-side from the JWT.
 */
export async function fetchMyRegisteredEvents(
  query: MyRegistrationsQuery = {},
): Promise<{ rows: MosqueEvent[]; total: number; page: number; pageSize: number; pageCount: number; registrations: Record<string, BackendMyRegistration> }> {
  const params: Record<string, string | number | boolean | undefined> = {
    status: query.status,
    timeframe: query.timeframe,
    page: query.page,
    pageSize: query.pageSize,
    limit: query.limit,
    all: query.all,
  };

  const result = await apiGetRaw<BackendMyRegistration[] | { rows: BackendMyRegistration[]; total: number; page: number; pageSize: number; pageCount: number }>(
    "/events/my-registrations",
    params,
  );

  const rawRows = Array.isArray(result) ? result : result.rows || [];
  const total = Array.isArray(result) ? rawRows.length : result.total ?? rawRows.length;
  const page = Array.isArray(result) ? 1 : result.page ?? 1;
  const pageSize = Array.isArray(result) ? rawRows.length : result.pageSize ?? 10;
  const pageCount = Array.isArray(result) ? 1 : result.pageCount ?? 1;

  const rows = rawRows.map((r) => toFrontendEvent(r.event));
  const registrations: Record<string, BackendMyRegistration> = {};
  for (const r of rawRows) {
    registrations[r.event.id] = r;
  }

  return { rows, total, page, pageSize, pageCount, registrations };
}

/**
 * Fetch a single registration for the current user by registration UUID or event ID/slug.
 */
export async function fetchMyRegistration(idOrEventId: string): Promise<BackendMyRegistration> {
  const result = await apiGetRaw<BackendMyRegistration>(`/events/my-registrations/${encodeURIComponent(idOrEventId)}`);
  return result;
}

/**
 * Verify a ticket by registration id.
 */
export async function verifyTicket(registrationId: string): Promise<TicketVerificationResult> {
  const result = await apiGetRaw<TicketVerificationResult>(`/events/verify-ticket/${encodeURIComponent(registrationId)}`);
  return result;
}

/**
 * Perform check-in of a registration by id (admin / staff only).
 */
export async function checkInTicket(registrationId: string): Promise<CheckInResult> {
  const result = await apiPostRaw<CheckInResult>(`/events/check-in`, { registrationId });
  return result;
}

/**
 * Register the current user for an event.
 * Returns the created registration together with the event details.
 */
export async function registerForEvent(eventId: string): Promise<BackendMyRegistration> {
  const result = await apiPostRaw<BackendMyRegistration>(`/events/${encodeURIComponent(eventId)}/register`);
  return result;
}


