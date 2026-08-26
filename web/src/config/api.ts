/**
 * Centralized API configuration for the NOOR frontend.
 *
 * Resolves the backend API base URL using:
 * 1. `process.env.NEXT_PUBLIC_API_URL` (configured via .env or build-time environment)
 * 2. Hostname detection in the browser (if running on mostak.tech -> https://api.mostak.tech)
 * 3. Environment fallback (production -> https://api.mostak.tech, development -> http://localhost:4000)
 */

export function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && envUrl.trim() !== "") {
    return envUrl.replace(/\/+$/, "");
  }

  // Browser-level safety net: ensure requests never hit the frontend asset origin
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "mostak.tech" || host.endsWith(".mostak.tech")) {
      return "https://api.mostak.tech";
    }
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:4000";
    }
  }

  if (process.env.NODE_ENV === "production") {
    return "https://api.mostak.tech";
  }

  return "http://localhost:4000";
}

export const API_BASE_URL = getApiBaseUrl();
