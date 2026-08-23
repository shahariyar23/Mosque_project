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
import { DetailDrawer, DetailField, DetailGrid, DetailSection, DetailStats } from "@/components/ui/detail-drawer";
import { StatGrid } from "@/components/ui/stat-card";
import { Chip, KhutbahStatusBadge, KhutbahThemeChip } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { khutbahEntries as seedEntries, khutbahStats } from "@/data/khutbah";
import { downloadCsv } from "@/lib/mosque/export";
import { formatCount, formatDayMonth, formatLongDate } from "@/lib/mosque/format";
import {
  contentLanguages,
  khutbahStatuses,
  khutbahThemes,
  type KhutbahDraft,
  type KhutbahEntry,
  type StatMetric,
} from "@/lib/mosque/types";

/**
 * The Friday khutbah archive and planner.
 *
 * Rows run from the drafts still being written, through what is scheduled, back to what has been
 * delivered — most recent first. Same shape as the other registers: this component owns the search
 * predicate and the shared `DataTable` does the rest. A delivered khutbah reports its congregation
 * and reach; a scheduled or draft one has neither yet, so those read as an em dash.
 */
const metrics: StatMetric[] = [
  {
    id: "total",
    label: "Khutbahs",
    value: formatCount(khutbahStats.total),
    hint: "In the archive",
    icon: "megaphone",
    tone: "neutral",
  },
  {
    id: "delivered",
    label: "Delivered",
    value: formatCount(khutbahStats.delivered),
    hint: "Recorded and archived",
    icon: "check-circle",
    tone: "positive",
  },
  {
    id: "scheduled",
    label: "Upcoming",
    value: formatCount(khutbahStats.scheduled),
    hint: "Scheduled Fridays",
    icon: "clock",
    tone: "warning",
  },
  {
    id: "attendance",
    label: "Avg Congregation",
    value: formatCount(khutbahStats.avgAttendance),
    hint: "Across delivered khutbahs",
    icon: "users",
    tone: "gold",
  },
];

const emptyDraft: KhutbahDraft = {
  title: "",
  speaker: "",
  date: "",
  language: "Bangla",
  theme: "Taqwa",
  series: "",
  summary: "",
  scriptureRefs: "",
  durationMinutes: "22",
};

/** Attendance and reach only exist once a khutbah is delivered; an em dash reads better than 0. */
const numberOrDash = (value: number | undefined) => (value && value > 0 ? formatCount(value) : "—");

/** How a khutbah was captured, for the detail drawer. */
const recordingLabel = (entry: KhutbahEntry) => {
  if (entry.hasAudio && entry.hasVideo) return "Audio & video";
  if (entry.hasVideo) return "Video only";
  if (entry.hasAudio) return "Audio only";
  return "Not recorded";
};

export function KhutbahView({ openAddOnMount = false }: { openAddOnMount?: boolean }) {
  const { notify } = useToast();
  const [entries, setEntries] = useState<KhutbahEntry[]>(seedEntries);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [theme, setTheme] = useState("all");
  const [language, setLanguage] = useState("all");
  const [selected, setSelected] = useState<KhutbahEntry | null>(null);
  const [adding, setAdding] = useState(openAddOnMount);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (needle) {
        const haystack =
          `${entry.title} ${entry.speaker} ${entry.theme} ${entry.series ?? ""} ${entry.id} ${entry.summary}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (status !== "all" && entry.status !== status) return false;
      if (theme !== "all" && entry.theme !== theme) return false;
      if (language !== "all" && entry.language !== language) return false;
      return true;
    });
  }, [entries, language, search, status, theme]);

  const filters: SelectFilter[] = [
    {
      id: "status",
      label: "Status",
      value: status,
      onChange: setStatus,
      options: [{ value: "all", label: "Any status" }, ...khutbahStatuses.map((value) => ({ value, label: value }))],
    },
    {
      id: "theme",
      label: "Theme",
      value: theme,
      onChange: setTheme,
      options: [{ value: "all", label: "All themes" }, ...khutbahThemes.map((value) => ({ value, label: value }))],
    },
    {
      id: "language",
      label: "Language",
      value: language,
      onChange: setLanguage,
      options: [{ value: "all", label: "Any language" }, ...contentLanguages.map((value) => ({ value, label: value }))],
    },
  ];

  const activeFilterCount = (status !== "all" ? 1 : 0) + (theme !== "all" ? 1 : 0) + (language !== "all" ? 1 : 0);
  const resetFilters = () => {
    setStatus("all");
    setTheme("all");
    setLanguage("all");
  };

  const addEntry = (draft: KhutbahDraft) => {
    const refs = draft.scriptureRefs
      .split(/\r?\n|,/)
      .map((ref) => ref.trim())
      .filter(Boolean);

    const entry: KhutbahEntry = {
      id: `KHT-${String(entries.length + 1).padStart(3, "0")}`,
      title: draft.title.trim(),
      speaker: draft.speaker.trim(),
      date: draft.date,
      status: "Draft",
      language: draft.language,
      theme: draft.theme,
      series: draft.series.trim() || undefined,
      summary: draft.summary.trim(),
      scriptureRefs: refs,
      durationMinutes: Number(draft.durationMinutes) || 22,
      hasAudio: false,
      hasVideo: false,
      views: 0,
    };

    setEntries((current) => [entry, ...current]);
    setAdding(false);
    notify({
      message: "Khutbah added as a draft.",
      description: `${entry.title} · ${entry.id} — held in this browser only.`,
    });
  };

  const exportCsv = () => {
    downloadCsv("noor-mosque-khutbahs.csv", filtered, [
      { header: "Khutbah ID", value: (entry) => entry.id },
      { header: "Title", value: (entry) => entry.title },
      { header: "Speaker", value: (entry) => entry.speaker },
      { header: "Date", value: (entry) => entry.date },
      { header: "Status", value: (entry) => entry.status },
      { header: "Theme", value: (entry) => entry.theme },
      { header: "Series", value: (entry) => entry.series ?? "" },
      { header: "Language", value: (entry) => entry.language },
      { header: "Duration (min)", value: (entry) => entry.durationMinutes },
      { header: "Congregation", value: (entry) => entry.attendance ?? "" },
      { header: "Reach", value: (entry) => entry.views },
      { header: "Scripture", value: (entry) => entry.scriptureRefs.join("; ") },
    ]);
    notify({
      tone: "info",
      message: "Export downloaded.",
      description: `${formatCount(filtered.length)} rows, matching the filters currently applied.`,
    });
  };

  const columns: Column<KhutbahEntry>[] = [
    {
      key: "khutbah",
      header: "Khutbah",
      cell: (entry) => (
        <span className="min-w-0">
          <span className="block font-medium text-[#17211d]">{entry.title}</span>
          <span className="block truncate text-[12px] text-[#69726d]">
            {entry.series ? `${entry.series} · ` : ""}
            {entry.speaker}
          </span>
        </span>
      ),
      sortValue: (entry) => entry.title,
    },
    {
      key: "theme",
      header: "Theme",
      cell: (entry) => <KhutbahThemeChip theme={entry.theme} />,
      sortValue: (entry) => entry.theme,
    },
    {
      key: "date",
      header: "Date",
      cell: (entry) => <span className="whitespace-nowrap text-[#3d453f]">{formatLongDate(entry.date)}</span>,
      sortValue: (entry) => entry.date,
    },
    {
      key: "congregation",
      header: "Congregation",
      align: "right",
      cell: (entry) => <span className="tabular-nums text-[#3d453f]">{numberOrDash(entry.attendance)}</span>,
      sortValue: (entry) => entry.attendance ?? 0,
    },
    {
      key: "status",
      header: "Status",
      cell: (entry) => <KhutbahStatusBadge status={entry.status} />,
      sortValue: (entry) => entry.status,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      align: "right",
      cell: (entry) => (
        <span className="flex items-center justify-end gap-1">
          <IconButton icon="eye" label={`View ${entry.title}`} onClick={() => setSelected(entry)} />
          <Can permission="khutbah.update">
            <IconButton icon="pencil" label={`Edit ${entry.title}`} onClick={() => setSelected(entry)} />
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
          title="Khutbah Archive"
          description="The Friday sermons — what has been delivered, what is scheduled, and the drafts in preparation."
          icon="megaphone"
          actions={
            <>
              <Button variant="secondary" size="sm" icon="download" onClick={exportCsv}>
                Export
              </Button>
              <Can permission="khutbah.create">
                <Button size="sm" icon="plus" onClick={() => setAdding(true)}>
                  Add Khutbah
                </Button>
              </Can>
            </>
          }
        />

        <FinanceFilters
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "Search by title, speaker, theme…",
            label: "Search khutbahs by title, speaker, theme, series or ID",
          }}
          filters={filters}
          activeCount={activeFilterCount}
          onReset={resetFilters}
        />

        <DataTable
          rows={filtered}
          columns={columns}
          getRowKey={(entry) => entry.id}
          caption="Friday khutbahs with theme, date, congregation and status"
          initialSort={{ key: "date", direction: "desc" }}
          pageSize={10}
          mobileTitle={(entry) => entry.title}
          mobileSubtitle={(entry) => `${entry.speaker} · ${formatDayMonth(entry.date)}`}
          mobileTrailing={(entry) => <KhutbahStatusBadge status={entry.status} />}
          mobileHiddenKeys={["khutbah", "status"]}
          emptyState={
            <FinanceEmptyState
              icon="megaphone"
              title="No khutbahs found."
              description={
                activeFilterCount > 0 || search
                  ? "Nothing matches the current search and filters. Try clearing them."
                  : "The archive is empty. Add the first khutbah to begin the record."
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
                  <Can permission="khutbah.create">
                    <Button icon="plus" onClick={() => setAdding(true)}>
                      Add Khutbah
                    </Button>
                  </Can>
                )
              }
            />
          }
        />
      </Panel>

      {selected ? <KhutbahDetailDrawer entry={selected} onClose={() => setSelected(null)} /> : null}
      <AddKhutbahModal open={adding} onClose={() => setAdding(false)} onSave={addEntry} />
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Detail drawer
 * -------------------------------------------------------------------------- */

function KhutbahDetailDrawer({ entry, onClose }: { entry: KhutbahEntry; onClose: () => void }) {
  return (
    <DetailDrawer
      open
      onClose={onClose}
      eyebrow={entry.id}
      title={entry.title}
      subtitle={entry.series ? `${entry.series} · ${entry.speaker}` : entry.speaker}
      badge={
        <>
          <KhutbahStatusBadge status={entry.status} />
          <KhutbahThemeChip theme={entry.theme} />
        </>
      }
      footer={
        <>
          <Can permission="khutbah.update">
            <Button size="sm" icon="pencil">
              Edit khutbah
            </Button>
          </Can>
          <Button size="sm" variant="secondary" onClick={onClose} className="ml-auto">
            Close
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {entry.status === "Scheduled" ? (
          <InlineNotice tone="info" icon="clock">
            Scheduled for {formatLongDate(entry.date)}. It will be recorded and archived after it is delivered.
          </InlineNotice>
        ) : null}
        {entry.status === "Draft" ? (
          <InlineNotice tone="neutral" icon="pencil">
            Draft — still in preparation and not yet on the Jumu&rsquo;ah schedule.
          </InlineNotice>
        ) : null}

        <DetailStats
          items={[
            { label: "Congregation", value: numberOrDash(entry.attendance) },
            { label: "Duration", value: `${entry.durationMinutes} min` },
            { label: "Reach", value: numberOrDash(entry.views), hint: "plays" },
          ]}
        />

        <DetailSection title="Summary">
          <p className="text-[13px] leading-6 text-[#4d564f]">{entry.summary}</p>
        </DetailSection>

        <DetailSection title={`Scripture referenced (${entry.scriptureRefs.length})`}>
          {entry.scriptureRefs.length === 0 ? (
            <p className="text-[13px] text-[#69726d]">No references recorded yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {entry.scriptureRefs.map((ref) => (
                <Chip key={ref}>{ref}</Chip>
              ))}
            </div>
          )}
        </DetailSection>

        <DetailSection title="Details">
          <DetailGrid>
            <DetailField label="Speaker" value={entry.speaker} />
            <DetailField label="Date" value={formatLongDate(entry.date)} />
            <DetailField label="Theme" value={<KhutbahThemeChip theme={entry.theme} />} />
            <DetailField label="Language" value={entry.language} />
            <DetailField label="Series" value={entry.series ?? "—"} />
            <DetailField label="Recording" value={recordingLabel(entry)} />
          </DetailGrid>
        </DetailSection>
      </div>
    </DetailDrawer>
  );
}

/* -------------------------------------------------------------------------- *
 * Add khutbah
 * -------------------------------------------------------------------------- */

function AddKhutbahModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (draft: KhutbahDraft) => void;
}) {
  const [draft, setDraft] = useState<KhutbahDraft>(emptyDraft);
  const [submitted, setSubmitted] = useState(false);

  const set = <Key extends keyof KhutbahDraft>(key: Key, value: KhutbahDraft[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const errors = {
    title: draft.title.trim().length === 0 ? "A khutbah needs a title." : undefined,
    speaker: draft.speaker.trim().length === 0 ? "Name the speaker." : undefined,
    date: draft.date.length === 0 ? "Choose the Friday it is for." : undefined,
    summary: draft.summary.trim().length === 0 ? "Add a short summary of the theme." : undefined,
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
      title="Add khutbah"
      description="Starts a new khutbah as a draft. It can be scheduled onto a Friday once it is ready."
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button icon="check" onClick={submit}>
            Add Khutbah
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Title"
          required
          value={draft.title}
          onChange={(event) => set("title", event.target.value)}
          error={show("title")}
          placeholder="The Weight of the Trust"
          containerClassName="sm:col-span-2"
        />
        <TextField
          label="Speaker"
          required
          value={draft.speaker}
          onChange={(event) => set("speaker", event.target.value)}
          error={show("speaker")}
          placeholder="Imam Abdul Karim"
        />
        <TextField
          label="Friday"
          type="date"
          required
          value={draft.date}
          onChange={(event) => set("date", event.target.value)}
          error={show("date")}
        />
        <SelectField
          label="Theme"
          required
          value={draft.theme}
          options={[...khutbahThemes]}
          onChange={(event) => set("theme", event.target.value as KhutbahDraft["theme"])}
        />
        <SelectField
          label="Language"
          required
          value={draft.language}
          options={[...contentLanguages]}
          onChange={(event) => set("language", event.target.value as KhutbahDraft["language"])}
        />
        <TextField
          label="Series"
          value={draft.series}
          onChange={(event) => set("series", event.target.value)}
          placeholder="Purifying the Heart"
          hint="Leave blank for a standalone khutbah."
        />
        <TextField
          label="Duration"
          type="number"
          value={draft.durationMinutes}
          onChange={(event) => set("durationMinutes", event.target.value)}
          hint="Minutes."
        />
        <TextAreaField
          label="Summary"
          required
          rows={3}
          value={draft.summary}
          onChange={(event) => set("summary", event.target.value)}
          error={show("summary")}
          hint="One or two lines on the theme, shown in the table and drawer."
          containerClassName="sm:col-span-2"
        />
        <TextAreaField
          label="Scripture referenced"
          rows={3}
          value={draft.scriptureRefs}
          onChange={(event) => set("scriptureRefs", event.target.value)}
          hint="One reference per line — e.g. Qur'an 33:72, Sahih al-Bukhari 6015."
          containerClassName="sm:col-span-2"
        />
      </div>

      {submitted && !valid ? (
        <InlineNotice className="mt-4" tone="neutral" icon="alert">
          Some details still need attention — see the messages above.
        </InlineNotice>
      ) : (
        <InlineNotice className="mt-4" tone="gold">
          Front-end preview — the khutbah is added to this browser session only.
        </InlineNotice>
      )}
    </Modal>
  );
}
