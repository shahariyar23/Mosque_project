"use client";

import { useEffect, useState } from "react";
import { InnerPage } from "@/components/inner-page";
import { useMosqueBranding } from "@/components/mosque-branding-provider";
import {
  DEFAULT_PUBLIC_MOSQUE_SLUG,
  fetchPublicGallery,
  type PublicGalleryItem,
} from "@/services/publicHomeService";

export default function Gallery() {
  const { activeSlug } = useMosqueBranding();
  const [items, setItems] = useState<PublicGalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    fetchPublicGallery(activeSlug || DEFAULT_PUBLIC_MOSQUE_SLUG)
      .then((result) => {
        if (mounted) setItems(result);
      })
      .catch(() => {
        if (mounted) setItems([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [activeSlug]);

  return (
    <InnerPage eyebrow="OUR COMMUNITY" title="Moments at the mosque.">
      {loading ? (
        <div className="py-16 text-center text-sm text-[#69726d]">Loading gallery...</div>
      ) : items.length === 0 ? (
        <div className="border border-dashed border-[#deded5] px-6 py-16 text-center text-sm text-[#69726d]">
          This mosque has not published any gallery photos yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {items.map((item, index) => (
            <figure
              className={`relative min-h-48 overflow-hidden bg-[#073a2d] ${index === 0 ? "md:col-span-2 md:row-span-2" : ""}`}
              key={item.id}
            >
              <img
                src={item.imageUrl}
                alt={item.altText || item.title || "Mosque community gallery"}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-linear-to-t from-[#073a2d]/80 to-transparent" />
              <figcaption className="absolute bottom-3 left-3 text-xs font-semibold text-white">
                {item.title || item.category}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </InnerPage>
  );
}
