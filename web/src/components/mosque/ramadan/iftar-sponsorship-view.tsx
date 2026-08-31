"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, IconButton } from "@/components/finance/ui/button";
import { DataTable, type Column } from "@/components/finance/ui/data-table";
import { ConfirmDialog } from "@/components/finance/ui/dialogs";
import { FinanceFilters, type SelectFilter } from "@/components/finance/ui/filters";
import { TextAreaField, TextField } from "@/components/finance/ui/form-field";
import { Modal } from "@/components/finance/ui/modal";
import { Panel, PanelFooter, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { TableSkeleton } from "@/components/finance/ui/skeleton";
import { FinanceEmptyState, FinanceErrorState } from "@/components/finance/ui/states";
import { DetailDrawer, DetailField, DetailGrid, DetailSection } from "@/components/ui/detail-drawer";
import { StatGrid } from "@/components/ui/stat-card";
import { useToast } from "@/components/ui/toast";
import { mosqueSettings } from "@/data/settings";
import { useApiResource } from "@/hooks/use-api";
import {
  formatClockTime,
  formatCount,
  formatLongDate,
  getTodayInTimezone,
} from "@/lib/mosque/format";
import type { StatMetric } from "@/lib/mosque/types";
import { ServiceError } from "@/services/query";
import {
  fetchRamadanSchedules,
  type Ramadan,
} from "@/services/ramadanService";
import {
  createIftarSponsorship,
  deleteIftarSponsorship,
  fetchIftarSponsorships,
  updateIftarSponsorship,
  type CreateIftarSponsorshipInput,
  type IftarSponsorship,
  type IftarSponsorshipStatus,
} from "@/services/iftarSponsorshipService";

const YEAR_FILTER_OPTIONS = [
  { value: "all", label: "All Hijri Years" },
  { value: "1447", label: "1447 AH (2026)" },
  { value: "1446", label: "1446 AH (2025)" },
  { value: "1448", label: "1448 AH (2027)" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "available", label: "Available Only" },
  { value: "confirmed", label: "Confirmed" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function formatCurrency(amount: string | null | undefined) {
  if (!amount) return "—";
  const num = parseFloat(amount);
  if (isNaN(num)) return amount;
  return `৳${num.toLocaleString()}`;
}

function formatErrorMessage(err: unknown): string {
  if (err instanceof ServiceError) {
    if (err.status === 409 || err.code === "CONFLICT") {
      return "This Ramadan day already has an active Iftar sponsor. Update or cancel the existing sponsorship instead.";
    }
    if (err.status === 404 || err.code === "NOT_FOUND") {
      return "The requested mosque member or sponsorship record was not found.";
    }
    if (err.status === 400 || err.code === "BAD_REQUEST") {
      return err.message || "Please check all required form fields and try again.";
    }
    return err.message;
  }
  if (err instanceof Error) {
    if (err.message.includes("409") || err.message.toLowerCase().includes("conflict")) {
      return "This Ramadan day already has an active Iftar sponsor.";
    }
    return err.message;
  }
  return "An unexpected error occurred. Please try again.";
}

export type DaySponsorshipEntry = {
  dayNumber: number;
  date: string;
  year: number;
  schedule?: Ramadan | null;
  sponsorship?: IftarSponsorship | null;
  status: IftarSponsorshipStatus | "available";
  isToday: boolean;
};

export function IftarSponsorshipView() {
  const { notify } = useToast();
  const timeFormat = (mosqueSettings.prayer.timeFormat as "12h" | "24h") || "12h";

  const [selectedYear, setSelectedYear] = useState<string>("1447");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [viewLayout, setViewLayout] = useState<"calendar" | "table">("calendar");

  const queryYear = selectedYear === "all" ? undefined : Number(selectedYear);

  // Fetch Iftar sponsorships
  const sponsorshipQueryParams = useMemo(() => {
    return {
      year: queryYear,
      status: selectedStatus === "all" || selectedStatus === "available" ? undefined : (selectedStatus as IftarSponsorshipStatus),
      search: search.trim() || undefined,
      all: true,
      pageSize: 100,
    };
  }, [queryYear, selectedStatus, search]);

  const {
    data: paginatedData,
    loading: sponsorshipsLoading,
    error: sponsorshipsError,
    refetch: refetchSponsorships,
  } = useApiResource(
    () => fetchIftarSponsorships(sponsorshipQueryParams),
    [queryYear, selectedStatus, search]
  );

  // Fetch Ramadan timetable schedules for day alignment
  const {
    data: rawSchedules = [],
    loading: schedulesLoading,
    error: schedulesError,
    refetch: refetchSchedules,
  } = useApiResource(
    () => fetchRamadanSchedules({ year: queryYear }),
    [queryYear]
  );

  const rawSponsorships = useMemo(() => paginatedData?.rows || [], [paginatedData]);
  const loading = sponsorshipsLoading || schedulesLoading;
  const error = sponsorshipsError || schedulesError;

  const refetchAll = () => {
    refetchSponsorships();
    refetchSchedules();
  };

  // Modals & Drawers state
  const [activeDrawerItem, setActiveDrawerItem] = useState<IftarSponsorship | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<IftarSponsorship | null>(null);
  const [deletingItem, setDeletingItem] = useState<IftarSponsorship | null>(null);
  const [presetDateForCreate, setPresetDateForCreate] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);

  // Today in mosque timezone (Asia/Dhaka)
  const todayMosque = useMemo(() => getTodayInTimezone("Asia/Dhaka"), []);

  // Map of date -> Sponsorship
  const sponsorshipByDate = useMemo(() => {
    const map = new Map<string, IftarSponsorship>();
    for (const item of rawSponsorships) {
      map.set(item.date, item);
    }
    return map;
  }, [rawSponsorships]);

  // Combined Day-Wise Ramadan Calendar List (Days 1..30)
  const dayEntries = useMemo<DaySponsorshipEntry[]>(() => {
    // Sort schedules chronologically
    const sortedSchedules = [...rawSchedules].sort((a, b) => a.date.localeCompare(b.date));

    // If schedules exist, build entries from schedules
    if (sortedSchedules.length > 0) {
      return sortedSchedules.map((schedule, idx) => {
        const sponsorship = sponsorshipByDate.get(schedule.date) || null;
        let status: IftarSponsorshipStatus | "available" = "available";
        if (sponsorship) {
          status = sponsorship.status;
        }

        return {
          dayNumber: idx + 1,
          date: schedule.date,
          year: schedule.year,
          schedule,
          sponsorship,
          status,
          isToday: schedule.date === todayMosque,
        };
      });
    }

    // Fallback if no schedule created yet: list from sponsorships or default 30 days
    if (rawSponsorships.length > 0) {
      const sortedSponsorships = [...rawSponsorships].sort((a, b) => a.date.localeCompare(b.date));
      return sortedSponsorships.map((sponsorship, idx) => ({
        dayNumber: idx + 1,
        date: sponsorship.date,
        year: sponsorship.year,
        schedule: null,
        sponsorship,
        status: sponsorship.status,
        isToday: sponsorship.date === todayMosque,
      }));
    }

    return [];
  }, [rawSchedules, sponsorshipByDate, rawSponsorships, todayMosque]);

  // Filter day entries based on status and search
  const filteredDayEntries = useMemo(() => {
    return dayEntries.filter((entry) => {
      if (selectedStatus === "available" && entry.status !== "available") return false;
      if (
        selectedStatus !== "all" &&
        selectedStatus !== "available" &&
        entry.status !== selectedStatus
      ) {
        return false;
      }

      if (search.trim()) {
        const term = search.toLowerCase();
        const matchesDay = `day ${entry.dayNumber}`.includes(term) || `${entry.dayNumber}` === term;
        const matchesDate = entry.date.includes(term);
        const matchesSponsor =
          entry.sponsorship?.sponsorName.toLowerCase().includes(term) || false;
        const matchesMenu =
          entry.sponsorship?.menuDetails?.toLowerCase().includes(term) || false;
        const matchesNotes =
          entry.sponsorship?.notes?.toLowerCase().includes(term) || false;

        return matchesDay || matchesDate || matchesSponsor || matchesMenu || matchesNotes;
      }

      return true;
    });
  }, [dayEntries, selectedStatus, search]);

  // Compute summary stats
  const stats = useMemo<StatMetric[]>(() => {
    const totalCount = rawSponsorships.length;
    const confirmedCount = rawSponsorships.filter((s) => s.status === "confirmed").length;
    const todaySponsor = rawSponsorships.find((s) => s.date === todayMosque);
    const upcomingSponsor = rawSponsorships.find(
      (s) => s.date >= todayMosque && s.status === "confirmed"
    );

    return [
      {
        id: "total_sponsorships",
        label: "Total Sponsors",
        value: formatCount(totalCount),
        hint: `${confirmedCount} confirmed hosts`,
        icon: "heart",
        tone: "positive",
      },
      {
        id: "today_host",
        label: "Today's Sponsor",
        value: todaySponsor ? todaySponsor.sponsorName : "Available",
        hint: todaySponsor
          ? `${todaySponsor.numberOfServings || 0} meals · ${todaySponsor.status}`
          : "No sponsor assigned today",
        icon: "sparkle",
        tone: todaySponsor ? "positive" : "neutral",
      },
      {
        id: "upcoming_host",
        label: "Next Scheduled Host",
        value: upcomingSponsor ? upcomingSponsor.sponsorName : "None scheduled",
        hint: upcomingSponsor ? formatLongDate(upcomingSponsor.date) : "All upcoming open",
        icon: "calendar",
        tone: "neutral",
      },
      {
        id: "confirmed_days",
        label: "Confirmed Days",
        value: `${confirmedCount} / 30`,
        hint: `${Math.max(0, 30 - confirmedCount)} days open for sponsorship`,
        icon: "check-circle",
        tone: "positive",
      },
    ];
  }, [rawSponsorships, todayMosque]);

  // Handle Form Submit
  const handleFormSubmit = async (formData: CreateIftarSponsorshipInput) => {
    setMutating(true);
    try {
      if (modalMode === "edit" && editingItem) {
        await updateIftarSponsorship(editingItem.id, formData);
        notify({
          message: "Sponsorship updated successfully",
          description: `Updated Iftar sponsorship for ${formData.date}.`,
          tone: "success",
        });
      } else {
        await createIftarSponsorship(formData);
        notify({
          message: "Sponsorship created successfully",
          description: `Added ${formData.sponsorName} for ${formData.date}.`,
          tone: "success",
        });
      }
      setModalMode(null);
      setEditingItem(null);
      setPresetDateForCreate(null);
      refetchAll();
    } catch (err) {
      notify({
        message: "Failed to save sponsorship",
        description: formatErrorMessage(err),
        tone: "danger",
      });
      throw err;
    } finally {
      setMutating(false);
    }
  };

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    setMutating(true);
    try {
      await deleteIftarSponsorship(deletingItem.id);
      notify({
        message: "Sponsorship removed",
        description: `Removed sponsorship for ${deletingItem.date}.`,
        tone: "success",
      });
      setDeletingItem(null);
      if (activeDrawerItem?.id === deletingItem.id) {
        setActiveDrawerItem(null);
      }
      refetchAll();
    } catch (err) {
      notify({
        message: "Failed to remove sponsorship",
        description: formatErrorMessage(err),
        tone: "danger",
      });
    } finally {
      setMutating(false);
    }
  };

  // Open Create for specific Day
  const handleAddSponsorForDate = (dateStr: string) => {
    setPresetDateForCreate(dateStr);
    setEditingItem(null);
    setModalMode("create");
  };

  // Columns definition for Table view
  const columns: Column<IftarSponsorship>[] = [
    {
      key: "date",
      header: "Date / Day",
      cell: (row) => {
        const isToday = row.date === todayMosque;
        return (
          <div>
            <div className="flex items-center gap-2 font-medium text-[#17211d]">
              <span>{formatLongDate(row.date)}</span>
              {isToday && (
                <span className="rounded bg-[#0d4d3b] px-1.5 py-0.5 text-[10px] font-bold text-white">
                  TODAY
                </span>
              )}
            </div>
            <span className="text-xs text-[#8b938d]">{row.date} · {row.year} AH</span>
          </div>
        );
      },
    },
    {
      key: "sponsor",
      header: "Sponsor",
      cell: (row) => (
        <div>
          <div className="font-semibold text-[#17211d]">{row.sponsorName}</div>
          <div className="text-xs text-[#69726d]">
            {row.sponsorPhone || row.sponsorEmail || "No contact info"}
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (row) => (
        <span
          className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${
            row.userId
              ? "bg-[#eaf2ed] text-[#0d4d3b]"
              : "bg-[#faf9f4] text-[#69726d] border border-[#e5e3da]"
          }`}
        >
          {row.userId ? "MEMBER" : "EXTERNAL"}
        </span>
      ),
    },
    {
      key: "servings",
      header: "Servings",
      cell: (row) => (
        <span className="tabular-nums font-medium text-[#17211d]">
          {row.numberOfServings ? `${row.numberOfServings} people` : "—"}
        </span>
      ),
    },
    {
      key: "cost",
      header: "Pledged Amount",
      cell: (row) => (
        <span className="tabular-nums font-semibold text-[#0d4d3b]">
          {formatCurrency(row.estimatedCost)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => {
        const styles: Record<IftarSponsorshipStatus, string> = {
          confirmed: "bg-[#eaf2ed] text-[#0d4d3b] border-[#c2ddcb]",
          pending: "bg-[#fef9ee] text-[#b45309] border-[#fde68a]",
          completed: "bg-[#f2eee3] text-[#17211d] border-[#deddd3]",
          cancelled: "bg-[#fdf2f2] text-[#991b1b] border-[#fecaca]",
        };
        return (
          <span
            className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold capitalize ${
              styles[row.status] || ""
            }`}
          >
            {row.status}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "",
      headerHidden: true,
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <IconButton
            icon="eye"
            label="View details"
            onClick={() => setActiveDrawerItem(row)}
          />
          <Can permission="ramadan.manage">
            <IconButton
              icon="pencil"
              label="Edit sponsorship"
              onClick={() => {
                setEditingItem(row);
                setPresetDateForCreate(null);
                setModalMode("edit");
              }}
            />
            <IconButton
              icon="trash"
              label="Delete sponsorship"
              tone="danger"
              onClick={() => setDeletingItem(row)}
            />
          </Can>
        </div>
      ),
    },
  ];

  const selectFilters: SelectFilter[] = [
    {
      id: "year",
      label: "Hijri Year",
      value: selectedYear,
      options: YEAR_FILTER_OPTIONS,
      onChange: setSelectedYear,
    },
    {
      id: "status",
      label: "Status",
      value: selectedStatus,
      options: STATUS_FILTER_OPTIONS,
      onChange: setSelectedStatus,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-[#e5e3da] pb-5 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold tracking-[.18em] text-[#c79a45]">
              RAMADAN 1447 AH
            </p>
            <span className="text-[#8b938d]">/</span>
            <p className="text-xs font-bold tracking-[.18em] text-[#69726d]">
              SPONSORSHIPS
            </p>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#17211d]">
            Iftar Sponsorship
          </h1>
          <p className="mt-1 text-sm text-[#69726d]">
            Coordinate daily community Iftar hosts, sponsor pledges, and meal capacity.
          </p>
        </div>

        {/* View Switcher Tabs & Create Button */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border border-[#deddd3] bg-[#faf9f4] p-1 text-xs">
            <Link
              href="/dashboard/ramadan"
              className="rounded-md px-3 py-1.5 font-medium text-[#69726d] transition-colors hover:text-[#17211d]"
            >
              Timetable
            </Link>
            <span className="rounded-md bg-[#0d4d3b] px-3 py-1.5 font-semibold text-white shadow-sm">
              Iftar Sponsorship
            </span>
          </div>

          <Can permission="ramadan.manage">
            <Button
              icon="plus"
              onClick={() => {
                setEditingItem(null);
                setPresetDateForCreate(null);
                setModalMode("create");
              }}
            >
              Add Sponsor
            </Button>
          </Can>
        </div>
      </div>

      {/* Summary Cards */}
      <StatGrid metrics={stats} />

      {/* Main Panel */}
      <Panel>
        <PanelHeader
          title="Ramadan Iftar Calendar"
          description={`30-day chronological schedule for ${
            selectedYear === "all" ? "all years" : `${selectedYear} AH`
          }`}
          actions={
            <div className="inline-flex rounded-lg border border-[#deddd3] bg-[#faf9f4] p-1 text-xs">
              <button
                type="button"
                onClick={() => setViewLayout("calendar")}
                className={`rounded-md px-3 py-1 font-medium transition-all ${
                  viewLayout === "calendar"
                    ? "bg-[#0d4d3b] text-white shadow-sm"
                    : "text-[#69726d] hover:text-[#17211d]"
                }`}
              >
                Day-Wise View
              </button>
              <button
                type="button"
                onClick={() => setViewLayout("table")}
                className={`rounded-md px-3 py-1 font-medium transition-all ${
                  viewLayout === "table"
                    ? "bg-[#0d4d3b] text-white shadow-sm"
                    : "text-[#69726d] hover:text-[#17211d]"
                }`}
              >
                Table View
              </button>
            </div>
          }
        />

        {/* Filter Bar */}
        <div className="border-b border-[#deddd3] bg-[#faf9f4] px-6 py-4">
          <FinanceFilters
            search={{
              value: search,
              onChange: setSearch,
              placeholder: "Search day (e.g. Day 1), sponsor name, menu, or notes...",
              label: "Search calendar",
            }}
            filters={selectFilters}
          />
        </div>

        {loading ? (
          <div className="p-6">
            <TableSkeleton columns={6} rows={6} />
          </div>
        ) : error ? (
          <div className="p-6">
            <FinanceErrorState
              title="Unable to load Iftar sponsorships"
              description="Failed to load Ramadan schedules or sponsorships from the server."
              onRetry={refetchAll}
            />
          </div>
        ) : viewLayout === "calendar" ? (
          /* Day-Wise 30-Day Grid Calendar */
          <div className="p-6">
            {filteredDayEntries.length === 0 ? (
              <FinanceEmptyState
                title={search || selectedStatus !== "all" ? "No matching Ramadan days" : "No schedule data"}
                description={
                  search || selectedStatus !== "all"
                    ? "Try adjusting your search or filters to see more days."
                    : "Add Ramadan schedule entries to configure the 30-day Iftar sponsorship calendar."
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredDayEntries.map((day) => (
                  <DaySponsorshipCard
                    key={day.date}
                    day={day}
                    timeFormat={timeFormat}
                    onViewDetails={(s) => setActiveDrawerItem(s)}
                    onEdit={(s) => {
                      setEditingItem(s);
                      setPresetDateForCreate(null);
                      setModalMode("edit");
                    }}
                    onDelete={(s) => setDeletingItem(s)}
                    onAddSponsor={() => handleAddSponsorForDate(day.date)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Table View */
          <div>
            <DataTable
              caption="Iftar Sponsorships"
              columns={columns}
              rows={rawSponsorships}
              getRowKey={(item) => item.id}
              emptyState={
                <FinanceEmptyState
                  title={search || selectedStatus !== "all" ? "No sponsorships match filters" : "No sponsorships recorded"}
                  description={
                    search || selectedStatus !== "all"
                      ? "Try adjusting your filters or search keywords."
                      : "Record an Iftar sponsor for a Ramadan day using the button above."
                  }
                />
              }
            />
            <PanelFooter>
              <span className="text-xs text-[#69726d]">{rawSponsorships.length} sponsorships recorded</span>
            </PanelFooter>
          </div>
        )}
      </Panel>

      {/* Details Drawer */}
      <DetailDrawer
        open={Boolean(activeDrawerItem)}
        onClose={() => setActiveDrawerItem(null)}
        title={activeDrawerItem ? `Iftar Sponsorship — ${formatLongDate(activeDrawerItem.date)}` : ""}
        subtitle={activeDrawerItem ? `Ramadan ${activeDrawerItem.year} AH · ${activeDrawerItem.date}` : ""}
        footer={
          activeDrawerItem && (
            <div className="flex items-center justify-between w-full">
              <Can permission="ramadan.manage">
                <Button
                  variant="danger"
                  onClick={() => {
                    setDeletingItem(activeDrawerItem);
                  }}
                >
                  Delete Sponsorship
                </Button>
                <Button
                  variant="primary"
                  icon="pencil"
                  onClick={() => {
                    setEditingItem(activeDrawerItem);
                    setPresetDateForCreate(null);
                    setModalMode("edit");
                  }}
                >
                  Edit Sponsorship
                </Button>
              </Can>
            </div>
          )
        }
      >
        {activeDrawerItem && (
          <div className="space-y-6">
            <DetailSection title="Sponsor Profile">
              <DetailGrid>
                <DetailField label="Sponsor Name" value={activeDrawerItem.sponsorName} />
                <DetailField
                  label="Affiliation"
                  value={
                    activeDrawerItem.userId ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-[#0d4d3b]">
                        Registered Member
                      </span>
                    ) : (
                      "External Benefactor"
                    )
                  }
                />
                <DetailField
                  label="Contact Phone"
                  value={activeDrawerItem.sponsorPhone || "Not provided"}
                />
                <DetailField
                  label="Contact Email"
                  value={activeDrawerItem.sponsorEmail || "Not provided"}
                />
              </DetailGrid>
            </DetailSection>

            <DetailSection title="Event Logistics">
              <DetailGrid>
                <DetailField
                  label="Date"
                  value={`${formatLongDate(activeDrawerItem.date)} (${activeDrawerItem.date})`}
                />
                <DetailField label="Hijri Year" value={`${activeDrawerItem.year} AH`} />
                <DetailField
                  label="Estimated Servings"
                  value={
                    activeDrawerItem.numberOfServings
                      ? `${activeDrawerItem.numberOfServings} people`
                      : "Open / Standard Capacity"
                  }
                />
                <DetailField
                  label="Pledged Cost"
                  value={formatCurrency(activeDrawerItem.estimatedCost)}
                />
                <DetailField
                  label="Status"
                  value={
                    <span className="inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold capitalize bg-[#eaf2ed] text-[#0d4d3b]">
                      {activeDrawerItem.status}
                    </span>
                  }
                />
              </DetailGrid>
            </DetailSection>

            {activeDrawerItem.menuDetails && (
              <DetailSection title="Menu Arrangements">
                <p className="text-sm text-[#17211d] bg-[#faf9f4] p-3.5 rounded-lg border border-[#e5e3da]">
                  {activeDrawerItem.menuDetails}
                </p>
              </DetailSection>
            )}

            {activeDrawerItem.notes && (
              <DetailSection title="Internal Notes">
                <p className="text-sm text-[#69726d] bg-[#faf9f4] p-3.5 rounded-lg border border-[#e5e3da]">
                  {activeDrawerItem.notes}
                </p>
              </DetailSection>
            )}
          </div>
        )}
      </DetailDrawer>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={Boolean(deletingItem)}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Iftar Sponsorship"
        description={`Are you sure you want to remove the Iftar sponsorship for ${
          deletingItem?.date
        } (${deletingItem?.sponsorName})? This will re-open this Ramadan day for new sponsors.`}
        tone="danger"
      />

      {/* Add / Edit Form Modal */}
      {modalMode && (
        <IftarSponsorshipFormModal
          open={Boolean(modalMode)}
          mode={modalMode}
          initialData={editingItem}
          presetDate={presetDateForCreate}
          year={Number(selectedYear === "all" ? 1447 : selectedYear)}
          onClose={() => {
            setModalMode(null);
            setEditingItem(null);
            setPresetDateForCreate(null);
          }}
          onSubmit={handleFormSubmit}
          loading={mutating}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DaySponsorshipCard Component
// ---------------------------------------------------------------------------
function DaySponsorshipCard({
  day,
  timeFormat,
  onViewDetails,
  onEdit,
  onDelete,
  onAddSponsor,
}: {
  day: DaySponsorshipEntry;
  timeFormat: "12h" | "24h";
  onViewDetails: (s: IftarSponsorship) => void;
  onEdit: (s: IftarSponsorship) => void;
  onDelete: (s: IftarSponsorship) => void;
  onAddSponsor: () => void;
}) {
  const isAvailable = day.status === "available";
  const isPending = day.status === "pending";
  const isConfirmed = day.status === "confirmed";
  const isCompleted = day.status === "completed";
  const isCancelled = day.status === "cancelled";

  return (
    <div
      className={`relative flex flex-col justify-between rounded-xl border p-4 transition-all ${
        day.isToday
          ? "border-[#0d4d3b] bg-[#f4f8f5] shadow-md ring-2 ring-[#0d4d3b]/30"
          : isAvailable
          ? "border-dashed border-[#deddd3] bg-[#faf9f4] hover:border-[#0d4d3b]/50 hover:bg-white"
          : isConfirmed
          ? "border-[#c2ddcb] bg-white shadow-xs"
          : isPending
          ? "border-[#fde68a] bg-[#fffdf7] shadow-xs"
          : isCancelled
          ? "border-[#fecaca] bg-[#fffbfb] shadow-xs"
          : "border-[#e5e3da] bg-white shadow-xs"
      }`}
    >
      {/* Card Header: Day & Status */}
      <div>
        <div className="flex items-center justify-between gap-2 border-b border-[#e5e3da] pb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="rounded-md bg-[#17211d] px-2 py-0.5 text-xs font-bold text-white">
              Day {day.dayNumber}
            </span>
            {day.isToday && (
              <span className="rounded-md bg-[#c79a45] px-1.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                Today
              </span>
            )}
          </div>

          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${
              isConfirmed
                ? "bg-[#eaf2ed] text-[#0d4d3b]"
                : isPending
                ? "bg-[#fef9ee] text-[#b45309]"
                : isAvailable
                ? "bg-[#f2eee3] text-[#69726d]"
                : isCompleted
                ? "bg-[#f4f3ef] text-[#17211d]"
                : "bg-[#fdf2f2] text-[#991b1b]"
            }`}
          >
            {day.status}
          </span>
        </div>

        {/* Date Display */}
        <div className="mt-2.5">
          <p className="text-sm font-semibold text-[#17211d]">
            {formatLongDate(day.date)}
          </p>
          <p className="text-xs text-[#8b938d]">{day.date}</p>
        </div>

        {/* Fasting times if available */}
        {day.schedule && (
          <div className="mt-2 flex items-center gap-2 text-xs text-[#69726d] bg-[#f8f6ef] rounded-md px-2 py-1">
            <span>
              Sehri:{" "}
              <strong className="text-[#17211d]">
                {formatClockTime(day.schedule.fastingStart, timeFormat)}
              </strong>
            </span>
            <span>•</span>
            <span>
              Iftar:{" "}
              <strong className="text-[#0d4d3b]">
                {formatClockTime(day.schedule.fastingEnd, timeFormat)}
              </strong>
            </span>
          </div>
        )}

        {/* Sponsorship Info */}
        <div className="mt-3">
          {day.sponsorship ? (
            <div className="space-y-1.5 rounded-lg border border-[#e5e3da] bg-[#faf9f4] p-2.5 text-xs">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-[#17211d] truncate">
                  {day.sponsorship.sponsorName}
                </span>
                <span className="text-[10px] text-[#8b938d] uppercase font-semibold">
                  {day.sponsorship.userId ? "Member" : "External"}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#69726d]">
                <span>Servings:</span>
                <span className="font-semibold text-[#17211d]">
                  {day.sponsorship.numberOfServings
                    ? `${day.sponsorship.numberOfServings} meals`
                    : "Standard"}
                </span>
              </div>

              {day.sponsorship.estimatedCost && (
                <div className="flex items-center justify-between text-[11px] text-[#69726d]">
                  <span>Pledged:</span>
                  <span className="font-bold text-[#0d4d3b]">
                    {formatCurrency(day.sponsorship.estimatedCost)}
                  </span>
                </div>
              )}

              {day.sponsorship.menuDetails && (
                <p className="mt-1 line-clamp-1 italic text-[11px] text-[#69726d]">
                  &ldquo;{day.sponsorship.menuDetails}&rdquo;
                </p>
              )}
            </div>
          ) : (
            <div className="flex min-h-[76px] flex-col items-center justify-center rounded-lg border border-dashed border-[#deddd3] p-3 text-center">
              <p className="text-xs text-[#8b938d]">No sponsor assigned</p>
              <p className="text-[11px] font-medium text-[#c79a45] mt-0.5">
                Open for Iftar sponsorship
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Card Actions */}
      <div className="mt-4 flex items-center justify-between border-t border-[#e5e3da] pt-2.5">
        {day.sponsorship ? (
          <>
            <button
              type="button"
              onClick={() => onViewDetails(day.sponsorship!)}
              className="text-xs font-semibold text-[#0d4d3b] hover:underline"
            >
              View Details →
            </button>
            <div className="flex items-center gap-1">
              <Can permission="ramadan.manage">
                <IconButton
                  icon="pencil"
                  label="Edit"
                  onClick={() => onEdit(day.sponsorship!)}
                />
                <IconButton
                  icon="trash"
                  label="Delete"
                  tone="danger"
                  onClick={() => onDelete(day.sponsorship!)}
                />
              </Can>
            </div>
          </>
        ) : (
          <Can permission="ramadan.manage">
            <button
              type="button"
              onClick={onAddSponsor}
              className="w-full rounded-md bg-[#0d4d3b] py-1.5 text-center text-xs font-semibold text-white transition hover:bg-[#09382b]"
            >
              + Add Sponsor
            </button>
          </Can>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form Modal Component
// ---------------------------------------------------------------------------
function IftarSponsorshipFormModal({
  open,
  mode,
  initialData,
  presetDate,
  year,
  onClose,
  onSubmit,
  loading,
}: {
  open: boolean;
  mode: "create" | "edit";
  initialData?: IftarSponsorship | null;
  presetDate?: string | null;
  year: number;
  onClose: () => void;
  onSubmit: (data: CreateIftarSponsorshipInput) => Promise<void>;
  loading: boolean;
}) {
  const [formYear, setFormYear] = useState<number>(initialData?.year || year || 1447);
  const [formDate, setFormDate] = useState<string>(
    initialData?.date || presetDate || "2026-02-18"
  );
  const [sponsorName, setSponsorName] = useState<string>(initialData?.sponsorName || "");
  const [sponsorPhone, setSponsorPhone] = useState<string>(initialData?.sponsorPhone || "");
  const [sponsorEmail, setSponsorEmail] = useState<string>(initialData?.sponsorEmail || "");
  const [numberOfServings, setNumberOfServings] = useState<string>(
    initialData?.numberOfServings ? String(initialData.numberOfServings) : "150"
  );
  const [estimatedCost, setEstimatedCost] = useState<string>(
    initialData?.estimatedCost ? String(initialData.estimatedCost) : ""
  );
  const [status, setStatus] = useState<IftarSponsorshipStatus>(
    initialData?.status || "confirmed"
  );
  const [menuDetails, setMenuDetails] = useState<string>(initialData?.menuDetails || "");
  const [notes, setNotes] = useState<string>(initialData?.notes || "");
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formDate) {
      setFormError("Ramadan date is required.");
      return;
    }
    if (!sponsorName.trim() || sponsorName.trim().length < 2) {
      setFormError("Sponsor name must be at least 2 characters.");
      return;
    }

    const payload: CreateIftarSponsorshipInput = {
      year: Number(formYear),
      date: formDate,
      sponsorName: sponsorName.trim(),
      sponsorPhone: sponsorPhone.trim() || null,
      sponsorEmail: sponsorEmail.trim() || null,
      numberOfServings: numberOfServings ? Number(numberOfServings) : null,
      estimatedCost: estimatedCost ? Number(estimatedCost) : null,
      status,
      menuDetails: menuDetails.trim() || null,
      notes: notes.trim() || null,
    };

    try {
      await onSubmit(payload);
    } catch (err) {
      setFormError(formatErrorMessage(err));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "create" ? "Add Iftar Sponsor" : "Edit Iftar Sponsorship"}
      description="Record community donor commitments and meal logistics for this Ramadan day."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="rounded-md border border-[#fecaca] bg-[#fdf2f2] p-3 text-xs text-[#991b1b]">
            {formError}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Hijri Year"
            name="year"
            type="number"
            value={String(formYear)}
            onChange={(e) => setFormYear(Number(e.target.value))}
            required
          />
          <TextField
            label="Gregorian Date"
            name="date"
            type="date"
            value={formDate}
            onChange={(e) => setFormDate(e.target.value)}
            required
          />
        </div>

        <TextField
          label="Sponsor Name"
          name="sponsorName"
          placeholder="e.g. Abdul Karim / Family of..."
          value={sponsorName}
          onChange={(e) => setSponsorName(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Phone Number"
            name="sponsorPhone"
            placeholder="+8801700000000"
            value={sponsorPhone}
            onChange={(e) => setSponsorPhone(e.target.value)}
          />
          <TextField
            label="Email Address"
            name="sponsorEmail"
            type="email"
            placeholder="sponsor@example.com"
            value={sponsorEmail}
            onChange={(e) => setSponsorEmail(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <TextField
            label="Meal Servings"
            name="servings"
            type="number"
            placeholder="150"
            value={numberOfServings}
            onChange={(e) => setNumberOfServings(e.target.value)}
          />
          <TextField
            label="Pledged Cost (৳)"
            name="cost"
            type="number"
            placeholder="25000"
            value={estimatedCost}
            onChange={(e) => setEstimatedCost(e.target.value)}
          />
          <div>
            <label className="block text-xs font-bold text-[#17211d]">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as IftarSponsorshipStatus)}
              className="mt-1 block w-full rounded-md border border-[#deddd3] bg-white px-3 py-2 text-xs text-[#17211d] focus:border-[#0d4d3b] focus:outline-none"
            >
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <TextAreaField
          label="Menu Details & Catering Notes"
          name="menu"
          placeholder="e.g. Special mutton biryani, dates, mineral water, fruits..."
          rows={2}
          value={menuDetails}
          onChange={(e) => setMenuDetails(e.target.value)}
        />

        <TextAreaField
          label="Internal Mosque Remarks"
          name="notes"
          placeholder="e.g. Volunteers assigned: Brother Hasan & Brother Rahim"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="mt-6 flex justify-end gap-3 border-t border-[#e5e3da] pt-4">
          <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : mode === "create" ? "Add Sponsor" : "Save Changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
