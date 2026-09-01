/**
 * `/bookings` — Mosque Service Booking Requests.
 *
 * Connects frontend views to the NestJS Bookings API at `/api/v1/bookings`.
 * Maps backend lowercase/snake_case enums to frontend Title Case conventions.
 */

import { apiDeleteRaw, apiGetRaw, apiPatchRaw, apiPostRaw } from "./apiClient";
import type {
  Booking,
  BookingStatus,
  ServiceCategory,
} from "@/lib/mosque/types";

/* -------------------------------------------------------------------------- *
 * Backend shape
 * -------------------------------------------------------------------------- */

export type BackendBooking = {
  id: string;
  serviceId: string;
  serviceName: string;
  category: string;
  requesterName: string;
  requesterPhone: string;
  requesterEmail: string;
  memberId: string | null;
  status: string;
  scheduledDate: string;
  scheduledTime: string | null;
  submittedAt: string;
  location: string;
  partySize: number;
  fee: number;
  assignedTo: string | null;
  assignedToId: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type BackendBookingStats = {
  total: number;
  pending: number;
  confirmed: number;
  thisWeek: number;
};

export type PaginatedBookingsResponse = {
  rows: BackendBooking[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type BookingQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  serviceId?: string;
  status?: string;
  category?: string;
  from?: string;
  to?: string;
  all?: boolean;
};

export type CreateBookingInput = {
  serviceId: string;
  userId?: string | null;
  requesterName: string;
  requesterPhone: string;
  requesterEmail?: string;
  memberId?: string;
  scheduledDate: string;
  scheduledTime?: string;
  location: string;
  partySize?: number;
  fee?: number;
  assignedTo?: string;
  assignedToId?: string;
  notes?: string;
  status?: string;
};

export type UpdateBookingInput = Partial<CreateBookingInput>;

export type UpdateBookingStatusInput = {
  status: string;
  reason?: string;
};

/* -------------------------------------------------------------------------- *
 * Category & status mapping — backend lowercase ↔ frontend Title Case
 * -------------------------------------------------------------------------- */

const CATEGORY_TO_FRONTEND: Record<string, ServiceCategory> = {
  funeral: "Funeral",
  marriage: "Marriage",
  counselling: "Counselling",
  welfare: "Welfare",
  education: "Education",
  facility: "Facility",
  certificate: "Certificate",
};

const STATUS_TO_FRONTEND: Record<string, BookingStatus> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  declined: "Declined",
};

function toFrontendCategory(raw: string): ServiceCategory {
  return CATEGORY_TO_FRONTEND[raw.toLowerCase()] ?? (raw as ServiceCategory);
}

function toFrontendStatus(raw: string): BookingStatus {
  return STATUS_TO_FRONTEND[raw.toLowerCase()] ?? (raw as BookingStatus);
}

function toBackendStatus(status?: string): string | undefined {
  return status ? status.toLowerCase() : undefined;
}

function toBackendCategory(category?: string): string | undefined {
  return category && category !== "all" ? category.toLowerCase() : undefined;
}

/** Map a backend booking DTO to the frontend `Booking` model. */
export function toFrontendBooking(backend: BackendBooking): Booking {
  return {
    id: backend.id,
    serviceId: backend.serviceId,
    serviceName: backend.serviceName,
    category: toFrontendCategory(backend.category),
    requesterName: backend.requesterName,
    requesterPhone: backend.requesterPhone,
    requesterEmail: backend.requesterEmail ?? "",
    memberId: backend.memberId ?? undefined,
    status: toFrontendStatus(backend.status),
    scheduledDate: backend.scheduledDate.slice(0, 10),
    scheduledTime: backend.scheduledTime ?? undefined,
    submittedAt: backend.submittedAt.slice(0, 10),
    location: backend.location,
    partySize: backend.partySize,
    fee: backend.fee,
    assignedTo: backend.assignedTo ?? undefined,
    notes: backend.notes ?? "",
  };
}

/* -------------------------------------------------------------------------- *
 * API functions
 * -------------------------------------------------------------------------- */

/**
 * Fetch paginated or full booking list from `/api/v1/bookings`.
 */
export async function fetchBookings(
  query: BookingQuery = {}
): Promise<{ rows: Booking[]; total: number; page: number; pageSize: number; pageCount: number }> {
  const params: Record<string, string | number | boolean | undefined> = {
    ...query,
    status: query.status && query.status !== "all" ? toBackendStatus(query.status) : undefined,
    category: toBackendCategory(query.category),
  };

  const result = await apiGetRaw<PaginatedBookingsResponse | BackendBooking[]>("/bookings", params);

  if (Array.isArray(result)) {
    const rows = result.map(toFrontendBooking);
    return { rows, total: rows.length, page: 1, pageSize: rows.length, pageCount: 1 };
  }

  return {
    rows: (result.rows || []).map(toFrontendBooking),
    total: result.total || 0,
    page: result.page || 1,
    pageSize: result.pageSize || 10,
    pageCount: result.pageCount || 1,
  };
}

/**
 * Fetch booking statistics from `/api/v1/bookings/stats`.
 */
export async function fetchBookingStats(): Promise<BackendBookingStats> {
  return apiGetRaw<BackendBookingStats>("/bookings/stats");
}

/**
 * Fetch a single booking by UUID.
 */
export async function fetchBooking(id: string): Promise<Booking> {
  const result = await apiGetRaw<BackendBooking>(`/bookings/${encodeURIComponent(id)}`);
  return toFrontendBooking(result);
}

/**
 * Create a new booking request.
 */
export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const payload = {
    ...input,
    ...(input.status && { status: toBackendStatus(input.status) }),
  };
  const result = await apiPostRaw<BackendBooking>("/bookings", payload);
  return toFrontendBooking(result);
}

/**
 * Update an existing booking.
 */
export async function updateBooking(id: string, input: UpdateBookingInput): Promise<Booking> {
  const payload = {
    ...input,
    ...(input.status && { status: toBackendStatus(input.status) }),
  };
  const result = await apiPatchRaw<BackendBooking>(`/bookings/${encodeURIComponent(id)}`, payload);
  return toFrontendBooking(result);
}

/**
 * Transition booking status (Pending → Confirmed, Cancelled, etc.).
 */
export async function updateBookingStatus(id: string, input: UpdateBookingStatusInput): Promise<Booking> {
  const payload = {
    status: input.status.toLowerCase(),
    ...(input.reason && { reason: input.reason }),
  };
  const result = await apiPatchRaw<BackendBooking>(`/bookings/${encodeURIComponent(id)}/status`, payload);
  return toFrontendBooking(result);
}

/**
 * Soft-delete / cancel a booking.
 */
export async function deleteBooking(id: string): Promise<Booking> {
  const result = await apiDeleteRaw<BackendBooking>(`/bookings/${encodeURIComponent(id)}`);
  return toFrontendBooking(result);
}
