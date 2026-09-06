/**
 * Public Home Page API.
 *
 * Read-only, unauthenticated, slug-scoped endpoints for the public home page. The backend projects
 * every response through its public DTOs, so the home page never receives an admin field, donor
 * detail, or internal identifier. The slug is the only tenant key: a visitor can only read what the
 * one mosque whose slug they requested chose to publish.
 */

import { apiGet } from "./apiClient";

/** The primary website tenant. Must match the backend seed's mosque slug. */
export const DEFAULT_PUBLIC_MOSQUE_SLUG = "noor-jame-masjid";

export type PublicMosqueInfo = {
  slug: string;
  name: string;
  description: string | null;
  addressLine: string | null;
  city: string | null;
  district: string | null;
  country: string | null;
  establishedYear: number | null;
  logoUrl: string | null;
};

export type PublicPrayerTiming = {
  calculated: string;
  adjustment: number;
  time: string;
};

export type PublicPrayerTimes = {
  date: string;
  hijri: { date: string | null } | null;
  timezone: string;
  coordinates: { latitude: number; longitude: number };
  timings: Partial<Record<string, PublicPrayerTiming>>;
  source: "aladhan";
  adjusted: boolean;
};

export type PublicJumuahEntry = {
  date: string | null;
  khutbahTime: string;
  prayerTime: string;
  imam: string | null;
  location: string | null;
  notes: string | null;
};

export type PublicService = {
  slug: string;
  name: string;
  category: string;
  status: string;
  summary: string;
  description: string | null;
  coordinator: string;
  availability: string;
  location: string;
};

export type PublicEvent = {
  slug: string;
  title: string;
  category: string;
  status: string;
  date: string;
  startTime: string;
  endTime: string | null;
  timeLabel: string | null;
  location: string;
  speaker: string | null;
  description: string | null;
  imageUrl: string | null;
};

export type PublicAnnouncement = {
  title: string;
  summary: string | null;
  content: string;
  category: string;
  author: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
};

export type PublicCommunityStats = {
  activeServices: number;
  upcomingEvents: number;
  publicFunds: number;
  members: number;
};

/**
 * The mosque's public profile, or null when nothing is published.
 */
export async function fetchPublicMosque(
  mosqueSlug: string = DEFAULT_PUBLIC_MOSQUE_SLUG,
): Promise<PublicMosqueInfo | null> {
  return apiGet<PublicMosqueInfo | null>(
    `/public/mosques/${encodeURIComponent(mosqueSlug)}/mosque`,
  );
}

export async function fetchPublicTodayPrayerTimes(
  mosqueSlug: string = DEFAULT_PUBLIC_MOSQUE_SLUG,
): Promise<PublicPrayerTimes | null> {
  return apiGet<PublicPrayerTimes | null>(
    `/public/mosques/${encodeURIComponent(mosqueSlug)}/prayer-times/today`,
  );
}

export async function fetchPublicJumuah(
  mosqueSlug: string = DEFAULT_PUBLIC_MOSQUE_SLUG,
): Promise<PublicJumuahEntry[]> {
  return apiGet<PublicJumuahEntry[]>(
    `/public/mosques/${encodeURIComponent(mosqueSlug)}/jumuah`,
  );
}

export async function fetchPublicServices(
  mosqueSlug: string = DEFAULT_PUBLIC_MOSQUE_SLUG,
  limit = 4,
): Promise<PublicService[]> {
  return apiGet<PublicService[]>(
    `/public/mosques/${encodeURIComponent(mosqueSlug)}/services`,
    { limit },
  );
}

export async function fetchPublicUpcomingEvents(
  mosqueSlug: string = DEFAULT_PUBLIC_MOSQUE_SLUG,
  limit = 3,
): Promise<PublicEvent[]> {
  return apiGet<PublicEvent[]>(
    `/public/mosques/${encodeURIComponent(mosqueSlug)}/events`,
    { limit },
  );
}

export async function fetchPublicCommunityStats(
  mosqueSlug: string = DEFAULT_PUBLIC_MOSQUE_SLUG,
): Promise<PublicCommunityStats | null> {
  return apiGet<PublicCommunityStats | null>(
    `/public/mosques/${encodeURIComponent(mosqueSlug)}/stats`,
  );
}
