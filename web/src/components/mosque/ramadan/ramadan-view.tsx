"use client";

import { useMemo, useState } from "react";
import { Button, IconButton } from "@/components/finance/ui/button";
import { ConfirmDialog } from "@/components/finance/ui/dialogs";
import { TextAreaField, TextField } from "@/components/finance/ui/form-field";
import { Icon } from "@/components/finance/ui/icon";
import { Modal } from "@/components/finance/ui/modal";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { StatGrid } from "@/components/ui/stat-card";
import { useToast } from "@/components/ui/toast";
import { mockRamadanSchedule, type RamadanDayEntry } from "@/data/ramadan";
import { mosqueSettings } from "@/data/settings";
import {
  formatClockTime,
  formatCount,
  formatLongDate,
  getTodayInTimezone,
} from "@/lib/mosque/format";
import type { StatMetric } from "@/lib/mosque/types";

export function RamadanView() {
  const { notify } = useToast();
  const timeFormat = mosqueSettings.prayer.timeFormat;

  // Local state initialized with isolated mock data for Phase 1 UI preview
  const [schedules, setSchedules] = useState<RamadanDayEntry[]>(mockRamadanSchedule);
  const [selectedYear, setSelectedYear] = useState<number>(1447);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal states
  const [createOpen, setCreateOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<RamadanDayEntry | null>(null);
  const [deletingDay, setDeletingDay] = useState<RamadanDayEntry | null>(null);

  // Filtered list
  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      const matchYear = s.year === selectedYear;
      const matchSearch =
        !searchQuery ||
        s.date.includes(searchQuery) ||
        `Day ${s.dayNumber}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.notes && s.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchYear && matchSearch;
    });
  }, [schedules, selectedYear, searchQuery]);

  // Derived metrics for summary cards
  const todayMosque = useMemo(() => getTodayInTimezone("Asia/Dhaka"), []);
  const todaySchedule = schedules.find((s) => s.date === todayMosque) || schedules[0];

  const metrics: StatMetric[] = [
    {
      id: "ramadan-year",
      label: "Current Ramadan",
      value: `${selectedYear} AH`,
      hint: `${formatCount(schedules.length)} days scheduled`,
      icon: "moon",
      tone: "gold",
    },
    {
      id: "sehri-time",
      label: "Sehri / Suhoor Ends",
      value: todaySchedule ? formatClockTime(todaySchedule.fastingStart, timeFormat) : "—",
      hint: todaySchedule?.suhoorTime
        ? `Mosque Suhoor ${formatClockTime(todaySchedule.suhoorTime, timeFormat)}`
        : "Imsak cutoff time",
      icon: "sun",
      tone: "neutral",
    },
    {
      id: "iftar-time",
      label: "Iftar / Sunset",
      value: todaySchedule ? formatClockTime(todaySchedule.fastingEnd, timeFormat) : "—",
      hint: todaySchedule ? `Day ${todaySchedule.dayNumber} · Fast ends` : "Maghrib time",
      icon: "sunset",
      tone: "neutral",
    },
    {
      id: "taraweeh-time",
      label: "Taraweeh Prayer",
      value: todaySchedule?.taraweehTime
        ? formatClockTime(todaySchedule.taraweehTime, timeFormat)
        : "—",
      hint: "20 Rak'ahs congregation",
      icon: "mosque",
      tone: "positive",
    },
  ];

  // Placeholder mutation handlers
  const handleCreateSubmit = (newEntry: Omit<RamadanDayEntry, "id">) => {
    const entry: RamadanDayEntry = {
      ...newEntry,
      id: `RAM-${Date.now()}`,
    };
    setSchedules((prev) => [...prev, entry].sort((a, b) => a.date.localeCompare(b.date)));
    setCreateOpen(false);
    notify({
      message: "Schedule added",
      description: `Ramadan Day ${entry.dayNumber} on ${formatLongDate(entry.date)} created.`,
      tone: "success",
    });
  };

  const handleEditSubmit = (updated: RamadanDayEntry) => {
    setSchedules((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setEditingDay(null);
    notify({
      message: "Schedule updated",
      description: `Day ${updated.dayNumber} timings updated successfully.`,
      tone: "success",
    });
  };

  const handleDeleteConfirm = () => {
    if (!deletingDay) return;
    setSchedules((prev) => prev.filter((s) => s.id !== deletingDay.id));
    setDeletingDay(null);
    notify({
      message: "Schedule removed",
      description: `Day ${deletingDay.dayNumber} schedule was removed.`,
      tone: "info",
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Summary Metrics */}
      <StatGrid metrics={metrics} />

      {/* Main Ramadan Schedule Panel */}
      <Panel>
        <PanelHeader
          title={`Ramadan Schedule ${selectedYear} AH`}
          description="Daily Imsak, Iftar, and Taraweeh prayer timetable for the community."
          actions={
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Year Filter */}
              <div className="flex items-center gap-1.5 rounded-md border border-[#d8dcd8] bg-white px-2.5 py-1 text-[13px]">
                <Icon name="calendar" size={14} className="text-[#69726d]" />
                <select
                  aria-label="Filter by Hijri year"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-transparent font-medium text-[#17211d] focus:outline-none"
                >
                  <option value={1447}>1447 AH (2026)</option>
                  <option value={1446}>1446 AH (2025)</option>
                  <option value={1448}>1448 AH (2027)</option>
                </select>
              </div>

              {/* Add Day Button */}
              <Can permission="ramadan.manage">
                <Button size="sm" icon="plus" onClick={() => setCreateOpen(true)}>
                  Add Day Schedule
                </Button>
              </Can>
            </div>
          }
        />

        <PanelBody>
          {/* Search bar */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="relative w-full max-w-sm">
              <Icon
                name="search"
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b938d]"
              />
              <input
                type="text"
                placeholder="Search by day, date or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-[#d8dcd8] bg-white py-1.5 pl-9 pr-3 text-[13px] text-[#17211d] placeholder-[#8b938d] transition-colors focus:border-[#0d4d3b] focus:outline-none"
              />
            </div>
            <div className="text-[12.5px] text-[#69726d]">
              Showing <span className="font-semibold text-[#17211d]">{filteredSchedules.length}</span> days
            </div>
          </div>

          {/* Schedule Table */}
          <div className="overflow-x-auto rounded-lg border border-[#e2e1d6]">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-[#e2e1d6] bg-[#faf9f4] text-[11.5px] font-bold uppercase tracking-[.06em] text-[#69726d]">
                <tr>
                  <th className="px-4 py-3">Day</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Sehri (Imsak)</th>
                  <th className="px-4 py-3">Iftar</th>
                  <th className="px-4 py-3">Taraweeh</th>
                  <th className="px-4 py-3">Notes</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eceae0] bg-white">
                {filteredSchedules.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[13px] text-[#69726d]">
                      No Ramadan schedule records found for the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredSchedules.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-[#faf9f4]/60">
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="inline-flex items-center rounded-md bg-[#eaf2ed] px-2 py-0.5 text-[12px] font-semibold text-[#0d4d3b]">
                          Day {item.dayNumber}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-[#17211d]">
                        {formatLongDate(item.date)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-[#17211d]">
                        {formatClockTime(item.fastingStart, timeFormat)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums font-semibold text-[#0d4d3b]">
                        {formatClockTime(item.fastingEnd, timeFormat)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-[#69726d]">
                        {item.taraweehTime ? formatClockTime(item.taraweehTime, timeFormat) : "—"}
                      </td>
                      <td className="px-4 py-3 text-[12.5px] text-[#555f58]">
                        {item.notes || <span className="text-[#a0a6a1]">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <Can permission="ramadan.manage">
                          <div className="inline-flex items-center gap-1">
                            <IconButton
                              icon="pencil"
                              label="Edit schedule"
                              onClick={() => setEditingDay(item)}
                            />
                            <IconButton
                              icon="trash"
                              tone="danger"
                              label="Delete schedule"
                              onClick={() => setDeletingDay(item)}
                            />
                          </div>
                        </Can>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </PanelBody>

        <PanelFooter>
          <div className="flex flex-wrap items-center justify-between gap-3 text-[12.5px] text-[#69726d]">
            <span>Times are aligned with mosque geographic coordinates and local sightings.</span>
            <span>Hijri Calendar {selectedYear} AH</span>
          </div>
        </PanelFooter>
      </Panel>

      {/* Create Modal */}
      {createOpen ? (
        <RamadanDayModal
          mode="create"
          open={createOpen}
          year={selectedYear}
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreateSubmit}
        />
      ) : null}

      {/* Edit Modal */}
      {editingDay ? (
        <RamadanDayModal
          mode="edit"
          open={Boolean(editingDay)}
          entry={editingDay}
          year={editingDay.year}
          onClose={() => setEditingDay(null)}
          onSubmit={(updated) => handleEditSubmit({ ...editingDay, ...updated })}
        />
      ) : null}

      {/* Delete Confirmation */}
      {deletingDay ? (
        <ConfirmDialog
          open={Boolean(deletingDay)}
          onClose={() => setDeletingDay(null)}
          onConfirm={handleDeleteConfirm}
          title="Delete Ramadan Schedule"
          description={`Are you sure you want to remove Ramadan Day ${deletingDay.dayNumber} (${formatLongDate(deletingDay.date)}) from the calendar?`}
          confirmLabel="Delete Day"
          tone="danger"
        />
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Create / Edit Ramadan Day Modal
 * -------------------------------------------------------------------------- */

type ModalFormState = {
  year: number;
  date: string;
  dayNumber: number;
  fastingStart: string;
  fastingEnd: string;
  suhoorTime: string;
  iftarTime: string;
  taraweehTime: string;
  notes: string;
};

function RamadanDayModal({
  mode,
  open,
  entry,
  year,
  onClose,
  onSubmit,
}: {
  mode: "create" | "edit";
  open: boolean;
  entry?: RamadanDayEntry;
  year: number;
  onClose: () => void;
  onSubmit: (data: Omit<RamadanDayEntry, "id">) => void;
}) {
  const [form, setForm] = useState<ModalFormState>({
    year: entry?.year || year,
    date: entry?.date || "",
    dayNumber: entry?.dayNumber || 1,
    fastingStart: entry?.fastingStart || "05:00",
    fastingEnd: entry?.fastingEnd || "18:00",
    suhoorTime: entry?.suhoorTime || "",
    iftarTime: entry?.iftarTime || "",
    taraweehTime: entry?.taraweehTime || "19:45",
    notes: entry?.notes || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.fastingStart || !form.fastingEnd) return;

    onSubmit({
      year: form.year,
      date: form.date,
      dayNumber: form.dayNumber,
      fastingStart: form.fastingStart,
      fastingEnd: form.fastingEnd,
      suhoorTime: form.suhoorTime || null,
      iftarTime: form.iftarTime || null,
      taraweehTime: form.taraweehTime || null,
      notes: form.notes.trim() || null,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "create" ? "Add Ramadan Day" : `Edit Ramadan Day ${form.dayNumber}`}
      description="Configure daily fasting start (Imsak), Iftar, and congregation times."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button icon="check" onClick={handleSubmit}>
            {mode === "create" ? "Create Day" : "Save Changes"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Ramadan Day #"
            type="number"
            min={1}
            max={30}
            required
            value={form.dayNumber.toString()}
            onChange={(e) => setForm((prev) => ({ ...prev, dayNumber: Number(e.target.value) }))}
          />
          <TextField
            label="Gregorian Date"
            type="date"
            required
            value={form.date}
            onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Sehri / Imsak (Fast Start)"
            type="time"
            required
            value={form.fastingStart}
            onChange={(e) => setForm((prev) => ({ ...prev, fastingStart: e.target.value }))}
          />
          <TextField
            label="Iftar (Fast End)"
            type="time"
            required
            value={form.fastingEnd}
            onChange={(e) => setForm((prev) => ({ ...prev, fastingEnd: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Mosque Suhoor (Optional)"
            type="time"
            value={form.suhoorTime}
            onChange={(e) => setForm((prev) => ({ ...prev, suhoorTime: e.target.value }))}
          />
          <TextField
            label="Taraweeh Prayer (Optional)"
            type="time"
            value={form.taraweehTime}
            onChange={(e) => setForm((prev) => ({ ...prev, taraweehTime: e.target.value }))}
          />
        </div>

        <TextAreaField
          label="Notes (Optional)"
          rows={2}
          placeholder="e.g. Special lecture, Laylat al-Qadr, Khatm..."
          value={form.notes}
          onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
        />
      </form>
    </Modal>
  );
}
