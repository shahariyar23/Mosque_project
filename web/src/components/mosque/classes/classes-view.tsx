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
import { CapacityMeter } from "@/components/ui/charts";
import { DetailDrawer, DetailField, DetailGrid, DetailSection, DetailStats } from "@/components/ui/detail-drawer";
import { StatGrid } from "@/components/ui/stat-card";
import { ClassCategoryChip, ClassStatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { classStats, classes as seedClasses } from "@/data/classes";
import { formatAmount } from "@/lib/finance/format";
import { downloadCsv } from "@/lib/mosque/export";
import { formatClockTime, formatCount, formatLongDate, REFERENCE_DATE } from "@/lib/mosque/format";
import {
  classAudiences,
  classCategories,
  classLevels,
  classStatuses,
  type MosqueClass,
  type MosqueClassDraft,
  type StatMetric,
} from "@/lib/mosque/types";

/**
 * The class register — the mosque's teaching programme.
 *
 * A class is a standing offer with a term and a roll, so the figure that matters most is enrolment
 * against capacity; the detail drawer spells it out with the shared `CapacityMeter`. Same shape as
 * the other registers: this component owns the search predicate, and the shared `DataTable` does the
 * sorting, paging and mobile cards. A draft carries no roll yet, a completed class is kept only for
 * the record, and a full one sends new students to the waiting list.
 */
const metrics: StatMetric[] = [
  {
    id: "total",
    label: "Classes",
    value: formatCount(classStats.total),
    hint: "In the programme",
    icon: "graduation-cap",
    tone: "neutral",
  },
  {
    id: "enrolling",
    label: "Enrolling",
    value: formatCount(classStats.enrolling),
    hint: "Open for enrolment now",
    icon: "check-circle",
    tone: "positive",
  },
  {
    id: "students",
    label: "Students Enrolled",
    value: formatCount(classStats.studentsEnrolled),
    hint: "Across active classes",
    icon: "users",
    tone: "gold",
  },
  {
    id: "places",
    label: "Open Places",
    value: formatCount(classStats.openPlaces),
    hint: "Still available to book",
    icon: "user-plus",
    tone: "positive",
  },
];

const emptyDraft: MosqueClassDraft = {
  title: "",
  category: "Quran",
  teacher: "",
  level: "All levels",
  audience: "Adults",
  day: "",
  time: "10:00",
  durationMinutes: "90",
  term: "Autumn 2026",
  capacity: "25",
  feePerTerm: "0",
  status: "Enrolling",
  location: "",
  summary: "",
  description: "",
};

/** Zero is a genuinely free class, so it reads "Free" rather than "৳0". */
const feeLabel = (fee: number) => (fee === 0 ? "Free" : formatAmount(fee));

/** "Saturday & Sunday · 10:00 AM" — the schedule as one line for the row and the drawer. */
const scheduleLabel = (mosqueClass: MosqueClass) => `${mosqueClass.day} · ${formatClockTime(mosqueClass.time)}`;

export function ClassesView({ openAddOnMount = false }: { openAddOnMount?: boolean }) {
  const { notify } = useToast();
  const [classList, setClassList] = useState<MosqueClass[]>(seedClasses);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [level, setLevel] = useState("all");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<MosqueClass | null>(null);
  const [adding, setAdding] = useState(openAddOnMount);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return classList.filter((mosqueClass) => {
      if (needle) {
        const haystack =
          `${mosqueClass.title} ${mosqueClass.teacher} ${mosqueClass.category} ${mosqueClass.id} ${mosqueClass.summary}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (category !== "all" && mosqueClass.category !== category) return false;
      if (level !== "all" && mosqueClass.level !== level) return false;
      if (status !== "all" && mosqueClass.status !== status) return false;
      return true;
    });
  }, [category, classList, level, search, status]);

  const filters: SelectFilter[] = [
    {
      id: "category",
      label: "Category",
      value: category,
      onChange: setCategory,
      options: [{ value: "all", label: "All categories" }, ...classCategories.map((value) => ({ value, label: value }))],
    },
    {
      id: "level",
      label: "Level",
      value: level,
      onChange: setLevel,
      options: [{ value: "all", label: "Any level" }, ...classLevels.map((value) => ({ value, label: value }))],
    },
    {
      id: "status",
      label: "Status",
      value: status,
      onChange: setStatus,
      options: [{ value: "all", label: "Any status" }, ...classStatuses.map((value) => ({ value, label: value }))],
    },
  ];

  const activeFilterCount = (category !== "all" ? 1 : 0) + (level !== "all" ? 1 : 0) + (status !== "all" ? 1 : 0);
  const resetFilters = () => {
    setCategory("all");
    setLevel("all");
    setStatus("all");
  };

  const addClass = (draft: MosqueClassDraft) => {
    const mosqueClass: MosqueClass = {
      id: `CLS-${String(classList.length + 1).padStart(3, "0")}`,
      title: draft.title.trim(),
      category: draft.category,
      teacher: draft.teacher.trim(),
      level: draft.level,
      audience: draft.audience,
      day: draft.day.trim(),
      time: draft.time || "10:00",
      durationMinutes: Number(draft.durationMinutes) || 90,
      term: draft.term.trim() || "Autumn 2026",
      startDate: REFERENCE_DATE,
      capacity: Math.max(1, Number(draft.capacity) || 25),
      enrolled: 0,
      feePerTerm: Math.max(0, Number(draft.feePerTerm) || 0),
      status: draft.status,
      location: draft.location.trim(),
      summary: draft.summary.trim(),
      description: draft.description.trim(),
    };

    setClassList((current) => [mosqueClass, ...current]);
    setAdding(false);
    notify({
      message: "Class added to the programme.",
      description: `${mosqueClass.title} · ${mosqueClass.id} — held in this browser only.`,
    });
  };

  const exportCsv = () => {
    downloadCsv("noor-mosque-classes.csv", filtered, [
      { header: "Class ID", value: (mosqueClass) => mosqueClass.id },
      { header: "Title", value: (mosqueClass) => mosqueClass.title },
      { header: "Category", value: (mosqueClass) => mosqueClass.category },
      { header: "Level", value: (mosqueClass) => mosqueClass.level },
      { header: "Audience", value: (mosqueClass) => mosqueClass.audience },
      { header: "Teacher", value: (mosqueClass) => mosqueClass.teacher },
      { header: "Day", value: (mosqueClass) => mosqueClass.day },
      { header: "Time", value: (mosqueClass) => mosqueClass.time },
      { header: "Duration (min)", value: (mosqueClass) => mosqueClass.durationMinutes },
      { header: "Term", value: (mosqueClass) => mosqueClass.term },
      { header: "Enrolled", value: (mosqueClass) => mosqueClass.enrolled },
      { header: "Capacity", value: (mosqueClass) => mosqueClass.capacity },
      { header: "Fee per term (BDT)", value: (mosqueClass) => mosqueClass.feePerTerm },
      { header: "Status", value: (mosqueClass) => mosqueClass.status },
      { header: "Location", value: (mosqueClass) => mosqueClass.location },
    ]);
    notify({
      tone: "info",
      message: "Export downloaded.",
      description: `${formatCount(filtered.length)} rows, matching the filters currently applied.`,
    });
  };

  const columns: Column<MosqueClass>[] = [
    {
      key: "class",
      header: "Class",
      cell: (mosqueClass) => (
        <span className="min-w-0">
          <span className="block font-medium text-[#17211d]">{mosqueClass.title}</span>
          <span className="block truncate text-[12px] text-[#69726d]">{scheduleLabel(mosqueClass)}</span>
        </span>
      ),
      sortValue: (mosqueClass) => mosqueClass.title,
    },
    {
      key: "category",
      header: "Category",
      cell: (mosqueClass) => <ClassCategoryChip category={mosqueClass.category} />,
      sortValue: (mosqueClass) => mosqueClass.category,
    },
    {
      key: "teacher",
      header: "Teacher",
      cell: (mosqueClass) => <PersonCell name={mosqueClass.teacher} size="sm" />,
      sortValue: (mosqueClass) => mosqueClass.teacher,
    },
    {
      key: "enrolment",
      header: "Enrolment",
      align: "right",
      cell: (mosqueClass) => (
        <span className="tabular-nums text-[#3d453f]">
          {formatCount(mosqueClass.enrolled)}
          <span className="text-[#8b938d]"> / {formatCount(mosqueClass.capacity)}</span>
        </span>
      ),
      sortValue: (mosqueClass) => mosqueClass.enrolled,
    },
    {
      key: "status",
      header: "Status",
      cell: (mosqueClass) => <ClassStatusBadge status={mosqueClass.status} />,
      sortValue: (mosqueClass) => mosqueClass.status,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      align: "right",
      cell: (mosqueClass) => (
        <span className="flex items-center justify-end gap-1">
          <IconButton icon="eye" label={`View ${mosqueClass.title}`} onClick={() => setSelected(mosqueClass)} />
          <Can permission="class.manage">
            <IconButton icon="pencil" label={`Edit ${mosqueClass.title}`} onClick={() => setSelected(mosqueClass)} />
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
          title="Class Programme"
          description="The mosque's teaching — the weekend madrasah, the Hifz circle, Arabic, and the adult and sisters' courses."
          icon="graduation-cap"
          actions={
            <>
              <Button variant="secondary" size="sm" icon="download" onClick={exportCsv}>
                Export
              </Button>
              <Can permission="class.manage">
                <Button size="sm" icon="plus" onClick={() => setAdding(true)}>
                  Add Class
                </Button>
              </Can>
            </>
          }
        />

        <FinanceFilters
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "Search classes…",
            label: "Search classes by title, teacher, category or class ID",
          }}
          filters={filters}
          activeCount={activeFilterCount}
          onReset={resetFilters}
        />

        <DataTable
          rows={filtered}
          columns={columns}
          getRowKey={(mosqueClass) => mosqueClass.id}
          caption="Mosque classes with category, teacher, enrolment and status"
          initialSort={{ key: "enrolment", direction: "desc" }}
          pageSize={10}
          mobileTitle={(mosqueClass) => mosqueClass.title}
          mobileSubtitle={(mosqueClass) => `${mosqueClass.teacher} · ${feeLabel(mosqueClass.feePerTerm)}`}
          mobileTrailing={(mosqueClass) => <ClassStatusBadge status={mosqueClass.status} />}
          mobileHiddenKeys={["class", "status"]}
          emptyState={
            <FinanceEmptyState
              icon="graduation-cap"
              title="No classes found."
              description={
                activeFilterCount > 0 || search
                  ? "Nothing matches the current search and filters. Try clearing them."
                  : "The programme is empty. Add the first class to open enrolment."
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
                  <Can permission="class.manage">
                    <Button icon="plus" onClick={() => setAdding(true)}>
                      Add Class
                    </Button>
                  </Can>
                )
              }
            />
          }
        />
      </Panel>

      {selected ? <ClassDetailDrawer mosqueClass={selected} onClose={() => setSelected(null)} /> : null}
      <AddClassModal open={adding} onClose={() => setAdding(false)} onSave={addClass} />
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Detail drawer
 * -------------------------------------------------------------------------- */

function ClassDetailDrawer({ mosqueClass, onClose }: { mosqueClass: MosqueClass; onClose: () => void }) {
  return (
    <DetailDrawer
      open
      onClose={onClose}
      eyebrow={mosqueClass.id}
      title={mosqueClass.title}
      subtitle={`${mosqueClass.level} · ${mosqueClass.audience}`}
      badge={
        <>
          <ClassStatusBadge status={mosqueClass.status} />
          <ClassCategoryChip category={mosqueClass.category} />
        </>
      }
      footer={
        <>
          <Can permission="class.manage">
            <Button size="sm" icon="pencil">
              Edit class
            </Button>
          </Can>
          <Button size="sm" variant="secondary" onClick={onClose} className="ml-auto">
            Close
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {mosqueClass.status === "Full" ? (
          <InlineNotice tone="info" icon="info">
            This class is full for {mosqueClass.term}. New students are added to the waiting list.
          </InlineNotice>
        ) : null}
        {mosqueClass.status === "Draft" ? (
          <InlineNotice tone="neutral" icon="pencil">
            Draft — not yet open for enrolment or shown on the public timetable.
          </InlineNotice>
        ) : null}
        {mosqueClass.status === "Completed" ? (
          <InlineNotice tone="neutral" icon="check-circle">
            This class has finished. It is kept on the record for reference.
          </InlineNotice>
        ) : null}

        <DetailStats
          items={[
            { label: "Enrolled", value: formatCount(mosqueClass.enrolled), hint: `of ${formatCount(mosqueClass.capacity)}` },
            { label: "Fee", value: feeLabel(mosqueClass.feePerTerm), hint: "per term" },
            { label: "Session", value: `${mosqueClass.durationMinutes} min` },
          ]}
        />

        <DetailSection title="Enrolment">
          <CapacityMeter
            filled={mosqueClass.enrolled}
            capacity={mosqueClass.capacity}
            filledLabel="Enrolled"
            capacityLabel="Capacity"
            remainingLabel="Places left"
          />
        </DetailSection>

        <DetailSection title="About this class">
          <p className="text-[13px] leading-6 text-[#4d564f]">{mosqueClass.description}</p>
        </DetailSection>

        <DetailSection title="Details">
          <DetailGrid>
            <DetailField label="Teacher" value={mosqueClass.teacher} />
            <DetailField label="Category" value={<ClassCategoryChip category={mosqueClass.category} />} />
            <DetailField label="Level" value={mosqueClass.level} />
            <DetailField label="Audience" value={mosqueClass.audience} />
            <DetailField label="Schedule" value={scheduleLabel(mosqueClass)} />
            <DetailField label="Term" value={mosqueClass.term} />
            <DetailField label="Starts" value={formatLongDate(mosqueClass.startDate)} />
            <DetailField label="Fee" value={feeLabel(mosqueClass.feePerTerm)} />
            <DetailField label="Location" value={mosqueClass.location} full />
          </DetailGrid>
        </DetailSection>
      </div>
    </DetailDrawer>
  );
}

/* -------------------------------------------------------------------------- *
 * Add class
 * -------------------------------------------------------------------------- */

function AddClassModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (draft: MosqueClassDraft) => void;
}) {
  const [draft, setDraft] = useState<MosqueClassDraft>(emptyDraft);
  const [submitted, setSubmitted] = useState(false);

  const set = <Key extends keyof MosqueClassDraft>(key: Key, value: MosqueClassDraft[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const errors = {
    title: draft.title.trim().length === 0 ? "A class needs a title." : undefined,
    teacher: draft.teacher.trim().length === 0 ? "Name the teacher." : undefined,
    day: draft.day.trim().length === 0 ? "Say which day(s) it runs." : undefined,
    location: draft.location.trim().length === 0 ? "Say where it is held." : undefined,
    capacity: Number(draft.capacity) < 1 ? "Capacity must be at least one." : undefined,
    summary: draft.summary.trim().length === 0 ? "Add a one-line summary for the card and the table." : undefined,
    description: draft.description.trim().length === 0 ? "Explain what the class covers." : undefined,
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
      title="Add class"
      description="Adds a class to the programme. Set the status to Draft to keep it off the timetable until it is ready."
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button icon="check" onClick={submit}>
            Add Class
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Class title"
          required
          value={draft.title}
          onChange={(event) => set("title", event.target.value)}
          error={show("title")}
          placeholder="Beginner Arabic: Reading & Grammar"
          containerClassName="sm:col-span-2"
        />
        <SelectField
          label="Category"
          required
          value={draft.category}
          options={[...classCategories]}
          onChange={(event) => set("category", event.target.value as MosqueClassDraft["category"])}
        />
        <TextField
          label="Teacher"
          required
          value={draft.teacher}
          onChange={(event) => set("teacher", event.target.value)}
          error={show("teacher")}
          placeholder="Ustadh Rafiqul Islam"
        />
        <SelectField
          label="Level"
          required
          value={draft.level}
          options={[...classLevels]}
          onChange={(event) => set("level", event.target.value as MosqueClassDraft["level"])}
        />
        <SelectField
          label="Audience"
          required
          value={draft.audience}
          options={[...classAudiences]}
          onChange={(event) => set("audience", event.target.value as MosqueClassDraft["audience"])}
        />
        <TextField
          label="Day(s)"
          required
          value={draft.day}
          onChange={(event) => set("day", event.target.value)}
          error={show("day")}
          placeholder="Saturday & Sunday"
        />
        <TextField
          label="Start time"
          type="time"
          value={draft.time}
          onChange={(event) => set("time", event.target.value)}
        />
        <TextField
          label="Session length"
          type="number"
          value={draft.durationMinutes}
          onChange={(event) => set("durationMinutes", event.target.value)}
          hint="Minutes."
        />
        <TextField
          label="Term"
          value={draft.term}
          onChange={(event) => set("term", event.target.value)}
          placeholder="Autumn 2026"
        />
        <TextField
          label="Capacity"
          type="number"
          required
          value={draft.capacity}
          onChange={(event) => set("capacity", event.target.value)}
          error={show("capacity")}
        />
        <AmountField
          label="Fee per term"
          value={draft.feePerTerm}
          onChange={(event) => set("feePerTerm", event.target.value)}
          hint="Leave at 0 for a free class — it will read “Free”."
        />
        <SelectField
          label="Status"
          required
          value={draft.status}
          options={[...classStatuses]}
          onChange={(event) => set("status", event.target.value as MosqueClassDraft["status"])}
        />
        <TextField
          label="Location"
          required
          value={draft.location}
          onChange={(event) => set("location", event.target.value)}
          error={show("location")}
          placeholder="Classroom 1"
          containerClassName="sm:col-span-2"
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
      </div>

      {submitted && !valid ? (
        <InlineNotice className="mt-4" tone="neutral" icon="alert">
          Some details still need attention — see the messages above.
        </InlineNotice>
      ) : (
        <InlineNotice className="mt-4" tone="gold">
          Front-end preview — the class is added to this browser session only.
        </InlineNotice>
      )}
    </Modal>
  );
}
