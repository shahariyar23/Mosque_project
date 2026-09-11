"use client";

import { useEffect, useState } from "react";
import {
  fetchPublicMosque,
  fetchPublicFacilities,
  fetchPublicLeadership,
  fetchPublicMilestones,
  fetchPublicValues,
  fetchPublicGallery,
  fetchPublicServices,
  fetchPublicCommunityStats,
  DEFAULT_PUBLIC_MOSQUE_SLUG,
  type PublicMosqueInfo,
  type PublicFacility,
  type PublicLeadership,
  type PublicMilestone,
  type PublicValue,
  type PublicGalleryItem,
  type PublicService,
  type PublicCommunityStats,
} from "@/services/publicHomeService";

export type AboutData = {
  mosque: PublicMosqueInfo | null;
  facilities: PublicFacility[];
  leadership: PublicLeadership[];
  milestones: PublicMilestone[];
  values: PublicValue[];
  gallery: PublicGalleryItem[];
  services: PublicService[];
  stats: PublicCommunityStats | null;
};

export function usePublicAboutData(mosqueSlug: string = DEFAULT_PUBLIC_MOSQUE_SLUG) {
  const [data, setData] = useState<AboutData>({
    mosque: null,
    facilities: [],
    leadership: [],
    milestones: [],
    values: [],
    gallery: [],
    services: [],
    stats: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [
          mosque,
          facilities,
          leadership,
          milestones,
          values,
          gallery,
          services,
          stats,
        ] = await Promise.allSettled([
          fetchPublicMosque(mosqueSlug),
          fetchPublicFacilities(mosqueSlug),
          fetchPublicLeadership(mosqueSlug),
          fetchPublicMilestones(mosqueSlug),
          fetchPublicValues(mosqueSlug),
          fetchPublicGallery(mosqueSlug),
          fetchPublicServices(mosqueSlug, 8),
          fetchPublicCommunityStats(mosqueSlug),
        ]);

        if (!mounted) return;

        setData({
          mosque: mosque.status === "fulfilled" ? mosque.value : null,
          facilities: facilities.status === "fulfilled" ? facilities.value : [],
          leadership: leadership.status === "fulfilled" ? leadership.value : [],
          milestones: milestones.status === "fulfilled" ? milestones.value : [],
          values: values.status === "fulfilled" ? values.value : [],
          gallery: gallery.status === "fulfilled" ? gallery.value : [],
          services: services.status === "fulfilled" ? services.value : [],
          stats: stats.status === "fulfilled" ? stats.value : null,
        });
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [mosqueSlug]);

  return { data, loading };
}

