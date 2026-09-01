/**
 * `/services` — Mosque Service Catalogue.
 *
 * Connects frontend views to the NestJS Services API at `/api/v1/services`.
 * The backend uses lowercase enum values (funeral, active) while the frontend
 * uses title-case (Funeral, Active), so mapping helpers are kept here.
 */

import { apiDeleteRaw, apiGetRaw, apiPatchRaw, apiPostRaw } from "./apiClient";
import type { BackendBooking } from "./bookingService";
import type {
  Service,
  ServiceCategory,
  ServiceStatus,
} from "@/lib/mosque/types";

export type { BackendBooking };

/* -------------------------------------------------------------------------- *
 * Backend shape
 * -------------------------------------------------------------------------- */

export type BackendService = {
  id: string;
  name: string;
  slug: string;
  category: string;
  status: string;
  summary: string;
  description: string;
  coordinator: string;
  coordinatorId: string | null;
  contactPhone: string;
  location: string;
  availability: string;
  fee: number;
  requiresBooking: boolean;
  turnaround: string;
  bookingsThisMonth: number;
  totalBookings: number;
  createdAt: string;
  updatedAt: string;
};

export type BackendServiceStats = {
  total: number;
  active: number;
  bookingsThisMonth: number;
  free: number;
};

export type PaginatedServicesResponse = {
  rows: BackendService[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type ServiceQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  status?: string;
  all?: boolean;
};

export type CreateServiceInput = {
  name: string;
  slug?: string;
  category: string;
  status?: string;
  summary: string;
  description: string;
  coordinator: string;
  contactPhone: string;
  location: string;
  availability: string;
  fee?: number;
  requiresBooking?: boolean;
  turnaround: string;
};

export type UpdateServiceInput = Partial<CreateServiceInput>;

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

const STATUS_TO_FRONTEND: Record<string, ServiceStatus> = {
  active: "Active",
  paused: "Paused",
  draft: "Draft",
};

function toFrontendCategory(raw: string): ServiceCategory {
  return CATEGORY_TO_FRONTEND[raw.toLowerCase()] ?? (raw as ServiceCategory);
}

function toFrontendStatus(raw: string): ServiceStatus {
  return STATUS_TO_FRONTEND[raw.toLowerCase()] ?? (raw as ServiceStatus);
}

function toBackendCategory(cat: string): string {
  return cat.toLowerCase();
}

function toBackendStatus(status?: string): string | undefined {
  return status ? status.toLowerCase() : undefined;
}

/** Map a backend DTO to the frontend `Service` model. */
export function toFrontendService(backend: BackendService): Service {
  return {
    id: backend.id,
    name: backend.name,
    category: toFrontendCategory(backend.category),
    status: toFrontendStatus(backend.status),
    summary: backend.summary,
    description: backend.description,
    coordinator: backend.coordinator,
    contactPhone: backend.contactPhone,
    location: backend.location,
    availability: backend.availability,
    fee: backend.fee,
    requiresBooking: backend.requiresBooking,
    turnaround: backend.turnaround,
    bookingsThisMonth: backend.bookingsThisMonth,
    totalBookings: backend.totalBookings,
    updatedAt: backend.updatedAt.slice(0, 10),
  };
}

/* -------------------------------------------------------------------------- *
 * API functions
 * -------------------------------------------------------------------------- */

/**
 * Fetch paginated or full service list from `/api/v1/services`.
 */
export async function fetchServices(
  query: ServiceQuery = {}
): Promise<{ rows: Service[]; total: number; page: number; pageSize: number; pageCount: number }> {
  const params: Record<string, string | number | boolean | undefined> = {
    ...query,
    category: query.category && query.category !== "all" ? toBackendCategory(query.category) : undefined,
    status: query.status && query.status !== "all" ? toBackendStatus(query.status) : undefined,
  };

  const result = await apiGetRaw<PaginatedServicesResponse | BackendService[]>("/services", params);

  if (Array.isArray(result)) {
    const rows = result.map(toFrontendService);
    return { rows, total: rows.length, page: 1, pageSize: rows.length, pageCount: 1 };
  }

  return {
    rows: (result.rows || []).map(toFrontendService),
    total: result.total || 0,
    page: result.page || 1,
    pageSize: result.pageSize || 10,
    pageCount: result.pageCount || 1,
  };
}

/**
 * Fetch service statistics from `/api/v1/services/stats`.
 */
export async function fetchServiceStats(): Promise<BackendServiceStats> {
  return apiGetRaw<BackendServiceStats>("/services/stats");
}

/**
 * Fetch a single service by ID or slug.
 */
export async function fetchService(idOrSlug: string): Promise<Service> {
  const result = await apiGetRaw<BackendService>(`/services/${encodeURIComponent(idOrSlug)}`);
  return toFrontendService(result);
}

/**
 * Create a new service.
 */
export async function createService(input: CreateServiceInput): Promise<Service> {
  const payload = {
    ...input,
    category: toBackendCategory(input.category),
    ...(input.status && { status: toBackendStatus(input.status) }),
  };
  const result = await apiPostRaw<BackendService>("/services", payload);
  return toFrontendService(result);
}

/**
 * Update an existing service.
 */
export async function updateService(id: string, input: UpdateServiceInput): Promise<Service> {
  const payload = {
    ...input,
    ...(input.category && { category: toBackendCategory(input.category) }),
    ...(input.status && { status: toBackendStatus(input.status) }),
  };
  const result = await apiPatchRaw<BackendService>(`/services/${encodeURIComponent(id)}`, payload);
  return toFrontendService(result);
}

/**
 * Soft-delete (deactivate) a service.
 */
export async function deleteService(id: string): Promise<Service> {
  const result = await apiDeleteRaw<BackendService>(`/services/${encodeURIComponent(id)}`);
  return toFrontendService(result);
}

/**
 * Fetch recent bookings for a specific service (used in detail drawer).
 */
export async function fetchBookingsByService(serviceId: string): Promise<BackendBooking[]> {
  const { apiGetRaw: _apiGetRaw } = await import("./apiClient");
  const result = await apiGetRaw<{ rows: BackendBooking[] } | BackendBooking[]>(
    "/bookings",
    { serviceId, pageSize: 10, all: "false" }
  );
  if (Array.isArray(result)) return result;
  return (result as { rows: BackendBooking[] }).rows ?? [];
}
