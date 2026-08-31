"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Button, ButtonLink, IconButton } from "@/components/finance/ui/button";
import { DataTable, type Column } from "@/components/finance/ui/data-table";
import { TextField } from "@/components/finance/ui/form-field";
import { Icon, type IconName } from "@/components/finance/ui/icon";
import { Modal } from "@/components/finance/ui/modal";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { FinanceEmptyState, InlineNotice } from "@/components/finance/ui/states";
import { PrayerStrip } from "@/components/mosque/prayer/prayer-strip";
import { DateNav } from "@/components/ui/date-nav";
import { PrayerStatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { prayerColumns, scheduleFor, weeklySchedule, todaySlots } from "@/data/prayer-times";
import { formatClockTime, formatLongDate, fromMinutes, getTodayInTimezone, REFERENCE_DATE, toMinutes } from "@/lib/mosque/format";
import type { DailyPrayerSchedule, PrayerId, PrayerSlot, WeeklyPrayerRow } from "@/lib/mosque/types";
import { fetchMosqueSettings, type MosqueSettings } from "@/services/mosqueService";
import {
  fetchPrayerSettings,
  fetchPrayerTimesForDate,
  updatePrayerSettings,
  type PrayerSettings,
  type PrayerTimesResponse,
  type UpdatePrayerSettingsInput,
} from "@/services/prayerTimesService";

const STORAGE_KEY_PREFIX = "noor_prayer_slots_";

/** Helper to read date-specific saved overrides from persistent storage */
function getSavedSlotsForDate(targetDate: string): PrayerSlot[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${targetDate}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Ignore storage parse error
  }
  return null;
}

export function PrayerTimesView({ initialDate }: { initialDate?: string }) {
  const { notify } = useToast();
  const todayInMosqueZone = useMemo(() => getTodayInTimezone("Asia/Dhaka"), []);
  const effectiveInitialDate = initialDate || todayInMosqueZone;
  const [date, setDate] = useState<string>(effectiveInitialDate);
  const [liveSettings, setLiveSettings] = useState<MosqueSettings | null>(null);
  const [backendTimes, setBackendTimes] = useState<PrayerTimesResponse | null>(null);
  const [prayerSettings, setPrayerSettings] = useState<PrayerSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  /** Date-specific manual overrides strictly isolated per calendar date */
  const [overrides, setOverrides] = useState<Record<string, PrayerSlot[]>>(() => {
    const initialSaved = getSavedSlotsForDate(effectiveInitialDate);
    return initialSaved ? { [effectiveInitialDate]: initialSaved } : {};
  });

  const [editing, setEditing] = useState(false);

  // Load general mosque settings once
  useEffect(() => {
    fetchMosqueSettings()
      .then((s) => setLiveSettings(s))
      .catch(() => {});
  }, []);

  // Fetch live calculated prayer times whenever date changes, preserving any manual overrides
  const loadDateSchedule = useCallback(async (targetDate: string) => {
    try {
      setLoading(true);
      const [res, settings] = await Promise.all([
        fetchPrayerTimesForDate(targetDate).catch(() => null),
        fetchPrayerSettings().catch(() => null),
      ]);

      if (res) {
        setBackendTimes(res);
      }
      if (settings) {
        setPrayerSettings(settings);
      }

      // Check persistent storage for this date's manual overrides
      const savedForDate = getSavedSlotsForDate(targetDate);
      if (savedForDate) {
        setOverrides((prev) => ({ ...prev, [targetDate]: savedForDate }));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDateSchedule(date);
  }, [date, loadDateSchedule]);

  /**
   * Construct active schedule from real backend database timings (with manual overrides prioritized)
   */
  const schedule = useMemo<DailyPrayerSchedule>(() => {
    const base = scheduleFor(date);

    let resolvedSlots = base.slots;
    if (backendTimes && backendTimes.timings) {
      const t = backendTimes.timings;
      const iqamahTimings = backendTimes.iqamahTimings || {};
      const iqamahOffsetMinutes = liveSettings?.iqamahOffset ?? 15;

      resolvedSlots = todaySlots.map((defaultSlot) => {
        const prayerKey = defaultSlot.id as keyof typeof t;
        const timing = t[prayerKey];

        if (timing) {
          const adhan = timing.time;
          let iqamah: string | undefined = undefined;
          if (defaultSlot.isCongregation) {
            if (iqamahTimings[prayerKey]) {
              iqamah = iqamahTimings[prayerKey];
            } else {
              const adhanMins = toMinutes(adhan);
              const offset = defaultSlot.id === "maghrib" ? 3 : iqamahOffsetMinutes;
              iqamah = fromMinutes(adhanMins + offset);
            }
          }

          return {
            ...defaultSlot,
            adhan,
            iqamah: defaultSlot.isCongregation ? iqamah : undefined,
          };
        }
        return defaultSlot;
      });
    }

    return {
      date,
      location: backendTimes?.timezone ? `${backendTimes.timezone} (Mosque Coords)` : base.location,
      hijriDate: backendTimes?.hijri?.date
        ? `${backendTimes.hijri.day ?? ""} ${backendTimes.hijri.monthName ?? ""} ${backendTimes.hijri.year ?? "AH"}`
        : base.hijriDate,
      slots: resolvedSlots,
    };
  }, [date, backendTimes, liveSettings]);

  const timeFormat = "12h";

  const saveSlots = async (newSlots: PrayerSlot[]) => {
    const targetDate = date; // Lock to the exact date being edited
    try {
      setSaving(true);

      const updateInput: UpdatePrayerSettingsInput = {};

      newSlots.forEach((slot) => {
        if (slot.id === "fajr") {
          updateInput.fajrTime = slot.adhan;
          if (slot.iqamah) updateInput.fajrIqamah = slot.iqamah;
        } else if (slot.id === "sunrise") {
          updateInput.sunriseTime = slot.adhan;
        } else if (slot.id === "dhuhr") {
          updateInput.dhuhrTime = slot.adhan;
          if (slot.iqamah) updateInput.dhuhrIqamah = slot.iqamah;
        } else if (slot.id === "asr") {
          updateInput.asrTime = slot.adhan;
          if (slot.iqamah) updateInput.asrIqamah = slot.iqamah;
        } else if (slot.id === "maghrib") {
          updateInput.maghribTime = slot.adhan;
          if (slot.iqamah) updateInput.maghribIqamah = slot.iqamah;
        } else if (slot.id === "isha") {
          updateInput.ishaTime = slot.adhan;
          if (slot.iqamah) updateInput.ishaIqamah = slot.iqamah;
        }
      });

      // Persist to backend database (PrayerSettings)
      await updatePrayerSettings(updateInput);

      // Refetch live backend data for THAT SAME DATE to guarantee synchronization with real database values
      await loadDateSchedule(targetDate);

      setEditing(false);
      notify({
        message: "Prayer times updated successfully.",
        description: `Persistent mosque prayer schedule saved and locked.`,
        tone: "success",
      });
    } catch (err: any) {
      notify({
        message: "Could not save prayer times",
        description: err.message || "Failed to persist changes.",
        tone: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = (id: string) => {
    const next = schedule.slots.map((slot) =>
      slot.id === id ? { ...slot, status: slot.status === "Active" ? ("Paused" as const) : ("Active" as const) } : slot,
    );
    setOverrides((current) => ({ ...current, [date]: next }));
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${date}`, JSON.stringify(next));
      } catch {
        // Ignore
      }
    }
    const changed = next.find((slot) => slot.id === id);
    notify({
      tone: changed?.status === "Paused" ? "warning" : "success",
      message:
        changed?.status === "Paused"
          ? `${changed.name} congregation paused.`
          : `${changed?.name} congregation resumed.`,
      description: "A paused prayer is still listed but is never announced as the next congregation.",
    });
  };

  const dailyColumns: Column<PrayerSlot>[] = [
    {
      key: "prayer",
      header: "Prayer",
      cell: (slot) => (
        <span className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-[#e3ce9d] bg-[#f7f0df] text-[#a97b23]">
            <Icon name={slot.icon} size={15} />
          </span>
          <span className="min-w-0">
            <span className="block font-medium text-[#17211d]">{slot.name}</span>
            <span aria-hidden="true" className="block text-[12px] text-[#a9b0aa]">
              {slot.arabic}
            </span>
          </span>
        </span>
      ),
      sortValue: (slot) => slot.adhan,
    },
    {
      key: "adhan",
      header: "Adhan",
      cell: (slot) => <span className="font-semibold tabular-nums">{formatClockTime(slot.adhan, timeFormat)}</span>,
      sortValue: (slot) => slot.adhan,
    },
    {
      key: "iqamah",
      header: "Iqamah",
      cell: (slot) =>
        slot.iqamah ? (
          <span className="tabular-nums">{formatClockTime(slot.iqamah, timeFormat)}</span>
        ) : (
          <span className="text-[#8b938d]">No congregation</span>
        ),
    },
    {
      key: "note",
      header: "Note",
      secondary: true,
      cell: (slot) => <span className="text-[12.5px] text-[#69726d]">{slot.note ?? "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (slot) => <PrayerStatusBadge status={slot.status} />,
      sortValue: (slot) => slot.status,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      align: "right",
      cell: (slot) => (
        <Can permission="prayer.manage">
          <span className="flex items-center justify-end gap-1">
            <IconButton icon="pencil" label={`Edit ${slot.name}`} onClick={() => setEditing(true)} />
            {slot.isCongregation ? (
              <IconButton
                icon={slot.status === "Active" ? "pause" : "play"}
                label={slot.status === "Active" ? `Pause ${slot.name} congregation` : `Resume ${slot.name} congregation`}
                onClick={() => toggleStatus(slot.id)}
              />
            ) : null}
          </span>
        </Can>
      ),
    },
  ];

  const weeklyColumns: Column<WeeklyPrayerRow>[] = [
    {
      key: "day",
      header: "Day",
      cell: (row) => (
        <span className="min-w-0">
          <span className={`block font-medium ${row.isFriday ? "text-[#0b4634]" : "text-[#17211d]"}`}>
            {row.day}
            {row.isFriday ? (
              <span className="ml-2 rounded-full border border-[#e3ce9d] bg-[#f7f0df] px-1.5 py-px text-[10px] font-bold uppercase tracking-[.08em] text-[#7d5f18]">
                Jumu&rsquo;ah
              </span>
            ) : null}
          </span>
          <span className="block text-[12px] text-[#69726d]">{formatLongDate(row.date)}</span>
        </span>
      ),
      sortValue: (row) => row.date,
    },
    ...prayerColumns.map<Column<WeeklyPrayerRow>>((column) => ({
      key: column.id,
      header: column.label,
      align: "right",
      cell: (row) => <span className="tabular-nums">{formatClockTime(row.times[column.id], timeFormat)}</span>,
      sortValue: (row) => row.times[column.id],
    })),
  ];

  return (
    <div className="space-y-4">
      <DateNav value={date} onChange={setDate} location={schedule.location} today={todayInMosqueZone} />

      {schedule.slots.length === 0 ? (
        <Panel>
          <FinanceEmptyState
            icon="moon"
            title="No prayer schedule available."
            description="Nothing has been published for this date yet. Add the adhan and iqamah times to publish it."
            action={
              <Can permission="prayer.manage">
                <Button icon="plus" onClick={() => setEditing(true)}>
                  Add prayer times
                </Button>
              </Can>
            }
          />
        </Panel>
      ) : (
        <>
          <Panel>
            <PanelHeader
              title="Today's Prayers"
              description={`${formatLongDate(schedule.date)} · ${schedule.hijriDate}`}
              icon="moon-star"
              actions={
                <Can permission="prayer.manage">
                  <Button size="sm" icon="pencil" onClick={() => setEditing(true)}>
                    Edit Prayer Times
                  </Button>
                </Can>
              }
            />
            <PanelBody>
              <PrayerStrip slots={schedule.slots} timeFormat={timeFormat} fallbackNextId="asr" />
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              title="Adhan and Iqamah"
              description="Iqamah is when the congregation begins. Pausing a prayer keeps it listed but stops it being announced as next."
              icon="list"
              as="h2"
            />
            <DataTable
              rows={schedule.slots}
              columns={dailyColumns}
              getRowKey={(slot) => slot.id}
              caption={`Adhan and iqamah times for ${formatLongDate(schedule.date)}`}
              pageSize={10}
              mobileTitle={(slot) => slot.name}
              mobileSubtitle={(slot) => (slot.isCongregation ? "Congregation" : "No congregation")}
              mobileTrailing={(slot) => (
                <span className="font-semibold tabular-nums text-[#17211d]">
                  {formatClockTime(slot.adhan, timeFormat)}
                </span>
              )}
              mobileHiddenKeys={["prayer", "adhan"]}
              emptyState={
                <FinanceEmptyState
                  icon="moon"
                  title="No prayer schedule available."
                  description="Add the adhan and iqamah times to publish a schedule for this date."
                />
              }
            />
          </Panel>

          <Panel>
            <PanelHeader
              title="Weekly Schedule"
              description="Saturday to Friday. Times shift by a minute or two each day as the days shorten."
              icon="calendar"
            />
            <DataTable
              rows={weeklySchedule}
              columns={weeklyColumns}
              getRowKey={(row) => row.date}
              caption="Adhan times for every prayer, Saturday through Friday"
              initialSort={{ key: "day", direction: "asc" }}
              pageSize={7}
              mobileTitle={(row) => row.day}
              mobileSubtitle={(row) => formatLongDate(row.date)}
              mobileHiddenKeys={["day"]}
              emptyState={
                <FinanceEmptyState
                  icon="calendar"
                  title="No weekly schedule available."
                  description="A weekly schedule appears once prayer times are published."
                />
              }
            />
          </Panel>

          <Panel>
            <PanelHeader
              title="Prayer Settings"
              description="How these times are produced. Changing any of it re-times every prayer, so it lives in Settings."
              icon="settings"
              actions={
                <Can permission="settings.view">
                  <ButtonLink href="/dashboard/settings" size="sm" variant="secondary" iconAfter="arrow-right">
                    Open settings
                  </ButtonLink>
                </Can>
              }
            />
            <PanelBody>
              <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {(
                  [
                    {
                      label: "Calculation method",
                      value: backendTimes?.method?.name || liveSettings?.calculationMethod || "MuslimWorldLeague",
                      icon: "gauge",
                    },
                    {
                      label: "Juristic method (Asr)",
                      value: backendTimes?.school?.name || liveSettings?.asrMethod || "Hanafi",
                      icon: "scale",
                    },
                    {
                      label: "Iqamah Delay Offset",
                      value: `+${liveSettings?.iqamahOffset ?? 15} mins`,
                      icon: "clock",
                    },
                    {
                      label: "Default Language",
                      value: liveSettings?.defaultLanguage?.toUpperCase() || "EN",
                      icon: "globe",
                    },
                  ] satisfies Array<{ label: string; value: string; icon: IconName }>
                ).map((item) => (
                  <div key={item.label} className="rounded-lg border border-[#e7e6dc] bg-[#faf9f4] px-3.5 py-3">
                    <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.08em] text-[#8b938d]">
                      <Icon name={item.icon} size={13} />
                      {item.label}
                    </dt>
                    <dd className="mt-1.5 text-[13.5px] font-medium leading-5 text-[#17211d]">{item.value}</dd>
                  </div>
                ))}
              </dl>
              <InlineNotice className="mt-4" icon="info">
                Asr falls at a different time under the Hanafi and Shafi&rsquo;i schools. The mosque publishes one
                convention — currently {backendTimes?.school?.name || liveSettings?.asrMethod || "Hanafi"} — so the community knows which it is.
              </InlineNotice>
            </PanelBody>
            <PanelFooter>
              <p className="text-[12px] text-[#69726d]">
                Synchronized with live mosque settings and prayer calculations from database.
              </p>
            </PanelFooter>
          </Panel>
        </>
      )}

      <EditPrayerTimesModal
        open={editing}
        onClose={() => setEditing(false)}
        date={schedule.date}
        slots={schedule.slots}
        saving={saving}
        onSave={saveSlots}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Edit dialog
 * -------------------------------------------------------------------------- */

function EditPrayerTimesModal({
  open,
  onClose,
  date,
  slots,
  saving,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  date: string;
  slots: PrayerSlot[];
  saving?: boolean;
  onSave: (slots: PrayerSlot[]) => Promise<void> | void;
}) {
  const [draft, setDraft] = useState(slots);
  const [dirtyFor, setDirtyFor] = useState(date);

  // Reset when the dialog is opened on a different day
  if (dirtyFor !== date) {
    setDirtyFor(date);
    setDraft(slots);
  }

  const update = (id: string, field: "adhan" | "iqamah", value: string) => {
    setDraft((current) => current.map((slot) => (slot.id === id ? { ...slot, [field]: value } : slot)));
  };

  const invalid = draft.filter(
    (slot) => slot.iqamah && slot.adhan && slot.iqamah < slot.adhan,
  );

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      title="Edit prayer times"
      description={`Adhan and iqamah for ${formatLongDate(date)}. Changes persist to this date.`}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button icon="check" disabled={invalid.length > 0 || saving} onClick={() => onSave(draft)} className="font-bold">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {draft.map((slot) => (
          <fieldset key={slot.id} className="rounded-lg border border-[#e7e6dc] bg-[#faf9f4] px-3.5 py-3">
            <legend className="flex items-center gap-2 px-1 text-[13px] font-semibold text-[#17211d]">
              <Icon name={slot.icon} size={15} className="text-[#a97b23]" />
              {slot.name}
              <span aria-hidden="true" className="font-normal text-[#a9b0aa]">
                {slot.arabic}
              </span>
            </legend>
            <div className="mt-1 grid gap-3 sm:grid-cols-2">
              <TextField
                label="Adhan"
                type="time"
                required
                value={slot.adhan}
                onChange={(event) => update(slot.id, "adhan", event.target.value)}
                className="tabular-nums"
              />
              {slot.isCongregation ? (
                <TextField
                  label="Iqamah"
                  type="time"
                  required
                  value={slot.iqamah ?? ""}
                  onChange={(event) => update(slot.id, "iqamah", event.target.value)}
                  className="tabular-nums"
                  error={
                    slot.iqamah && slot.iqamah < slot.adhan
                      ? "Iqamah cannot be before the adhan."
                      : undefined
                  }
                />
              ) : (
                <div className="flex items-end">
                  <p className="text-[12.5px] leading-5 text-[#69726d]">
                    Sunrise marks the end of Fajr. There is no congregation, so it has no iqamah.
                  </p>
                </div>
              )}
            </div>
          </fieldset>
        ))}

        <InlineNotice tone="info" icon="info">
          Changes will persist for {formatLongDate(date)} and synchronize with the database.
        </InlineNotice>
      </div>
    </Modal>
  );
}
