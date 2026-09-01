"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { DataTable, type Column } from "@/components/finance/ui/data-table";
import { ConfirmDialog } from "@/components/finance/ui/dialogs";
import { FinanceFilters, type SelectFilter } from "@/components/finance/ui/filters";
import { Panel, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { FinanceEmptyState, InlineNotice } from "@/components/finance/ui/states";
import { PersonCell } from "@/components/ui/avatar";
import { DetailDrawer, DetailField, DetailGrid, DetailSection } from "@/components/ui/detail-drawer";
import { StatCard } from "@/components/ui/stat-card";
import { RegistrationStatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { eventFilterOptions } from "@/data/events";
import { fetchRegistrations } from "@/services/registrationService";
import { registrationStatuses, type Registration, type StatMetric } from "@/lib/mosque/types";
import { Button, ButtonLink, IconButton } from "@/components/finance/ui/button";
import { formatCount, formatLongDate } from "@/lib/mosque/format";
import { downloadCsv } from "@/lib/mosque/export";

function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function RegistrationsView() {
  const { notify } = useToast();

  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [totals, setTotals] = useState({ total: 0, confirmed: 0, pending: 0, waitlisted: 0, cancelled: 0 });

  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<Registration | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { rows } = await fetchRegistrations();
      setRegistrations(rows);
      const newTotals = rows.reduce(
        (acc, r) => {
          acc.total++;
          switch (r.status) {
            case "Confirmed":
              acc.confirmed++;
              break;
            case "Pending":
              acc.pending++;
              break;
            case "Waitlisted":
              acc.waitlisted++;
              break;
            case "Cancelled":
              acc.cancelled++;
              break;
          }
          return acc;
        },
        { total: 0, confirmed: 0, pending: 0, waitlisted: 0, cancelled: 0 }
      );
      setTotals(newTotals);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selected = useMemo(
    () => registrations.find((r) => r.id === selectedId) ?? null,
    [registrations, selectedId]
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return registrations.filter((r) => {
      if (needle) {
        const haystack = `${r.participantName} ${r.eventTitle} ${r.participantPhone ?? ""} ${r.id}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (eventFilter !== "all" && r.eventId !== eventFilter) return false;
      if (status !== "all" && r.status !== status) return false;
      if (from && r.registeredAt < from) return false;
      if (to && r.registeredAt > to) return false;
      return true;
    });
  }, [eventFilter, from, registrations, search, status, to]);

  const metrics: StatMetric[] = useMemo(
    () => [
      {
        id: "total",
        label: "Total Registrations",
        value: formatCount(totals.total),
        hint: "Across every open programme",
        icon: "clipboard-check",
        tone: "neutral",
      },
      {
        id: "confirmed",
        label: "Confirmed",
        value: formatCount(totals.confirmed),
        hint: "Holding a place",
        icon: "check-circle",
        tone: "positive",
      },
      {
        id: "pending",
        label: "Pending",
        value: formatCount(totals.pending),
        hint: "Awaiting review",
        icon: "clock",
        tone: "warning",
      },
      {
        id: "waitlisted",
        label: "Waitlisted",
        value: formatCount(totals.waitlisted),
        hint: "First in line if places free",
        icon: "users",
        tone: "gold",
      },
      {
        id: "cancelled",
        label: "Cancelled",
        value: formatCount(totals.cancelled),
        hint: "Places released",
        icon: "x-circle",
        tone: "negative",
      },
    ],
    [totals]
  );

  const filters: SelectFilter[] = [
    { id: "event", label: "Event", value: eventFilter, onChange: setEventFilter, options: eventFilterOptions },
    {
      id: "status",
      label: "Status",
      value: status,
      onChange: setStatus,
      options: [
        { value: "all", label: "Any status" },
        ...registrationStatuses.map((value) => ({ value, label: value })),
      ],
    },
  ];

  const activeFilterCount =
    (eventFilter !== "all" ? 1 : 0) + (status !== "all" ? 1 : 0) + (from ? 1 : 0) + (to ? 1 : 0);

  const resetFilters = () => {
    setEventFilter("all");
    setStatus("all");
    setFrom("");
    setTo("");
  };

  const setStatusOf = (id: string, next: Registration["status"]) => {
    const target = registrations.find((registration) => registration.id === id);
    setRegistrations((current) =>
      current.map((registration) => (registration.id === id ? { ...registration, status: next } : registration))
    );

    if (next === "Confirmed") {
      notify({
        message: "Registration confirmed.",
        description: `${target?.participantName} · ${target?.eventTitle}`,
      });
    } else if (next === "Cancelled") {
      notify({
        tone: "info",
        message: "Registration cancelled.",
        description: `${target?.participantName}'s place has been released.`,
      });
    }
  };

  const exportCsv = () => {
    downloadCsv("noor-mosque-registrations.csv", filtered, [
      { header: "Registration ID", value: (row) => row.id },
      { header: "Participant", value: (row) => row.participantName },
      { header: "Phone", value: (row) => row.participantPhone ?? "" },
      { header: "Email", value: (row) => row.participantEmail ?? "" },
      { header: "Event", value: (row) => row.eventTitle },
      { header: "Event date", value: (row) => row.eventDate },
      { header: "Registered on", value: (row) => row.registeredAt },
      { header: "Guests", value: (row) => row.guests },
      { header: "Status", value: (row) => row.status },
      { header: "Member ID", value: (row) => row.memberId ?? "" },
      { header: "Special requirements", value: (row) => row.specialRequirements ?? "" },
    ]);
    notify({
      tone: "info",
      message: "Export downloaded.",
      description: `${formatCount(filtered.length)} rows, matching the filters currently applied.`,
    });
  };

  const columns: Column<Registration>[] = [
    {
      key: "participant",
      header: "Participant",
      cell: (row) => (
        <PersonCell name={row.participantName} meta={row.memberId ? `Member · ${row.memberId}` : "Visitor"} />
      ),
      sortValue: (row) => row.participantName,
    },
    {
      key: "event",
      header: "Event",
      cell: (row) => (
        <span className="min-w-0">
          <span className="block truncate">{row.eventTitle}</span>
          <span className="block text-[12px] text-[#8b938d]">{formatLongDate(row.eventDate)}</span>
        </span>
      ),
      sortValue: (row) => row.eventTitle,
    },
    {
      key: "registered",
      header: "Registration Date",
      cell: (row) => <span className="tabular-nums">{formatLongDate(row.registeredAt)}</span>,
      sortValue: (row) => row.registeredAt,
    },
    {
      key: "phone",
      header: "Phone",
      secondary: true,
      cell: (row) => <span className="tabular-nums">{row.participantPhone ?? "—"}</span>,
    },
    {
      key: "guests",
      header: "Guests",
      align: "right",
      cell: (row) =>
        row.guests === 0 ? (
          <span className="text-[#8b938d]">None</span>
        ) : (
          <span className="tabular-nums">{pluralise(row.guests, "guest")}</span>
        ),
      sortValue: (row) => row.guests,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <RegistrationStatusBadge status={row.status} />,
      sortValue: (row) => row.status,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      align: "right",
      cell: (row) => (
        <span className="flex items-center justify-end gap-1">
          <IconButton icon="eye" label={`View ${row.participantName}'s registration`} onClick={() => setSelectedId(row.id)} />
          <Can permission="event.update">
            {row.status === "Confirmed" || row.status === "Cancelled" ? null : (
              <IconButton
                icon="check"
                label={`Confirm ${row.participantName}'s registration`}
                onClick={() => setStatusOf(row.id, "Confirmed")}
              />
            )}
          </Can>
          <Can permission="event.update">
            {row.status === "Cancelled" ? null : (
              <IconButton
                icon="x-circle"
                tone="danger"
                label={`Cancel ${row.participantName}'s registration`}
                onClick={() => setCancelling(row)}
              />
            )}
          </Can>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {metrics.map((metric) => (
          <StatCard key={metric.id} metric={metric} />
        ))}
      </div>

      <Panel>
        <PanelHeader
          title="Registrations"
          description="Everyone who has booked a place, and whether that place is held."
          icon="clipboard-check"
          actions={
            <Button variant="secondary" size="sm" icon="download" onClick={exportCsv}>
              Export
            </Button>
          }
        />

        <FinanceFilters
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "Search participant…",
            label: "Search registrations by participant, event, phone or registration ID",
          }}
          filters={filters}
          dateRange={{
            label: "Registration date",
            fromLabel: "Registered on or after",
            toLabel: "Registered on or before",
            from,
            to,
            onFromChange: setFrom,
            onToChange: setTo,
          }}
          activeCount={activeFilterCount}
          onReset={resetFilters}
        />

        <DataTable
          rows={filtered}
          columns={columns}
          getRowKey={(row) => row.id}
          caption="Event registrations with participant, event, guest count and status"
          initialSort={{ key: "registered", direction: "desc" }}
          pageSize={10}
          mobileTitle={(row) => row.participantName}
          mobileSubtitle={(row) => row.eventTitle}
          mobileTrailing={(row) => <RegistrationStatusBadge status={row.status} />}
          mobileHiddenKeys={["participant", "status", "event"]}
          emptyState={
            <FinanceEmptyState
              icon="clipboard-check"
              title="No registrations found."
              description={
                activeFilterCount > 0 || search
                  ? "Nothing matches the current search and filters. Try clearing them."
                  : "Nobody has registered for an event yet. Registrations appear here as they come in."
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
                  <ButtonLink href="/dashboard/events" icon="calendar-days">
                    Open events
                  </ButtonLink>
                )
              }
            />
          }
        />
      </Panel>

      {selected ? (
        <RegistrationDetailDrawer
          registration={selected}
          onClose={() => setSelectedId(null)}
          onConfirm={() => setStatusOf(selected.id, "Confirmed")}
          onCancel={() => {
            setCancelling(selected);
            setSelectedId(null);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={cancelling !== null}
        onClose={() => setCancelling(null)}
        onConfirm={() => {
          if (cancelling) setStatusOf(cancelling.id, "Cancelled");
          setCancelling(null);
        }}
        title="Cancel this registration?"
        description="The place is released immediately and the next person on the waitlist can take it. The registration stays on the record as cancelled rather than being deleted."
        confirmLabel="Cancel registration"
        cancelLabel="Keep it"
        tone="danger"
        details={
          cancelling ? (
            <dl className="space-y-1.5 text-[13px]">
              <div className="flex justify-between gap-4">
                <dt className="text-[#69726d]">Participant</dt>
                <dd className="font-medium text-[#17211d]">{cancelling.participantName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#69726d]">Event</dt>
                <dd className="text-right font-medium text-[#17211d]">{cancelling.eventTitle}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#69726d]">Places released</dt>
                <dd className="font-medium tabular-nums text-[#17211d]">{1 + cancelling.guests}</dd>
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

function RegistrationDetailDrawer({
  registration,
  onClose,
  onConfirm,
  onCancel,
}: {
  registration: Registration;
  onClose: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <DetailDrawer
      open
      onClose={onClose}
      eyebrow={registration.id}
      title={registration.participantName}
      subtitle={registration.eventTitle}
      avatarName={registration.participantName}
      badge={<RegistrationStatusBadge status={registration.status} />}
      footer={
        <>
          <Can permission="event.update">
            {registration.status !== "Confirmed" && registration.status !== "Cancelled" ? (
              <Button size="sm" icon="check" onClick={onConfirm}>
                Confirm place
              </Button>
            ) : null}
            {registration.status !== "Cancelled" ? (
              <Button size="sm" variant="danger" icon="x-circle" onClick={onCancel}>
                Cancel registration
              </Button>
            ) : null}
          </Can>
          <Button size="sm" variant="secondary" onClick={onClose} className="ml-auto">
            Close
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {registration.status === "Waitlisted" ? (
          <InlineNotice tone="gold">
            This attendee is on the waitlist. Confirming will grant a place if capacity allows.
          </InlineNotice>
        ) : null}
        {registration.status === "Cancelled" ? (
          <InlineNotice tone="neutral" icon="info">
            This registration was cancelled and no place is held.
          </InlineNotice>
        ) : null}

        <DetailSection title="Registration details">
          <DetailGrid>
            <DetailField label="Event" value={registration.eventTitle} />
            <DetailField label="Event date" value={formatLongDate(registration.eventDate)} />
            <DetailField label="Registered on" value={formatLongDate(registration.registeredAt)} />
            <DetailField
              label="Guests"
              value={registration.guests === 0 ? "None (1 place)" : pluralise(registration.guests, "guest")}
            />
            <DetailField label="Status" value={<RegistrationStatusBadge status={registration.status} />} />
          </DetailGrid>
        </DetailSection>

        <DetailSection title="Participant details">
          <DetailGrid>
            <DetailField label="Full name" value={registration.participantName} />
            <DetailField
              label="On the register"
              value={registration.memberId ? `Member · ${registration.memberId}` : "Visitor"}
            />
            <DetailField label="Phone" value={registration.participantPhone ? <span className="tabular-nums">{registration.participantPhone}</span> : "—"} />
            <DetailField label="Email" value={registration.participantEmail ? <span className="break-all">{registration.participantEmail}</span> : "—"} />
          </DetailGrid>
        </DetailSection>

        {registration.specialRequirements ? (
          <DetailSection title="Special requirements">
            <p className="text-[13px] leading-6 text-[#4d564f]">{registration.specialRequirements}</p>
          </DetailSection>
        ) : null}
      </div>
    </DetailDrawer>
  );
}
