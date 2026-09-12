"use client";

import { useEffect, useState } from "react";
import {
  fetchPublicMosque,
  fetchPublicServices,
  fetchPublicUpcomingEvents,
  fetchPublicCommunityStats,
  DEFAULT_PUBLIC_MOSQUE_SLUG,
  type PublicMosqueInfo,
  type PublicService,
  type PublicEvent,
  type PublicCommunityStats,
} from "@/services/publicHomeService";
import { useMosqueBranding } from "@/components/mosque-branding-provider";

export type HomeData = {
  mosque: PublicMosqueInfo | null;
  services: PublicService[];
  events: PublicEvent[];
  stats: PublicCommunityStats | null;
};

export type LoadingState = {
  mosque: boolean;
  services: boolean;
  events: boolean;
  stats: boolean;
};

export function usePublicHomeData(customSlug?: string) {
  const { activeSlug } = useMosqueBranding();
  const mosqueSlug = customSlug || activeSlug || DEFAULT_PUBLIC_MOSQUE_SLUG;
  const [data, setData] = useState<HomeData>({
    mosque: null,
    services: [],
    events: [],
    stats: null,
  });
  const [loading, setLoading] = useState<LoadingState>({
    mosque: true,
    services: true,
    events: true,
    stats: true,
  });

  useEffect(() => {
    let mounted = true;

    async function load() {
      const [mosque, services, events, stats] = await Promise.allSettled([
        fetchPublicMosque(mosqueSlug),
        fetchPublicServices(mosqueSlug, 4),
        fetchPublicUpcomingEvents(mosqueSlug, 3),
        fetchPublicCommunityStats(mosqueSlug),
      ]);

      if (!mounted) return;

      setData({
        mosque: mosque.status === "fulfilled" ? mosque.value : null,
        services: services.status === "fulfilled" ? services.value : [],
        events: events.status === "fulfilled" ? events.value : [],
        stats: stats.status === "fulfilled" ? stats.value : null,
      });
      setLoading({
        mosque: false,
        services: false,
        events: false,
        stats: false,
      });
    }

    load();
    return () => {
      mounted = false;
    };
  }, [mosqueSlug]);

  return { data, loading };
}
