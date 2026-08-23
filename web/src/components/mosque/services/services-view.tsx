"use client";

import { useMemo, useState } from "react";
import { Button, IconButton } from "@/components/finance/ui/button";
import { DataTable, type Column } from "@/components/finance/ui/data-table";
import { FinanceFilters, type SelectFilter } from "@/components/finance/ui/filters";
import { AmountField, SelectField, TextAreaField, TextField } from "@/components/finance/ui/form-field";
import { Modal } from "@/components/finance/ui/modal";
import { Panel, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { FinanceEmptyState, InlineNotice } from "@/components/finance/ui/states";
import { PersonCell } from "@/components/ui/avatar";
import { DetailDrawer, DetailField, DetailGrid, DetailSection, DetailStats } from "@/components/ui/detail-drawer";
import { StatGrid } from "@/components/ui/stat-card";
import { BookingStatusBadge, ServiceCategoryChip, ServiceStatusBadge } from "@/components/ui/status-badge";
import { TabPanel, Tabs, useTabIds, type TabItem } from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";
import { useToast } from "@/components/ui/toast";
import { bookingsForService } from "@/data/bookings";
import { serviceStats, services as seedServices } from "@/data/services";
import { formatAmount } from "@/lib/finance/format";
import { downloadCsv } from "@/lib/mosque/export";
import { formatClockTime, formatCount, formatLongDate, REFERENCE_DATE } from "@/lib/mosque/format";
import {
  serviceCategories,
  serviceStatuses,
  type Service,
  type ServiceDraft,
  type StatMetric,
} from "@/lib/mosque/types";

/**
 * The service catalogue.
 *
 * A service is the mosque's standing offer — a funeral it will arrange, a hall it will let, a
 * counselling slot it will keep. The individual requests against these live in the bookings module;
 * here the detail drawer only *reads* the recent ones through `bookingsForService`, so the two
 * modules stay one direction apart and the catalogue never owns a request's lifecycle.
 *
 * Same shape as the member register: the predicate is the only thing this component owns, and the
 * shared `DataTable` handles sort, paging and the mobile cards.
 */
const metrics: StatMetric[] = [
  {
    id: "total",
    label: "Total Services",
    value: formatCount(serviceStats.total),
    hint: "In the catalogue",
    icon: "hands-heart",
    tone: "neutral",
  },
  {
    id: "active",
    label: "Active",
    value: formatCount(serviceStats.active),
    hint: `${Math.round((serviceStats.active / serviceStats.total) * 100)}% open to the community`,
    icon: "check-circle",
    tone: "positive",
  },
  {
    id: "bookings",
    label: "Bookings This Month",
    value: formatCount(serviceStats.bookingsThisMonth),
    hint: "Requests across every service",
    icon: "calendar-days",
    tone: "gold",
  },
  {
    id: "free",
    label: "Free of Charge",
    value: formatCount(serviceStats.free),
    hint: "Active services with no fee",
    icon: "heart",
    tone: "positive",
  },
];

const emptyDraft: ServiceDraft = {
  name: "",
  category: "Counselling",
  status: "Active",
  summary: "",
  description: "",
  coordinator: "",
  contactPhone: "",
  location: "",
  availability: "By appointment",
  fee: "0",
  requiresBooking: true,
  turnaround: "Within a week",
};

/** Zero is a genuinely free service, so it reads "Free" rather than "৳0". */
const feeLabel = (fee: number) => (fee === 0 ? "Free" : formatAmount(fee));

export function ServicesView({ openAddOnMount = false }: { openAddOnMount?: boolean }) {
  const { notify } = useToast();
  const [services, setServices] = useState<Service[]>(seedServices);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<Service | null>(null);
  const [adding, setAdding] = useState(openAddOnMount);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return services.filter((service) => {
      if (needle) {
        const haystack =
          `${service.name} ${service.summary} ${service.coordinator} ${service.id} ${service.category}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (category !== "all" && service.category !== category) return false;
      if (status !== "all" && service.status !== status) return false;
      return true;
    });
  }, [category, search, services, status]);

  const filters: SelectFilter[] = [
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
    {
      id: "status",
      label: "Status",
      value: status,
      onChange: setStatus,
      options: [{ value: "all", label: "Any status" }, ...serviceStatuses.map((value) => ({ value, label: value }))],
    },
  ];

  const activeFilterCount = (category !== "all" ? 1 : 0) + (status !== "all" ? 1 : 0);
  const resetFilters = () => {
    setCategory("all");
    setStatus("all");
  };

  const addService = (draft: ServiceDraft) => {
    const service: Service = {
      id: `SVC-${String(services.length + 1).padStart(3, "0")}`,
      name: draft.name.trim(),
      category: draft.category,
      status: draft.status,
      summary: draft.summary.trim(),
      description: draft.description.trim(),
      coordinator: draft.coordinator.trim(),
      contactPhone: draft.contactPhone.trim(),
      location: draft.location.trim(),
      availability: draft.availability.trim() || "By appointment",
      fee: Number(draft.fee) || 0,
      requiresBooking: draft.requiresBooking,
      turnaround: draft.turnaround.trim() || "To be confirmed",
      bookingsThisMonth: 0,
      totalBookings: 0,
      updatedAt: REFERENCE_DATE,
    };

    setServices((current) => [service, ...current]);
    setAdding(false);
    notify({
      message: "Service added to the catalogue.",
      description: `${service.name} · ${service.id} — held in this browser only.`,
    });
  };

  const exportCsv = () => {
    downloadCsv("noor-mosque-services.csv", filtered, [
      { header: "Service ID", value: (service) => service.id },
      { header: "Name", value: (service) => service.name },
      { header: "Category", value: (service) => service.category },
      { header: "Status", value: (service) => service.status },
      { header: "Coordinator", value: (service) => service.coordinator },
      { header: "Contact", value: (service) => service.contactPhone },
      { header: "Location", value: (service) => service.location },
      { header: "Availability", value: (service) => service.availability },
      { header: "Fee (BDT)", value: (service) => service.fee },
      { header: "Booking required", value: (service) => (service.requiresBooking ? "Yes" : "No") },
      { header: "Turnaround", value: (service) => service.turnaround },
      { header: "Bookings this month", value: (service) => service.bookingsThisMonth },
      { header: "Total bookings", value: (service) => service.totalBookings },
    ]);
    notify({
      tone: "info",
      message: "Export downloaded.",
      description: `${formatCount(filtered.length)} rows, matching the filters currently applied.`,
    });
  };

  const columns: Column<Service>[] = [
    {
      key: "service",
      header: "Service",
      cell: (service) => (
        <span className="min-w-0">
          <span className="block font-medium text-[#17211d]">{service.name}</span>
          <span className="block truncate text-[12px] text-[#69726d]">{service.summary}</span>
        </span>
      ),
      sortValue: (service) => service.name,
    },
    {
      key: "category",
      header: "Category",
      cell: (service) => <ServiceCategoryChip category={service.category} />,
      sortValue: (service) => service.category,
    },
    {
      key: "coordinator",
      header: "Coordinator",
      cell: (service) => <PersonCell name={service.coordinator} size="sm" />,
      sortValue: (service) => service.coordinator,
    },
    {
      key: "fee",
      header: "Fee",
      align: "right",
      cell: (service) =>
        service.fee === 0 ? (
          <span className="text-[#0b4634]">Free</span>
        ) : (
          <span className="tabular-nums">{formatAmount(service.fee)}</span>
        ),
      sortValue: (service) => service.fee,
    },
    {
      key: "status",
      header: "Status",
      cell: (service) => <ServiceStatusBadge status={service.status} />,
      sortValue: (service) => service.status,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      align: "right",
      cell: (service) => (
        <span className="flex items-center justify-end gap-1">
          <IconButton icon="eye" label={`View ${service.name}`} onClick={() => setSelected(service)} />
          <Can permission="service.manage">
            <IconButton icon="pencil" label={`Edit ${service.name}`} onClick={() => setSelected(service)} />
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
          title="Service Catalogue"
          description="What the community can call on the mosque for beyond the daily prayers."
          icon="hands-heart"
          actions={
            <>
              <Button variant="secondary" size="sm" icon="download" onClick={exportCsv}>
                Export
              </Button>
              <Can permission="service.manage">
                <Button size="sm" icon="plus" onClick={() => setAdding(true)}>
                  Add Service
                </Button>
              </Can>
            </>
          }
        />

        <FinanceFilters
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "Search services…",
            label: "Search services by name, summary, coordinator or service ID",
          }}
          filters={filters}
          activeCount={activeFilterCount}
          onReset={resetFilters}
        />

        <DataTable
          rows={filtered}
          columns={columns}
          getRowKey={(service) => service.id}
          caption="Mosque services with category, coordinator, suggested contribution and status"
          initialSort={{ key: "service", direction: "asc" }}
          pageSize={10}
          mobileTitle={(service) => service.name}
          mobileSubtitle={(service) => `${service.category} · ${service.coordinator}`}
          mobileTrailing={(service) => <ServiceStatusBadge status={service.status} />}
          mobileHiddenKeys={["service", "status"]}
          emptyState={
            <FinanceEmptyState
              icon="hands-heart"
              title="No services found."
              description={
                activeFilterCount > 0 || search
                  ? "Nothing matches the current search and filters. Try clearing them."
                  : "The catalogue is empty. Add the first service to open it to the community."
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
                  <Can permission="service.manage">
                    <Button icon="plus" onClick={() => setAdding(true)}>
                      Add Service
                    </Button>
                  </Can>
                )
              }
            />
          }
        />
      </Panel>

      {selected ? <ServiceDetailDrawer service={selected} onClose={() => setSelected(null)} /> : null}
      <AddServiceModal open={adding} onClose={() => setAdding(false)} onSave={addService} />
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Detail drawer
 * -------------------------------------------------------------------------- */

const detailTabs: ReadonlyArray<TabItem<"overview" | "contact" | "bookings">> = [
  { id: "overview", label: "Overview" },
  { id: "contact", label: "Contact" },
  { id: "bookings", label: "Bookings" },
];

function ServiceDetailDrawer({ service, onClose }: { service: Service; onClose: () => void }) {
  const [tab, setTab] = useState<(typeof detailTabs)[number]["id"]>("overview");
  const idBase = useTabIds();
  const recent = bookingsForService(service.id);

  return (
    <DetailDrawer
      open
      onClose={onClose}
      eyebrow={service.id}
      title={service.name}
      subtitle={service.summary}
      badge={
        <>
          <ServiceStatusBadge status={service.status} />
          <ServiceCategoryChip category={service.category} />
        </>
      }
      tabs={<Tabs items={detailTabs} active={tab} onChange={setTab} label={`${service.name} details`} idBase={idBase} />}
      footer={
        <>
          <Can permission="service.manage">
            <Button size="sm" icon="pencil">
              Edit service
            </Button>
          </Can>
          <Button size="sm" variant="secondary" onClick={onClose} className="ml-auto">
            Close
          </Button>
        </>
      }
    >
      <TabPanel base={idBase} id="overview" active={tab === "overview"}>
        <div className="space-y-5">
          <DetailStats
            items={[
              { label: "Fee", value: feeLabel(service.fee) },
              { label: "This month", value: formatCount(service.bookingsThisMonth), hint: "bookings" },
              { label: "All time", value: formatCount(service.totalBookings), hint: "bookings" },
            ]}
          />
          <DetailSection title="About this service">
            <p className="text-[13px] leading-6 text-[#4d564f]">{service.description}</p>
          </DetailSection>
          <DetailSection title="Details">
            <DetailGrid>
              <DetailField label="Category" value={<ServiceCategoryChip category={service.category} />} />
              <DetailField label="Status" value={<ServiceStatusBadge status={service.status} />} />
              <DetailField label="Suggested contribution" value={feeLabel(service.fee)} />
              <DetailField label="Turnaround" value={service.turnaround} />
              <DetailField label="Booking" value={service.requiresBooking ? "Required" : "Walk-in, no booking"} />
              <DetailField label="Last updated" value={formatLongDate(service.updatedAt)} />
            </DetailGrid>
          </DetailSection>
        </div>
      </TabPanel>

      <TabPanel base={idBase} id="contact" active={tab === "contact"}>
        <div className="space-y-5">
          <DetailSection title="Coordinator">
            <DetailGrid>
              <DetailField label="Name" value={service.coordinator} />
              <DetailField label="Phone" value={<span className="tabular-nums">{service.contactPhone}</span>} />
            </DetailGrid>
          </DetailSection>
          <DetailSection title="Where & when">
            <DetailGrid>
              <DetailField label="Location" value={service.location} full />
              <DetailField label="Availability" value={service.availability} full />
            </DetailGrid>
          </DetailSection>
          <InlineNotice icon="info">
            Contact details are shown to the office and to anyone with permission to manage services. What a family is
            told is handled case by case.
          </InlineNotice>
        </div>
      </TabPanel>

      <TabPanel base={idBase} id="bookings" active={tab === "bookings"}>
        <DetailSection title={`Recent bookings (${recent.length})`}>
          {recent.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[#dcdacd] bg-[#faf9f4] px-3.5 py-6 text-center text-[13px] text-[#69726d]">
              No bookings have been made against this service yet.
            </p>
          ) : (
            <ul className="divide-y divide-[#f0efe6]">
              {recent.map((booking) => (
                <li key={booking.id} className="flex items-start justify-between gap-3 py-3 first:pt-0">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium text-[#17211d]">{booking.requesterName}</p>
                    <p className="mt-0.5 text-[12px] text-[#69726d]">
                      {formatLongDate(booking.scheduledDate)}
                      {booking.scheduledTime ? ` · ${formatClockTime(booking.scheduledTime)}` : null}
                    </p>
                  </div>
                  <BookingStatusBadge status={booking.status} />
                </li>
              ))}
            </ul>
          )}
        </DetailSection>
      </TabPanel>
    </DetailDrawer>
  );
}

/* -------------------------------------------------------------------------- *
 * Add service
 * -------------------------------------------------------------------------- */

function AddServiceModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (draft: ServiceDraft) => void;
}) {
  const [draft, setDraft] = useState<ServiceDraft>(emptyDraft);
  const [submitted, setSubmitted] = useState(false);

  const set = <Key extends keyof ServiceDraft>(key: Key, value: ServiceDraft[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const errors = {
    name: draft.name.trim().length === 0 ? "A service needs a name." : undefined,
    summary: draft.summary.trim().length === 0 ? "Add a one-line summary for the card and the table." : undefined,
    description: draft.description.trim().length === 0 ? "Explain what the service offers." : undefined,
    coordinator: draft.coordinator.trim().length === 0 ? "Name who coordinates it." : undefined,
    contactPhone: draft.contactPhone.trim().length < 6 ? "A contact number is required." : undefined,
    location: draft.location.trim().length === 0 ? "Say where it is offered." : undefined,
    fee: Number(draft.fee) < 0 ? "A fee cannot be negative." : undefined,
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
      title="Add service"
      description="Publishes a new offer to the service catalogue. It can be edited or paused afterwards."
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button icon="check" onClick={submit}>
            Add Service
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Service name"
          required
          value={draft.name}
          onChange={(event) => set("name", event.target.value)}
          error={show("name")}
          placeholder="Janazah (Funeral) Service"
          containerClassName="sm:col-span-2"
        />
        <SelectField
          label="Category"
          required
          value={draft.category}
          options={[...serviceCategories]}
          onChange={(event) => set("category", event.target.value as ServiceDraft["category"])}
        />
        <SelectField
          label="Status"
          required
          value={draft.status}
          options={[...serviceStatuses]}
          onChange={(event) => set("status", event.target.value as ServiceDraft["status"])}
          hint="Draft keeps it out of the community's view until it is ready."
        />
        <TextField
          label="Summary"
          required
          value={draft.summary}
          onChange={(event) => set("summary", event.target.value)}
          error={show("summary")}
          hint="One line, shown on the card and in the table."
          containerClassName="sm:col-span-2"
        />
        <TextAreaField
          label="Description"
          required
          rows={4}
          value={draft.description}
          onChange={(event) => set("description", event.target.value)}
          error={show("description")}
          hint="The fuller explanation shown in the detail drawer."
          containerClassName="sm:col-span-2"
        />
        <TextField
          label="Coordinator"
          required
          value={draft.coordinator}
          onChange={(event) => set("coordinator", event.target.value)}
          error={show("coordinator")}
          placeholder="Imam Abdul Karim"
        />
        <TextField
          label="Contact phone"
          type="tel"
          required
          value={draft.contactPhone}
          onChange={(event) => set("contactPhone", event.target.value)}
          error={show("contactPhone")}
          placeholder="+880 1XXX-XXXXXX"
        />
        <TextField
          label="Location"
          required
          value={draft.location}
          onChange={(event) => set("location", event.target.value)}
          error={show("location")}
          placeholder="Main prayer hall"
          containerClassName="sm:col-span-2"
        />
        <TextField
          label="Availability"
          value={draft.availability}
          onChange={(event) => set("availability", event.target.value)}
          hint="Plain language — “By appointment”, “24 hours”, “After Jumu'ah”."
        />
        <TextField
          label="Turnaround"
          value={draft.turnaround}
          onChange={(event) => set("turnaround", event.target.value)}
          placeholder="Same day, 3–5 days…"
        />
        <AmountField
          label="Suggested contribution"
          value={draft.fee}
          onChange={(event) => set("fee", event.target.value)}
          error={show("fee")}
          hint="Leave at 0 for a free service — it will read “Free”."
        />
        <div className="rounded-lg border border-[#e7e6dc] bg-[#faf9f4] px-3.5 py-1 sm:col-span-2">
          <Toggle
            label="Booking required"
            description="Off means the community can simply turn up — right for a collection point or an open desk."
            checked={draft.requiresBooking}
            onChange={(next) => set("requiresBooking", next)}
          />
        </div>
      </div>

      {submitted && !valid ? (
        <InlineNotice className="mt-4" tone="neutral" icon="alert">
          Some details still need attention — see the messages above.
        </InlineNotice>
      ) : (
        <InlineNotice className="mt-4" tone="gold">
          Front-end preview — the service is added to this browser session only.
        </InlineNotice>
      )}
    </Modal>
  );
}
