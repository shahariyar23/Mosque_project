"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, IconButton } from "@/components/finance/ui/button";
import { DataTable, type Column } from "@/components/finance/ui/data-table";
import { ConfirmDialog } from "@/components/finance/ui/dialogs";
import { FinanceFilters, SegmentedControl, type SelectFilter } from "@/components/finance/ui/filters";
import { SelectField, TextAreaField, TextField } from "@/components/finance/ui/form-field";
import { Modal } from "@/components/finance/ui/modal";
import { Panel, PanelBody, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { TableSkeleton } from "@/components/finance/ui/skeleton";
import { EventGridSkeleton } from "@/components/ui/skeletons";
import { FinanceEmptyState, FinanceErrorState, InlineNotice } from "@/components/finance/ui/states";
import { Toggle } from "@/components/ui/toggle";
import { CapacityMeter } from "@/components/ui/charts";
import { DetailDrawer, DetailField, DetailGrid, DetailSection } from "@/components/ui/detail-drawer";
import { EventCard } from "@/components/mosque/events/event-card";
import { PersonCell } from "@/components/ui/avatar";
import { StatGrid } from "@/components/ui/stat-card";
import { EventCategoryChip, EventStatusBadge, RegistrationStatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { registrationsForEvent } from "@/data/registrations";
import {
  formatClockTime,
  formatCount,
  formatLongDate,
  formatRelativeDay,
  getTodayInTimezone,
} from "@/lib/mosque/format";
import {
  eventCategories,
  eventStatuses,
  type EventCategory,
  type EventDraft,
  type EventStatus,
  type MosqueEvent,
  type StatMetric,
} from "@/lib/mosque/types";
import {
  createEvent,
  deleteEvent,
  fetchEvents,
  updateEvent,
} from "@/services/eventService";

const emptyDraft: EventDraft = {
  title: "",
  category: "Community",
  date: "",
  startTime: "",
  endTime: "",
  location: "",
  speaker: "",
  description: "",
  capacity: "100",
  registrationRequired: true,
};

export function EventsView({ openCreateOnMount = false }: { openCreateOnMount?: boolean }) {
  const { notify } = useToast();
  const [events, setEvents] = useState<MosqueEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");

  const [selected, setSelected] = useState<MosqueEvent | null>(null);
  const [creating, setCreating] = useState(openCreateOnMount);
  const [editing, setEditing] = useState<MosqueEvent | null>(null);
  const [deleting, setDeleting] = useState<MosqueEvent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const todayStr = useMemo(() => getTodayInTimezone(), []);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchEvents({ all: true });
      setEvents(result.rows);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load events from the server.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Dynamically computed metrics based on real database records
  const metrics: StatMetric[] = useMemo(() => {
    const currentMonthPrefix = todayStr.slice(0, 7); // "YYYY-MM"

    const upcomingEvents = events.filter(
      (e) => (e.status === "Upcoming" || e.status === "Ongoing") && e.date >= todayStr
    );
    const thisMonthEvents = events.filter((e) => e.date.startsWith(currentMonthPrefix));
    const totalRegistrations = events.reduce((sum, e) => sum + (e.registered || 0), 0);
    const completedEvents = events.filter(
      (e) => e.status === "Completed" || (e.status !== "Cancelled" && e.date < todayStr)
    );

    // Compute hint for next upcoming event
    const sortedUpcoming = [...upcomingEvents].sort((a, b) => a.date.localeCompare(b.date));
    const nextEventHint =
      sortedUpcoming.length > 0
        ? `Next: ${formatLongDate(sortedUpcoming[0].date)}`
        : "No upcoming events scheduled";

    return [
      {
        id: "upcoming",
        label: "Upcoming Events",
        value: formatCount(upcomingEvents.length),
        hint: nextEventHint,
        icon: "calendar-days",
        tone: "gold",
      },
      {
        id: "month",
        label: "This Month",
        value: formatCount(thisMonthEvents.length),
        hint: `Scheduled in ${new Date().toLocaleString("default", { month: "long" })}`,
        icon: "calendar",
        tone: "neutral",
      },
      {
        id: "registrations",
        label: "Registrations",
        value: formatCount(totalRegistrations),
        hint: "Across all mosque programmes",
        icon: "clipboard-check",
        tone: "positive",
      },
      {
        id: "completed",
        label: "Completed",
        value: formatCount(completedEvents.length),
        hint: "Delivered programmes",
        icon: "check-circle",
        tone: "neutral",
      },
    ];
  }, [events, todayStr]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return events.filter((event) => {
      if (needle) {
        const haystack = `${event.title} ${event.location} ${event.speaker ?? ""} ${event.description} ${event.category}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (category !== "all" && event.category !== category) return false;
      if (status !== "all" && event.status !== status) return false;
      return true;
    });
  }, [category, events, search, status]);

  /** Soonest first for upcoming work, most recent first for everything else. */
  const ordered = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const aUpcoming = a.status === "Upcoming" || a.status === "Ongoing";
        const bUpcoming = b.status === "Upcoming" || b.status === "Ongoing";
        if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
        return aUpcoming ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
      }),
    [filtered],
  );

  const filters: SelectFilter[] = [
    {
      id: "category",
      label: "Category",
      value: category,
      onChange: setCategory,
      options: [
        { value: "all", label: "All categories" },
        ...eventCategories.map((value) => ({ value, label: value })),
      ],
    },
    {
      id: "status",
      label: "Status",
      value: status,
      onChange: setStatus,
      options: [{ value: "all", label: "Any status" }, ...eventStatuses.map((value) => ({ value, label: value }))],
    },
  ];

  const activeFilterCount = (category !== "all" ? 1 : 0) + (status !== "all" ? 1 : 0);
  const resetFilters = () => {
    setCategory("all");
    setStatus("all");
  };

  const handleCreateEvent = async (draft: EventDraft) => {
    setIsSubmitting(true);
    try {
      const created = await createEvent({
        title: draft.title.trim(),
        category: draft.category,
        date: draft.date,
        startTime: draft.startTime,
        endTime: draft.endTime || null,
        location: draft.location.trim(),
        speaker: draft.speaker.trim() || null,
        description: draft.description.trim(),
        capacity: Number(draft.capacity) || 100,
        registrationRequired: draft.registrationRequired,
      });

      setCreating(false);
      await loadEvents();
      notify({
        message: "Event created successfully.",
        description: `${created.title} · ${formatLongDate(created.date)} has been published.`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create event. Please try again.";
      notify({
        message: "Could not create event.",
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateEvent = async (id: string, draft: EventDraft & { status: EventStatus }) => {
    setIsSubmitting(true);
    try {
      const updated = await updateEvent(id, {
        title: draft.title.trim(),
        category: draft.category,
        status: draft.status,
        date: draft.date,
        startTime: draft.startTime,
        endTime: draft.endTime || null,
        location: draft.location.trim(),
        speaker: draft.speaker.trim() || null,
        description: draft.description.trim(),
        capacity: Number(draft.capacity) || 100,
        registrationRequired: draft.registrationRequired,
      });

      setEditing(null);
      if (selected && selected.id === id) {
        setSelected(updated);
      }
      await loadEvents();
      notify({
        message: "Event updated successfully.",
        description: `${updated.title} has been updated.`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update event. Please try again.";
      notify({
        message: "Could not update event.",
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!deleting) return;
    try {
      await deleteEvent(deleting.id);
      notify({
        message: "Event deleted.",
        description: `${deleting.title} has been removed from the calendar.`,
      });
      if (selected && selected.id === deleting.id) {
        setSelected(null);
      }
      setDeleting(null);
      await loadEvents();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete event. Please try again.";
      notify({
        message: "Could not delete event.",
        description: message,
      });
    }
  };

  const columns: Column<MosqueEvent>[] = [
    {
      key: "event",
      header: "Event",
      cell: (event) => (
        <span className="min-w-0">
          <span className="block font-medium text-[#17211d]">{event.title}</span>
          <span className="block truncate text-[12px] text-[#69726d]">
            {event.speaker ?? (event.registrationRequired ? "Registration required" : "Drop-in")}
          </span>
        </span>
      ),
      sortValue: (event) => event.title,
    },
    {
      key: "date",
      header: "Date",
      cell: (event) => (
        <span className="min-w-0">
          <span className="block tabular-nums">{formatLongDate(event.date)}</span>
          <span className="block text-[12px] text-[#8b938d]">
            {event.timeLabel ?? formatClockTime(event.startTime)}
          </span>
        </span>
      ),
      sortValue: (event) => `${event.date} ${event.startTime}`,
    },
    {
      key: "category",
      header: "Category",
      cell: (event) => <EventCategoryChip category={event.category} />,
      sortValue: (event) => event.category,
    },
    {
      key: "location",
      header: "Location",
      secondary: true,
      cell: (event) => <span className="truncate">{event.location}</span>,
      sortValue: (event) => event.location,
    },
    {
      key: "registrations",
      header: "Registrations",
      align: "right",
      cell: (event) =>
        event.registrationRequired ? (
          <span className="tabular-nums">
            <span className="font-semibold text-[#17211d]">{formatCount(event.registered)}</span>
            <span className="text-[#8b938d]"> / {formatCount(event.capacity)}</span>
          </span>
        ) : (
          <span className="text-[#8b938d]">Not required</span>
        ),
      sortValue: (event) => event.registered,
    },
    {
      key: "status",
      header: "Status",
      cell: (event) => <EventStatusBadge status={event.status} />,
      sortValue: (event) => event.status,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      align: "right",
      cell: (event) => (
        <span className="flex items-center justify-end gap-1">
          <IconButton icon="eye" label={`View ${event.title}`} onClick={() => setSelected(event)} />
          <Can permission="event.update">
            <IconButton icon="pencil" label={`Edit ${event.title}`} onClick={() => setEditing(event)} />
          </Can>
          <Can permission="event.delete">
            <IconButton icon="trash" label={`Delete ${event.title}`} onClick={() => setDeleting(event)} />
          </Can>
        </span>
      ),
    },
  ];

  const emptyState = (
    <FinanceEmptyState
      icon="calendar-days"
      title="No events found."
      description={
        activeFilterCount > 0 || search
          ? "Nothing matches the current search and filters. Try clearing them."
          : "The calendar is empty. Create an event to open it for registration."
      }
      action={
        activeFilterCount > 0 || search ? (
          <Button
            variant="secondary"
            icon="close"
            onClick={() => {
              resetFilters();
              setSearch("");
            }}
          >
            Clear search and filters
          </Button>
        ) : (
          <Can permission="event.create">
            <Button icon="plus" onClick={() => setCreating(true)}>
              Create Event
            </Button>
          </Can>
        )
      }
    />
  );

  return (
    <div className="space-y-4">
      <StatGrid metrics={metrics} />

      <Panel>
        <PanelHeader
          title="Programme"
          description="Every event the mosque has scheduled, is running, or has delivered."
          icon="calendar-days"
          actions={
            <Can permission="event.create">
              <Button size="sm" icon="plus" onClick={() => setCreating(true)}>
                Create Event
              </Button>
            </Can>
          }
        />

        <FinanceFilters
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "Search events…",
            label: "Search events by title, location, speaker or category",
          }}
          filters={filters}
          activeCount={activeFilterCount}
          onReset={resetFilters}
          trailing={
            <SegmentedControl
              label="View"
              size="sm"
              value={view}
              options={[
                { value: "grid", label: "Grid" },
                { value: "list", label: "List" },
              ]}
              onChange={setView}
            />
          }
        />

        {loading && events.length === 0 ? (
          <div className="p-6">
            {view === "grid" ? <EventGridSkeleton count={6} /> : <TableSkeleton rows={5} />}
          </div>
        ) : error && events.length === 0 ? (
          <FinanceErrorState
            title="Unable to load events."
            description={error}
            onRetry={loadEvents}
          />
        ) : ordered.length === 0 ? (
          emptyState
        ) : view === "grid" ? (
          <PanelBody>
            <p className="sr-only" aria-live="polite">
              {formatCount(ordered.length)} events shown.
            </p>
            <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {ordered.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onOpen={() => setSelected(event)}
                />
              ))}
            </ul>
          </PanelBody>
        ) : (
          <DataTable
            rows={ordered}
            columns={columns}
            getRowKey={(event) => event.id}
            caption="Mosque events with date, category, location, registrations and status"
            pageSize={10}
            mobileTitle={(event) => event.title}
            mobileSubtitle={(event) => formatLongDate(event.date)}
            mobileTrailing={(event) => <EventStatusBadge status={event.status} />}
            mobileHiddenKeys={["event", "status", "date"]}
            emptyState={emptyState}
          />
        )}
      </Panel>

      {selected ? (
        <EventDetailDrawer
          event={selected}
          onClose={() => setSelected(null)}
          onEdit={() => {
            setEditing(selected);
          }}
          onDelete={() => {
            setDeleting(selected);
          }}
        />
      ) : null}

      <CreateEventModal
        open={creating}
        onClose={() => setCreating(false)}
        onSave={handleCreateEvent}
        isSubmitting={isSubmitting}
      />

      {editing ? (
        <EditEventModal
          open={!!editing}
          event={editing}
          onClose={() => setEditing(null)}
          onSave={(draft) => handleUpdateEvent(editing.id, draft)}
          isSubmitting={isSubmitting}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          open={!!deleting}
          onClose={() => setDeleting(null)}
          onConfirm={handleDeleteEvent}
          title="Delete event?"
          description={`Are you sure you want to cancel and delete "${deleting.title}"? This event will be cancelled on the mosque calendar.`}
          confirmLabel="Delete Event"
          tone="danger"
        />
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Detail drawer
 * -------------------------------------------------------------------------- */

function EventDetailDrawer({
  event,
  onClose,
  onEdit,
  onDelete,
}: {
  event: MosqueEvent;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const registrations = registrationsForEvent(event.id);
  const confirmed = registrations.filter((registration) => registration.status === "Confirmed");
  const guests = registrations.reduce((total, registration) => total + registration.guests, 0);

  return (
    <DetailDrawer
      open
      onClose={onClose}
      eyebrow={event.category}
      title={event.title}
      subtitle={`${formatLongDate(event.date)} · ${event.timeLabel ?? formatClockTime(event.startTime)}`}
      badge={<EventStatusBadge status={event.status} />}
      footer={
        <>
          <Can permission="event.update">
            <Button size="sm" icon="pencil" onClick={onEdit}>
              Edit event
            </Button>
          </Can>
          <Can permission="event.delete">
            <Button size="sm" variant="danger" icon="trash" onClick={onDelete}>
              Delete
            </Button>
          </Can>
          <Button size="sm" variant="secondary" onClick={onClose} className="ml-auto">
            Close
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {event.status === "Cancelled" ? (
          <InlineNotice tone="neutral" icon="alert">
            This event was cancelled. Registrations against it no longer hold a place.
          </InlineNotice>
        ) : null}

        <DetailSection title="Details">
          <DetailGrid>
            <DetailField label="Date" value={formatLongDate(event.date)} />
            <DetailField label="Day" value={formatRelativeDay(event.date)} />
            <DetailField
              label="Time"
              value={
                event.timeLabel ??
                `${formatClockTime(event.startTime)}${event.endTime ? ` – ${formatClockTime(event.endTime)}` : ""}`
              }
            />
            <DetailField label="Category" value={<EventCategoryChip category={event.category} />} />
            <DetailField label="Location" value={event.location} full />
            {event.speaker ? <DetailField label="Speaker" value={event.speaker} full /> : null}
          </DetailGrid>
        </DetailSection>

        <DetailSection title="Description">
          <p className="text-[13px] leading-6 text-[#4d564f]">{event.description}</p>
        </DetailSection>

        {event.registrationRequired ? (
          <DetailSection title="Registration">
            <CapacityMeter
              filled={event.registered}
              capacity={event.capacity}
              filledLabel="Registered"
              capacityLabel="Capacity"
              remainingLabel="Places left"
            />
            <p className="mt-3 text-[12.5px] text-[#69726d]">
              {formatCount(event.registered)} registered of {formatCount(event.capacity)} total capacity.
            </p>
          </DetailSection>
        ) : (
          <DetailSection title="Registration">
            <p className="rounded-lg border border-dashed border-[#dcdacd] bg-[#faf9f4] px-3.5 py-4 text-[13px] leading-6 text-[#69726d]">
              This event does not take registrations. Anyone may attend, and the hall holds{" "}
              {formatCount(event.capacity)}.
            </p>
          </DetailSection>
        )}

        <DetailSection title={`Registrations (${registrations.length})`}>
          {registrations.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[#dcdacd] bg-[#faf9f4] px-3.5 py-6 text-center text-[13px] text-[#69726d]">
              No registrations found for this event yet.
            </p>
          ) : (
            <ul className="divide-y divide-[#f0efe6]">
              {registrations.map((registration) => (
                <li key={registration.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
                  <div className="min-w-0 text-[13px]">
                    <PersonCell
                      name={registration.participantName}
                      meta={registration.guests > 0 ? `+${registration.guests} guests` : registration.participantPhone}
                      size="sm"
                    />
                  </div>
                  <RegistrationStatusBadge status={registration.status} />
                </li>
              ))}
            </ul>
          )}
        </DetailSection>
      </div>
    </DetailDrawer>
  );
}

/* -------------------------------------------------------------------------- *
 * Create event modal
 * -------------------------------------------------------------------------- */

function CreateEventModal({
  open,
  onClose,
  onSave,
  isSubmitting = false,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (draft: EventDraft) => void;
  isSubmitting?: boolean;
}) {
  const [draft, setDraft] = useState<EventDraft>(emptyDraft);
  const [submitted, setSubmitted] = useState(false);

  const set = <Key extends keyof EventDraft>(key: Key, value: EventDraft[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const errors = {
    title: draft.title.trim().length === 0 ? "An event needs a name." : undefined,
    date: draft.date.length === 0 ? "Pick a date." : undefined,
    startTime: draft.startTime.length === 0 ? "Pick a start time." : undefined,
    endTime:
      draft.endTime.length > 0 && draft.endTime <= draft.startTime
        ? "The end time has to be after the start."
        : undefined,
    location: draft.location.trim().length === 0 ? "Say where it is being held." : undefined,
    capacity:
      draft.registrationRequired && (Number(draft.capacity) || 0) <= 0
        ? "Set how many places are available."
        : undefined,
  };
  const valid = Object.values(errors).every((error) => error === undefined);
  const show = (key: keyof typeof errors) => (submitted ? errors[key] : undefined);

  const close = () => {
    setDraft(emptyDraft);
    setSubmitted(false);
    onClose();
  };

  const submit = () => {
    setSubmitted(true);
    if (!valid || isSubmitting) return;
    onSave(draft);
    setDraft(emptyDraft);
    setSubmitted(false);
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Create event"
      description="Adds a programme to the mosque calendar. It is created as Upcoming and can be edited afterwards."
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button icon="check" onClick={submit} disabled={isSubmitting}>
            {isSubmitting ? "Creating…" : "Create Event"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Event name"
          required
          value={draft.title}
          onChange={(event) => set("title", event.target.value)}
          error={show("title")}
          containerClassName="sm:col-span-2"
        />
        <SelectField
          label="Category"
          required
          value={draft.category}
          options={[...eventCategories]}
          onChange={(event) => set("category", event.target.value as EventDraft["category"])}
        />
        <TextField
          label="Date"
          type="date"
          required
          value={draft.date}
          onChange={(event) => set("date", event.target.value)}
          error={show("date")}
        />
        <TextField
          label="Start time"
          type="time"
          required
          value={draft.startTime}
          onChange={(event) => set("startTime", event.target.value)}
          error={show("startTime")}
        />
        <TextField
          label="End time"
          type="time"
          value={draft.endTime}
          onChange={(event) => set("endTime", event.target.value)}
          error={show("endTime")}
        />
        <TextField
          label="Location"
          required
          value={draft.location}
          onChange={(event) => set("location", event.target.value)}
          error={show("location")}
          placeholder="Main Prayer Hall"
        />
        <TextField
          label="Speaker"
          value={draft.speaker}
          onChange={(event) => set("speaker", event.target.value)}
          placeholder="Imam Abdul Karim"
        />
        <TextAreaField
          label="Description"
          rows={4}
          value={draft.description}
          onChange={(event) => set("description", event.target.value)}
          hint="What it is, who it is for, and anything an attendee needs to bring or know."
          containerClassName="sm:col-span-2"
        />

        <div className="rounded-lg border border-[#e7e6dc] bg-[#faf9f4] px-3.5 py-1 sm:col-span-2">
          <Toggle
            label="Registration required"
            description="Off means anyone may attend without booking — right for weekly study circles and drop-in classes."
            checked={draft.registrationRequired}
            onChange={(next) => set("registrationRequired", next)}
          />
        </div>

        <TextField
          label={draft.registrationRequired ? "Capacity" : "Hall capacity"}
          type="number"
          min={1}
          required={draft.registrationRequired}
          value={draft.capacity}
          onChange={(event) => set("capacity", event.target.value)}
          error={show("capacity")}
          hint={
            draft.registrationRequired
              ? "Places that can be booked. Registrations past this go on a waitlist."
              : "Recorded for reference only, since no places are booked."
          }
          containerClassName="sm:col-span-2"
        />
      </div>

      {submitted && !valid ? (
        <InlineNotice className="mt-4" tone="neutral" icon="alert">
          Some details still need attention — see the messages above.
        </InlineNotice>
      ) : null}
    </Modal>
  );
}

/* -------------------------------------------------------------------------- *
 * Edit event modal
 * -------------------------------------------------------------------------- */

function EditEventModal({
  open,
  event,
  onClose,
  onSave,
  isSubmitting = false,
}: {
  open: boolean;
  event: MosqueEvent;
  onClose: () => void;
  onSave: (draft: EventDraft & { status: EventStatus }) => void;
  isSubmitting?: boolean;
}) {
  const [draft, setDraft] = useState<EventDraft & { status: EventStatus }>({
    title: event.title,
    category: event.category,
    status: event.status,
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime || "",
    location: event.location,
    speaker: event.speaker || "",
    description: event.description,
    capacity: String(event.capacity),
    registrationRequired: event.registrationRequired,
  });
  const [submitted, setSubmitted] = useState(false);

  const set = <Key extends keyof (EventDraft & { status: EventStatus })>(
    key: Key,
    value: (EventDraft & { status: EventStatus })[Key]
  ) => setDraft((current) => ({ ...current, [key]: value }));

  const errors = {
    title: draft.title.trim().length === 0 ? "An event needs a name." : undefined,
    date: draft.date.length === 0 ? "Pick a date." : undefined,
    startTime: draft.startTime.length === 0 ? "Pick a start time." : undefined,
    endTime:
      draft.endTime.length > 0 && draft.endTime <= draft.startTime
        ? "The end time has to be after the start."
        : undefined,
    location: draft.location.trim().length === 0 ? "Say where it is being held." : undefined,
    capacity:
      draft.registrationRequired && (Number(draft.capacity) || 0) <= 0
        ? "Set how many places are available."
        : undefined,
  };
  const valid = Object.values(errors).every((error) => error === undefined);
  const show = (key: keyof typeof errors) => (submitted ? errors[key] : undefined);

  const submit = () => {
    setSubmitted(true);
    if (!valid || isSubmitting) return;
    onSave(draft);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Event"
      description={`Update details, logistics and status for "${event.title}".`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button icon="check" onClick={submit} disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save Changes"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Event name"
          required
          value={draft.title}
          onChange={(e) => set("title", e.target.value)}
          error={show("title")}
          containerClassName="sm:col-span-2"
        />
        <SelectField
          label="Category"
          required
          value={draft.category}
          options={[...eventCategories]}
          onChange={(e) => set("category", e.target.value as EventCategory)}
        />
        <SelectField
          label="Status"
          required
          value={draft.status}
          options={[...eventStatuses]}
          onChange={(e) => set("status", e.target.value as EventStatus)}
        />
        <TextField
          label="Date"
          type="date"
          required
          value={draft.date}
          onChange={(e) => set("date", e.target.value)}
          error={show("date")}
        />
        <TextField
          label="Start time"
          type="time"
          required
          value={draft.startTime}
          onChange={(e) => set("startTime", e.target.value)}
          error={show("startTime")}
        />
        <TextField
          label="End time"
          type="time"
          value={draft.endTime}
          onChange={(e) => set("endTime", e.target.value)}
          error={show("endTime")}
        />
        <TextField
          label="Location"
          required
          value={draft.location}
          onChange={(e) => set("location", e.target.value)}
          error={show("location")}
        />
        <TextField
          label="Speaker"
          value={draft.speaker}
          onChange={(e) => set("speaker", e.target.value)}
        />
        <TextAreaField
          label="Description"
          rows={4}
          value={draft.description}
          onChange={(e) => set("description", e.target.value)}
          containerClassName="sm:col-span-2"
        />

        <div className="rounded-lg border border-[#e7e6dc] bg-[#faf9f4] px-3.5 py-1 sm:col-span-2">
          <Toggle
            label="Registration required"
            checked={draft.registrationRequired}
            onChange={(next) => set("registrationRequired", next)}
          />
        </div>

        <TextField
          label={draft.registrationRequired ? "Capacity" : "Hall capacity"}
          type="number"
          min={1}
          required={draft.registrationRequired}
          value={draft.capacity}
          onChange={(e) => set("capacity", e.target.value)}
          error={show("capacity")}
          containerClassName="sm:col-span-2"
        />
      </div>

      {submitted && !valid ? (
        <InlineNotice className="mt-4" tone="neutral" icon="alert">
          Some details still need attention — see the messages above.
        </InlineNotice>
      ) : null}
    </Modal>
  );
}
