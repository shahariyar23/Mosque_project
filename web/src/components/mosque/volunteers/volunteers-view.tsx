"use client";

import { useMemo, useState } from "react";
import { Chip } from "@/components/finance/ui/badge";
import { Button, IconButton } from "@/components/finance/ui/button";
import { DataTable, type Column } from "@/components/finance/ui/data-table";
import { FinanceFilters, type SelectFilter } from "@/components/finance/ui/filters";
import { SelectField, TextAreaField, TextField } from "@/components/finance/ui/form-field";
import { Icon } from "@/components/finance/ui/icon";
import { Modal } from "@/components/finance/ui/modal";
import { Panel, PanelBody, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { ProgressBar } from "@/components/finance/ui/progress";
import { FinanceEmptyState, InlineNotice } from "@/components/finance/ui/states";
import { PersonCell } from "@/components/ui/avatar";
import { DetailDrawer, DetailField, DetailGrid, DetailSection, DetailStats } from "@/components/ui/detail-drawer";
import { StatGrid } from "@/components/ui/stat-card";
import { AvailabilityBadge, VolunteerStatusBadge } from "@/components/ui/status-badge";
import { TabPanel, Tabs, useTabIds, type TabItem } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import {
  teamFilterOptions,
  volunteerTeams,
  volunteerTotals,
  volunteers as seedVolunteers,
} from "@/data/volunteers";
import { formatCount, formatLongDate, formatMonthYear, pluralise, REFERENCE_DATE } from "@/lib/mosque/format";
import {
  volunteerAvailabilities,
  volunteerSchedules,
  volunteerStatuses,
  type StatMetric,
  type Volunteer,
  type VolunteerDraft,
  type VolunteerTeam,
} from "@/lib/mosque/types";

/**
 * Volunteer coordination.
 *
 * Same shape as the members screen on purpose — summary strip, team cards, filtered table, detail
 * drawer — because they are the same job done to a different roster, and someone who has learned one
 * should not have to learn the other. Everything shared lives in the kit; what differs here is the
 * team grouping and the service-hours figures.
 */
const metrics: StatMetric[] = [
  {
    id: "total",
    label: "Total Volunteers",
    value: formatCount(volunteerTotals.total),
    hint: "Across every service team",
    icon: "hands-heart",
    tone: "neutral",
  },
  {
    id: "active",
    label: "Active",
    value: formatCount(volunteerTotals.active),
    hint: `${formatCount(volunteerTotals.total - volunteerTotals.active)} inactive or on leave`,
    icon: "check-circle",
    tone: "positive",
  },
  {
    id: "available",
    label: "Available Today",
    value: formatCount(volunteerTotals.availableToday),
    hint: "Marked available for the current rota",
    icon: "clock",
    tone: "gold",
  },
  {
    id: "teams",
    label: "Teams",
    value: formatCount(volunteerTotals.teams),
    hint: "Each with a named lead",
    icon: "users",
    tone: "neutral",
  },
];

const emptyDraft: VolunteerDraft = {
  name: "",
  email: "",
  phone: "",
  teamId: volunteerTeams[0]?.id ?? "",
  skills: "",
  schedule: "Weekends",
  availability: "Available",
  status: "Active",
  emergencyContactName: "",
  emergencyContactPhone: "",
};

export function VolunteersView({ openAddOnMount = false }: { openAddOnMount?: boolean }) {
  const { notify } = useToast();
  const [volunteers, setVolunteers] = useState<Volunteer[]>(seedVolunteers);
  const [search, setSearch] = useState("");
  const [team, setTeam] = useState("all");
  const [status, setStatus] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [selected, setSelected] = useState<Volunteer | null>(null);
  const [adding, setAdding] = useState(openAddOnMount);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return volunteers.filter((volunteer) => {
      if (needle) {
        const haystack = `${volunteer.name} ${volunteer.email} ${volunteer.phone} ${volunteer.id} ${volunteer.teamName} ${volunteer.skills.join(" ")}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (team !== "all" && volunteer.teamId !== team) return false;
      if (status !== "all" && volunteer.status !== status) return false;
      if (availability !== "all" && volunteer.availability !== availability) return false;
      return true;
    });
  }, [availability, search, status, team, volunteers]);

  const filters: SelectFilter[] = [
    { id: "team", label: "Team", value: team, onChange: setTeam, options: teamFilterOptions },
    {
      id: "status",
      label: "Status",
      value: status,
      onChange: setStatus,
      options: [{ value: "all", label: "Any status" }, ...volunteerStatuses.map((value) => ({ value, label: value }))],
    },
    {
      id: "availability",
      label: "Availability",
      value: availability,
      onChange: setAvailability,
      options: [
        { value: "all", label: "Any" },
        ...volunteerAvailabilities.map((value) => ({ value, label: value })),
      ],
    },
  ];

  const activeFilterCount =
    (team !== "all" ? 1 : 0) + (status !== "all" ? 1 : 0) + (availability !== "all" ? 1 : 0);

  const resetFilters = () => {
    setTeam("all");
    setStatus("all");
    setAvailability("all");
  };

  const addVolunteer = (draft: VolunteerDraft) => {
    const chosen = volunteerTeams.find((entry) => entry.id === draft.teamId);
    const volunteer: Volunteer = {
      id: `VOL-${String(volunteers.length + 1).padStart(3, "0")}`,
      name: draft.name.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      teamId: draft.teamId,
      teamName: chosen?.name ?? "Unassigned",
      schedule: draft.schedule,
      availability: draft.availability,
      joinedDate: REFERENCE_DATE,
      status: draft.status,
      skills: draft.skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean),
      serviceHours: 0,
      eventsParticipated: 0,
      emergencyContactName: draft.emergencyContactName.trim(),
      emergencyContactPhone: draft.emergencyContactPhone.trim(),
    };

    setVolunteers((current) => [volunteer, ...current]);
    setAdding(false);
    notify({
      message: "Volunteer added successfully.",
      description: `${volunteer.name} joined ${volunteer.teamName} — held in this browser only.`,
    });
  };

  const columns: Column<Volunteer>[] = [
    {
      key: "volunteer",
      header: "Volunteer",
      cell: (volunteer) => <PersonCell name={volunteer.name} meta={volunteer.id} />,
      sortValue: (volunteer) => volunteer.name,
    },
    {
      key: "team",
      header: "Team",
      cell: (volunteer) => <Chip>{volunteer.teamName}</Chip>,
      sortValue: (volunteer) => volunteer.teamName,
    },
    {
      key: "phone",
      header: "Phone",
      secondary: true,
      cell: (volunteer) => <span className="tabular-nums">{volunteer.phone}</span>,
    },
    {
      key: "availability",
      header: "Availability",
      cell: (volunteer) => (
        <span className="flex flex-col gap-1">
          <AvailabilityBadge availability={volunteer.availability} />
          <span className="text-[11.5px] text-[#8b938d]">{volunteer.schedule}</span>
        </span>
      ),
      sortValue: (volunteer) => volunteer.availability,
    },
    {
      key: "joined",
      header: "Joined",
      cell: (volunteer) => <span className="tabular-nums">{formatMonthYear(volunteer.joinedDate)}</span>,
      sortValue: (volunteer) => volunteer.joinedDate,
    },
    {
      key: "status",
      header: "Status",
      cell: (volunteer) => <VolunteerStatusBadge status={volunteer.status} />,
      sortValue: (volunteer) => volunteer.status,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      align: "right",
      cell: (volunteer) => (
        <span className="flex items-center justify-end gap-1">
          <IconButton icon="eye" label={`View ${volunteer.name}`} onClick={() => setSelected(volunteer)} />
          <Can permission="volunteer.manage">
            <IconButton icon="pencil" label={`Edit ${volunteer.name}`} onClick={() => setSelected(volunteer)} />
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
          title="Volunteer Teams"
          description="Eight teams cover the mosque's week. Selecting one filters the roster below."
          icon="hands-heart"
          actions={
            <Can permission="volunteer.manage">
              <Button size="sm" icon="plus" onClick={() => setAdding(true)}>
                Add Volunteer
              </Button>
            </Can>
          }
        />
        <PanelBody>
          <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            {volunteerTeams.map((entry) => (
              <TeamCard
                key={entry.id}
                team={entry}
                selected={team === entry.id}
                onSelect={() => setTeam(team === entry.id ? "all" : entry.id)}
              />
            ))}
          </ul>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader
          title="Volunteer Roster"
          description="Who is on which team, when they are free and how much they have given."
          icon="list"
        />

        <FinanceFilters
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "Search volunteers…",
            label: "Search volunteers by name, team, skill or phone",
          }}
          filters={filters}
          activeCount={activeFilterCount}
          onReset={resetFilters}
        />

        <DataTable
          rows={filtered}
          columns={columns}
          getRowKey={(volunteer) => volunteer.id}
          caption="Mosque volunteers with team, availability, join date and status"
          initialSort={{ key: "volunteer", direction: "asc" }}
          pageSize={10}
          mobileTitle={(volunteer) => volunteer.name}
          mobileSubtitle={(volunteer) => volunteer.teamName}
          mobileTrailing={(volunteer) => <VolunteerStatusBadge status={volunteer.status} />}
          mobileHiddenKeys={["volunteer", "status", "team"]}
          footNote={`Sample of the roster — ${formatCount(seedVolunteers.length)} of ${formatCount(volunteerTotals.total)} volunteers loaded.`}
          emptyState={
            <FinanceEmptyState
              icon="hands-heart"
              title="No volunteers registered yet."
              description={
                activeFilterCount > 0 || search
                  ? "Nothing matches the current search and filters. Try clearing them."
                  : "Nobody has been placed on a team yet. Add the first volunteer to start a rota."
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
                  <Can permission="volunteer.manage">
                    <Button icon="plus" onClick={() => setAdding(true)}>
                      Add Volunteer
                    </Button>
                  </Can>
                )
              }
            />
          }
        />
      </Panel>

      {selected ? <VolunteerDetailDrawer volunteer={selected} onClose={() => setSelected(null)} /> : null}
      <AddVolunteerModal open={adding} onClose={() => setAdding(false)} onSave={addVolunteer} />
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Team card
 * -------------------------------------------------------------------------- */

/**
 * A team card is a filter control, so it is a `<button>` with `aria-pressed` rather than a decorated
 * div with a click handler — that is what makes it reachable by keyboard and announced as a toggle.
 */
function TeamCard({
  team,
  selected,
  onSelect,
}: {
  team: VolunteerTeam;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className={`h-full w-full rounded-lg border px-3.5 py-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b] ${
          selected
            ? "border-[#0d4d3b] bg-[#eef2ec]"
            : "border-[#e2e1d6] bg-white hover:border-[#b9c2ba] hover:bg-[#fbfaf5]"
        }`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-md border ${
              selected ? "border-[#c2d8cb] bg-white text-[#0d4d3b]" : "border-[#e3ce9d] bg-[#f7f0df] text-[#a97b23]"
            }`}
          >
            <Icon name={team.icon} size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <p className={`text-[13.5px] font-semibold ${selected ? "text-[#0b4634]" : "text-[#17211d]"}`}>
              {team.name}
            </p>
            <p className="mt-0.5 text-[12px] tabular-nums text-[#69726d]">
              {pluralise(team.volunteerCount, "volunteer")}
            </p>
          </div>
        </div>

        <p className="mt-2.5 text-[12px] leading-5 text-[#69726d]">{team.description}</p>

        <div className="mt-3 border-t border-[#eceae0] pt-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[11px] text-[#8b938d]">Active today</p>
            <p className="text-[11.5px] font-semibold tabular-nums text-[#3d453f]">
              {team.activeToday}/{team.volunteerCount}
            </p>
          </div>
          <ProgressBar
            className="mt-1.5"
            value={team.activeToday}
            max={team.volunteerCount}
            tone={selected ? "success" : "gold"}
            label={`${team.activeToday} of ${team.volunteerCount} ${team.name} volunteers active today`}
          />
          <p className="mt-2 truncate text-[11.5px] text-[#8b938d]">Lead: {team.lead}</p>
        </div>
      </button>
    </li>
  );
}

/* -------------------------------------------------------------------------- *
 * Detail drawer
 * -------------------------------------------------------------------------- */

const detailTabs: ReadonlyArray<TabItem<"profile" | "team" | "service">> = [
  { id: "profile", label: "Profile" },
  { id: "team", label: "Team & skills" },
  { id: "service", label: "Service" },
];

function VolunteerDetailDrawer({ volunteer, onClose }: { volunteer: Volunteer; onClose: () => void }) {
  const [tab, setTab] = useState<(typeof detailTabs)[number]["id"]>("profile");
  const idBase = useTabIds();
  const team = volunteerTeams.find((entry) => entry.id === volunteer.teamId);

  return (
    <DetailDrawer
      open
      onClose={onClose}
      eyebrow={volunteer.id}
      title={volunteer.name}
      subtitle={`${volunteer.teamName} · ${volunteer.schedule}`}
      avatarName={volunteer.name}
      badge={
        <>
          <VolunteerStatusBadge status={volunteer.status} />
          <AvailabilityBadge availability={volunteer.availability} />
        </>
      }
      tabs={
        <Tabs items={detailTabs} active={tab} onChange={setTab} label={`${volunteer.name} details`} idBase={idBase} />
      }
      footer={
        <>
          <Can permission="volunteer.manage">
            <Button size="sm" icon="pencil">
              Edit volunteer
            </Button>
          </Can>
          <Button size="sm" variant="secondary" onClick={onClose} className="ml-auto">
            Close
          </Button>
        </>
      }
    >
      <TabPanel base={idBase} id="profile" active={tab === "profile"}>
        <div className="space-y-5">
          <DetailStats
            items={[
              { label: "Service hours", value: `${formatCount(volunteer.serviceHours)} hrs` },
              { label: "Events", value: formatCount(volunteer.eventsParticipated) },
              { label: "Joined", value: formatMonthYear(volunteer.joinedDate) },
            ]}
          />
          <DetailSection title="Contact">
            <DetailGrid>
              <DetailField label="Phone" value={<span className="tabular-nums">{volunteer.phone}</span>} />
              <DetailField label="Email" value={<span className="break-all">{volunteer.email}</span>} />
            </DetailGrid>
          </DetailSection>
          <DetailSection title="Emergency contact">
            <DetailGrid>
              <DetailField label="Name" value={volunteer.emergencyContactName} />
              <DetailField
                label="Phone"
                value={<span className="tabular-nums">{volunteer.emergencyContactPhone}</span>}
              />
            </DetailGrid>
          </DetailSection>
        </div>
      </TabPanel>

      <TabPanel base={idBase} id="team" active={tab === "team"}>
        <div className="space-y-5">
          <DetailSection title="Team">
            <div className="rounded-lg border border-[#e7e6dc] bg-[#faf9f4] px-3.5 py-3">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[#e3ce9d] bg-[#f7f0df] text-[#a97b23]">
                  <Icon name={team?.icon ?? "hands-heart"} size={17} />
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold text-[#17211d]">{volunteer.teamName}</p>
                  <p className="mt-0.5 text-[12px] leading-5 text-[#69726d]">{team?.description}</p>
                  <p className="mt-1.5 text-[11.5px] text-[#8b938d]">Lead: {team?.lead ?? "Unassigned"}</p>
                </div>
              </div>
            </div>
          </DetailSection>

          <DetailSection title={`Skills (${volunteer.skills.length})`}>
            {volunteer.skills.length === 0 ? (
              <p className="text-[13px] text-[#69726d]">No skills recorded yet.</p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {volunteer.skills.map((skill) => (
                  <li key={skill}>
                    <Chip>{skill}</Chip>
                  </li>
                ))}
              </ul>
            )}
          </DetailSection>

          <DetailSection title="Availability">
            <DetailGrid>
              <DetailField label="Usual schedule" value={volunteer.schedule} />
              <DetailField
                label="Right now"
                value={<AvailabilityBadge availability={volunteer.availability} />}
              />
            </DetailGrid>
          </DetailSection>
        </div>
      </TabPanel>

      <TabPanel base={idBase} id="service" active={tab === "service"}>
        <div className="space-y-5">
          <DetailSection title="Service record">
            <DetailStats
              items={[
                { label: "Service hours", value: `${formatCount(volunteer.serviceHours)} hrs`, hint: "Since joining" },
                {
                  label: "Events participated",
                  value: formatCount(volunteer.eventsParticipated),
                  hint: "Programmes worked",
                },
                {
                  label: "Hours per event",
                  value:
                    volunteer.eventsParticipated > 0
                      ? (volunteer.serviceHours / volunteer.eventsParticipated).toFixed(1)
                      : "—",
                  hint: "Average",
                },
              ]}
            />
          </DetailSection>

          <DetailSection title="Contribution to the team">
            <div className="rounded-lg border border-[#e7e6dc] bg-[#faf9f4] px-3.5 py-3.5">
              <p className="text-[12.5px] text-[#69726d]">
                {volunteer.name.split(" ")[0]} has given{" "}
                <span className="font-semibold tabular-nums text-[#17211d]">
                  {formatCount(volunteer.serviceHours)} hours
                </span>{" "}
                since {formatLongDate(volunteer.joinedDate)}.
              </p>
              <ProgressBar
                className="mt-3"
                value={volunteer.serviceHours}
                max={220}
                tone={volunteer.serviceHours >= 150 ? "success" : "gold"}
                label={`${volunteer.serviceHours} hours of service`}
                showValue
              />
              <p className="mt-1 text-[11.5px] text-[#8b938d]">
                Measured against 220 hours, the highest on the roster.
              </p>
            </div>
            <InlineNotice className="mt-3" icon="info">
              Hours are submitted by the team lead after each rota and are not editable from this panel.
            </InlineNotice>
          </DetailSection>
        </div>
      </TabPanel>
    </DetailDrawer>
  );
}

/* -------------------------------------------------------------------------- *
 * Add volunteer
 * -------------------------------------------------------------------------- */

function AddVolunteerModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (draft: VolunteerDraft) => void;
}) {
  const [draft, setDraft] = useState<VolunteerDraft>(emptyDraft);
  const [submitted, setSubmitted] = useState(false);

  const set = <Key extends keyof VolunteerDraft>(key: Key, value: VolunteerDraft[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const errors = {
    name: draft.name.trim().length === 0 ? "A volunteer needs a name." : undefined,
    phone: draft.phone.trim().length < 6 ? "A contactable phone number is required." : undefined,
    email:
      draft.email.trim().length > 0 && !draft.email.includes("@")
        ? "That does not look like an email address."
        : undefined,
    teamId: draft.teamId.length === 0 ? "Choose the team they will serve on." : undefined,
    emergencyContactPhone:
      draft.emergencyContactName.trim().length > 0 && draft.emergencyContactPhone.trim().length < 6
        ? "Add a number for the emergency contact, or remove the name."
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
      title="Add volunteer"
      description="Places someone on a service team. An emergency contact is strongly recommended for anyone on the security or food teams."
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button icon="check" onClick={submit}>
            Add Volunteer
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Name"
          required
          value={draft.name}
          onChange={(event) => set("name", event.target.value)}
          error={show("name")}
          containerClassName="sm:col-span-2"
        />
        <TextField
          label="Phone"
          type="tel"
          required
          placeholder="+880 1XXX-XXXXXX"
          value={draft.phone}
          onChange={(event) => set("phone", event.target.value)}
          error={show("phone")}
        />
        <TextField
          label="Email"
          type="email"
          value={draft.email}
          onChange={(event) => set("email", event.target.value)}
          error={show("email")}
        />
        <SelectField
          label="Team"
          required
          value={draft.teamId}
          options={volunteerTeams.map((team) => ({ value: team.id, label: team.name }))}
          onChange={(event) => set("teamId", event.target.value)}
          error={show("teamId")}
        />
        <SelectField
          label="Usual schedule"
          required
          value={draft.schedule}
          options={[...volunteerSchedules]}
          onChange={(event) => set("schedule", event.target.value as VolunteerDraft["schedule"])}
        />
        <TextAreaField
          label="Skills"
          rows={2}
          value={draft.skills}
          onChange={(event) => set("skills", event.target.value)}
          hint="Comma separated — First aid, Bulk cooking, Video editing."
          containerClassName="sm:col-span-2"
        />

        <fieldset className="sm:col-span-2">
          <legend className="text-[13px] font-semibold text-[#3d453f]">Emergency contact</legend>
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <TextField
              label="Name"
              value={draft.emergencyContactName}
              onChange={(event) => set("emergencyContactName", event.target.value)}
            />
            <TextField
              label="Phone"
              type="tel"
              value={draft.emergencyContactPhone}
              onChange={(event) => set("emergencyContactPhone", event.target.value)}
              error={show("emergencyContactPhone")}
            />
          </div>
        </fieldset>

        <SelectField
          label="Availability"
          required
          value={draft.availability}
          options={[...volunteerAvailabilities]}
          onChange={(event) => set("availability", event.target.value as VolunteerDraft["availability"])}
        />
        <SelectField
          label="Status"
          required
          value={draft.status}
          options={[...volunteerStatuses]}
          onChange={(event) => set("status", event.target.value as VolunteerDraft["status"])}
        />
      </div>

      {submitted && !valid ? (
        <InlineNotice className="mt-4" tone="neutral" icon="alert">
          Some details still need attention — see the messages above.
        </InlineNotice>
      ) : (
        <InlineNotice className="mt-4" tone="gold">
          Front-end preview — the volunteer is added to this browser session only.
        </InlineNotice>
      )}
    </Modal>
  );
}
