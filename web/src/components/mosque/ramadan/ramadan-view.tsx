"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useDashboardSession } from "@/components/dashboard/session-provider";
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
  createRamadan,
  deleteRamadan,
  fetchRamadanSchedules,
  updateRamadan,
  type CreateRamadanInput,
  type Ramadan,
  type UpdateRamadanInput,
} from "@/services/ramadanService";

const YEAR_FILTER_OPTIONS = [
  { value: "all", label: "All Hijri Years" },
  { value: "1447", label: "1447 AH (2026)" },
  { value: "1446", label: "1446 AH (2025)" },
  { value: "1448", label: "1448 AH (2027)" },
];

export function RamadanView() {
  const { can } = useDashboardSession();
  const { notify } = useToast();
  const timeFormat = mosqueSettings.prayer.timeFormat;

  const [selectedYear, setSelectedYear] = useState<string>("1447");
  const [search, setSearch] = useState<string>("");

  // Real backend API resource
  const queryYear = selectedYear === "all" ? undefined : Number(selectedYear);
  const {
    data: rawSchedules = [],
    loading,
    error,
    refetch,
  } = useApiResource(
    () => fetchRamadanSchedules(queryYear ? { year: queryYear } : {}),
    [queryYear],
    {
      enabled: can("prayer.view"),
    }
  );

  // Modals and Drawers
  const [createOpen, setCreateOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<Ramadan | null>(null);
  const [detailDay, setDetailDay] = useState<Ramadan | null>(null);
  const [deletingDay, setDeletingDay] = useState<Ramadan | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Ensure chronological order and calculate virtual Ramadan day numbers per year
  const schedulesWithDay = useMemo(() => {
    const sorted = [...(rawSchedules || [])].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.map((item, idx) => ({
      ...item,
      dayNumber: idx + 1,
    }));
  }, [rawSchedules]);

  // Client-side search filtering
  const filteredSchedules = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return schedulesWithDay;
    return schedulesWithDay.filter((s) => {
      return (
        s.date.toLowerCase().includes(q) ||
        `day ${s.dayNumber}`.toLowerCase().includes(q) ||
        (s.notes && s.notes.toLowerCase().includes(q))
      );
    });
  }, [schedulesWithDay, search]);

  // Derived metrics based on mosque local timezone
  const todayMosque = useMemo(() => getTodayInTimezone("Asia/Dhaka"), []);
  const todaySchedule = schedulesWithDay.find((s) => s.date === todayMosque);
  const nextSchedule = schedulesWithDay.find((s) => s.date >= todayMosque) || schedulesWithDay[0];
  const activeDisplaySchedule = todaySchedule || nextSchedule;

  const metrics: StatMetric[] = [
    {
      id: "total-days",
      label: "Total Ramadan Days",
      value: formatCount(schedulesWithDay.length),
      hint: selectedYear === "all" ? "All configured years" : `Hijri Year ${selectedYear} AH calendar`,
      icon: "moon",
      tone: "gold",
    },
    {
      id: "today-fast",
      label: todaySchedule ? "Today's Fast" : "Upcoming Fast",
      value: activeDisplaySchedule ? `Day ${activeDisplaySchedule.dayNumber}` : "—",
      hint: activeDisplaySchedule ? formatLongDate(activeDisplaySchedule.date) : "No schedule recorded",
      icon: "calendar",
      tone: "neutral",
    },
    {
      id: "upcoming-sehri",
      label: "Sehri / Suhoor (Imsak)",
      value: activeDisplaySchedule
        ? formatClockTime(activeDisplaySchedule.fastingStart, timeFormat)
        : "—",
      hint: activeDisplaySchedule?.suhoorTime
        ? `Mosque Suhoor ${formatClockTime(activeDisplaySchedule.suhoorTime, timeFormat)}`
        : "Fasting begins",
      icon: "sun",
      tone: "neutral",
    },
    {
      id: "upcoming-iftar",
      label: "Iftar / Sunset",
      value: activeDisplaySchedule
        ? formatClockTime(activeDisplaySchedule.fastingEnd, timeFormat)
        : "—",
      hint: activeDisplaySchedule ? "Fasting ends (Maghrib)" : "Maghrib time",
      icon: "sunset",
      tone: "positive",
    },
  ];

  // Filters config for FinanceFilters component
  const filterConfig: SelectFilter[] = [
    {
      id: "year",
      label: "Hijri Year",
      value: selectedYear,
      options: YEAR_FILTER_OPTIONS,
      onChange: setSelectedYear,
    },
  ];

  // Table columns definition
  const columns: Column<Ramadan & { dayNumber: number }>[] = [
    {
      key: "day",
      header: "Day",
      cell: (row) => (
        <span className="inline-flex items-center rounded-md bg-[#eaf2ed] px-2.5 py-0.5 text-[12px] font-semibold text-[#0d4d3b]">
          Day {row.dayNumber}
        </span>
      ),
    },
    {
      key: "date",
      header: "Date",
      cell: (row) => (
        <div>
          <div className="font-medium text-[#17211d]">{formatLongDate(row.date)}</div>
          <div className="text-[11.5px] text-[#69726d] tabular-nums">{row.date}</div>
        </div>
      ),
    },
    {
      key: "sehri",
      header: "Sehri (Imsak)",
      cell: (row) => (
        <div>
          <div className="font-semibold tabular-nums text-[#17211d]">
            {formatClockTime(row.fastingStart, timeFormat)}
          </div>
          {row.suhoorTime ? (
            <div className="text-[11.5px] text-[#69726d]">
              Suhoor: {formatClockTime(row.suhoorTime, timeFormat)}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: "iftar",
      header: "Iftar (Sunset)",
      cell: (row) => (
        <div className="font-semibold tabular-nums text-[#0d4d3b]">
          {formatClockTime(row.fastingEnd, timeFormat)}
        </div>
      ),
    },
    {
      key: "taraweeh",
      header: "Taraweeh",
      cell: (row) => (
        <div className="tabular-nums text-[#69726d]">
          {row.taraweehTime ? formatClockTime(row.taraweehTime, timeFormat) : "—"}
        </div>
      ),
    },
    {
      key: "notes",
      header: "Notes",
      cell: (row) => (
        <div className="max-w-[200px] truncate text-[12.5px] text-[#555f58]">
          {row.notes || <span className="text-[#a0a6a1]">—</span>}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      headerHidden: true,
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton
            icon="eye"
            label="View day details"
            onClick={() => setDetailDay(row)}
          />
          <Can permission="ramadan.manage">
            <IconButton
              icon="pencil"
              label="Edit schedule"
              onClick={() => setEditingDay(row)}
            />
            <IconButton
              icon="trash"
              tone="danger"
              label="Delete schedule"
              onClick={() => setDeletingDay(row)}
            />
          </Can>
        </div>
      ),
    },
  ];

  // Delete handler
  const handleDeleteConfirm = async () => {
    if (!deletingDay || isDeleting) return;
    try {
      setIsDeleting(true);
      await deleteRamadan(deletingDay.id);
      notify({
        message: "Ramadan schedule deleted",
        description: `Schedule for ${formatLongDate(deletingDay.date)} was removed.`,
        tone: "info",
      });
      setDeletingDay(null);
      refetch();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to delete schedule.";
      notify({
        message: "Failed to delete schedule",
        description: errorMsg,
        tone: "danger",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* View Switcher Tabs */}
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-lg border border-[#deddd3] bg-[#faf9f4] p-1 text-xs">
          <span className="rounded-md bg-[#0d4d3b] px-3 py-1.5 font-semibold text-white shadow-sm">
            Timetable
          </span>
          <Link
            href="/dashboard/ramadan/sponsorships"
            className="rounded-md px-3 py-1.5 font-medium text-[#69726d] transition-colors hover:text-[#17211d]"
          >
            Iftar Sponsorship
          </Link>
        </div>
      </div>

      {/* Top Stat Cards */}
      <StatGrid metrics={metrics} />

      {/* Main Panel */}
      <Panel>
        <PanelHeader
          title={`Ramadan Timetable ${selectedYear !== "all" ? `— ${selectedYear} AH` : ""}`}
          description="Daily fasting schedule, Imsak, Iftar, and Taraweeh congregation times."
          actions={
            <Can permission="ramadan.manage">
              <Button
                size="sm"
                icon="plus"
                onClick={() => setCreateOpen(true)}
              >
                Add Ramadan Schedule
              </Button>
            </Can>
          }
        />

        {/* Filters */}
        <div className="border-b border-[#e2e1d6] px-4 py-3 sm:px-6">
          <FinanceFilters
            search={{
              value: search,
              onChange: setSearch,
              placeholder: "Search by day, date (YYYY-MM-DD), or notes...",
              label: "Search timetable",
            }}
            filters={filterConfig}
          />
        </div>

        {/* Schedule List */}
        {loading ? (
          <div className="p-4 sm:p-6">
            <TableSkeleton columns={6} rows={6} />
          </div>
        ) : error ? (
          <div className="p-6">
            <FinanceErrorState
              title="Unable to load Ramadan timetable"
              description={error || "Failed to retrieve Ramadan schedules from the database."}
              onRetry={refetch}
            />
          </div>
        ) : filteredSchedules.length === 0 ? (
          <FinanceEmptyState
            title="No Ramadan schedules found"
            description={
              search
                ? `No schedule entries match the query "${search}".`
                : "No Ramadan schedule records have been created for this period yet."
            }
            action={
              <Can permission="ramadan.manage">
                <Button size="sm" icon="plus" onClick={() => setCreateOpen(true)}>
                  Add Ramadan Schedule
                </Button>
              </Can>
            }
          />
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <DataTable
                columns={columns}
                rows={filteredSchedules}
                getRowKey={(row) => row.id}
                caption="Ramadan Daily Schedule"
                emptyState={null}
              />
            </div>

            {/* Mobile Card View */}
            <div className="divide-y divide-[#eceae0] md:hidden">
              {filteredSchedules.map((row) => (
                <div key={row.id} className="p-4 space-y-3 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center rounded-md bg-[#eaf2ed] px-2.5 py-0.5 text-[12px] font-semibold text-[#0d4d3b]">
                      Day {row.dayNumber}
                    </span>
                    <span className="text-[13px] font-medium text-[#17211d]">
                      {formatLongDate(row.date)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 rounded-md bg-[#faf9f4] p-2.5 text-[12.5px] border border-[#e7e6dc]">
                    <div>
                      <span className="block text-[10.5px] uppercase font-bold text-[#8b938d]">
                        Sehri / Imsak
                      </span>
                      <span className="font-semibold tabular-nums text-[#17211d]">
                        {formatClockTime(row.fastingStart, timeFormat)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10.5px] uppercase font-bold text-[#5f7d70]">
                        Iftar
                      </span>
                      <span className="font-semibold tabular-nums text-[#0d4d3b]">
                        {formatClockTime(row.fastingEnd, timeFormat)}
                      </span>
                    </div>
                  </div>

                  {row.notes ? (
                    <p className="text-[12px] text-[#69726d] italic line-clamp-2">{row.notes}</p>
                  ) : null}

                  <div className="flex items-center justify-between pt-1 border-t border-[#f0efe6]">
                    <div className="text-[11.5px] text-[#8b938d]">
                      Taraweeh: {row.taraweehTime ? formatClockTime(row.taraweehTime, timeFormat) : "—"}
                    </div>
                    <div className="flex items-center gap-1">
                      <IconButton
                        icon="eye"
                        label="View details"
                        onClick={() => setDetailDay(row)}
                      />
                      <Can permission="ramadan.manage">
                        <IconButton
                          icon="pencil"
                          label="Edit"
                          onClick={() => setEditingDay(row)}
                        />
                        <IconButton
                          icon="trash"
                          tone="danger"
                          label="Delete"
                          onClick={() => setDeletingDay(row)}
                        />
                      </Can>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <PanelFooter>
          <div className="flex flex-wrap items-center justify-between gap-3 text-[12.5px] text-[#69726d]">
            <span>Calculated from mosque coordinates and regional sighting standards.</span>
            <span>Hijri Calendar {selectedYear !== "all" ? `${selectedYear} AH` : "All"}</span>
          </div>
        </PanelFooter>
      </Panel>

      {/* Create Modal */}
      {createOpen ? (
        <RamadanScheduleFormModal
          mode="create"
          open={createOpen}
          year={selectedYear === "all" ? 1447 : Number(selectedYear)}
          onClose={() => setCreateOpen(false)}
          onSuccess={() => {
            setCreateOpen(false);
            refetch();
          }}
        />
      ) : null}

      {/* Edit Modal */}
      {editingDay ? (
        <RamadanScheduleFormModal
          mode="edit"
          open={Boolean(editingDay)}
          entry={editingDay}
          year={editingDay.year}
          onClose={() => setEditingDay(null)}
          onSuccess={() => {
            setEditingDay(null);
            refetch();
          }}
        />
      ) : null}

      {/* Detail Drawer */}
      {detailDay ? (
        <DetailDrawer
          open={Boolean(detailDay)}
          onClose={() => setDetailDay(null)}
          title={`Ramadan Day ${schedulesWithDay.find((s) => s.id === detailDay.id)?.dayNumber || 1}`}
          subtitle={`Fasting & Prayer Timetable for ${formatLongDate(detailDay.date)}`}
          badge={
            <span className="inline-flex items-center rounded-full bg-[#eaf2ed] px-2.5 py-0.5 text-[11.5px] font-medium text-[#0d4d3b]">
              Hijri {detailDay.year} AH
            </span>
          }
          footer={
            <Can permission="ramadan.manage">
              <Button
                size="sm"
                variant="secondary"
                icon="pencil"
                onClick={() => {
                  const target = detailDay;
                  setDetailDay(null);
                  setEditingDay(target);
                }}
              >
                Edit schedule
              </Button>
            </Can>
          }
        >
          <DetailSection title="Fasting Timings">
            <DetailGrid columns={2}>
              <DetailField
                label="Sehri / Imsak Cutoff"
                value={formatClockTime(detailDay.fastingStart, timeFormat)}
              />
              <DetailField
                label="Iftar / Maghrib"
                value={formatClockTime(detailDay.fastingEnd, timeFormat)}
              />
              <DetailField
                label="Mosque Suhoor Service"
                value={detailDay.suhoorTime ? formatClockTime(detailDay.suhoorTime, timeFormat) : "—"}
              />
              <DetailField
                label="Taraweeh Prayer"
                value={detailDay.taraweehTime ? formatClockTime(detailDay.taraweehTime, timeFormat) : "—"}
              />
            </DetailGrid>
          </DetailSection>

          <DetailSection title="Calendar & Notes">
            <DetailGrid columns={2}>
              <DetailField label="Gregorian Date" value={formatLongDate(detailDay.date)} />
              <DetailField
                label="Calendar Day"
                value={`Day ${schedulesWithDay.find((s) => s.id === detailDay.id)?.dayNumber || 1}`}
              />
            </DetailGrid>
            {detailDay.notes ? (
              <div className="mt-3">
                <DetailField label="Special Events & Notes" value={detailDay.notes} />
              </div>
            ) : null}
          </DetailSection>
        </DetailDrawer>
      ) : null}

      {/* Delete Confirmation Dialog */}
      {deletingDay ? (
        <ConfirmDialog
          open={Boolean(deletingDay)}
          onClose={() => {
            if (!isDeleting) setDeletingDay(null);
          }}
          onConfirm={handleDeleteConfirm}
          title="Delete Ramadan Schedule"
          description={`Are you sure you want to delete the schedule for ${formatLongDate(deletingDay.date)}? This action cannot be undone.`}
          confirmLabel={isDeleting ? "Deleting..." : "Delete Schedule"}
          tone="danger"
        />
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Create / Edit Ramadan Schedule Form Modal
 * -------------------------------------------------------------------------- */

type FormState = {
  year: number;
  date: string;
  fastingStart: string;
  fastingEnd: string;
  suhoorTime: string;
  iftarTime: string;
  taraweehTime: string;
  notes: string;
};

function RamadanScheduleFormModal({
  mode,
  open,
  entry,
  year,
  onClose,
  onSuccess,
}: {
  mode: "create" | "edit";
  open: boolean;
  entry?: Ramadan;
  year: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { notify } = useToast();
  const timeFormat = mosqueSettings.prayer.timeFormat;

  const [form, setForm] = useState<FormState>({
    year: entry?.year || year,
    date: entry?.date || "",
    fastingStart: entry?.fastingStart || "05:00",
    fastingEnd: entry?.fastingEnd || "18:00",
    suhoorTime: entry?.suhoorTime || "",
    iftarTime: entry?.iftarTime || "",
    taraweehTime: entry?.taraweehTime || "19:45",
    notes: entry?.notes || "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>(undefined);

  // Validations
  const invalidDate = !form.date;
  const invalidFastingStart = !form.fastingStart;
  const invalidFastingEnd = !form.fastingEnd;
  const invalidTimeOrder = Boolean(
    form.fastingStart && form.fastingEnd && form.fastingEnd <= form.fastingStart
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setFormError(null);
    setFieldErrors(undefined);

    if (invalidDate || invalidFastingStart || invalidFastingEnd || invalidTimeOrder) {
      return;
    }

    if (mode === "create") {
      try {
        setSubmitting(true);
        const payload: CreateRamadanInput = {
          year: form.year,
          date: form.date,
          fastingStart: form.fastingStart,
          fastingEnd: form.fastingEnd,
          suhoorTime: form.suhoorTime || null,
          iftarTime: form.iftarTime || null,
          taraweehTime: form.taraweehTime || null,
          notes: form.notes.trim() || null,
        };

        await createRamadan(payload);

        notify({
          message: "Ramadan schedule created",
          description: `${formatLongDate(payload.date)}: Sehri ${formatClockTime(payload.fastingStart, timeFormat)}, Iftar ${formatClockTime(payload.fastingEnd, timeFormat)}.`,
          tone: "success",
        });

        onSuccess();
      } catch (err: unknown) {
        if (err instanceof ServiceError && err.fieldErrors) {
          setFieldErrors(err.fieldErrors as Record<string, string[]>);
        }
        const errorMsg = err instanceof Error ? err.message : "Failed to create Ramadan schedule.";
        setFormError(errorMsg);
        notify({
          message: "Unable to create schedule",
          description: errorMsg,
          tone: "danger",
        });
      } finally {
        setSubmitting(false);
      }
    } else if (mode === "edit" && entry) {
      try {
        setSubmitting(true);
        const payload: UpdateRamadanInput = {
          year: form.year,
          date: form.date,
          fastingStart: form.fastingStart,
          fastingEnd: form.fastingEnd,
          suhoorTime: form.suhoorTime || null,
          iftarTime: form.iftarTime || null,
          taraweehTime: form.taraweehTime || null,
          notes: form.notes.trim() || null,
        };

        await updateRamadan(entry.id, payload);

        notify({
          message: "Ramadan schedule updated",
          description: `${formatLongDate(payload.date || form.date)}: Sehri ${formatClockTime(payload.fastingStart || form.fastingStart, timeFormat)}, Iftar ${formatClockTime(payload.fastingEnd || form.fastingEnd, timeFormat)}.`,
          tone: "success",
        });

        onSuccess();
      } catch (err: unknown) {
        if (err instanceof ServiceError && err.fieldErrors) {
          setFieldErrors(err.fieldErrors as Record<string, string[]>);
        }
        const errorMsg = err instanceof Error ? err.message : "Failed to update Ramadan schedule.";
        setFormError(errorMsg);
        notify({
          message: "Unable to update schedule",
          description: errorMsg,
          tone: "danger",
        });
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "create" ? "Add Ramadan Schedule" : `Edit Ramadan Schedule`}
      description="Configure daily fasting start (Imsak), Iftar, and congregation times."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            icon="check"
            onClick={handleSubmit}
            disabled={submitting || invalidDate || invalidFastingStart || invalidFastingEnd || invalidTimeOrder}
          >
            {submitting ? "Saving..." : mode === "create" ? "Create Schedule" : "Save Changes"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {formError ? (
          <div className="rounded-md border border-[#e5a8a8] bg-[#fdf2f2] p-3 text-[12.5px] text-[#991b1b]">
            {formError}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Hijri Year"
            type="number"
            min={1400}
            max={1500}
            required
            value={form.year.toString()}
            onChange={(e) => setForm((prev) => ({ ...prev, year: Number(e.target.value) }))}
          />
          <TextField
            label="Gregorian Date"
            type="date"
            required
            error={
              (submitted && invalidDate ? "Date is required." : undefined) ||
              fieldErrors?.date?.[0]
            }
            value={form.date}
            onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Sehri / Imsak (Fast Start)"
            type="time"
            required
            error={
              (submitted && invalidFastingStart
                ? "Start time is required."
                : submitted && invalidTimeOrder
                ? "Must be before Iftar."
                : undefined) || fieldErrors?.fastingStart?.[0]
            }
            value={form.fastingStart}
            onChange={(e) => setForm((prev) => ({ ...prev, fastingStart: e.target.value }))}
          />
          <TextField
            label="Iftar (Fast End)"
            type="time"
            required
            error={
              (submitted && invalidFastingEnd ? "Iftar time is required." : undefined) ||
              fieldErrors?.fastingEnd?.[0]
            }
            value={form.fastingEnd}
            onChange={(e) => setForm((prev) => ({ ...prev, fastingEnd: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Mosque Suhoor (Optional)"
            type="time"
            error={fieldErrors?.suhoorTime?.[0]}
            value={form.suhoorTime}
            onChange={(e) => setForm((prev) => ({ ...prev, suhoorTime: e.target.value }))}
          />
          <TextField
            label="Taraweeh Prayer (Optional)"
            type="time"
            error={fieldErrors?.taraweehTime?.[0]}
            value={form.taraweehTime}
            onChange={(e) => setForm((prev) => ({ ...prev, taraweehTime: e.target.value }))}
          />
        </div>

        <TextAreaField
          label="Notes / Special Events (Optional)"
          rows={2}
          placeholder="e.g. Laylat al-Qadr, Khatm al-Quran, Community Iftar..."
          error={fieldErrors?.notes?.[0]}
          value={form.notes}
          onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
        />
      </form>
    </Modal>
  );
}
