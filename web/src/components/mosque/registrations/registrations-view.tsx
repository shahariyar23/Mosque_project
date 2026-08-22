"use client";

import { useMemo, useState } from "react";
import { Button, ButtonLink, IconButton } from "@/components/finance/ui/button";
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
import { registrationTotals, registrations as seedRegistrations } from "@/data/registrations";
import { downloadCsv } from "@/lib/mosque/export";
import { formatCount, formatLongDate, pluralise } from "@/lib/mosque/format";
import { registrationStatuses, type Registration, type StatMetric } from "@/lib/mosque/types";

/**
 * Event registrations.
 *
 * Confirm and cancel are the two things this screen exists to do, and both are real here: they change
 * the row in state, the badge in the table updates, and a toast confirms it. Cancelling routes through
 * a confirmation dialog because it takes someone's place away — the same rule the finance module
 * applies to voiding a record.
 */
const metrics: StatMetric[] = [
  {
    id: "total",
    label: "Total Registrations",
    value: formatCount(registrationTotals.total),
    hint: "Across every open programme",
    icon: "clipboard-check",
    tone: "neutral",
  },
  {
    id: "confirmed",
    label: "Confirmed",
    value: formatCount(registrationTotals.confirmed),
    hint: "Places are held",
    icon: "check-circle",
    tone: "positive",
  },
  {
    id: "pending",
    label: "Pending",
    value: formatCount(registrationTotals.pending),
    hint: "Waiting on a decision",
    icon: "clock",
    tone: "warning",
  },
  {
    id: "waitlisted",
    label: "Waitlisted",
    value: formatCount(registrationTotals.waitlisted),
    hint: "Event is at capacity",
    icon: "list",
    tone: "gold",
  },
  {
    id: "cancelled",
    label: "Cancelled",
    value: formatCount(registrationTotals.cancelled),
    hint: "Withdrawn or event cancelled",
    icon: "x-circle",
    tone: "negative",
  },
];

export function RegistrationsView() {
  const { notify } = useToast();
  const [registrations, setRegistrations] = useState<Registration[]>(seedRegistrations);
  const [search, setSearch] = useState("");
  const [event, setEvent] = useState("all");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<Registration | null>(null);

  /**
   * The drawer follows the id, not a snapshot of the row. Holding the object would leave the panel
   * showing "Pending" straight after someone pressed Confirm inside it.
   */
  const selected = registrations.find((registration) => registration.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return registrations.filter((registration) => {
      if (needle) {
        const haystack = `${registration.participantName} ${registration.participantEmail} ${registration.participantPhone} ${registration.eventTitle} ${registration.id}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (event !== "all" && registration.eventId !== event) return false;
      if (status !== "all" && registration.status !== status) return false;
      if (from && registration.registeredAt < from) return false;
      if (to && registration.registeredAt > to) return false;
      return true;
    });
  }, [event, from, registrations, search, status, to]);

  const filters: SelectFilter[] = [
    { id: "event", label: "Event", value: event, onChange: setEvent, options: eventFilterOptions },
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
    (event !== "all" ? 1 : 0) + (status !== "all" ? 1 : 0) + (from ? 1 : 0) + (to ? 1 : 0);

  const resetFilters = () => {
    setEvent("all");
    setStatus("all");
    setFrom("");
    setTo("");
  };

  const setStatusOf = (id: string, next: Registration["status"]) => {
    const target = registrations.find((registration) => registration.id === id);
    setRegistrations((current) =>
      current.map((registration) => (registration.id === id ? { ...registration, status: next } : registration)),
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
      { header: "Phone", value: (row) => row.participantPhone },
      { header: "Email", value: (row) => row.participantEmail },
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
      cell: (row) => <span className="tabular-nums">{row.participantPhone}</span>,
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
      {/* Five figures, not four: pending + confirmed + cancelled alone do not add up to the total once
          a waitlist exists, and three numbers that quietly disagree with a fourth is worse than five
          that sum. `StatGrid` is fixed at four columns, so the tiles are laid out directly here. */}
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
          footNote={`Sample of the register — ${formatCount(seedRegistrations.length)} of ${formatCount(registrationTotals.total)} registrations loaded.`}
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
            // The drawer closes as the confirmation opens rather than sitting behind it. Two
            // overlays using `useDialogFocus` at once both bind Escape and a Tab trap to
            // `document`, so a stacked pair closes both panels on one Escape and fights over
            // where Tab goes. Handing over instead of stacking avoids the whole problem, and the
            // table underneath is where the changed status wants to be seen anyway.
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
  const settled = registration.status === "Confirmed" || registration.status === "Cancelled";

  return (
    <DetailDrawer
      open
      onClose={onClose}
      eyebrow={registration.id}
      title={registration.participantName}
      subtitle={registration.memberId ? `Member · ${registration.memberId}` : "Visitor · not on the register"}
      avatarName={registration.participantName}
      badge={<RegistrationStatusBadge status={registration.status} />}
      footer={
        <>
          <Can permission="event.update">
            {settled ? null : (
              <Button size="sm" icon="check" onClick={onConfirm}>
                Confirm
              </Button>
            )}
          </Can>
          <Can permission="event.update">
            {registration.status === "Cancelled" ? null : (
              <Button size="sm" variant="danger" icon="x-circle" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </Can>
          <ButtonLink href="/dashboard/events" size="sm" variant="secondary" className="ml-auto">
            View Event
          </ButtonLink>
        </>
      }
    >
      <div className="space-y-5">
        {registration.status === "Waitlisted" ? (
          <InlineNotice tone="gold" icon="info">
            The event is at capacity. This place is offered automatically if a confirmed registration is cancelled.
          </InlineNotice>
        ) : null}

        <DetailSection title="Participant">
          <DetailGrid>
            <DetailField label="Name" value={registration.participantName} />
            <DetailField
              label="Phone"
              value={<span className="tabular-nums">{registration.participantPhone}</span>}
            />
            <DetailField label="Email" value={<span className="break-all">{registration.participantEmail}</span>} full />
            <DetailField
              label="On the member register"
              value={registration.memberId ? `Yes — ${registration.memberId}` : "No — attending as a visitor"}
              full
            />
          </DetailGrid>
        </DetailSection>

        <DetailSection title="Registration">
          <DetailGrid>
            <DetailField label="Event" value={registration.eventTitle} full />
            <DetailField label="Event date" value={formatLongDate(registration.eventDate)} />
            <DetailField label="Registered on" value={formatLongDate(registration.registeredAt)} />
            <DetailField
              label="Guests"
              value={registration.guests === 0 ? "None" : pluralise(registration.guests, "guest")}
            />
            <DetailField label="Places held" value={<span className="tabular-nums">{1 + registration.guests}</span>} />
            <DetailField label="Status" value={<RegistrationStatusBadge status={registration.status} />} full />
          </DetailGrid>
        </DetailSection>

        <DetailSection title="Special requirements">
          {registration.specialRequirements ? (
            <p className="rounded-lg border border-[#e7e6dc] bg-[#faf9f4] px-3.5 py-3 text-[13px] leading-6 text-[#4d564f]">
              {registration.specialRequirements}
            </p>
          ) : (
            <p className="text-[13px] text-[#69726d]">None recorded.</p>
          )}
        </DetailSection>
      </div>
    </DetailDrawer>
  );
}
