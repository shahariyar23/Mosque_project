"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { siteConfig } from "@/config/site";
import {
  fetchPublicMosque,
  DEFAULT_PUBLIC_MOSQUE_SLUG,
} from "@/services/publicHomeService";
import { fetchMosque } from "@/services/mosqueService";
import { useAuth } from "@/components/auth-provider";

export type MosqueBranding = {
  name: string;
  shortName: string;
  description: string | null;
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  establishedYear: number | null;
  isLoading: boolean;
};

type MosqueBrandingContextValue = {
  branding: MosqueBranding;
  activeSlug: string;
  setActiveSlug: (slug: string) => void;
  updateBranding: (partial: Partial<MosqueBranding>) => void;
  refreshBranding: () => Promise<void>;
};

const STORAGE_KEY = "mosque_branding_v1";
const PUBLIC_SLUG_STORAGE_KEY = "noor_public_mosque_slug";
const EVENT_KEY = "mosque-branding-updated";
const SLUG_EVENT_KEY = "noor:public_mosque_changed";

const defaultBranding: MosqueBranding = {
  name: siteConfig.name,
  shortName: siteConfig.name.toUpperCase(),
  description: null,
  logoUrl: null,
  phone: null,
  email: siteConfig.email,
  establishedYear: 1987,
  isLoading: true,
};

function getStoredBranding(): Partial<MosqueBranding> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Ignore JSON errors or quota issues
  }
  return null;
}

function persistBranding(data: MosqueBranding) {
  if (typeof window === "undefined") return;
  try {
    const payload = {
      name: data.name,
      shortName: data.shortName,
      description: data.description,
      logoUrl: data.logoUrl,
      phone: data.phone,
      email: data.email,
      establishedYear: data.establishedYear,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage issues
  }
}

const MosqueBrandingContext = createContext<MosqueBrandingContextValue>({
  branding: defaultBranding,
  activeSlug: DEFAULT_PUBLIC_MOSQUE_SLUG,
  setActiveSlug: () => {},
  updateBranding: () => {},
  refreshBranding: async () => {},
});

export function MosqueBrandingProvider({ children }: { children: ReactNode }) {
  // Always initialize with defaultBranding so server-rendered HTML and client initial hydration match exactly
  const [branding, setBranding] = useState<MosqueBranding>(defaultBranding);
  const [activeSlug, setActiveSlugState] = useState<string>(DEFAULT_PUBLIC_MOSQUE_SLUG);
  const { session } = useAuth();

  // Hydrate stored branding and active slug from localStorage only after initial client mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedSlug = localStorage.getItem(PUBLIC_SLUG_STORAGE_KEY);
        if (storedSlug) {
          setActiveSlugState(storedSlug);
        }
      } catch {}
    }
    const stored = getStoredBranding();
    if (stored) {
      setBranding((prev) => ({
        ...prev,
        ...stored,
        isLoading: false,
      }));
    }
  }, []);

  const setActiveSlug = useCallback((slug: string) => {
    setActiveSlugState(slug);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(PUBLIC_SLUG_STORAGE_KEY, slug);
        window.dispatchEvent(new CustomEvent(SLUG_EVENT_KEY, { detail: slug }));
      } catch {}
    }
  }, []);

  const updateBranding = useCallback(
    (partial: Partial<MosqueBranding>) => {
      setBranding((prev) => {
        const shortName =
          partial.shortName ??
          (partial.name ? (partial.name.split(" ")[0] || prev.shortName).toUpperCase() : prev.shortName);

        const updated: MosqueBranding = {
          ...prev,
          ...partial,
          shortName,
          isLoading: false,
        };
        persistBranding(updated);

        // Notify other components & tabs immediately
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent(EVENT_KEY, {
              detail: updated,
            }),
          );
        }

        return updated;
      });
    },
    [],
  );

  const refreshBranding = useCallback(async () => {
    try {
      // 1. If signed in, try authenticated /mosque endpoint first
      if (session?.user?.mosqueId) {
        try {
          const authMosque = await fetchMosque();
          if (authMosque) {
            updateBranding({
              name: authMosque.name || siteConfig.name,
              shortName: (authMosque.name ? authMosque.name.split(" ")[0] : siteConfig.name).toUpperCase(),
              description: authMosque.description,
              logoUrl: authMosque.logoUrl,
              phone: authMosque.phone,
              email: authMosque.email,
              establishedYear: authMosque.establishedYear,
            });
            return;
          }
        } catch {
          // Fall through to public endpoint if auth fetch fails or unauthorized
        }
      }

      // 2. Fallback to public tenant endpoint for current activeSlug
      const pubMosque = await fetchPublicMosque(activeSlug);
      if (pubMosque) {
        updateBranding({
          name: pubMosque.name || siteConfig.name,
          shortName: (pubMosque.name ? pubMosque.name.split(" ")[0] : siteConfig.name).toUpperCase(),
          description: pubMosque.description,
          logoUrl: pubMosque.logoUrl,
          phone: pubMosque.phone,
          email: pubMosque.email,
          establishedYear: pubMosque.establishedYear,
        });
      }
    } catch {
      // Keep existing branding on network failure
    } finally {
      setBranding((prev) => ({ ...prev, isLoading: false }));
    }
  }, [activeSlug, session?.user?.mosqueId, updateBranding]);

  // Refresh branding when activeSlug or session changes
  useEffect(() => {
    void refreshBranding();
  }, [refreshBranding]);

  // Listen to custom window events for immediate same-window updates
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleCustomEvent = (e: Event) => {
      const custom = e as CustomEvent<MosqueBranding>;
      if (custom.detail) {
        setBranding(custom.detail);
      }
    };

    const handleSlugEvent = (e: Event) => {
      const custom = e as CustomEvent<string>;
      if (custom.detail) {
        setActiveSlugState(custom.detail);
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setBranding((prev) => ({
            ...prev,
            ...parsed,
            isLoading: false,
          }));
        } catch {
          // Ignore parse errors
        }
      }
      if (e.key === PUBLIC_SLUG_STORAGE_KEY && e.newValue) {
        setActiveSlugState(e.newValue);
      }
    };

    window.addEventListener(EVENT_KEY, handleCustomEvent);
    window.addEventListener(SLUG_EVENT_KEY, handleSlugEvent);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(EVENT_KEY, handleCustomEvent);
      window.removeEventListener(SLUG_EVENT_KEY, handleSlugEvent);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return (
    <MosqueBrandingContext.Provider
      value={{ branding, activeSlug, setActiveSlug, updateBranding, refreshBranding }}
    >
      {children}
    </MosqueBrandingContext.Provider>
  );
}

export function useMosqueBranding() {
  const context = useContext(MosqueBrandingContext);
  if (!context) {
    throw new Error("useMosqueBranding must be used within a MosqueBrandingProvider");
  }
  return context;
}

