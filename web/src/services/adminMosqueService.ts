"use client";

import { apiGet, apiPatch, apiPost } from "./apiClient";

export type MosqueStatus = "active" | "suspended" | "inactive";

export interface MosqueStats {
  usersCount: number;
  adminsCount: number;
  eventsCount: number;
  announcementsCount: number;
  bookingsCount?: number;
  totalRevenue?: number;
}

export interface PlatformMetrics {
  totalMosques: number;
  activeMosques: number;
  suspendedMosques: number;
  totalUsers: number;
  totalMembers: number;
  totalStaff: number;
  totalEvents: number;
  totalBookings: number;
  totalAnnouncements: number;
  totalRevenue: number;
}

export interface PlatformChartPoint {
  label: string;
  value: number;
}

export interface PlatformCharts {
  mosqueStatus: PlatformChartPoint[];
  membersByMosque: PlatformChartPoint[];
  eventsByMosque: PlatformChartPoint[];
  bookingsByMosque: PlatformChartPoint[];
  revenueByMosque: PlatformChartPoint[];
}

export interface MosqueComparisonRow {
  id: string;
  name: string;
  code: string | null;
  slug: string;
  city: string | null;
  country: string | null;
  status: MosqueStatus;
  createdAt: string;
  stats: MosqueStats;
  lastActivity: string | null;
}

export interface PlatformOverviewData {
  metrics: PlatformMetrics;
  charts: PlatformCharts;
  comparison: MosqueComparisonRow[];
}

export interface AdminMosqueSummary {
  id: string;
  name: string;
  code: string | null;
  slug: string;
  city: string | null;
  country: string | null;
  timezone: string;
  status: MosqueStatus;
  isActive: boolean;
  createdAt: string;
  userCount?: number;
  adminCount?: number;
  eventCount?: number;
  announcementCount?: number;
  stats: MosqueStats;
}

export interface MosqueAdminUser {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface AdminMosqueDetail extends AdminMosqueSummary {
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  postalCode: string | null;
  state: string | null;
  capacity: number | null;
  latitude: number | null;
  longitude: number | null;
  administrators: MosqueAdminUser[];
}

export interface CreateMosqueInput {
  name: string;
  slug: string;
  code?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  timezone?: string;
  capacity?: number;
  adminFullName: string;
  adminEmail: string;
  adminPassword: string;
  adminPhone?: string;
}

export interface UpdateMosqueInput {
  name?: string;
  slug?: string;
  code?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  timezone?: string;
  capacity?: number;
}

export interface AddMosqueAdminInput {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
}

/**
 * Super Admin API client for Platform Mosque Management & Global Overview.
 * Requires platform.manage or mosque.create permissions.
 */
export async function fetchPlatformOverview(): Promise<PlatformOverviewData> {
  return apiGet<PlatformOverviewData>("/admin/mosques/platform/overview");
}

export async function fetchAdminMosques(): Promise<AdminMosqueSummary[]> {
  const data = await apiGet<AdminMosqueSummary[]>("/admin/mosques");
  return data.map((m) => ({
    ...m,
    stats: m.stats || {
      usersCount: m.userCount ?? 0,
      adminsCount: m.adminCount ?? 0,
      eventsCount: m.eventCount ?? 0,
      announcementsCount: m.announcementCount ?? 0,
      bookingsCount: 0,
      totalRevenue: 0,
    },
  }));
}

export async function fetchAdminMosque(id: string): Promise<AdminMosqueDetail> {
  const data = await apiGet<AdminMosqueDetail>(`/admin/mosques/${id}`);
  return {
    ...data,
    stats: data.stats || {
      usersCount: data.userCount ?? 0,
      adminsCount: data.adminCount ?? 0,
      eventsCount: data.eventCount ?? 0,
      announcementsCount: data.announcementCount ?? 0,
      bookingsCount: 0,
      totalRevenue: 0,
    },
  };
}

export async function createAdminMosque(input: CreateMosqueInput): Promise<AdminMosqueDetail> {
  return apiPost<AdminMosqueDetail>("/admin/mosques", input);
}

export async function updateAdminMosque(id: string, input: UpdateMosqueInput): Promise<AdminMosqueDetail> {
  return apiPatch<AdminMosqueDetail>(`/admin/mosques/${id}`, input);
}

export async function setAdminMosqueStatus(
  id: string,
  status: MosqueStatus,
): Promise<{ id: string; status: MosqueStatus; isActive: boolean }> {
  return apiPatch<{ id: string; status: MosqueStatus; isActive: boolean }>(`/admin/mosques/${id}/status`, {
    status,
  });
}

export async function addAdminMosqueStaff(
  id: string,
  input: AddMosqueAdminInput,
): Promise<MosqueAdminUser> {
  return apiPost<MosqueAdminUser>(`/admin/mosques/${id}/admins`, input);
}

