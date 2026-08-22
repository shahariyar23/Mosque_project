"use client";

import { useMemo, useState } from "react";
import { Button, IconButton } from "@/components/finance/ui/button";
import { DataTable, type Column } from "@/components/finance/ui/data-table";
import { FinanceFilters, type SelectFilter } from "@/components/finance/ui/filters";
import { SelectField, TextAreaField, TextField } from "@/components/finance/ui/form-field";
import { Modal } from "@/components/finance/ui/modal";
import { Panel, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { ProgressBar } from "@/components/finance/ui/progress";
import { FinanceEmptyState, InlineNotice } from "@/components/finance/ui/states";
import { PersonCell } from "@/components/ui/avatar";
import { DetailDrawer, DetailField, DetailGrid, DetailSection, DetailStats } from "@/components/ui/detail-drawer";
import { StatGrid } from "@/components/ui/stat-card";
import { MemberStatusBadge, MembershipTierBadge, RegistrationStatusBadge } from "@/components/ui/status-badge";
import { TabPanel, Tabs, useTabIds, type TabItem } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { memberTotals, members as seedMembers } from "@/data/members";
import { registrationsForMember } from "@/data/registrations";
import { formatAmount } from "@/lib/finance/format";
import { downloadCsv } from "@/lib/mosque/export";
import {
  ageGroupOf,
  ageOf,
  formatCount,
  formatLongDate,
  formatRelativeDay,
  REFERENCE_DATE,
} from "@/lib/mosque/format";
import {
  ageGroups,
  genders,
  memberStatuses,
  membershipTiers,
  type Member,
  type MemberDraft,
  type StatMetric,
} from "@/lib/mosque/types";

/**
 * The member register.
 *
 * Filtering, sorting and paging all happen over the in-memory array — the shared `DataTable` owns sort
 * and paging, this component owns the predicate. When the API lands, the predicate becomes a query
 * string and the table does not change at all.
 *
 * The summary cards report the whole register (1,248 members) while the table holds a sample of
 * forty-four. That is said out loud in the table's footnote rather than left for someone to notice: a
 * card and a table that disagree without explanation is the kind of thing that quietly destroys trust
 * in every other number on the page.
 */
const metrics: StatMetric[] = [
  {
    id: "total",
    label: "Total Members",
    value: formatCount(memberTotals.total),
    hint: "On the register today",
    icon: "users",
    tone: "neutral",
    change: { label: "+8.4%", direction: "up", period: "this month" },
  },
  {
    id: "active",
    label: "Active Members",
    value: formatCount(memberTotals.active),
    hint: `${Math.round((memberTotals.active / memberTotals.total) * 100)}% of the register`,
    icon: "check-circle",
    tone: "positive",
  },
  {
    id: "new",
    label: "New This Month",
    value: formatCount(memberTotals.newThisMonth),
    hint: "Joined in August",
    icon: "user-plus",
    tone: "gold",
    change: { label: "+6", direction: "up", period: "vs July" },
  },
  {
    id: "inactive",
    label: "Inactive",
    value: formatCount(memberTotals.inactive),
    hint: "Moved away or lapsed",
    icon: "alert",
    tone: "warning",
  },
];

const emptyDraft: MemberDraft = {
  name: "",
  email: "",
  phone: "",
  gender: "Male",
  dateOfBirth: "",
  address: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  status: "Pending",
  tier: "General",
  monthlyContribution: "500",
};

export function MembersView({ openAddOnMount = false }: { openAddOnMount?: boolean }) {
  const { notify } = useToast();
  const [members, setMembers] = useState<Member[]>(seedMembers);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [gender, setGender] = useState("all");
  const [ageGroup, setAgeGroup] = useState("all");
  const [joinedFrom, setJoinedFrom] = useState("");
  const [joinedTo, setJoinedTo] = useState("");
  const [selected, setSelected] = useState<Member | null>(null);
  const [adding, setAdding] = useState(openAddOnMount);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return members.filter((member) => {
      if (needle) {
        const haystack = `${member.name} ${member.email} ${member.phone} ${member.id} ${member.address}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (status !== "all" && member.status !== status) return false;
      if (gender !== "all" && member.gender !== gender) return false;
      if (ageGroup !== "all" && ageGroupOf(member.dateOfBirth) !== ageGroup) return false;
      if (joinedFrom && member.joinDate < joinedFrom) return false;
      if (joinedTo && member.joinDate > joinedTo) return false;
      return true;
    });
  }, [ageGroup, gender, joinedFrom, joinedTo, members, search, status]);

  const filters: SelectFilter[] = [
    {
      id: "status",
      label: "Status",
      value: status,
      onChange: setStatus,
      options: [{ value: "all", label: "Any status" }, ...memberStatuses.map((value) => ({ value, label: value }))],
    },
    {
      id: "gender",
      label: "Gender",
      value: gender,
      onChange: setGender,
      options: [{ value: "all", label: "Any" }, ...genders.map((value) => ({ value, label: value }))],
    },
    {
      id: "age",
      label: "Age group",
      value: ageGroup,
      onChange: setAgeGroup,
      options: [{ value: "all", label: "Any age" }, ...ageGroups.map((value) => ({ value, label: value }))],
    },
  ];

  const activeFilterCount =
    (status !== "all" ? 1 : 0) +
    (gender !== "all" ? 1 : 0) +
    (ageGroup !== "all" ? 1 : 0) +
    (joinedFrom ? 1 : 0) +
    (joinedTo ? 1 : 0);

  const resetFilters = () => {
    setStatus("all");
    setGender("all");
    setAgeGroup("all");
    setJoinedFrom("");
    setJoinedTo("");
  };

  const addMember = (draft: MemberDraft) => {
    const member: Member = {
      id: `MEM-${String(members.length + 1).padStart(3, "0")}`,
      name: draft.name.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      gender: draft.gender,
      dateOfBirth: draft.dateOfBirth,
      address: draft.address.trim(),
      joinDate: REFERENCE_DATE,
      status: draft.status,
      tier: draft.tier,
      emergencyContactName: draft.emergencyContactName.trim(),
      emergencyContactPhone: draft.emergencyContactPhone.trim(),
      monthlyContribution: Number(draft.monthlyContribution) || 0,
      contributionsPaidThisYear: 0,
      eventsAttended: 0,
      lastSeen: REFERENCE_DATE,
    };

    // Newest first, so the row someone just created is the one they see.
    setMembers((current) => [member, ...current]);
    setAdding(false);
    notify({
      message: "Member added successfully.",
      description: `${member.name} · ${member.id} — held in this browser only.`,
    });
  };

  const exportCsv = () => {
    downloadCsv("noor-mosque-members.csv", filtered, [
      { header: "Member ID", value: (member) => member.id },
      { header: "Name", value: (member) => member.name },
      { header: "Phone", value: (member) => member.phone },
      { header: "Email", value: (member) => member.email },
      { header: "Gender", value: (member) => member.gender },
      { header: "Date of birth", value: (member) => member.dateOfBirth },
      { header: "Age", value: (member) => ageOf(member.dateOfBirth) },
      { header: "Address", value: (member) => member.address },
      { header: "Join date", value: (member) => member.joinDate },
      { header: "Status", value: (member) => member.status },
      { header: "Membership", value: (member) => member.tier },
      { header: "Monthly pledge (BDT)", value: (member) => member.monthlyContribution },
      { header: "Emergency contact", value: (member) => member.emergencyContactName },
      { header: "Emergency phone", value: (member) => member.emergencyContactPhone },
    ]);
    notify({
      tone: "info",
      message: "Export downloaded.",
      description: `${formatCount(filtered.length)} rows, matching the filters currently applied.`,
    });
  };

  const columns: Column<Member>[] = [
    {
      key: "member",
      header: "Member",
      cell: (member) => <PersonCell name={member.name} meta={member.id} />,
      sortValue: (member) => member.name,
    },
    {
      key: "phone",
      header: "Phone",
      cell: (member) => <span className="tabular-nums">{member.phone}</span>,
    },
    {
      key: "email",
      header: "Email",
      secondary: true,
      cell: (member) => <span className="truncate">{member.email}</span>,
      sortValue: (member) => member.email,
    },
    {
      key: "gender",
      header: "Gender",
      cell: (member) => member.gender,
      sortValue: (member) => member.gender,
    },
    {
      key: "joined",
      header: "Join Date",
      cell: (member) => <span className="tabular-nums">{formatLongDate(member.joinDate)}</span>,
      sortValue: (member) => member.joinDate,
    },
    {
      key: "status",
      header: "Status",
      cell: (member) => <MemberStatusBadge status={member.status} />,
      sortValue: (member) => member.status,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      align: "right",
      cell: (member) => (
        <span className="flex items-center justify-end gap-1">
          <IconButton icon="eye" label={`View ${member.name}`} onClick={() => setSelected(member)} />
          <Can permission="member.manage">
            <IconButton icon="pencil" label={`Edit ${member.name}`} onClick={() => setSelected(member)} />
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
          title="Member Register"
          description="Everyone on the community roll, with their contact details and membership standing."
          icon="users"
          actions={
            <>
              <Button variant="secondary" size="sm" icon="download" onClick={exportCsv}>
                Export
              </Button>
              <Can permission="member.manage">
                <Button size="sm" icon="plus" onClick={() => setAdding(true)}>
                  Add Member
                </Button>
              </Can>
            </>
          }
        />

        <FinanceFilters
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "Search members…",
            label: "Search members by name, phone, email or member ID",
          }}
          filters={filters}
          dateRange={{
            label: "Registration date",
            fromLabel: "Joined on or after",
            toLabel: "Joined on or before",
            from: joinedFrom,
            to: joinedTo,
            onFromChange: setJoinedFrom,
            onToChange: setJoinedTo,
          }}
          activeCount={activeFilterCount}
          onReset={resetFilters}
        />

        <DataTable
          rows={filtered}
          columns={columns}
          getRowKey={(member) => member.id}
          caption="Mosque members with contact details, join date and membership status"
          initialSort={{ key: "joined", direction: "desc" }}
          pageSize={10}
          mobileTitle={(member) => member.name}
          mobileSubtitle={(member) => `${member.id} · ${member.tier}`}
          mobileTrailing={(member) => <MemberStatusBadge status={member.status} />}
          mobileHiddenKeys={["member", "status"]}
          footNote={`Sample of the register — ${formatCount(seedMembers.length)} of ${formatCount(memberTotals.total)} records loaded.`}
          emptyState={
            <FinanceEmptyState
              icon="users"
              title="No members found."
              description={
                activeFilterCount > 0 || search
                  ? "Nothing matches the current search and filters. Try clearing them."
                  : "The register is empty. Add the first member to get started."
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
                  <Can permission="member.manage">
                    <Button icon="plus" onClick={() => setAdding(true)}>
                      Add Member
                    </Button>
                  </Can>
                )
              }
            />
          }
        />
      </Panel>

      {selected ? <MemberDetailDrawer member={selected} onClose={() => setSelected(null)} /> : null}
      <AddMemberModal open={adding} onClose={() => setAdding(false)} onSave={addMember} />
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Detail drawer
 * -------------------------------------------------------------------------- */

const detailTabs: ReadonlyArray<TabItem<"profile" | "contact" | "membership" | "events" | "activity">> = [
  { id: "profile", label: "Profile" },
  { id: "contact", label: "Contact" },
  { id: "membership", label: "Membership" },
  { id: "events", label: "Events" },
  { id: "activity", label: "Activity" },
];

function MemberDetailDrawer({ member, onClose }: { member: Member; onClose: () => void }) {
  const [tab, setTab] = useState<(typeof detailTabs)[number]["id"]>("profile");
  const idBase = useTabIds();
  const registrations = registrationsForMember(member.id);

  const pledgedThisYear = member.monthlyContribution * 8;
  const paidThisYear = member.monthlyContribution * member.contributionsPaidThisYear;

  return (
    <DetailDrawer
      open
      onClose={onClose}
      eyebrow={member.id}
      title={member.name}
      subtitle={`${member.gender} · ${ageOf(member.dateOfBirth)} years · ${ageGroupOf(member.dateOfBirth)}`}
      avatarName={member.name}
      badge={
        <>
          <MemberStatusBadge status={member.status} />
          <MembershipTierBadge tier={member.tier} />
        </>
      }
      tabs={
        <Tabs items={detailTabs} active={tab} onChange={setTab} label={`${member.name} details`} idBase={idBase} />
      }
      footer={
        <>
          <Can permission="member.manage">
            <Button size="sm" icon="pencil">
              Edit member
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
              { label: "Member since", value: formatLongDate(member.joinDate).slice(-4), hint: formatLongDate(member.joinDate) },
              { label: "Events attended", value: formatCount(member.eventsAttended) },
              { label: "Last seen", value: formatRelativeDay(member.lastSeen), hint: formatLongDate(member.lastSeen) },
            ]}
          />
          <DetailSection title="Profile">
            <DetailGrid>
              <DetailField label="Full name" value={member.name} />
              <DetailField label="Member ID" value={member.id} />
              <DetailField label="Gender" value={member.gender} />
              <DetailField label="Date of birth" value={formatLongDate(member.dateOfBirth)} />
              <DetailField label="Age" value={`${ageOf(member.dateOfBirth)} years`} />
              <DetailField label="Age group" value={ageGroupOf(member.dateOfBirth)} />
            </DetailGrid>
          </DetailSection>
        </div>
      </TabPanel>

      <TabPanel base={idBase} id="contact" active={tab === "contact"}>
        <div className="space-y-5">
          <DetailSection title="Contact">
            <DetailGrid>
              <DetailField label="Phone" value={<span className="tabular-nums">{member.phone}</span>} />
              <DetailField label="Email" value={<span className="break-all">{member.email}</span>} />
              <DetailField label="Address" value={member.address} full />
            </DetailGrid>
          </DetailSection>
          <DetailSection title="Emergency contact">
            <DetailGrid>
              <DetailField label="Name" value={member.emergencyContactName} />
              <DetailField
                label="Phone"
                value={<span className="tabular-nums">{member.emergencyContactPhone}</span>}
              />
            </DetailGrid>
          </DetailSection>
        </div>
      </TabPanel>

      <TabPanel base={idBase} id="membership" active={tab === "membership"}>
        <div className="space-y-5">
          <DetailSection title="Membership">
            <DetailGrid>
              <DetailField label="Status" value={<MemberStatusBadge status={member.status} />} />
              <DetailField label="Tier" value={<MembershipTierBadge tier={member.tier} />} />
              <DetailField label="Joined" value={formatLongDate(member.joinDate)} />
              <DetailField label="Years on the register" value={`${Math.max(0, 2026 - Number(member.joinDate.slice(0, 4)))}`} />
            </DetailGrid>
          </DetailSection>

          <DetailSection title="Contributions">
            <div className="rounded-lg border border-[#e7e6dc] bg-[#faf9f4] px-3.5 py-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[12.5px] text-[#69726d]">Paid this year</p>
                <p className="text-[15px] font-semibold tabular-nums text-[#0b4634]">{formatAmount(paidThisYear)}</p>
              </div>
              <ProgressBar
                className="mt-2.5"
                value={member.contributionsPaidThisYear}
                max={8}
                tone={member.contributionsPaidThisYear >= 8 ? "success" : "pending"}
                label={`${member.contributionsPaidThisYear} of 8 monthly contributions paid this year`}
              />
              <p className="mt-2 text-[12px] text-[#8b938d]">
                {member.contributionsPaidThisYear} of 8 months · pledged {formatAmount(member.monthlyContribution)} a
                month, {formatAmount(pledgedThisYear)} expected to date
              </p>
            </div>
            <InlineNotice className="mt-3" icon="info">
              Read-only here. Contributions are recorded and receipted in the finance module, so that one place stays the
              record of what was actually collected.
            </InlineNotice>
          </DetailSection>
        </div>
      </TabPanel>

      <TabPanel base={idBase} id="events" active={tab === "events"}>
        <DetailSection title={`Event registrations (${registrations.length})`}>
          {registrations.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[#dcdacd] bg-[#faf9f4] px-3.5 py-6 text-center text-[13px] text-[#69726d]">
              {member.name.split(" ")[0]} has not registered for any events yet.
            </p>
          ) : (
            <ul className="divide-y divide-[#f0efe6]">
              {registrations.map((registration) => (
                <li key={registration.id} className="flex items-start justify-between gap-3 py-3 first:pt-0">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium text-[#17211d]">{registration.eventTitle}</p>
                    <p className="mt-0.5 text-[12px] text-[#69726d]">
                      {formatLongDate(registration.eventDate)}
                      {registration.guests > 0 ? ` · ${formatCount(registration.guests)} guests` : null}
                    </p>
                  </div>
                  <RegistrationStatusBadge status={registration.status} />
                </li>
              ))}
            </ul>
          )}
        </DetailSection>
      </TabPanel>

      <TabPanel base={idBase} id="activity" active={tab === "activity"}>
        <DetailSection title="Activity">
          <ul className="space-y-3">
            {[
              { label: "Joined the mosque register", at: member.joinDate },
              ...registrations
                .slice(0, 4)
                .map((registration) => ({ label: `Registered for ${registration.eventTitle}`, at: registration.registeredAt })),
              { label: "Last seen at the mosque", at: member.lastSeen },
            ]
              .sort((a, b) => b.at.localeCompare(a.at))
              .map((entry, index) => (
                <li key={`${entry.label}-${index}`} className="flex items-start gap-2.5">
                  <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c79a45]" />
                  <div className="min-w-0">
                    <p className="text-[13px] text-[#17211d]">{entry.label}</p>
                    <p className="text-[11.5px] text-[#8b938d]">
                      {formatLongDate(entry.at)} · {formatRelativeDay(entry.at)}
                    </p>
                  </div>
                </li>
              ))}
          </ul>
        </DetailSection>
      </TabPanel>
    </DetailDrawer>
  );
}

/* -------------------------------------------------------------------------- *
 * Add member
 * -------------------------------------------------------------------------- */

function AddMemberModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (draft: MemberDraft) => void;
}) {
  const [draft, setDraft] = useState<MemberDraft>(emptyDraft);
  const [submitted, setSubmitted] = useState(false);

  const set = <Key extends keyof MemberDraft>(key: Key, value: MemberDraft[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const errors = {
    name: draft.name.trim().length === 0 ? "A member needs a full name." : undefined,
    phone: draft.phone.trim().length < 6 ? "A contactable phone number is required." : undefined,
    email:
      draft.email.trim().length > 0 && !draft.email.includes("@")
        ? "That does not look like an email address."
        : undefined,
    dateOfBirth: draft.dateOfBirth.length === 0 ? "A date of birth sets the age group." : undefined,
    emergencyContactPhone:
      draft.emergencyContactName.trim().length > 0 && draft.emergencyContactPhone.trim().length < 6
        ? "Add a number for the emergency contact, or remove the name."
        : undefined,
  };
  const valid = Object.values(errors).every((error) => error === undefined);

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

  /** Errors only appear after a submit attempt, so the form is not shouting before anyone has typed. */
  const show = (key: keyof typeof errors) => (submitted ? errors[key] : undefined);

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add member"
      description="Registers someone on the community roll. Only the name, phone and date of birth are required."
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button icon="check" onClick={submit}>
            Add Member
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Full name"
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
          label="Gender"
          required
          value={draft.gender}
          options={[...genders]}
          onChange={(event) => set("gender", event.target.value as MemberDraft["gender"])}
        />
        <TextField
          label="Date of birth"
          type="date"
          required
          max={REFERENCE_DATE}
          value={draft.dateOfBirth}
          onChange={(event) => set("dateOfBirth", event.target.value)}
          error={show("dateOfBirth")}
        />
        <TextAreaField
          label="Address"
          rows={2}
          value={draft.address}
          onChange={(event) => set("address", event.target.value)}
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
          label="Membership status"
          required
          value={draft.status}
          options={[...memberStatuses]}
          onChange={(event) => set("status", event.target.value as MemberDraft["status"])}
          hint="New applications usually start as Pending until the committee reviews them."
        />
        <SelectField
          label="Membership tier"
          required
          value={draft.tier}
          options={[...membershipTiers]}
          onChange={(event) => set("tier", event.target.value as MemberDraft["tier"])}
        />
        <TextField
          label="Monthly contribution (৳)"
          type="number"
          min={0}
          value={draft.monthlyContribution}
          onChange={(event) => set("monthlyContribution", event.target.value)}
          hint="A pledge, not a payment — collection is recorded in the finance module."
          containerClassName="sm:col-span-2"
        />
      </div>

      {submitted && !valid ? (
        <InlineNotice className="mt-4" tone="neutral" icon="alert">
          Some details still need attention — see the messages above.
        </InlineNotice>
      ) : (
        <InlineNotice className="mt-4" tone="gold">
          Front-end preview — the member is added to this browser session only.
        </InlineNotice>
      )}
    </Modal>
  );
}
