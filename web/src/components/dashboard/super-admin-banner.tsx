"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/finance/ui/icon";
import { fetchAdminMosques, type AdminMosqueSummary } from "@/services/adminMosqueService";
import { getActiveMosqueId, setActiveMosqueId, subscribeTenantChange } from "@/services/tenantStore";
import { useDashboardSession } from "@/components/dashboard/session-provider";

export function SuperAdminMosqueBanner() {
  const router = useRouter();
  const { user } = useDashboardSession();
  const [activeMosqueId, setLocalActiveMosqueId] = useState<string | null>(null);
  const [mosques, setMosques] = useState<AdminMosqueSummary[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isSuperAdmin =
    user?.role === "super_admin" ||
    (user?.permissions && user.permissions.includes("platform.manage"));

  useEffect(() => {
    setLocalActiveMosqueId(getActiveMosqueId());
    return subscribeTenantChange((id) => setLocalActiveMosqueId(id));
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) return;
    let mounted = true;
    fetchAdminMosques()
      .then((data) => {
        if (mounted) setMosques(data);
      })
      .catch((err) => {
        console.error("Failed to load mosques in banner:", err);
      });
    return () => {
      mounted = false;
    };
  }, [isSuperAdmin]);

  if (!isSuperAdmin || !activeMosqueId) {
    return null;
  }

  const currentMosque = mosques.find((m) => m.id === activeMosqueId);

  const handleExitScope = () => {
    setActiveMosqueId(null);
    setLocalActiveMosqueId(null);
    router.push("/dashboard");
    window.location.href = "/dashboard";
  };

  const handleSwitchToMosque = (targetId: string) => {
    setActiveMosqueId(targetId);
    setLocalActiveMosqueId(targetId);
    setDropdownOpen(false);
    router.push(`/admin/mosques/${targetId}/dashboard`);
  };

  return (
    <div className="mb-5 rounded-xl border border-[#0d4d3b]/30 bg-gradient-to-r from-[#0d4d3b]/10 via-[#0d4d3b]/5 to-[#f8f6ef] p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#0d4d3b] text-white shadow-xs">
            <Icon name="mosque" size={20} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0d4d3b]">
                Super Admin Tenant Scope:
              </span>
              <span className="text-sm font-bold text-[#17211d]">
                {currentMosque ? currentMosque.name : "Selected Mosque"}
              </span>
              {currentMosque?.code && (
                <span className="rounded bg-[#0d4d3b] px-1.5 py-0.2 text-[10px] font-bold text-white">
                  {currentMosque.code}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-[#5c655f]">
              All dashboard widgets, finances, prayer times, events, and records belong strictly to this mosque.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Mosque Switcher Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#cfd4cd] bg-white px-3 py-1.5 text-xs font-medium text-[#17211d] shadow-2xs hover:bg-[#faf9f4]"
            >
              <span>Switch Mosque</span>
              <Icon name="chevron-down" size={12} />
            </button>
            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 top-full z-40 mt-1 w-56 rounded-lg border border-[#e2e1d6] bg-white py-1 shadow-lg">
                  <div className="border-b border-[#e7e6dc] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8b938d]">
                    Select Mosque Context
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {mosques.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSwitchToMosque(m.id)}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition ${
                          activeMosqueId === m.id
                            ? "bg-[#0d4d3b]/10 font-bold text-[#0d4d3b]"
                            : "text-[#17211d] hover:bg-[#faf9f4]"
                        }`}
                      >
                        <span className="truncate">{m.name}</span>
                        {activeMosqueId === m.id && <Icon name="check" size={13} className="shrink-0 text-[#0d4d3b]" />}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => router.push("/dashboard/admin/mosques")}
            className="rounded-md border border-[#cfd4cd] bg-white px-3 py-1.5 text-xs font-medium text-[#17211d] shadow-2xs hover:bg-[#faf9f4]"
          >
            All Mosques
          </button>

          <button
            type="button"
            onClick={handleExitScope}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#0d4d3b] px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#083528]"
          >
            <Icon name="chevron-left" size={13} />
            <span>Platform Overview</span>
          </button>
        </div>
      </div>
    </div>
  );
}
