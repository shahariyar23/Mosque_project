"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMosqueBranding } from "@/components/mosque-branding-provider";
import { fetchActivePublicMosques, type PublicMosqueListItem } from "@/services/publicHomeService";

export function PublicMosqueSelector() {
  const router = useRouter();
  const { activeSlug, setActiveSlug, branding } = useMosqueBranding();
  const [mosques, setMosques] = useState<PublicMosqueListItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchActivePublicMosques()
      .then((data) => {
        if (mounted) setMosques(data);
      })
      .catch((err) => {
        console.error("Failed to load public mosques list:", err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Only render selector if there are multiple mosques on the platform
  if (mosques.length <= 1) {
    return null;
  }

  const currentMosque = mosques.find((m) => m.slug === activeSlug);

  const handleSelect = (slug: string) => {
    setActiveSlug(slug);
    setOpen(false);
    // If on a specific mosque route, update URL; otherwise reload
    if (window.location.pathname.startsWith("/mosques/")) {
      router.push(`/mosques/${slug}`);
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded bg-black/25 px-2 py-0.5 text-[11px] font-medium text-white/90 transition hover:bg-black/40 hover:text-white focus:outline-none"
        title="Select Mosque"
      >
        <span className="text-[var(--gold)]">🕌</span>
        <span className="max-w-[120px] truncate sm:max-w-[180px]">
          {currentMosque ? currentMosque.name : branding.name || "Select Mosque"}
        </span>
        <span className="text-[9px] opacity-70">▼</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-60 rounded-md border border-[#c79a45]/40 bg-[#0b2820] py-1 text-white shadow-xl backdrop-blur">
            <div className="border-b border-[#c79a45]/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--gold)]">
              Select Mosque
            </div>
            <div className="max-h-52 overflow-y-auto py-1">
              {mosques.map((m) => {
                const isSelected = m.slug === activeSlug;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelect(m.slug)}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition ${
                      isSelected
                        ? "bg-[#c79a45]/20 font-semibold text-[var(--gold)]"
                        : "text-white/85 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="truncate font-medium">{m.name}</p>
                      <p className="text-[10px] text-white/55">
                        {m.code ? `${m.code} · ` : ""}
                        {m.city || "Dhaka"}
                      </p>
                    </div>
                    {isSelected && <span className="text-xs text-[var(--gold)]">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

