import { apiGetRaw, apiPostRaw, apiPatchRaw, apiDeleteRaw } from '@/services/apiClient';
import type { Registration, RegistrationStatus } from '@/lib/mosque/types';

export type BackendRegistration = {
  id: string;
  participantName: string;
  participantEmail?: string;
  participantPhone?: string;
  eventId: string;
  eventTitle: string;
  eventDate: string; // ISO date string
  registeredAt: string; // ISO datetime
  guests: number;
  status: string;
  memberId?: string;
  specialRequirements?: string;
};

export type RegistrationsResponse = {
  rows: BackendRegistration[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type RegistrationsQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  event?: string;
  status?: string;
  from?: string;
  to?: string;
  all?: boolean;
};

/** Convert backend DTO to frontend Registration type */
export function toFrontendRegistration(backend: BackendRegistration): Registration {
  return {
    id: backend.id,
    participantName: backend.participantName,
    participantEmail: backend.participantEmail ?? undefined,
    participantPhone: backend.participantPhone ?? undefined,
    eventId: backend.eventId,
    eventTitle: backend.eventTitle,
    eventDate: backend.eventDate,
    registeredAt: backend.registeredAt,
    guests: backend.guests,
    status: backend.status as RegistrationStatus,
    memberId: backend.memberId ?? undefined,
    specialRequirements: backend.specialRequirements ?? undefined,
  };
}

export async function fetchRegistrations(query: RegistrationsQuery = {}): Promise<{ rows: Registration[]; total: number }> {
  const params: Record<string, string | number | boolean | undefined> = { ...query };
  const result = await apiGetRaw<RegistrationsResponse | BackendRegistration[]>(`/registrations`, params);
  if (Array.isArray(result)) {
    const rows = result.map(toFrontendRegistration);
    return { rows, total: rows.length };
  }
  const rows = (result.rows || []).map(toFrontendRegistration);
  return { rows, total: result.total };
}

export async function createRegistration(input: Partial<Registration>): Promise<Registration> {
  const result = await apiPostRaw<BackendRegistration>(`/registrations`, input);
  return toFrontendRegistration(result);
}

export async function updateRegistration(id: string, input: Partial<Registration>): Promise<Registration> {
  const result = await apiPatchRaw<BackendRegistration>(`/registrations/${encodeURIComponent(id)}`, input);
  return toFrontendRegistration(result);
}

export async function deleteRegistration(id: string): Promise<void> {
  await apiDeleteRaw<void>(`/registrations/${encodeURIComponent(id)}`);
}

