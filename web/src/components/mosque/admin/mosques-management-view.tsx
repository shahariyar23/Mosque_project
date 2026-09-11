"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/finance/ui/badge";
import { Button } from "@/components/finance/ui/button";
import { ConfirmDialog } from "@/components/finance/ui/dialogs";
import { Field, TextField } from "@/components/finance/ui/form-field";
import { Icon } from "@/components/finance/ui/icon";
import { Modal } from "@/components/finance/ui/modal";
import { Panel, PanelBody, PanelHeader } from "@/components/finance/ui/panel";
import { InlineNotice } from "@/components/finance/ui/states";
import { DetailDrawer, DetailField, DetailGrid, DetailSection } from "@/components/ui/detail-drawer";
import { StatGrid } from "@/components/ui/stat-card";
import {
  fetchAdminMosques,
  fetchAdminMosque,
  createAdminMosque,
  setAdminMosqueStatus,
  addAdminMosqueStaff,
  type AdminMosqueSummary,
  type AdminMosqueDetail,
  type CreateMosqueInput,
  type MosqueStatus,
} from "@/services/adminMosqueService";
import { getActiveMosqueId, setActiveMosqueId, subscribeTenantChange } from "@/services/tenantStore";
import type { StatMetric } from "@/lib/mosque/types";

export function MosquesManagementView() {
  const router = useRouter();
  const [mosques, setMosques] = useState<AdminMosqueSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active context state
  const [activeMosqueId, setLocalActiveMosqueId] = useState<string | null>(null);

  // Filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");

  // Add Mosque Modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateMosqueInput>({
    name: "",
    slug: "",
    code: "",
    city: "Dhaka",
    country: "Bangladesh",
    timezone: "Asia/Dhaka",
    address: "",
    adminFullName: "",
    adminEmail: "",
    adminPassword: "",
    adminPhone: "",
  });

  // Detail Drawer state
  const [selectedMosqueId, setSelectedMosqueId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<AdminMosqueDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Status Change Dialog state
  const [statusDialogMosque, setStatusDialogMosque] = useState<AdminMosqueSummary | null>(null);
  const [targetStatus, setTargetStatus] = useState<MosqueStatus>("active");
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  // Load active context from store
  useEffect(() => {
    setLocalActiveMosqueId(getActiveMosqueId());
    return subscribeTenantChange((id) => setLocalActiveMosqueId(id));
  }, []);

  // Fetch all mosques
  const loadMosques = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAdminMosques();
      setMosques(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load platform mosques.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMosques();
  }, []);

  // Fetch mosque detail when selected
  useEffect(() => {
    if (!selectedMosqueId) {
      setSelectedDetail(null);
      return;
    }
    let isMounted = true;
    setDetailLoading(true);
    fetchAdminMosque(selectedMosqueId)
      .then((detail) => {
        if (isMounted) setSelectedDetail(detail);
      })
      .catch((err) => {
        console.error("Failed to load mosque detail:", err);
      })
      .finally(() => {
        if (isMounted) setDetailLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [selectedMosqueId]);

  // Filtered Mosques
  const filteredMosques = useMemo(() => {
    return mosques.filter((m) => {
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        (m.code && m.code.toLowerCase().includes(q)) ||
        m.slug.toLowerCase().includes(q) ||
        (m.city && m.city.toLowerCase().includes(q))
      );
    });
  }, [mosques, statusFilter, search]);

  // Computed Metrics
  const metrics: StatMetric[] = useMemo(() => {
    const total = mosques.length;
    const active = mosques.filter((m) => m.status === "active").length;
    const suspended = mosques.filter((m) => m.status === "suspended").length;
    const totalAccounts = mosques.reduce(
      (acc, m) => acc + (m.stats?.usersCount ?? m.userCount ?? 0),
      0,
    );

    return [
      {
        id: "total-mosques",
        label: "Total Registered Mosques",
        value: total.toString(),
        hint: "Multi-tenant instances managed",
        tone: "neutral",
        icon: "mosque",
      },
      {
        id: "active-mosques",
        label: "Active Mosques",
        value: active.toString(),
        hint: "Serving congregations & portals",
        tone: "positive",
        icon: "check-circle",
      },
      {
        id: "suspended-mosques",
        label: "Suspended Mosques",
        value: suspended.toString(),
        hint: "Temporarily blocked from access",
        tone: suspended > 0 ? "warning" : "neutral",
        icon: "alert",
      },
      {
        id: "governed-users",
        label: "Governed Accounts",
        value: totalAccounts.toLocaleString(),
        hint: "Staff, imams & registered members",
        tone: "gold",
        icon: "users",
      },
    ];
  }, [mosques]);

  // Form Slug auto-generator
  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setForm((prev) => ({
      ...prev,
      name,
      slug: prev.slug === "" || prev.slug === form.name.toLowerCase().replace(/[\s_-]+/g, "-") ? slug : prev.slug,
    }));
  };

  // Submit New Mosque
  const handleCreateMosque = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim() || !form.adminEmail.trim() || !form.adminPassword.trim()) {
      setAddError("Please fill in all required fields.");
      return;
    }
    try {
      setSubmitting(true);
      setAddError(null);
      await createAdminMosque(form);
      setAddModalOpen(false);
      setForm({
        name: "",
        slug: "",
        code: "",
        city: "Dhaka",
        country: "Bangladesh",
        timezone: "Asia/Dhaka",
        address: "",
        adminFullName: "",
        adminEmail: "",
        adminPassword: "",
        adminPhone: "",
      });
      await loadMosques();
    } catch (err: any) {
      setAddError(err?.message || "Failed to create mosque. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Switch Active Tenant & Navigate into Mosque Dashboard
  const handleSwitchTenant = (mosqueId: string | null) => {
    setActiveMosqueId(mosqueId);
    setLocalActiveMosqueId(mosqueId);
    if (mosqueId) {
      router.push(`/admin/mosques/${mosqueId}/dashboard`);
    }
  };

  // Toggle Mosque Status
  const handleConfirmStatusChange = async () => {
    if (!statusDialogMosque) return;
    try {
      setStatusSubmitting(true);
      await setAdminMosqueStatus(statusDialogMosque.id, targetStatus);
      setStatusDialogMosque(null);
      await loadMosques();
      if (selectedMosqueId === statusDialogMosque.id) {
        const detail = await fetchAdminMosque(statusDialogMosque.id);
        setSelectedDetail(detail);
      }
    } catch (err: any) {
      alert(err?.message || "Failed to change mosque status.");
    } finally {
      setStatusSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Active Tenant Switcher Notification */}
      {activeMosqueId && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-[#0d4d3b]/20 bg-[#0d4d3b]/5 px-4 py-3 text-sm text-[#0d4d3b]">
          <div className="flex items-center gap-2">
            <Icon name="sparkle" size={16} />
            <span>
              <strong>Active Tenant Context:</strong> Scoped to{" "}
              <strong>{mosques.find((m) => m.id === activeMosqueId)?.name || activeMosqueId}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleSwitchTenant(null)}
            className="rounded bg-[#0d4d3b] px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-[#093529]"
          >
            Reset to Platform Overview
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#17211d] sm:text-3xl">
            Platform Mosques
          </h1>
          <p className="mt-1 text-sm text-[#5c655f]">
            Central governance across all tenant mosques, administrator credentials, and portal statuses.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            onClick={loadMosques}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <Icon name="refresh" size={15} />
            <span>Refresh</span>
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setAddError(null);
              setAddModalOpen(true);
            }}
            className="flex items-center gap-1.5"
          >
            <Icon name="plus" size={15} />
            <span>Register Mosque</span>
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <StatGrid metrics={metrics} />

      {/* Main Table Panel */}
      <Panel>
        <PanelHeader
          title="Registered Mosques"
          description={`${filteredMosques.length} ${filteredMosques.length === 1 ? "mosque" : "mosques"} found`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] sm:min-w-[260px]">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, code or city..."
                  className="w-full rounded-md border border-[#cfd4cd] bg-white py-1.5 pl-8 pr-3 text-xs text-[#17211d] placeholder:text-[#9aa19c] focus:border-[#0d4d3b] focus:outline-none"
                />
                <span className="absolute left-2.5 top-2 text-[#9aa19c]">
                  <Icon name="search" size={13} />
                </span>
              </div>
              <div className="flex rounded-md border border-[#cfd4cd] bg-[#f6f5ee] p-0.5 text-xs font-medium text-[#5c655f]">
                {(["all", "active", "suspended"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setStatusFilter(tab)}
                    className={`rounded px-2.5 py-1 capitalize transition ${
                      statusFilter === tab
                        ? "bg-white font-semibold text-[#0d4d3b] shadow-sm"
                        : "hover:text-[#17211d]"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          }
        />
        <PanelBody className="p-0">
          {error && (
            <div className="p-5">
              <InlineNotice tone="danger">{error}</InlineNotice>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-sm text-[#69726d]">
              <span className="animate-spin text-[#0d4d3b]">
                <Icon name="rotate" size={24} />
              </span>
              <p className="mt-3">Loading platform mosques...</p>
            </div>
          ) : filteredMosques.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-sm text-[#69726d]">
              <Icon name="mosque" size={32} />
              <p className="mt-3 font-semibold text-[#17211d]">No mosques found</p>
              <p className="mt-1 text-xs text-[#8b938d]">
                {search ? "Try adjusting your search criteria" : "Start by registering a new mosque."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#e7e6dc] bg-[#faf9f4] text-[12px] font-semibold uppercase tracking-wider text-[#69726d]">
                    <th className="px-5 py-3">Mosque & Code</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Timezone</th>
                    <th className="px-4 py-3 text-center">Accounts</th>
                    <th className="px-4 py-3 text-center">Events</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e7e6dc]">
                  {filteredMosques.map((m) => {
                    const isSelectedContext = activeMosqueId === m.id;
                    return (
                      <tr
                        key={m.id}
                        className={`transition hover:bg-[#faf9f4] ${
                          isSelectedContext ? "bg-[#0d4d3b]/5" : ""
                        }`}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#0d4d3b]/20 bg-[#0d4d3b]/10 text-[#0d4d3b]">
                              <Icon name="mosque" size={20} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-[#17211d]">{m.name}</span>
                                {m.code && (
                                  <span className="rounded bg-[#eaf2ed] px-1.5 py-0.5 text-[11px] font-bold text-[#0b4634]">
                                    {m.code}
                                  </span>
                                )}
                              </div>
                              <span className="block text-xs text-[#8b938d]">/{m.slug}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-xs text-[#5c655f]">
                          {m.city ? `${m.city}, ${m.country || ""}` : "Not specified"}
                        </td>
                        <td className="px-4 py-4 text-xs font-mono text-[#5c655f]">{m.timezone}</td>
                        <td className="px-4 py-4 text-center text-xs font-semibold tabular-nums text-[#17211d]">
                          {m.stats?.usersCount ?? m.userCount ?? 0}
                          <span className="ml-1 text-[11px] font-normal text-[#8b938d]">
                            ({m.stats?.adminsCount ?? m.adminCount ?? 0} staff)
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center text-xs font-semibold tabular-nums text-[#17211d]">
                          {m.stats?.eventsCount ?? m.eventCount ?? 0}
                        </td>
                        <td className="px-4 py-4">
                          {m.status === "active" ? (
                            <Badge tone="success">Active</Badge>
                          ) : (
                            <Badge tone="danger">Suspended</Badge>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSwitchTenant(m.id)}
                              title="Enter this mosque's dashboard"
                              className="inline-flex items-center gap-1 rounded-md border border-[#0d4d3b] bg-[#0d4d3b] px-2.5 py-1 text-xs font-semibold text-white shadow-2xs hover:bg-[#083528]"
                            >
                              <span>Enter Dashboard</span>
                              <Icon name="arrow-right" size={12} />
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedMosqueId(m.id)}
                              title="View details and staff"
                              className="rounded-md border border-[#cfd4cd] p-1 text-[#5c655f] hover:bg-white hover:text-[#17211d]"
                            >
                              <Icon name="eye" size={15} />
                            </button>

                            {m.status === "active" ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setStatusDialogMosque(m);
                                  setTargetStatus("suspended");
                                }}
                                title="Suspend Mosque"
                                className="rounded-md border border-[#d99b93]/50 p-1 text-[#94291f] hover:bg-[#fbf2f1]"
                              >
                                <Icon name="pause" size={15} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setStatusDialogMosque(m);
                                  setTargetStatus("active");
                                }}
                                title="Reactivate Mosque"
                                className="rounded-md border border-[#a1cca5]/50 p-1 text-[#0b4634] hover:bg-[#eaf2ed]"
                              >
                                <Icon name="check" size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </PanelBody>
      </Panel>

      {/* Add Mosque Modal */}
      <Modal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Register New Mosque"
        description="Provision a completely isolated mosque instance and assign its initial primary administrator."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateMosque} disabled={submitting}>
              {submitting ? "Creating..." : "Create Mosque & Admin"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateMosque} className="space-y-6">
          {addError && <InlineNotice tone="danger">{addError}</InlineNotice>}

          {/* Section 1: Mosque Identity */}
          <div>
            <h3 className="text-sm font-bold text-[#0d4d3b] uppercase tracking-wider">
              1. Mosque Profile & Tenancy
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="Mosque Official Name"
                required
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Dhanmondi Central Masjid"
              />
              <TextField
                label="Mosque Code"
                hint="Unique identifier (e.g. MOS-003)"
                value={form.code || ""}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="MOS-003"
              />
              <TextField
                label="URL Slug"
                required
                hint="Public web identifier (e.g. dhanmondi-central)"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
                placeholder="dhanmondi-central"
              />
              <TextField
                label="Timezone"
                required
                value={form.timezone || "Asia/Dhaka"}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                placeholder="Asia/Dhaka"
              />
              <TextField
                label="City"
                value={form.city || ""}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Dhaka"
              />
              <TextField
                label="Country"
                value={form.country || ""}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                placeholder="Bangladesh"
              />
              <div className="sm:col-span-2">
                <TextField
                  label="Physical Address"
                  value={form.address || ""}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Road 27, Dhanmondi R/A"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-[#e7e6dc]" />

          {/* Section 2: Initial Admin Credentials */}
          <div>
            <h3 className="text-sm font-bold text-[#0d4d3b] uppercase tracking-wider">
              2. Primary Mosque Administrator
            </h3>
            <p className="mt-1 text-xs text-[#69726d]">
              This account will be granted mosque_admin privileges scoped strictly to this mosque.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="Administrator Full Name"
                required
                value={form.adminFullName}
                onChange={(e) => setForm({ ...form, adminFullName: e.target.value })}
                placeholder="e.g. Mawlana Tariq Ahmed"
              />
              <TextField
                label="Admin Phone Number"
                value={form.adminPhone || ""}
                onChange={(e) => setForm({ ...form, adminPhone: e.target.value })}
                placeholder="+8801700000000"
              />
              <TextField
                label="Administrator Login Email"
                required
                type="email"
                value={form.adminEmail}
                onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                placeholder="admin@dhanmondi.example"
              />
              <TextField
                label="Initial Password"
                required
                type="password"
                hint="Minimum 8 characters"
                value={form.adminPassword}
                onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                placeholder="••••••••••••"
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Mosque Detail Drawer */}
      <DetailDrawer
        open={Boolean(selectedMosqueId)}
        onClose={() => setSelectedMosqueId(null)}
        title={selectedDetail?.name || "Mosque Profile"}
        subtitle={selectedDetail?.code ? `Code: ${selectedDetail.code}` : undefined}
        badge={
          selectedDetail ? (
            selectedDetail.status === "active" ? (
              <Badge tone="success">Active</Badge>
            ) : (
              <Badge tone="danger">Suspended</Badge>
            )
          ) : null
        }
        footer={
          selectedDetail ? (
            <div className="flex items-center justify-between w-full">
              <Button
                variant={selectedDetail.status === "active" ? "danger" : "secondary"}
                onClick={() => {
                  setStatusDialogMosque(selectedDetail);
                  setTargetStatus(selectedDetail.status === "active" ? "suspended" : "active");
                }}
              >
                {selectedDetail.status === "active" ? "Suspend Mosque" : "Activate Mosque"}
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  handleSwitchTenant(selectedDetail.id);
                  setSelectedMosqueId(null);
                }}
              >
                Open Mosque Dashboard
              </Button>
            </div>
          ) : null
        }
      >
        {detailLoading || !selectedDetail ? (
          <div className="flex justify-center py-12 text-sm text-[#69726d]">
            <Icon name="rotate" size={20} className="animate-spin text-[#0d4d3b]" />
            <span className="ml-2">Loading mosque details...</span>
          </div>
        ) : (
          <div className="space-y-6">
            <DetailSection title="Mosque Information">
              <DetailGrid>
                <DetailField label="Public URL Slug" value={`/${selectedDetail.slug}`} />
                <DetailField label="Timezone" value={selectedDetail.timezone} />
                <DetailField label="City" value={selectedDetail.city || "—"} />
                <DetailField label="Country" value={selectedDetail.country || "—"} />
                <DetailField label="Capacity" value={selectedDetail.capacity?.toString() || "—"} />
                <DetailField
                  label="Registered On"
                  value={new Date(selectedDetail.createdAt).toLocaleDateString()}
                />
              </DetailGrid>
            </DetailSection>

            <DetailSection title="Tenancy Summary">
              <DetailGrid>
                <DetailField label="Total Accounts" value={selectedDetail.stats.usersCount.toString()} />
                <DetailField label="Staff Admins" value={selectedDetail.stats.adminsCount.toString()} />
                <DetailField label="Public Events" value={selectedDetail.stats.eventsCount.toString()} />
                <DetailField
                  label="Announcements"
                  value={selectedDetail.stats.announcementsCount.toString()}
                />
              </DetailGrid>
            </DetailSection>

            <DetailSection title="Governing Administrators">
              {selectedDetail.administrators?.length === 0 ? (
                <p className="text-xs text-[#8b938d]">No administrators assigned yet.</p>
              ) : (
                <div className="space-y-2">
                  {selectedDetail.administrators.map((admin) => (
                    <div
                      key={admin.id}
                      className="flex items-center justify-between rounded-md border border-[#e7e6dc] p-3 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-[#17211d]">{admin.fullName}</p>
                        <p className="text-[#69726d]">{admin.email}</p>
                      </div>
                      <div className="text-right">
                        <span className="rounded bg-[#eaf2ed] px-2 py-0.5 text-[11px] font-medium text-[#0b4634]">
                          {admin.role}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DetailSection>
          </div>
        )}
      </DetailDrawer>

      {/* Confirmation Dialog for Status Changes */}
      {statusDialogMosque && (
        <ConfirmDialog
          open={Boolean(statusDialogMosque)}
          onClose={() => setStatusDialogMosque(null)}
          onConfirm={handleConfirmStatusChange}
          title={targetStatus === "suspended" ? "Suspend Mosque?" : "Reactivate Mosque?"}
          description={
            targetStatus === "suspended"
              ? `Are you sure you want to suspend "${statusDialogMosque.name}"? Staff logins for this mosque will be rejected, but all existing data, records, and finances will be securely preserved.`
              : `Reactivating "${statusDialogMosque.name}" will restore staff access and public portal endpoints immediately.`
          }
          confirmLabel={targetStatus === "suspended" ? "Suspend Mosque" : "Reactivate"}
          tone={targetStatus === "suspended" ? "danger" : "primary"}
        />
      )}
    </div>
  );
}
