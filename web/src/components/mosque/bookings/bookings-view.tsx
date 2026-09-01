"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, IconButton } from "@/components/finance/ui/button";
import { DataTable, type Column } from "@/components/finance/ui/data-table";
import { ConfirmDialog } from "@/components/finance/ui/dialogs";
import { FinanceFilters, type SelectFilter } from "@/components/finance/ui/filters";
import { SelectField, TextAreaField, TextField } from "@/components/finance/ui/form-field";
import { Modal } from "@/components/finance/ui/modal";
import { Panel, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { TableSkeleton } from "@/components/finance/ui/skeleton";
import { FinanceEmptyState, FinanceErrorState, InlineNotice } from "@/components/finance/ui/states";
import { PersonCell } from "@/components/ui/avatar";
import { DetailDrawer, DetailField, DetailGrid, DetailSection, DetailStats } from "@/components/ui/detail-drawer";
import { StatGrid } from "@/components/ui/stat-card";
import { BookingStatusBadge, ServiceCategoryChip } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { formatAmount } from "@/lib/finance/format";
import { downloadCsv } from "@/lib/mosque/export";
import {
  formatClockTime,
  formatCount,
  formatDayMonth,
  formatLongDate,
  formatRelativeDay,
  getTodayInTimezone,
} from "@/lib/mosque/format";
import {
  bookingStatuses,
  serviceCategories,
  type Booking,
  type BookingDraft,
  type BookingStatus,
  type Service,
  type StatMetric,
} from "@/lib/mosque/types";
import {
  createBooking,
  deleteBooking,
  fetchBookingStats,
  fetchBookings,
  updateBooking,
  updateBookingStatus,
} from "@/services/bookingService";
import { fetchServices } from "@/services/serviceService";

const emptyDraft: BookingDraft = {
  serviceId: "",
  requesterName: "",
  requesterPhone: "",
  requesterEmail: "",
  scheduledDate: "",
  scheduledTime: "",
  partySize: "0",
  location: "",
  notes: "",
};

const feeLabel = (fee: number) => (fee === 0 ? "Free" : formatAmount(fee));

/**
 * Booking requests against the service catalogue — connected to the real NestJS Bookings API.
 */
export function BookingsView({ openAddOnMount = false }: { openAddOnMount?: boolean }) {
  const { notify } = useToast();

  // — Data states —
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // — Stats state —
  const [stats, setStats] = useState({ total: 0, pending: 0, confirmed: 0, thisWeek: 0 });

  // — Filters —
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [scheduledFrom, setScheduledFrom] = useState("");
  const [scheduledTo, setScheduledTo] = useState("");

  // — UI state —
  const [selected, setSelected] = useState<Booking | null>(null);
  const [adding, setAdding] = useState(openAddOnMount);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState<Booking | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // — Load Bookings & Services —
  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bookingsRes, servicesRes, statsRes] = await Promise.all([
        fetchBookings({ all: true }),
        fetchServices({ all: true }).catch(() => ({ rows: [], total: 0, page: 1, pageSize: 10, pageCount: 1 })),
        fetchBookingStats().catch(() => ({ total: 0, pending: 0, confirmed: 0, thisWeek: 0 })),
      ]);
      setBookings(bookingsRes.rows);
      setServices(servicesRes.rows);
      setStats(statsRes);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load bookings from the server.");
      // Still fetch services for the modal if bookings had an issue
      try {
        const servicesRes = await fetchServices({ all: true });
        setServices(servicesRes.rows);
      } catch {
        // Non-fatal
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      const s = await fetchBookingStats();
      setStats(s);
    } catch {
      // Non-fatal
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // — Live stats metrics from PostgreSQL —
  const metrics: StatMetric[] = useMemo(
    () => [
      {
        id: "total",
        label: "Total Bookings",
        value: formatCount(stats.total),
        hint: "Requests on record",
        icon: "calendar",
        tone: "neutral",
      },
      {
        id: "pending",
        label: "Pending",
        value: formatCount(stats.pending),
        hint: "Awaiting a decision",
        icon: "clock",
        tone: "warning",
      },
      {
        id: "confirmed",
        label: "Confirmed",
        value: formatCount(stats.confirmed),
        hint: "Booked and in the diary",
        icon: "check-circle",
        tone: "positive",
      },
      {
        id: "week",
        label: "This Week",
        value: formatCount(stats.thisWeek),
        hint: "Scheduled in the next 7 days",
        icon: "calendar-days",
        tone: "gold",
      },
    ],
    [stats]
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return bookings.filter((booking) => {
      if (needle) {
        const haystack =
          `${booking.requesterName} ${booking.serviceName} ${booking.requesterPhone} ${booking.id} ${booking.assignedTo ?? ""}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (status !== "all" && booking.status !== status) return false;
      if (category !== "all" && booking.category !== category) return false;
      if (scheduledFrom && booking.scheduledDate < scheduledFrom) return false;
      if (scheduledTo && booking.scheduledDate > scheduledTo) return false;
      return true;
    });
  }, [bookings, category, scheduledFrom, scheduledTo, search, status]);

  const filters: SelectFilter[] = [
    {
      id: "status",
      label: "Status",
      value: status,
      onChange: setStatus,
      options: [{ value: "all", label: "Any status" }, ...bookingStatuses.map((value) => ({ value, label: value }))],
    },
    {
      id: "category",
      label: "Category",
      value: category,
      onChange: setCategory,
      options: [
        { value: "all", label: "All categories" },
        ...serviceCategories.map((value) => ({ value, label: value })),
      ],
    },
  ];

  const activeFilterCount =
    (status !== "all" ? 1 : 0) + (category !== "all" ? 1 : 0) + (scheduledFrom ? 1 : 0) + (scheduledTo ? 1 : 0);

  const resetFilters = () => {
    setStatus("all");
    setCategory("all");
    setScheduledFrom("");
    setScheduledTo("");
  };

  // — Create booking —
  const addBooking = async (draft: BookingDraft) => {
    const svc = services.find((s) => s.id === draft.serviceId);
    setIsSubmitting(true);
    try {
      const created = await createBooking({
        serviceId: draft.serviceId,
        requesterName: draft.requesterName.trim(),
        requesterPhone: draft.requesterPhone.trim(),
        requesterEmail: draft.requesterEmail.trim() || undefined,
        scheduledDate: draft.scheduledDate,
        scheduledTime: draft.scheduledTime || undefined,
        location: draft.location.trim() || svc?.location || "Main prayer hall",
        partySize: Number(draft.partySize) || 0,
        notes: draft.notes.trim() || undefined,
      });

      setBookings((current) => [created, ...current]);
      setAdding(false);
      await refreshStats();
      notify({
        message: "Booking request logged.",
        description: `${created.requesterName} · ${created.serviceName} is now recorded.`,
      });
    } catch (err: unknown) {
      notify({
        tone: "danger",
        message: "Failed to log booking.",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // — Update booking status —
  const changeBookingStatus = async (booking: Booking, newStatus: BookingStatus) => {
    try {
      const updated = await updateBookingStatus(booking.id, { status: newStatus });
      setBookings((current) => current.map((b) => (b.id === updated.id ? updated : b)));
      if (selected?.id === updated.id) setSelected(updated);
      await refreshStats();
      notify({
        message: `Booking marked as ${newStatus}.`,
        description: `${updated.requesterName}'s request has been updated.`,
      });
    } catch (err: unknown) {
      notify({
        tone: "danger",
        message: "Failed to update status.",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  // — Update booking details —
  const saveBookingEdit = async (draft: BookingDraft) => {
    if (!editing) return;
    setIsSubmitting(true);
    try {
      const updated = await updateBooking(editing.id, {
        serviceId: draft.serviceId || undefined,
        requesterName: draft.requesterName.trim(),
        requesterPhone: draft.requesterPhone.trim(),
        requesterEmail: draft.requesterEmail.trim() || undefined,
        scheduledDate: draft.scheduledDate,
        scheduledTime: draft.scheduledTime || undefined,
        location: draft.location.trim() || undefined,
        partySize: Number(draft.partySize) || 0,
        notes: draft.notes.trim() || undefined,
      });

      setBookings((current) => current.map((b) => (b.id === updated.id ? updated : b)));
      if (selected?.id === updated.id) setSelected(updated);
      setEditing(null);
      await refreshStats();
      notify({ message: "Booking updated.", description: "Changes have been saved." });
    } catch (err: unknown) {
      notify({
        tone: "danger",
        message: "Failed to update booking.",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // — Cancel / Remove booking —
  const cancelBooking = async (booking: Booking) => {
    try {
      const updated = await deleteBooking(booking.id);
      setBookings((current) => current.filter((b) => b.id !== updated.id));
      if (selected?.id === updated.id) setSelected(null);
      await refreshStats();
      notify({ message: "Booking cancelled.", description: `The slot has been released.` });
    } catch (err: unknown) {
      notify({
        tone: "danger",
        message: "Failed to cancel booking.",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  const exportCsv = () => {
    downloadCsv("noor-mosque-bookings.csv", filtered, [
      { header: "Booking ID", value: (booking) => booking.id },
      { header: "Requester", value: (booking) => booking.requesterName },
      { header: "Phone", value: (booking) => booking.requesterPhone },
      { header: "Email", value: (booking) => booking.requesterEmail },
      { header: "Service", value: (booking) => booking.serviceName },
      { header: "Category", value: (booking) => booking.category },
      { header: "Status", value: (booking) => booking.status },
      { header: "Scheduled date", value: (booking) => booking.scheduledDate },
      { header: "Scheduled time", value: (booking) => booking.scheduledTime ?? "" },
      { header: "Submitted", value: (booking) => booking.submittedAt },
      { header: "Location", value: (booking) => booking.location },
      { header: "Party size", value: (booking) => booking.partySize },
      { header: "Fee (BDT)", value: (booking) => booking.fee },
      { header: "Assigned to", value: (booking) => booking.assignedTo ?? "" },
    ]);
    notify({
      tone: "info",
      message: "Export downloaded.",
      description: `${formatCount(filtered.length)} rows, matching the filters currently applied.`,
    });
  };

  const columns: Column<Booking>[] = [
    {
      key: "requester",
      header: "Requester",
      cell: (booking) => <PersonCell name={booking.requesterName} meta={booking.requesterPhone} size="sm" />,
      sortValue: (booking) => booking.requesterName,
    },
    {
      key: "service",
      header: "Service",
      cell: (booking) => (
        <span className="min-w-0">
          <span className="block font-medium text-[#17211d]">{booking.serviceName}</span>
          <span className="block truncate text-[12px] text-[#69726d]">
            {booking.assignedTo ? `Assigned to ${booking.assignedTo}` : "Unassigned"}
          </span>
        </span>
      ),
      sortValue: (booking) => booking.serviceName,
    },
    {
      key: "category",
      header: "Category",
      secondary: true,
      cell: (booking) => <ServiceCategoryChip category={booking.category} />,
      sortValue: (booking) => booking.category,
    },
    {
      key: "scheduled",
      header: "Scheduled",
      cell: (booking) => (
        <span className="min-w-0">
          <span className="block tabular-nums">{formatLongDate(booking.scheduledDate)}</span>
          <span className="block text-[12px] text-[#8b938d]">
            {booking.scheduledTime ? formatClockTime(booking.scheduledTime) : "Time to confirm"}
          </span>
        </span>
      ),
      sortValue: (booking) => `${booking.scheduledDate} ${booking.scheduledTime ?? ""}`,
    },
    {
      key: "status",
      header: "Status",
      cell: (booking) => <BookingStatusBadge status={booking.status} />,
      sortValue: (booking) => booking.status,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      align: "right",
      cell: (booking) => (
        <span className="flex items-center justify-end gap-1">
          <IconButton icon="eye" label={`View ${booking.requesterName}'s booking`} onClick={() => setSelected(booking)} />
          <Can permission="booking.manage">
            {booking.status === "Pending" ? (
              <IconButton
                icon="check"
                label={`Confirm ${booking.requesterName}'s booking`}
                onClick={() => changeBookingStatus(booking, "Confirmed")}
              />
            ) : null}
            {booking.status !== "Cancelled" ? (
              <IconButton
                icon="x-circle"
                tone="danger"
                label={`Cancel ${booking.requesterName}'s booking`}
                onClick={() => setCancelling(booking)}
              />
            ) : null}
            <IconButton icon="pencil" label={`Update ${booking.requesterName}'s booking`} onClick={() => setEditing(booking)} />
          </Can>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <StatGrid metrics={metrics} />

      <Panel>
        <PanelHeader
          title="Bookings"
          description="Requests the community has made against the mosque's services."
          icon="calendar-days"
          actions={
            <>
              <Button variant="secondary" size="sm" icon="download" onClick={exportCsv}>
                Export
              </Button>
              <Can permission="booking.manage">
                <Button size="sm" icon="plus" onClick={() => setAdding(true)}>
                  New Booking
                </Button>
              </Can>
            </>
          }
        />

        <FinanceFilters
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "Search bookings…",
            label: "Search bookings by requester, service, phone or booking ID",
          }}
          filters={filters}
          dateRange={{
            label: "Scheduled date",
            fromLabel: "Scheduled on or after",
            toLabel: "Scheduled on or before",
            from: scheduledFrom,
            to: scheduledTo,
            onFromChange: setScheduledFrom,
            onToChange: setScheduledTo,
          }}
          activeCount={activeFilterCount}
          onReset={resetFilters}
        />

        {loading ? (
          <TableSkeleton rows={6} columns={5} />
        ) : error ? (
          <FinanceErrorState
            title="Could not load bookings."
            description={error}
            onRetry={loadBookings}
          />
        ) : (
          <DataTable
            rows={filtered}
            columns={columns}
            getRowKey={(booking) => booking.id}
            caption="Booking requests with requester, service, scheduled date and status"
            initialSort={{ key: "scheduled", direction: "desc" }}
            pageSize={10}
            mobileTitle={(booking) => booking.requesterName}
            mobileSubtitle={(booking) => `${booking.serviceName} · ${formatLongDate(booking.scheduledDate)}`}
            mobileTrailing={(booking) => <BookingStatusBadge status={booking.status} />}
            mobileHiddenKeys={["requester", "status"]}
            emptyState={
              <FinanceEmptyState
                icon="calendar-days"
                title="No bookings found."
                description={
                  activeFilterCount > 0 || search
                    ? "Nothing matches the current search and filters. Try clearing them."
                    : "No requests have been made yet. Log the first booking to get started."
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
                    <Can permission="booking.manage">
                      <Button icon="plus" onClick={() => setAdding(true)}>
                        New Booking
                      </Button>
                    </Can>
                  )
                }
              />
            }
          />
        )}
      </Panel>

      {selected ? (
        <BookingDetailDrawer
          booking={selected}
          onClose={() => setSelected(null)}
          onEdit={() => { setEditing(selected); setSelected(null); }}
          onStatusChange={(status) => changeBookingStatus(selected, status)}
          onCancel={() => cancelBooking(selected)}
        />
      ) : null}

      <AddBookingModal
        open={adding}
        services={services}
        onClose={() => setAdding(false)}
        onSave={addBooking}
        isSubmitting={isSubmitting}
      />

      {editing ? (
        <AddBookingModal
          open
          editMode
          services={services}
          initialDraft={{
            serviceId: editing.serviceId,
            requesterName: editing.requesterName,
            requesterPhone: editing.requesterPhone,
            requesterEmail: editing.requesterEmail,
            scheduledDate: editing.scheduledDate,
            scheduledTime: editing.scheduledTime ?? "",
            partySize: String(editing.partySize),
            location: editing.location,
            notes: editing.notes,
          }}
          onClose={() => setEditing(null)}
          onSave={saveBookingEdit}
          isSubmitting={isSubmitting}
        />
      ) : null}

      <ConfirmDialog
        open={cancelling !== null}
        onClose={() => setCancelling(null)}
        onConfirm={() => {
          if (cancelling) cancelBooking(cancelling);
          setCancelling(null);
        }}
        title="Cancel this booking?"
        description="The scheduled slot is released immediately and will no longer be held."
        confirmLabel="Cancel booking"
        cancelLabel="Keep it"
        tone="danger"
        details={
          cancelling ? (
            <dl className="space-y-1.5 text-[13px]">
              <div className="flex justify-between gap-4">
                <dt className="text-[#69726d]">Requester</dt>
                <dd className="font-medium text-[#17211d]">{cancelling.requesterName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#69726d]">Service</dt>
                <dd className="text-right font-medium text-[#17211d]">{cancelling.serviceName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#69726d]">Scheduled Date</dt>
                <dd className="font-medium tabular-nums text-[#17211d]">{formatLongDate(cancelling.scheduledDate)}</dd>
              </div>
            </dl>
          ) : null
        }
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Detail drawer
 * -------------------------------------------------------------------------- */

function BookingDetailDrawer({
  booking,
  onClose,
  onEdit,
  onStatusChange,
  onCancel,
}: {
  booking: Booking;
  onClose: () => void;
  onEdit: () => void;
  onStatusChange: (status: BookingStatus) => void;
  onCancel: () => void;
}) {
  return (
    <DetailDrawer
      open
      onClose={onClose}
      eyebrow={booking.id.slice(0, 8).toUpperCase()}
      title={booking.requesterName}
      subtitle={booking.serviceName}
      avatarName={booking.requesterName}
      badge={
        <>
          <BookingStatusBadge status={booking.status} />
          <ServiceCategoryChip category={booking.category} />
        </>
      }
      footer={
        <>
          <Can permission="booking.manage">
            {booking.status === "Pending" ? (
              <Button size="sm" icon="check" onClick={() => onStatusChange("Confirmed")}>
                Confirm booking
              </Button>
            ) : null}
            {booking.status === "Confirmed" ? (
              <Button size="sm" icon="check-circle" onClick={() => onStatusChange("Completed")}>
                Mark completed
              </Button>
            ) : null}
            {booking.status !== "Cancelled" ? (
              <Button size="sm" variant="danger" icon="x-circle" onClick={onCancel}>
                Cancel booking
              </Button>
            ) : null}
            <Button size="sm" icon="pencil" onClick={onEdit}>
              Update
            </Button>
          </Can>
          <Button size="sm" variant="secondary" onClick={onClose} className="ml-auto">
            Close
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {booking.status === "Declined" ? (
          <InlineNotice tone="neutral" icon="alert">
            This request was declined by the office. See the notes for the reason.
          </InlineNotice>
        ) : null}
        {booking.status === "Cancelled" ? (
          <InlineNotice tone="neutral" icon="info">
            This request was cancelled by the requester and no longer holds a slot.
          </InlineNotice>
        ) : null}

        <DetailStats
          items={[
            { label: "Scheduled", value: formatDayMonth(booking.scheduledDate), hint: formatRelativeDay(booking.scheduledDate) },
            { label: "Fee", value: feeLabel(booking.fee) },
            { label: "Party size", value: booking.partySize > 0 ? formatCount(booking.partySize) : "—" },
          ]}
        />

        <DetailSection title="Request">
          <DetailGrid>
            <DetailField label="Service" value={booking.serviceName} />
            <DetailField label="Category" value={<ServiceCategoryChip category={booking.category} />} />
            <DetailField
              label="Scheduled"
              value={`${formatLongDate(booking.scheduledDate)}${
                booking.scheduledTime ? ` · ${formatClockTime(booking.scheduledTime)}` : ""
              }`}
            />
            <DetailField label="Submitted" value={formatRelativeDay(booking.submittedAt)} />
            <DetailField label="Assigned to" value={booking.assignedTo ?? "Unassigned"} />
            <DetailField label="Location" value={booking.location} full />
          </DetailGrid>
        </DetailSection>

        <DetailSection title="Requester">
          <DetailGrid>
            <DetailField label="Name" value={booking.requesterName} />
            <DetailField
              label="On the register"
              value={booking.memberId ? `Member · ${booking.memberId}` : "Visitor"}
            />
            <DetailField label="Phone" value={<span className="tabular-nums">{booking.requesterPhone}</span>} />
            <DetailField label="Email" value={<span className="break-all">{booking.requesterEmail || "—"}</span>} />
          </DetailGrid>
        </DetailSection>

        <DetailSection title="Notes">
          {booking.notes ? (
            <p className="text-[13px] leading-6 text-[#4d564f]">{booking.notes}</p>
          ) : (
            <p className="rounded-lg border border-dashed border-[#dcdacd] bg-[#faf9f4] px-3.5 py-4 text-[13px] text-[#69726d]">
              No notes were added to this request.
            </p>
          )}
        </DetailSection>

        <DetailSection title="Contribution">
          <InlineNotice icon="info">
            The {feeLabel(booking.fee)} shown is the service&rsquo;s suggested contribution. What is actually collected is
            recorded and receipted in the finance module.
          </InlineNotice>
        </DetailSection>
      </div>
    </DetailDrawer>
  );
}

/* -------------------------------------------------------------------------- *
 * New / Edit booking modal
 * -------------------------------------------------------------------------- */

function AddBookingModal({
  open,
  services,
  onClose,
  onSave,
  isSubmitting = false,
  editMode = false,
  initialDraft,
}: {
  open: boolean;
  services: Service[];
  onClose: () => void;
  onSave: (draft: BookingDraft) => void;
  isSubmitting?: boolean;
  editMode?: boolean;
  initialDraft?: BookingDraft;
}) {
  const [draft, setDraft] = useState<BookingDraft>(initialDraft ?? emptyDraft);
  const [submitted, setSubmitted] = useState(false);

  const todayStr = useMemo(() => getTodayInTimezone(), []);

  useEffect(() => {
    if (initialDraft) setDraft(initialDraft);
  }, [initialDraft]);

  const set = <Key extends keyof BookingDraft>(key: Key, value: BookingDraft[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const service = useMemo(() => services.find((s) => s.id === draft.serviceId), [services, draft.serviceId]);

  const bookableServices = useMemo(
    () => services.filter((s) => s.status === "Active" && s.requiresBooking),
    [services]
  );

  const errors = {
    serviceId: draft.serviceId.length === 0 ? "Choose the service being requested." : undefined,
    requesterName: draft.requesterName.trim().length === 0 ? "Who is the request for?" : undefined,
    requesterPhone: draft.requesterPhone.trim().length < 6 ? "A contactable phone number is required." : undefined,
    requesterEmail:
      draft.requesterEmail.trim().length > 0 && !draft.requesterEmail.includes("@")
        ? "That does not look like an email address."
        : undefined,
    scheduledDate:
      draft.scheduledDate.length === 0
        ? "Pick the date the service is needed."
        : !editMode && draft.scheduledDate < todayStr
          ? "That date has passed."
          : undefined,
  };
  const valid = Object.values(errors).every((error) => error === undefined);
  const show = (key: keyof typeof errors) => (submitted ? errors[key] : undefined);

  const close = () => {
    setDraft(initialDraft ?? emptyDraft);
    setSubmitted(false);
    onClose();
  };

  const submit = () => {
    setSubmitted(true);
    if (!valid) return;
    onSave(draft);
    if (!editMode) {
      setDraft(emptyDraft);
      setSubmitted(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={editMode ? "Update booking" : "New booking"}
      description={
        editMode
          ? "Update details of this booking request."
          : "Logs a request against a service. It starts as Pending for the office to confirm."
      }
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button icon="check" onClick={submit} disabled={isSubmitting}>
            {isSubmitting ? (editMode ? "Saving…" : "Logging…") : editMode ? "Save Changes" : "Log Booking"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Service"
          required
          value={draft.serviceId}
          placeholder="Select a service…"
          options={bookableServices.map((item) => ({ value: item.id, label: `${item.name} · ${item.category}` }))}
          onChange={(event) => set("serviceId", event.target.value)}
          error={show("serviceId")}
          hint={
            service
              ? `${feeLabel(service.fee)} · coordinated by ${service.coordinator}`
              : "Only active services that take bookings are listed."
          }
          containerClassName="sm:col-span-2"
        />
        <TextField
          label="Requester name"
          required
          value={draft.requesterName}
          onChange={(event) => set("requesterName", event.target.value)}
          error={show("requesterName")}
          containerClassName="sm:col-span-2"
        />
        <TextField
          label="Phone"
          type="tel"
          required
          placeholder="+880 1XXX-XXXXXX"
          value={draft.requesterPhone}
          onChange={(event) => set("requesterPhone", event.target.value)}
          error={show("requesterPhone")}
        />
        <TextField
          label="Email"
          type="email"
          value={draft.requesterEmail}
          onChange={(event) => set("requesterEmail", event.target.value)}
          error={show("requesterEmail")}
        />
        <TextField
          label="Preferred date"
          type="date"
          required
          min={todayStr}
          value={draft.scheduledDate}
          onChange={(event) => set("scheduledDate", event.target.value)}
          error={show("scheduledDate")}
        />
        <TextField
          label="Preferred time"
          type="time"
          value={draft.scheduledTime}
          onChange={(event) => set("scheduledTime", event.target.value)}
        />
        <TextField
          label="Party size"
          type="number"
          min={0}
          value={draft.partySize}
          onChange={(event) => set("partySize", event.target.value)}
          hint="For a hall hire or a ceremony. Leave at 0 where it does not apply."
        />
        <TextField
          label="Location"
          value={draft.location}
          onChange={(event) => set("location", event.target.value)}
          placeholder={service?.location ?? "Defaults to the service's usual place"}
        />
        <TextAreaField
          label="Notes"
          rows={3}
          value={draft.notes}
          onChange={(event) => set("notes", event.target.value)}
          hint="Anything the office should know before it confirms."
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
