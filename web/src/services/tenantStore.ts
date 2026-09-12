"use client";

import { useEffect, useState } from "react";

/**
 * Tenant context store for Super Admin multi-mosque management.
 *
 * Normal mosque staff are locked to their own mosque by the backend JWT session.
 * For Super Admin (holding platform.manage), this store tracks the selected
 * target mosque (or null for platform overview).
 */

const STORAGE_KEY = "noor_active_mosque_id";
const EVENT_NAME = "noor:mosque_changed";

let memoryMosqueId: string | null = null;

export function getActiveMosqueId(): string | null {
  if (typeof window === "undefined") {
    return memoryMosqueId;
  }
  try {
    return localStorage.getItem(STORAGE_KEY) || memoryMosqueId;
  } catch {
    return memoryMosqueId;
  }
}

export function setActiveMosqueId(mosqueId: string | null): void {
  memoryMosqueId = mosqueId;
  if (typeof window !== "undefined") {
    try {
      if (mosqueId) {
        localStorage.setItem(STORAGE_KEY, mosqueId);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: mosqueId }));
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }
}

export function subscribeTenantChange(callback: (mosqueId: string | null) => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    const custom = event as CustomEvent<string | null>;
    callback(custom.detail ?? null);
  };
  window.addEventListener(EVENT_NAME, handler);
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
  };
}

/**
 * A monotonic signal for data hooks. The selected ID is read by apiClient at request time; this signal
 * tells mounted resource hooks that their previous response belongs to a different tenant context.
 */
export function useTenantRevision(): number {
  const [revision, setRevision] = useState(0);

  useEffect(() => subscribeTenantChange(() => setRevision((current) => current + 1)), []);

  return revision;
}

