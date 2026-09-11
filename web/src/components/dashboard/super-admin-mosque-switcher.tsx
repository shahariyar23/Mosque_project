"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/finance/ui/icon";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import { fetchAdminMosques, type AdminMosqueSummary } from "@/services/adminMosqueService";
import { getActiveMosqueId, setActiveMosqueId, subscribeTenantChange } from "@/services/tenantStore";

export function SuperAdminMosqueSwitcher() {
  const { user } = useDashboardSession();
  const [mosques, setMosques] = useState<AdminMosqueSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const isSuperAdmin =
    user?.role === "super_admin" ||
    (user?.permissions && user.permissions.includes("platform.manage"));

  useEffect(() => {
    setActiveId(getActiveMosqueId());
    return subscribeTenantChange((id) => setActiveId(id));
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) return;
    let mounted = true;
    fetchAdminMosques()
      .then((data) => {
        if (mounted) setMosques(data);
      })
      .catch((err) => {
        console.error("Failed to load mosques in switcher:", err);
      });
    return () => {
      mounted = false;
    };
  }, [isSuperAdmin]);

  if (!isSuperAdmin) {
    return null;
  }

  const selectedMosque = mosques.find((m) => m.id === activeId);

  const handleSelect = (id: string | null) => {
    setActiveMosqueId(id);
    setActiveId(id);
    setOpen(false);
    if (id) {
      window.location.href = `/admin/mosques/${id}/dashboard`;
    } else {
      window.location.href = "/dashboard";
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded-full border border-[#0d4d3b]/30 bg-[#0d4d3b]/10 px-3 py-1.5 text-[12px] font-semibold text-[#0d4d3b] transition hover:bg-[#0d4d3b]/15"
        title="Super Admin Tenant Context Switcher"
      >
        <Icon name="mosque" size={14} className="text-[#0d4d3b]" />
        <span className="max-w-[150px] truncate sm:max-w-[200px]">
          {selectedMosque ? selectedMosque.name : "Platform Overview"}
        </span>
        {selectedMosque?.code && (
          <span className="rounded bg-[#0d4d3b] px-1 py-0.2 text-[10px] text-white">
            {selectedMosque.code}
          </span>
        )}
        <Icon name="chevron-down" size={12} className="opacity-70" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-40 mt-1.5 w-64 rounded-lg border border-[#deddd3] bg-white py-1 shadow-lg">
            <div className="border-b border-[#e7e6dc] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#69726d]">
              Manage Tenant Context
            </div>
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition ${
                activeId === null
                  ? "bg-[#0d4d3b]/10 font-bold text-[#0d4d3b]"
                  : "text-[#17211d] hover:bg-[#faf9f4]"
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon name="grid" size={14} />
                <span>Platform Overview (All)</span>
              </div>
              {activeId === null && <Icon name="check" size={13} />}
            </button>

            <div className="my-1 border-t border-[#e7e6dc]" />

            <div className="max-h-56 overflow-y-auto">
              {mosques.map((m) => {
                const isSelected = activeId === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelect(m.id)}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition ${
                      isSelected
                        ? "bg-[#0d4d3b]/10 font-bold text-[#0d4d3b]"
                        : "text-[#17211d] hover:bg-[#faf9f4]"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="truncate font-medium">{m.name}</p>
                      <p className="text-[10px] text-[#8b938d]">
                        {m.code ? `${m.code} · ` : ""}
                        {m.city || "Dhaka"}
                      </p>
                    </div>
                    {isSelected && <Icon name="check" size={13} className="shrink-0 text-[#0d4d3b]" />}
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

