"use client";

import { useMemo, useState } from "react";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import { Button, IconButton } from "@/components/finance/ui/button";
import { ConfirmDialog } from "@/components/finance/ui/dialogs";
import { SelectField, TextAreaField, TextField } from "@/components/finance/ui/form-field";
import { Icon } from "@/components/finance/ui/icon";
import { Modal } from "@/components/finance/ui/modal";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { FinanceEmptyState, FinanceErrorState, InlineNotice } from "@/components/finance/ui/states";
import { JumuahStatusBadge } from "@/components/ui/status-badge";
import { StatGrid } from "@/components/ui/stat-card";
import { useToast } from "@/components/ui/toast";
import { mosqueSettings } from "@/data/settings";
import { useApiResource } from "@/hooks/use-api";
import { ServiceError } from "@/services/query";
import {
  formatClockTime,
  formatCount,
  formatLongDate,
  formatRelativeDay,
  getTodayInTimezone,
} from "@/lib/mosque/format";
import type { StatMetric } from "@/lib/mosque/types";
import {
  createJumuah,
  deleteJumuah,
  fetchJumuahSchedules,
  updateJumuah,
  type CreateJumuahInput,
  type Jumuah,
  type UpdateJumuahInput,
} from "@/services/jumuahService";

/** Helper to check if a YYYY-MM-DD date is a Friday */
function isFriday(dateStr: string): boolean {
  if (!dateStr || dateStr.length !== 10) return false;
  const d = new Date(`${dateStr}T12:00:00Z`);
  return d.getUTCDay() === 5;
}

/** Helper to find the upcoming Friday date (YYYY-MM-DD) */
function getNextFriday(fromDateStr?: string): string {
  const base = fromDateStr ? new Date(`${fromDateStr}T12:00:00Z`) : new Date();
  const day = base.getUTCDay(); // 0 is Sunday, 5 is Friday
  const daysUntilFriday = (5 - day + 7) % 7;
  const target = new Date(base);
  target.setUTCDate(base.getUTCDate() + (daysUntilFriday === 0 ? 0 : daysUntilFriday));
  return target.toISOString().slice(0, 10);
}

export function JumuahView() {
  const { can } = useDashboardSession();
  const { notify } = useToast();

  const todayMosque = useMemo(() => getTodayInTimezone("Asia/Dhaka"), []);
  const nextFriday = useMemo(() => getNextFriday(todayMosque), [todayMosque]);
  const timeFormat = mosqueSettings.prayer.timeFormat;

  // Real backend API resource
  const {
    data: schedules = [],
    loading,
    error,
    refetch,
  } = useApiResource(() => fetchJumuahSchedules(), [], {
    enabled: can("prayer.view"),
  });

  // Modal & Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Jumuah | null>(null);
  const [deletingSchedule, setDeletingSchedule] = useState<Jumuah | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Active schedules count
  const activeSchedules = useMemo(
    () => (schedules || []).filter((s) => s.isActive),
    [schedules]
  );

  // Derived metrics for summary cards
  const firstSchedule = activeSchedules[0] || schedules[0];
  const secondSchedule = activeSchedules[1] || schedules[1];

  const metrics: StatMetric[] = [
    {
      id: "next",
      label: "Next Jumu'ah",
      value: formatLongDate(nextFriday),
      hint: formatRelativeDay(nextFriday, todayMosque),
      icon: "calendar",
      tone: "gold",
    },
    {
      id: "first",
      label: "First Jumu'ah",
      value: firstSchedule ? formatClockTime(firstSchedule.prayerTime, timeFormat) : "—",
      hint: firstSchedule
        ? `Khutbah ${formatClockTime(firstSchedule.khutbahTime, timeFormat)} · ${firstSchedule.imam || "Main Hall"}`
        : "No schedule configured",
      icon: "sun",
      tone: "neutral",
    },
    {
      id: "second",
      label: "Second Jumu'ah",
      value: secondSchedule ? formatClockTime(secondSchedule.prayerTime, timeFormat) : "—",
      hint: secondSchedule
        ? `Khutbah ${formatClockTime(secondSchedule.khutbahTime, timeFormat)} · ${secondSchedule.imam || "Second Hall"}`
        : schedules.length === 1
        ? "Single jama'at active"
        : "No second jama'at",
      icon: "sunset",
      tone: "neutral",
    },
    {
      id: "schedules-count",
      label: "Active Schedules",
      value: formatCount(activeSchedules.length),
      hint: `${formatCount(schedules.length)} total configured in roster`,
      icon: "users",
      tone: "positive",
    },
  ];

  // Delete handler
  const handleDeleteConfirm = async () => {
    if (!deletingSchedule) return;
    try {
      setIsDeleting(true);
      await deleteJumuah(deletingSchedule.id);
      notify({
        message: "Schedule deleted",
        description: "The Jumu'ah schedule has been removed.",
        tone: "info",
      });
      setDeletingSchedule(null);
      refetch();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "An error occurred while removing the schedule.";
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
    <div className="space-y-4">
      {/* Top Summary Cards */}
      <StatGrid metrics={metrics} />

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Main Schedules List */}
        <Panel className="xl:col-span-2">
          <PanelHeader
            title="Jumu'ah Schedule"
            description="Standing weekly schedules and dated Friday arrangements."
            icon="calendar"
            actions={
              <Can permission="jumuah.manage">
                <Button size="sm" icon="plus" onClick={() => setCreateOpen(true)}>
                  Add Schedule
                </Button>
              </Can>
            }
          />
          <PanelBody>
            {loading ? (
              <div className="grid gap-3 md:grid-cols-2">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-3 rounded-lg border border-[#e2e1d6] bg-white p-5 animate-pulse"
                  >
                    <div className="h-4 w-1/2 rounded bg-[#eceae0]" />
                    <div className="h-8 w-full rounded bg-[#f5f4ed]" />
                    <div className="h-4 w-3/4 rounded bg-[#eceae0]" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <FinanceErrorState
                title="Unable to load Jumu'ah schedules"
                description={error}
                onRetry={refetch}
              />
            ) : schedules.length === 0 ? (
              <FinanceEmptyState
                title="No Jumu'ah schedules configured"
                description="Create a standing weekly schedule or a specific Friday arrangement to publish Friday prayer times."
                action={
                  <Can permission="jumuah.manage">
                    <Button icon="plus" onClick={() => setCreateOpen(true)}>
                      Add Schedule
                    </Button>
                  </Can>
                }
              />
            ) : (
              <ul className="grid gap-3 md:grid-cols-2">
                {schedules.map((schedule, index) => (
                  <SessionCard
                    key={schedule.id}
                    schedule={schedule}
                    index={index}
                    timeFormat={timeFormat}
                    onEdit={() => setEditingSchedule(schedule)}
                    onDelete={() => setDeletingSchedule(schedule)}
                  />
                ))}
              </ul>
            )}
          </PanelBody>
          <PanelFooter>
            <p className="text-[12px] text-[#69726d]">
              {formatCount(activeSchedules.length)} of {formatCount(schedules.length)} schedules published and visible to the community.
            </p>
          </PanelFooter>
        </Panel>

        {/* Schedule Info / Guidance */}
        <Panel>
          <PanelHeader title="Schedule Guidance" description="How standing and dated schedules work." icon="chart" />
          <PanelBody className="space-y-4">
            <div className="rounded-lg border border-[#e7e6dc] bg-[#faf9f4] p-4 text-[13px] leading-relaxed text-[#4d564f]">
              <h4 className="font-semibold text-[#17211d]">Standing vs Dated Fridays</h4>
              <p className="mt-1">
                A <strong>standing weekly schedule</strong> (with no specific date) recurs every Friday automatically.
              </p>
              <p className="mt-2">
                A <strong>dated Friday schedule</strong> takes precedence on that particular Friday, allowing custom khutbah times, guest khatibs, or special arrangements.
              </p>
            </div>

            <InlineNotice icon="info">
              Times are stored in local mosque time. The prayer time must always follow or equal the khutbah time.
            </InlineNotice>
          </PanelBody>
        </Panel>
      </div>

      {/* Friday Khutbah & Sermon Information */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <PanelHeader
            title="Friday Khutbah & Sermon"
            description="Upcoming khatib and sermon details configured in the active schedule."
            icon="megaphone"
          />
          <PanelBody>
            <div className="rounded-lg border border-[#e7e6dc] bg-[#faf9f4] px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#c79a45]">
                    {firstSchedule?.location || "Main Prayer Hall"}
                  </p>
                  <h3 className="mt-1 text-[18px] font-semibold leading-snug text-[#17211d]">
                    {firstSchedule?.notes || "Friday Congregational Khutbah & Prayer"}
                  </h3>
                </div>
                <JumuahStatusBadge status={firstSchedule?.isActive ? "Open" : "Closed"} />
              </div>

              <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Khatib / Imam", value: firstSchedule?.imam || "To be announced", icon: "user" as const },
                  {
                    label: "Next Friday",
                    value: formatLongDate(firstSchedule?.date || nextFriday),
                    icon: "calendar" as const,
                  },
                  { label: "Location", value: firstSchedule?.location || "Main Hall", icon: "globe" as const },
                ].map((item) => (
                  <div key={item.label}>
                    <dt className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[.08em] text-[#8b938d]">
                      <Icon name={item.icon} size={12} />
                      {item.label}
                    </dt>
                    <dd className="mt-0.5 text-[13.5px] font-medium text-[#17211d]">{item.value}</dd>
                  </div>
                ))}
              </dl>

              {firstSchedule?.notes ? (
                <p className="mt-4 border-t border-[#eceae0] pt-3.5 text-[13px] leading-6 text-[#4d564f]">
                  {firstSchedule.notes}
                </p>
              ) : null}
            </div>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Active Jama'ats" description="Summary of current Friday prayers." icon="book" />
          <PanelBody>
            {schedules.length === 0 ? (
              <p className="text-sm text-[#69726d]">No schedules available.</p>
            ) : (
              <ul className="divide-y divide-[#f0efe6]">
                {schedules.map((s, idx) => (
                  <li key={s.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-medium text-[#17211d]">
                        {s.date ? `Friday, ${formatLongDate(s.date)}` : `Jama'at ${idx + 1} (Weekly)`}
                      </p>
                      <p className="mt-0.5 truncate text-[12px] text-[#69726d]">
                        {formatClockTime(s.prayerTime, timeFormat)} · {s.imam || s.location || "Main Hall"}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        s.isActive ? "bg-[#eaf2ed] text-[#0d4d3b]" : "bg-[#f4f3ec] text-[#717972]"
                      }`}
                    >
                      {s.isActive ? "Active" : "Draft"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </PanelBody>
        </Panel>
      </div>

      {/* Create Modal */}
      {createOpen ? (
        <ScheduleFormModal
          mode="create"
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSuccess={() => {
            setCreateOpen(false);
            refetch();
          }}
        />
      ) : null}

      {/* Edit Modal */}
      {editingSchedule ? (
        <ScheduleFormModal
          mode="edit"
          schedule={editingSchedule}
          open={Boolean(editingSchedule)}
          onClose={() => setEditingSchedule(null)}
          onSuccess={() => {
            setEditingSchedule(null);
            refetch();
          }}
        />
      ) : null}

      {/* Delete Confirmation Dialog */}
      {deletingSchedule ? (
        <ConfirmDialog
          open={Boolean(deletingSchedule)}
          onClose={() => setDeletingSchedule(null)}
          onConfirm={handleDeleteConfirm}
          title="Delete Jumu'ah Schedule"
          description={
            deletingSchedule.date
              ? `Are you sure you want to delete the schedule for Friday, ${formatLongDate(deletingSchedule.date)}? This action cannot be undone.`
              : "Are you sure you want to delete this standing weekly Jumu'ah schedule? This action cannot be undone."
          }
          confirmLabel={isDeleting ? "Deleting..." : "Delete Schedule"}
          tone="danger"
        />
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Session Card Component
 * -------------------------------------------------------------------------- */

function SessionCard({
  schedule,
  index,
  timeFormat,
  onEdit,
  onDelete,
}: {
  schedule: Jumuah;
  index: number;
  timeFormat: "12h" | "24h";
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isStanding = !schedule.date;
  const label = schedule.date
    ? `Friday, ${formatLongDate(schedule.date)}`
    : index === 0
    ? "First Jumu'ah (Standing)"
    : `Jumu'ah ${index + 1} (Standing)`;

  return (
    <li className="flex flex-col justify-between rounded-lg border border-[#e2e1d6] bg-white p-4 sm:p-5">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-[#17211d]">{label}</h3>
            <p className="mt-0.5 truncate text-[12px] text-[#69726d]">
              {schedule.location || (isStanding ? "Main Prayer Hall" : "Specific Friday")}
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11.5px] font-medium ${
              schedule.isActive
                ? "bg-[#eaf2ed] text-[#0d4d3b] border border-[#c2d8cb]"
                : "bg-[#f4f3ec] text-[#69726d] border border-[#e2e1d6]"
            }`}
          >
            {schedule.isActive ? "Published" : "Unpublished"}
          </span>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-md border border-[#e7e6dc] bg-[#faf9f4] px-3 py-2.5">
            <dt className="text-[10.5px] font-bold uppercase tracking-[.08em] text-[#8b938d]">Khutbah</dt>
            <dd className="mt-0.5 text-[16px] font-semibold tabular-nums text-[#17211d]">
              {formatClockTime(schedule.khutbahTime, timeFormat)}
            </dd>
          </div>
          <div className="rounded-md border border-[#c2d8cb] bg-[#eaf2ed] px-3 py-2.5">
            <dt className="text-[10.5px] font-bold uppercase tracking-[.08em] text-[#5f7d70]">Prayer</dt>
            <dd className="mt-0.5 text-[16px] font-semibold tabular-nums text-[#0b4634]">
              {formatClockTime(schedule.prayerTime, timeFormat)}
            </dd>
          </div>
        </dl>

        <dl className="mt-4 space-y-2 text-[13px]">
          <div className="flex items-start justify-between gap-3">
            <dt className="text-[#69726d]">Imam / Khatib</dt>
            <dd className="text-right font-medium text-[#17211d]">{schedule.imam || "—"}</dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="text-[#69726d]">Location</dt>
            <dd className="text-right font-medium text-[#17211d]">{schedule.location || "Main Hall"}</dd>
          </div>
          {schedule.notes ? (
            <div className="border-t border-[#f0efe6] pt-2">
              <dt className="text-[11px] font-medium uppercase tracking-wider text-[#8b938d]">Notes</dt>
              <dd className="mt-0.5 text-[12.5px] text-[#4d564f] line-clamp-2">{schedule.notes}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      <Can permission="jumuah.manage">
        <div className="mt-4 flex items-center justify-between border-t border-[#eceae0] pt-3.5">
          <Button size="sm" variant="secondary" icon="pencil" onClick={onEdit}>
            Edit schedule
          </Button>
          <IconButton
            icon="trash"
            tone="danger"
            label="Delete Jumu'ah schedule"
            onClick={onDelete}
          />
        </div>
      </Can>
    </li>
  );
}

/* -------------------------------------------------------------------------- *
 * Create / Edit Schedule Modal Component
 * -------------------------------------------------------------------------- */

type FormState = {
  isStanding: boolean;
  date: string;
  khutbahTime: string;
  prayerTime: string;
  imam: string;
  location: string;
  notes: string;
  isActive: boolean;
};

function ScheduleFormModal({
  mode,
  schedule,
  open,
  onClose,
  onSuccess,
}: {
  mode: "create" | "edit";
  schedule?: Jumuah;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { notify } = useToast();
  const timeFormat = mosqueSettings.prayer.timeFormat;

  const initialFormState: FormState = {
    isStanding: schedule ? schedule.date === null : true,
    date: schedule?.date || "",
    khutbahTime: schedule?.khutbahTime || "13:00",
    prayerTime: schedule?.prayerTime || "13:30",
    imam: schedule?.imam || "",
    location: schedule?.location || "",
    notes: schedule?.notes || "",
    isActive: schedule ? schedule.isActive : true,
  };

  const [form, setForm] = useState<FormState>(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>(undefined);

  // Client-side validations
  const prayerBeforeKhutbah = form.prayerTime && form.khutbahTime && form.prayerTime < form.khutbahTime;
  const invalidFridayDate = !form.isStanding && form.date ? !isFriday(form.date) : false;
  const missingDate = !form.isStanding && !form.date;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setFormError(null);
    setFieldErrors(undefined);

    if (prayerBeforeKhutbah || invalidFridayDate || missingDate || !form.khutbahTime || !form.prayerTime) {
      return;
    }

    try {
      setSubmitting(true);

      if (mode === "create") {
        const payload: CreateJumuahInput = {
          date: form.isStanding ? null : form.date,
          khutbahTime: form.khutbahTime,
          prayerTime: form.prayerTime,
          imam: form.imam.trim() || null,
          location: form.location.trim() || null,
          notes: form.notes.trim() || null,
          isActive: form.isActive,
        };

        await createJumuah(payload);
        notify({
          message: "Jumu'ah schedule created",
          description: `Khutbah ${formatClockTime(payload.khutbahTime, timeFormat)}, prayer ${formatClockTime(payload.prayerTime, timeFormat)}.`,
          tone: "success",
        });
      } else if (mode === "edit" && schedule) {
        const payload: UpdateJumuahInput = {
          date: form.isStanding ? null : form.date,
          khutbahTime: form.khutbahTime,
          prayerTime: form.prayerTime,
          imam: form.imam.trim() || null,
          location: form.location.trim() || null,
          notes: form.notes.trim() || null,
          isActive: form.isActive,
        };

        await updateJumuah(schedule.id, payload);
        notify({
          message: "Jumu'ah schedule updated",
          description: `Khutbah ${formatClockTime(payload.khutbahTime || form.khutbahTime, timeFormat)}, prayer ${formatClockTime(payload.prayerTime || form.prayerTime, timeFormat)}.`,
          tone: "success",
        });
      }

      onSuccess();
    } catch (err: unknown) {
      if (err instanceof ServiceError && err.fieldErrors) {
        setFieldErrors(err.fieldErrors as Record<string, string[]>);
      }
      const errorMsg = err instanceof Error ? err.message : "Failed to save Jumu'ah schedule.";
      setFormError(errorMsg);
      notify({
        message: "Unable to save schedule",
        description: errorMsg,
        tone: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "create" ? "Add Jumu'ah Schedule" : "Edit Jumu'ah Schedule"}
      description="Configure times, imam and location for this Friday congregational prayer."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            icon="check"
            disabled={submitting || prayerBeforeKhutbah || invalidFridayDate || missingDate}
            onClick={handleSubmit}
          >
            {submitting ? "Saving..." : mode === "create" ? "Create Schedule" : "Save Changes"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError ? (
          <div className="rounded-md border border-[#f5c6cb] bg-[#f8d7da] p-3 text-[13px] text-[#721c24]">
            {formError}
          </div>
        ) : null}

        {/* Schedule Type Selection */}
        <SelectField
          label="Schedule Type"
          value={form.isStanding ? "standing" : "specific"}
          options={[
            { value: "standing", label: "Standing Weekly Schedule (Every Friday)" },
            { value: "specific", label: "Specific Friday Date" },
          ]}
          onChange={(event) =>
            setForm({
              ...form,
              isStanding: event.target.value === "standing",
              date: event.target.value === "standing" ? "" : form.date,
            })
          }
        />

        {/* Specific Date input */}
        {!form.isStanding ? (
          <TextField
            label="Friday Date"
            type="date"
            required
            value={form.date}
            onChange={(event) => setForm({ ...form, date: event.target.value })}
            error={
              (submitted && missingDate ? "Please select a Friday date." : undefined) ||
              (invalidFridayDate ? "Selected date is not a Friday. Jumu'ah dates must be on a Friday." : undefined) ||
              fieldErrors?.date?.[0]
            }
            hint="Must fall on a Friday"
          />
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Khutbah time"
            type="time"
            required
            value={form.khutbahTime}
            onChange={(event) => setForm({ ...form, khutbahTime: event.target.value })}
            error={fieldErrors?.khutbahTime?.[0]}
          />
          <TextField
            label="Prayer time"
            type="time"
            required
            value={form.prayerTime}
            onChange={(event) => setForm({ ...form, prayerTime: event.target.value })}
            error={
              (prayerBeforeKhutbah ? "The prayer time cannot be earlier than the khutbah." : undefined) ||
              fieldErrors?.prayerTime?.[0]
            }
          />
        </div>

        <TextField
          label="Imam / Khatib"
          placeholder="e.g. Imam Abdul Karim"
          value={form.imam}
          onChange={(event) => setForm({ ...form, imam: event.target.value })}
          error={fieldErrors?.imam?.[0]}
        />

        <TextField
          label="Hall / Location"
          placeholder="e.g. Main Prayer Hall, Ground Floor"
          value={form.location}
          onChange={(event) => setForm({ ...form, location: event.target.value })}
          error={fieldErrors?.location?.[0]}
        />

        <SelectField
          label="Publish Status"
          value={form.isActive ? "true" : "false"}
          options={[
            { value: "true", label: "Published (Visible)" },
            { value: "false", label: "Unpublished (Draft)" },
          ]}
          onChange={(event) => setForm({ ...form, isActive: event.target.value === "true" })}
        />

        <TextAreaField
          label="Notes / Sermon Topic"
          rows={3}
          placeholder="Optional notes or sermon topic for this schedule..."
          value={form.notes}
          onChange={(event) => setForm({ ...form, notes: event.target.value })}
          error={fieldErrors?.notes?.[0]}
        />
      </form>
    </Modal>
  );
}
