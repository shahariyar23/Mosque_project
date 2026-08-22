"use client";

import { useMemo, useState } from "react";
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
import { prayerColumns, scheduleFor, weeklySchedule } from "@/data/prayer-times";
import { mosqueSettings } from "@/data/settings";
import { formatClockTime, formatLongDate, REFERENCE_DATE } from "@/lib/mosque/format";
import type { DailyPrayerSchedule, PrayerSlot, WeeklyPrayerRow } from "@/lib/mosque/types";

/**
 * Prayer schedule management.
 *
 * Front-end only: edits live in this component's state and are announced with a toast. Nothing is
 * posted anywhere. The `onSave` shape is a single schedule object, which is what a
 * `PUT /api/prayer-times/:date` will take, so wiring the API later touches this file and no other.
 *
 * Only `prayer.manage` sees the edit control. `prayer.view` is a base permission — every signed-in
 * person can read the schedule — so the read and write halves of this screen are gated separately
 * rather than the whole page being hidden from most of the mosque.
 */
export function PrayerTimesView({ initialDate = REFERENCE_DATE }: { initialDate?: string }) {
  const { notify } = useToast();
  const [date, setDate] = useState(initialDate);

  /** Edits by date, so moving off a day and back does not lose an unsaved change. */
  const [overrides, setOverrides] = useState<Record<string, PrayerSlot[]>>({});
  const [editing, setEditing] = useState(false);

  const schedule = useMemo<DailyPrayerSchedule>(() => {
    const base = scheduleFor(date);
    return overrides[date] ? { ...base, slots: overrides[date] } : base;
  }, [date, overrides]);

  const timeFormat = mosqueSettings.prayer.timeFormat;

  const saveSlots = (slots: PrayerSlot[]) => {
    setOverrides((current) => ({ ...current, [date]: slots }));
    setEditing(false);
    notify({
      message: "Prayer times updated successfully.",
      description: `${formatLongDate(date)} — adhan and iqamah saved for this device only.`,
    });
  };

  const toggleStatus = (id: string) => {
    const next = schedule.slots.map((slot) =>
      slot.id === id ? { ...slot, status: slot.status === "Active" ? ("Paused" as const) : ("Active" as const) } : slot,
    );
    setOverrides((current) => ({ ...current, [date]: next }));
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
      <DateNav value={date} onChange={setDate} location={schedule.location} />

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
                  description="The week's times are published alongside the daily schedule."
                />
              }
              footNote="Adhan times only — iqamah is set per day above."
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
                    { label: "Calculation method", value: mosqueSettings.prayer.calculationMethod, icon: "gauge" },
                    { label: "Juristic method (Asr)", value: mosqueSettings.prayer.juristicMethod, icon: "scale" },
                    { label: "Location", value: mosqueSettings.prayer.location, icon: "map-pin" },
                    { label: "Timezone", value: mosqueSettings.prayer.timezone, icon: "globe" },
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
                convention — currently {mosqueSettings.prayer.juristicMethod} — so the community knows which it is.
              </InlineNotice>
            </PanelBody>
            <PanelFooter>
              <p className="text-[12px] text-[#69726d]">
                Times shown for {schedule.location}. Sample data — not a live calculation.
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
        onSave={saveSlots}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Edit dialog
 * -------------------------------------------------------------------------- */

/**
 * Adhan and iqamah for the whole day in one form.
 *
 * `type="time"` rather than a custom picker: the browser gives a proper keyboard, a proper mobile
 * wheel, validation and screen-reader support for free, and it stores "HH:MM" — exactly the shape the
 * data uses, so nothing has to be parsed.
 *
 * Iqamah is only offered for prayers that have a congregation. Sunrise has no jama'at, so offering a
 * field for it would invite someone to fill in a time that means nothing.
 */
function EditPrayerTimesModal({
  open,
  onClose,
  date,
  slots,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  date: string;
  slots: PrayerSlot[];
  onSave: (slots: PrayerSlot[]) => void;
}) {
  const [draft, setDraft] = useState(slots);
  const [dirtyFor, setDirtyFor] = useState(date);

  // Reset when the dialog is opened on a different day, without an effect.
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
      onClose={onClose}
      title="Edit prayer times"
      description={`Adhan and iqamah for ${formatLongDate(date)}. Changes apply to this date only.`}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button icon="check" disabled={invalid.length > 0} onClick={() => onSave(draft)}>
            Save Changes
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

        <InlineNotice tone="gold" icon="info">
          This is a front-end preview — times are held in the browser and are not saved to the mosque record.
        </InlineNotice>
      </div>
    </Modal>
  );
}
