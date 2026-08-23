"use client";

import { useMemo, useState } from "react";
import { Button, IconButton } from "@/components/finance/ui/button";
import { DataTable, type Column } from "@/components/finance/ui/data-table";
import { FinanceFilters, type SelectFilter } from "@/components/finance/ui/filters";
import { SelectField, TextAreaField, TextField } from "@/components/finance/ui/form-field";
import { Modal } from "@/components/finance/ui/modal";
import { Panel, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { FinanceEmptyState, InlineNotice } from "@/components/finance/ui/states";
import { PersonCell } from "@/components/ui/avatar";
import { DetailDrawer, DetailField, DetailGrid, DetailSection, DetailStats } from "@/components/ui/detail-drawer";
import { StatGrid } from "@/components/ui/stat-card";
import { BookingStatusBadge, ServiceCategoryChip } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { bookingStats, bookings as seedBookings } from "@/data/bookings";
import { serviceById, services } from "@/data/services";
import { formatAmount } from "@/lib/finance/format";
import { downloadCsv } from "@/lib/mosque/export";
import {
  formatClockTime,
  formatCount,
  formatDayMonth,
  formatLongDate,
  formatRelativeDay,
  REFERENCE_DATE,
} from "@/lib/mosque/format";
import {
  bookingStatuses,
  serviceCategories,
  type Booking,
  type BookingDraft,
  type StatMetric,
} from "@/lib/mosque/types";

/**
 * Booking requests against the service catalogue.
 *
 * Each row is one request — a funeral to arrange, a hall to hire, a counselling slot to keep. The row
 * denormalises the service's name and category (exactly as an event registration carries its event's
 * title), so this table never has to join back to the catalogue to render. A new request resolves the
 * chosen service through `serviceById` to copy across the name, category, fee and coordinator.
 *
 * `fee` is shown read-only: what a family actually contributes is receipted in the finance module,
 * which stays the one record of money in and out.
 */
const metrics: StatMetric[] = [
  {
    id: "total",
    label: "Total Bookings",
    value: formatCount(bookingStats.total),
    hint: "Requests on record",
    icon: "calendar",
    tone: "neutral",
  },
  {
    id: "pending",
    label: "Pending",
    value: formatCount(bookingStats.pending),
    hint: "Awaiting a decision",
    icon: "clock",
    tone: "warning",
  },
  {
    id: "confirmed",
    label: "Confirmed",
    value: formatCount(bookingStats.confirmed),
    hint: "Booked and in the diary",
    icon: "check-circle",
    tone: "positive",
  },
  {
    id: "week",
    label: "This Week",
    value: formatCount(bookingStats.thisWeek),
    hint: "Scheduled in the next 7 days",
    icon: "calendar-days",
    tone: "gold",
  },
];

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

export function BookingsView({ openAddOnMount = false }: { openAddOnMount?: boolean }) {
  const { notify } = useToast();
  const [bookings, setBookings] = useState<Booking[]>(seedBookings);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [scheduledFrom, setScheduledFrom] = useState("");
  const [scheduledTo, setScheduledTo] = useState("");
  const [selected, setSelected] = useState<Booking | null>(null);
  const [adding, setAdding] = useState(openAddOnMount);

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

  const addBooking = (draft: BookingDraft) => {
    const service = serviceById(draft.serviceId);
    const booking: Booking = {
      id: `BKG-${String(bookings.length + 1).padStart(3, "0")}`,
      serviceId: draft.serviceId,
      serviceName: service?.name ?? "—",
      category: service?.category ?? "Facility",
      requesterName: draft.requesterName.trim(),
      requesterPhone: draft.requesterPhone.trim(),
      requesterEmail: draft.requesterEmail.trim(),
      status: "Pending",
      scheduledDate: draft.scheduledDate,
      scheduledTime: draft.scheduledTime || undefined,
      submittedAt: REFERENCE_DATE,
      location: draft.location.trim() || service?.location || "—",
      partySize: Number(draft.partySize) || 0,
      fee: service?.fee ?? 0,
      assignedTo: service?.coordinator,
      notes: draft.notes.trim(),
    };

    setBookings((current) => [booking, ...current]);
    setAdding(false);
    notify({
      message: "Booking request logged.",
      description: `${booking.requesterName} · ${booking.serviceName} — held in this browser only.`,
    });
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
            <IconButton icon="pencil" label={`Update ${booking.requesterName}'s booking`} onClick={() => setSelected(booking)} />
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
      </Panel>

      {selected ? <BookingDetailDrawer booking={selected} onClose={() => setSelected(null)} /> : null}
      <AddBookingModal open={adding} onClose={() => setAdding(false)} onSave={addBooking} />
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Detail drawer
 * -------------------------------------------------------------------------- */

function BookingDetailDrawer({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  return (
    <DetailDrawer
      open
      onClose={onClose}
      eyebrow={booking.id}
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
            <Button size="sm" icon="pencil">
              Update booking
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
            <DetailField label="Email" value={<span className="break-all">{booking.requesterEmail}</span>} />
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
 * New booking
 * -------------------------------------------------------------------------- */

/** Only services that are open and actually take bookings can be requested here. */
const bookableServices = services.filter((service) => service.status === "Active" && service.requiresBooking);

function AddBookingModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (draft: BookingDraft) => void;
}) {
  const [draft, setDraft] = useState<BookingDraft>(emptyDraft);
  const [submitted, setSubmitted] = useState(false);

  const set = <Key extends keyof BookingDraft>(key: Key, value: BookingDraft[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const service = serviceById(draft.serviceId);

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
        : draft.scheduledDate < REFERENCE_DATE
          ? "That date has passed."
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
    if (!valid) return;
    onSave(draft);
    setDraft(emptyDraft);
    setSubmitted(false);
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="New booking"
      description="Logs a request against a service. It starts as Pending for the office to confirm."
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button icon="check" onClick={submit}>
            Log Booking
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
          min={REFERENCE_DATE}
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
      ) : (
        <InlineNotice className="mt-4" tone="gold">
          Front-end preview — the booking is added to this browser session only.
        </InlineNotice>
      )}
    </Modal>
  );
}
