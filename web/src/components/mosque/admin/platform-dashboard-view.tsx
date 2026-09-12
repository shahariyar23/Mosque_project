"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/finance/ui/badge";
import { Button, ButtonLink } from "@/components/finance/ui/button";
import { Icon } from "@/components/finance/ui/icon";
import { Panel, PanelBody, PanelHeader } from "@/components/finance/ui/panel";
import { InlineNotice } from "@/components/finance/ui/states";
import { DonutChart, MiniBarChart, SplitBar } from "@/components/ui/charts";
import { StatGrid } from "@/components/ui/stat-card";
import { formatAmount } from "@/lib/finance/format";
import { formatCount, formatLongDate } from "@/lib/mosque/format";
import type { StatMetric } from "@/lib/mosque/types";
import {
  fetchPlatformOverview,
  type MosqueComparisonRow,
  type PlatformOverviewData,
} from "@/services/adminMosqueService";
import { setActiveMosqueId } from "@/services/tenantStore";

export function PlatformDashboardView() {
  const router = useRouter();
  const [data, setData] = useState<PlatformOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchPlatformOverview();
      setData(res);
    } catch (err: any) {
      setError(err?.message || "Failed to load platform-wide metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEnterMosque = (mosqueId: string) => {
    setActiveMosqueId(mosqueId);
    router.push(`/admin/mosques/${mosqueId}/dashboard`);
  };

  const filteredComparison = useMemo(() => {
    if (!data?.comparison) return [];
    if (!search.trim()) return data.comparison;
    const q = search.toLowerCase();
    return data.comparison.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.code && m.code.toLowerCase().includes(q)) ||
        m.slug.toLowerCase().includes(q) ||
        (m.city && m.city.toLowerCase().includes(q)),
    );
  }, [data, search]);

  const metrics: StatMetric[] = useMemo(() => {
    if (!data) return [];
    const m = data.metrics;
    return [
      {
        id: "total-mosques",
        label: "Platform Mosques",
        value: formatCount(m.totalMosques),
        hint: `${m.activeMosques} active · ${m.suspendedMosques} suspended`,
        tone: "neutral",
        icon: "mosque",
      },
      {
        id: "total-members",
        label: "Governed Accounts",
        value: formatCount(m.totalUsers),
        hint: `${m.totalMembers} members · ${m.totalStaff} staff`,
        tone: "positive",
        icon: "users",
      },
      {
        id: "total-events",
        label: "Platform Events",
        value: formatCount(m.totalEvents),
        hint: "Across all registered mosques",
        tone: "neutral",
        icon: "calendar",
      },
      {
        id: "total-bookings",
        label: "Service Bookings",
        value: formatCount(m.totalBookings),
        hint: "Appointments & facility usage",
        tone: "neutral",
        icon: "clock",
      },
      {
        id: "total-announcements",
        label: "Announcements",
        value: formatCount(m.totalAnnouncements),
        hint: "Published notices & broadcasts",
        tone: "neutral",
        icon: "megaphone",
      },
      {
        id: "total-revenue",
        label: "Platform Collections",
        value: formatAmount(m.totalRevenue),
        hint: "Completed donations & collections",
        tone: "gold",
        icon: "wallet",
      },
    ];
  }, [data]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <div className="h-8 w-64 animate-pulse rounded bg-[#e7e6dc]" />
          <div className="h-4 w-96 animate-pulse rounded bg-[#e7e6dc]" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-28 animate-pulse rounded-xl border border-[#e2e1d6] bg-white p-5" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-xl border border-[#0d4d3b]/20 bg-gradient-to-r from-[#0d4d3b]/10 via-[#0d4d3b]/5 to-transparent p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#0d4d3b] text-white shadow-sm">
              <Icon name="mosque" size={24} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-[#17211d] sm:text-2xl">
                  Super Admin Platform Overview
                </h1>
                <span className="rounded-full bg-[#0d4d3b] px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-white">
                  Global Scope
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[#5c655f] sm:text-sm">
                Centralized telemetry across all tenant mosques, accounts, financial inflows, and public services.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={loadData} disabled={loading} className="flex items-center gap-1.5">
              <Icon name="refresh" size={14} />
              <span>Refresh</span>
            </Button>
            <ButtonLink href="/dashboard/admin/mosques" variant="primary" icon="mosque">
              Mosque Directory
            </ButtonLink>
          </div>
        </div>
      </div>

      {error && <InlineNotice tone="danger">{error}</InlineNotice>}

      {/* Metric Cards */}
      <StatGrid metrics={metrics} />

      {/* Analytics & Charts Section */}
      {data && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* User Distribution Donut */}
          <Panel>
            <PanelHeader
              title="Community Membership by Mosque"
              description="Proportion of registered congregants and members across institutions"
            />
            <PanelBody>
              {data.charts.membersByMosque.length > 0 && data.metrics.totalUsers > 0 ? (
                <DonutChart
                  segments={data.charts.membersByMosque.map((p) => ({
                    label: p.label,
                    value: p.value,
                  }))}
                  centerValue={data.metrics.totalUsers.toString()}
                  centerLabel="Total Accounts"
                />
              ) : (
                <p className="py-8 text-center text-xs text-[#8b938d]">No account distribution data recorded yet.</p>
              )}
            </PanelBody>
          </Panel>

          {/* Revenue Contributions by Mosque */}
          <Panel>
            <PanelHeader
              title="Financial Collections by Mosque"
              description="Aggregate donations and Jumuah box collections by institution"
            />
            <PanelBody>
              {data.charts.revenueByMosque.length > 0 && data.metrics.totalRevenue > 0 ? (
                <div className="space-y-4">
                  <SplitBar
                    label="Revenue Share"
                    segments={data.charts.revenueByMosque.map((p) => ({
                      label: p.label,
                      value: p.value,
                      valueLabel: formatAmount(p.value),
                    }))}
                  />
                  <div className="rounded-lg bg-[#faf9f4] p-3 text-xs text-[#5c655f]">
                    <div className="flex items-center justify-between font-semibold text-[#17211d]">
                      <span>Platform Inflow:</span>
                      <span className="tabular-nums text-[#0d4d3b]">{formatAmount(data.metrics.totalRevenue)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="py-8 text-center text-xs text-[#8b938d]">No financial transactions recorded yet.</p>
              )}
            </PanelBody>
          </Panel>

          {/* Events Activity Bar Chart */}
          <Panel>
            <PanelHeader
              title="Events Hosted by Mosque"
              description="Educational seminars, conferences, and community gatherings"
            />
            <PanelBody>
              {data.charts.eventsByMosque.length > 0 ? (
                <MiniBarChart
                  points={data.charts.eventsByMosque.map((p) => ({
                    label: p.label.split(" ")[0] || p.label,
                    value: p.value,
                  }))}
                  caption="Events registered per institution"
                />
              ) : (
                <p className="py-8 text-center text-xs text-[#8b938d]">No events found.</p>
              )}
            </PanelBody>
          </Panel>

          {/* Bookings Activity Bar Chart */}
          <Panel>
            <PanelHeader
              title="Service Bookings by Mosque"
              description="Hall reservations, consultations, and specialized mosque services"
            />
            <PanelBody>
              {data.charts.bookingsByMosque.length > 0 ? (
                <MiniBarChart
                  points={data.charts.bookingsByMosque.map((p) => ({
                    label: p.label.split(" ")[0] || p.label,
                    value: p.value,
                  }))}
                  caption="Bookings registered per institution"
                />
              ) : (
                <p className="py-8 text-center text-xs text-[#8b938d]">No service bookings found.</p>
              )}
            </PanelBody>
          </Panel>
        </div>
      )}

      {/* Cross-Mosque Comparison Table */}
      <Panel>
        <PanelHeader
          title="Mosque Comparison & Drill-Down"
          description="Select any mosque to enter its dedicated dashboard and manage all tenant records."
          actions={
            <div className="relative min-w-[220px]">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter mosques..."
                className="w-full rounded-md border border-[#cfd4cd] bg-white py-1.5 pl-8 pr-3 text-xs text-[#17211d] placeholder:text-[#9aa19c] focus:border-[#0d4d3b] focus:outline-none"
              />
              <span className="absolute left-2.5 top-2 text-[#9aa19c]">
                <Icon name="search" size={13} />
              </span>
            </div>
          }
        />
        <PanelBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#e7e6dc] bg-[#faf9f4] text-[11.5px] font-semibold uppercase tracking-wider text-[#69726d]">
                  <th className="px-5 py-3">Mosque & Code</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Accounts</th>
                  <th className="px-4 py-3 text-center">Events</th>
                  <th className="px-4 py-3 text-center">Bookings</th>
                  <th className="px-4 py-3 text-center">Announcements</th>
                  <th className="px-4 py-3 text-right">Collections</th>
                  <th className="px-4 py-3">Last Activity</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e7e6dc]">
                {filteredComparison.map((m) => (
                  <tr key={m.id} className="transition hover:bg-[#faf9f4]">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#0d4d3b]/20 bg-[#0d4d3b]/10 text-[#0d4d3b]">
                          <Icon name="mosque" size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#17211d]">{m.name}</span>
                            {m.code && (
                              <span className="rounded bg-[#eaf2ed] px-1.5 py-0.2 text-[10.5px] font-bold text-[#0b4634]">
                                {m.code}
                              </span>
                            )}
                          </div>
                          <span className="block text-xs text-[#8b938d]">
                            {m.city ? `${m.city}, ` : ""}
                            {m.country || "Bangladesh"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {m.status === "active" ? (
                        <Badge tone="success">Active</Badge>
                      ) : (
                        <Badge tone="danger">Suspended</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center text-xs font-semibold tabular-nums text-[#17211d]">
                      {m.stats.usersCount}
                      <span className="ml-1 text-[11px] font-normal text-[#8b938d]">
                        ({m.stats.adminsCount} staff)
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center text-xs font-semibold tabular-nums text-[#17211d]">
                      {m.stats.eventsCount}
                    </td>
                    <td className="px-4 py-3.5 text-center text-xs font-semibold tabular-nums text-[#17211d]">
                      {m.stats.bookingsCount || 0}
                    </td>
                    <td className="px-4 py-3.5 text-center text-xs font-semibold tabular-nums text-[#17211d]">
                      {m.stats.announcementsCount}
                    </td>
                    <td className="px-4 py-3.5 text-right text-xs font-semibold tabular-nums text-[#0d4d3b]">
                      {formatAmount(m.stats.totalRevenue || 0)}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[#69726d]">
                      {m.lastActivity ? formatLongDate(m.lastActivity.split("T")[0]) : "Recent"}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleEnterMosque(m.id)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-[#0d4d3b] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#083528] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
                      >
                        <span>Enter Dashboard</span>
                        <Icon name="arrow-right" size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PanelBody>
      </Panel>
    </div>
  );
}
