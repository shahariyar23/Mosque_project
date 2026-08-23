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
import { QuranStatusBadge, QuranTypeChip } from "@/components/ui/status-badge";
import { Toggle } from "@/components/ui/toggle";
import { useToast } from "@/components/ui/toast";
import { ayahSpotlight, quranResources as seedResources, quranStats } from "@/data/quran";
import { downloadCsv } from "@/lib/mosque/export";
import { formatCount, formatLongDate, REFERENCE_DATE } from "@/lib/mosque/format";
import {
  contentLanguages,
  quranFormats,
  quranResourceTypes,
  quranStatuses,
  type QuranResource,
  type QuranResourceDraft,
  type StatMetric,
} from "@/lib/mosque/types";

/**
 * The Quran study library.
 *
 * Each row is a published piece of content — a recitation, a tafsir session, a memorisation plan —
 * not a student. Same shape as the service catalogue: this component owns only the search predicate,
 * and the shared `DataTable` handles sort, paging and the mobile cards. The ayah spotlight above the
 * table is the one homepage-facing flourish, read straight from the data file.
 */
const metrics: StatMetric[] = [
  {
    id: "total",
    label: "Resources",
    value: formatCount(quranStats.total),
    hint: "In the library",
    icon: "book",
    tone: "neutral",
  },
  {
    id: "published",
    label: "Published",
    value: formatCount(quranStats.published),
    hint: `${Math.round((quranStats.published / quranStats.total) * 100)}% live to the community`,
    icon: "check-circle",
    tone: "positive",
  },
  {
    id: "scheduled",
    label: "Scheduled",
    value: formatCount(quranStats.scheduled),
    hint: "Queued to publish",
    icon: "clock",
    tone: "warning",
  },
  {
    id: "reach",
    label: "Total Reach",
    value: formatCount(quranStats.totalViews),
    hint: "Plays and reads across the library",
    icon: "eye",
    tone: "gold",
  },
];

const emptyDraft: QuranResourceDraft = {
  title: "",
  type: "Recitation",
  format: "Audio",
  surah: "",
  reference: "",
  reciter: "",
  language: "Arabic",
  length: "",
  status: "Draft",
  featured: false,
  summary: "",
  description: "",
};

/** Draft and scheduled resources have no reach yet, so an em dash reads better than a bare 0. */
const reachLabel = (views: number) => (views === 0 ? "—" : formatCount(views));

export function QuranView({ openAddOnMount = false }: { openAddOnMount?: boolean }) {
  const { notify } = useToast();
  const [resources, setResources] = useState<QuranResource[]>(seedResources);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [format, setFormat] = useState("all");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<QuranResource | null>(null);
  const [adding, setAdding] = useState(openAddOnMount);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return resources.filter((resource) => {
      if (needle) {
        const haystack =
          `${resource.title} ${resource.surah} ${resource.reference} ${resource.reciter} ${resource.id} ${resource.type}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (type !== "all" && resource.type !== type) return false;
      if (format !== "all" && resource.format !== format) return false;
      if (status !== "all" && resource.status !== status) return false;
      return true;
    });
  }, [format, resources, search, status, type]);

  const filters: SelectFilter[] = [
    {
      id: "type",
      label: "Type",
      value: type,
      onChange: setType,
      options: [{ value: "all", label: "All types" }, ...quranResourceTypes.map((value) => ({ value, label: value }))],
    },
    {
      id: "format",
      label: "Format",
      value: format,
      onChange: setFormat,
      options: [{ value: "all", label: "Any format" }, ...quranFormats.map((value) => ({ value, label: value }))],
    },
    {
      id: "status",
      label: "Status",
      value: status,
      onChange: setStatus,
      options: [{ value: "all", label: "Any status" }, ...quranStatuses.map((value) => ({ value, label: value }))],
    },
  ];

  const activeFilterCount = (type !== "all" ? 1 : 0) + (format !== "all" ? 1 : 0) + (status !== "all" ? 1 : 0);
  const resetFilters = () => {
    setType("all");
    setFormat("all");
    setStatus("all");
  };

  const addResource = (draft: QuranResourceDraft) => {
    const resource: QuranResource = {
      id: `QRS-${String(resources.length + 1).padStart(3, "0")}`,
      title: draft.title.trim(),
      type: draft.type,
      format: draft.format,
      surah: draft.surah.trim(),
      reference: draft.reference.trim(),
      reciter: draft.reciter.trim(),
      language: draft.language,
      length: draft.length.trim() || "To be confirmed",
      status: draft.status,
      publishedAt: REFERENCE_DATE,
      views: 0,
      featured: draft.featured,
      summary: draft.summary.trim(),
      description: draft.description.trim(),
    };

    setResources((current) => [resource, ...current]);
    setAdding(false);
    notify({
      message: "Resource added to the library.",
      description: `${resource.title} · ${resource.id} — held in this browser only.`,
    });
  };

  const exportCsv = () => {
    downloadCsv("noor-mosque-quran-library.csv", filtered, [
      { header: "Resource ID", value: (resource) => resource.id },
      { header: "Title", value: (resource) => resource.title },
      { header: "Type", value: (resource) => resource.type },
      { header: "Format", value: (resource) => resource.format },
      { header: "Surah", value: (resource) => resource.surah },
      { header: "Reference", value: (resource) => resource.reference },
      { header: "Reciter / author", value: (resource) => resource.reciter },
      { header: "Language", value: (resource) => resource.language },
      { header: "Length", value: (resource) => resource.length },
      { header: "Status", value: (resource) => resource.status },
      { header: "Published", value: (resource) => resource.publishedAt },
      { header: "Reach", value: (resource) => resource.views },
      { header: "Featured", value: (resource) => (resource.featured ? "Yes" : "No") },
    ]);
    notify({
      tone: "info",
      message: "Export downloaded.",
      description: `${formatCount(filtered.length)} rows, matching the filters currently applied.`,
    });
  };

  const columns: Column<QuranResource>[] = [
    {
      key: "resource",
      header: "Resource",
      cell: (resource) => (
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="truncate font-medium text-[#17211d]">{resource.title}</span>
            {resource.featured ? (
              <span
                className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-[#c79a45]"
                title="Featured on the homepage"
              >
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
                  <path d="M8 1.2l1.9 3.85 4.25.62-3.07 3 .72 4.23L8 10.9l-3.8 2 .72-4.23-3.07-3 4.25-.62L8 1.2z" />
                </svg>
              </span>
            ) : null}
          </span>
          <span className="block truncate text-[12px] text-[#69726d]">{resource.reference}</span>
        </span>
      ),
      sortValue: (resource) => resource.title,
    },
    {
      key: "type",
      header: "Type",
      cell: (resource) => <QuranTypeChip type={resource.type} />,
      sortValue: (resource) => resource.type,
    },
    {
      key: "reciter",
      header: "Reciter / author",
      cell: (resource) => <PersonCell name={resource.reciter} size="sm" />,
      sortValue: (resource) => resource.reciter,
    },
    {
      key: "reach",
      header: "Reach",
      align: "right",
      cell: (resource) => <span className="tabular-nums text-[#3d453f]">{reachLabel(resource.views)}</span>,
      sortValue: (resource) => resource.views,
    },
    {
      key: "status",
      header: "Status",
      cell: (resource) => <QuranStatusBadge status={resource.status} />,
      sortValue: (resource) => resource.status,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      align: "right",
      cell: (resource) => (
        <span className="flex items-center justify-end gap-1">
          <IconButton icon="eye" label={`View ${resource.title}`} onClick={() => setSelected(resource)} />
          <Can permission="quran.manage">
            <IconButton icon="pencil" label={`Edit ${resource.title}`} onClick={() => setSelected(resource)} />
          </Can>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <StatGrid metrics={metrics} />

      <AyahSpotlight />

      <Panel>
        <PanelHeader
          title="Quran Library"
          description="Recitations, tafsir, memorisation plans and study guides the mosque shares with the community."
          icon="book"
          actions={
            <>
              <Button variant="secondary" size="sm" icon="download" onClick={exportCsv}>
                Export
              </Button>
              <Can permission="quran.manage">
                <Button size="sm" icon="plus" onClick={() => setAdding(true)}>
                  Add Resource
                </Button>
              </Can>
            </>
          }
        />

        <FinanceFilters
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "Search by title, surah, reciter…",
            label: "Search the Quran library by title, surah, reference, reciter or resource ID",
          }}
          filters={filters}
          activeCount={activeFilterCount}
          onReset={resetFilters}
        />

        <DataTable
          rows={filtered}
          columns={columns}
          getRowKey={(resource) => resource.id}
          caption="Quran study resources with type, reciter, reach and publication status"
          initialSort={{ key: "reach", direction: "desc" }}
          pageSize={10}
          mobileTitle={(resource) => resource.title}
          mobileSubtitle={(resource) => `${resource.type} · ${resource.reciter}`}
          mobileTrailing={(resource) => <QuranStatusBadge status={resource.status} />}
          mobileHiddenKeys={["resource", "status"]}
          emptyState={
            <FinanceEmptyState
              icon="book"
              title="No resources found."
              description={
                activeFilterCount > 0 || search
                  ? "Nothing matches the current search and filters. Try clearing them."
                  : "The library is empty. Add the first resource to share it with the community."
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
                  <Can permission="quran.manage">
                    <Button icon="plus" onClick={() => setAdding(true)}>
                      Add Resource
                    </Button>
                  </Can>
                )
              }
            />
          }
        />
      </Panel>

      {selected ? <QuranDetailDrawer resource={selected} onClose={() => setSelected(null)} /> : null}
      <AddQuranModal open={adding} onClose={() => setAdding(false)} onSave={addResource} />
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Ayah spotlight
 * -------------------------------------------------------------------------- */

function AyahSpotlight() {
  return (
    <section
      aria-label="Featured ayah"
      className="overflow-hidden rounded-xl border border-[#dfe6df] bg-gradient-to-br from-[#0d4d3b] to-[#0b4634] p-5 text-white sm:p-6"
    >
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#c79a45]">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10">
          <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor" aria-hidden>
            <path d="M8 1.2l1.9 3.85 4.25.62-3.07 3 .72 4.23L8 10.9l-3.8 2 .72-4.23-3.07-3 4.25-.62L8 1.2z" />
          </svg>
        </span>
        Ayah of the week
      </div>
      <p dir="rtl" lang="ar" className="mt-4 text-right text-[26px] leading-[1.9] text-white sm:text-[30px]">
        {ayahSpotlight.arabic}
      </p>
      <p className="mt-3 text-[13px] italic text-white/70">{ayahSpotlight.transliteration}</p>
      <p className="mt-1 text-[15px] leading-7 text-white/95">“{ayahSpotlight.translation}”</p>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-white/70">
        <span className="font-medium text-white/90">{ayahSpotlight.reference}</span>
        <span aria-hidden>·</span>
        <span>{ayahSpotlight.reciter}</span>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- *
 * Detail drawer
 * -------------------------------------------------------------------------- */

function QuranDetailDrawer({ resource, onClose }: { resource: QuranResource; onClose: () => void }) {
  return (
    <DetailDrawer
      open
      onClose={onClose}
      eyebrow={resource.id}
      title={resource.title}
      subtitle={resource.summary}
      badge={
        <>
          <QuranStatusBadge status={resource.status} />
          <QuranTypeChip type={resource.type} />
        </>
      }
      footer={
        <>
          <Can permission="quran.manage">
            <Button size="sm" icon="pencil">
              Edit resource
            </Button>
          </Can>
          <Button size="sm" variant="secondary" onClick={onClose} className="ml-auto">
            Close
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {resource.status === "Scheduled" ? (
          <InlineNotice tone="info" icon="clock">
            Scheduled to publish on {formatLongDate(resource.publishedAt)}. It is not visible to the community until then.
          </InlineNotice>
        ) : null}
        {resource.status === "Draft" ? (
          <InlineNotice tone="neutral" icon="pencil">
            Draft — kept out of the community&rsquo;s view until it is published.
          </InlineNotice>
        ) : null}

        <DetailStats
          items={[
            { label: "Reach", value: reachLabel(resource.views), hint: "plays & reads" },
            { label: "Length", value: resource.length },
            { label: "Language", value: resource.language },
          ]}
        />

        <DetailSection title="About this resource">
          <p className="text-[13px] leading-6 text-[#4d564f]">{resource.description}</p>
        </DetailSection>

        <DetailSection title="Reference">
          <DetailGrid>
            <DetailField label="Surah" value={resource.surah} />
            <DetailField label="Passage" value={resource.reference} />
            <DetailField label="Type" value={<QuranTypeChip type={resource.type} />} />
            <DetailField label="Format" value={resource.format} />
            <DetailField label="Reciter / author" value={resource.reciter} />
            <DetailField label="Language" value={resource.language} />
            <DetailField
              label={resource.status === "Scheduled" ? "Publishes" : "Published"}
              value={formatLongDate(resource.publishedAt)}
            />
            <DetailField label="Featured" value={resource.featured ? "On the homepage" : "No"} />
          </DetailGrid>
        </DetailSection>

        <InlineNotice icon="info">
          Playback and downloads are served to the community site; this register tracks what is published and how far it
          reaches.
        </InlineNotice>
      </div>
    </DetailDrawer>
  );
}

/* -------------------------------------------------------------------------- *
 * Add resource
 * -------------------------------------------------------------------------- */

function AddQuranModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (draft: QuranResourceDraft) => void;
}) {
  const [draft, setDraft] = useState<QuranResourceDraft>(emptyDraft);
  const [submitted, setSubmitted] = useState(false);

  const set = <Key extends keyof QuranResourceDraft>(key: Key, value: QuranResourceDraft[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const errors = {
    title: draft.title.trim().length === 0 ? "A resource needs a title." : undefined,
    surah: draft.surah.trim().length === 0 ? "Name the surah, or “Various” for a series." : undefined,
    reference: draft.reference.trim().length === 0 ? "Add a passage reference." : undefined,
    reciter: draft.reciter.trim().length === 0 ? "Name the reciter or author." : undefined,
    summary: draft.summary.trim().length === 0 ? "Add a one-line summary for the table." : undefined,
    description: draft.description.trim().length === 0 ? "Explain what the resource is." : undefined,
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
      title="Add Quran resource"
      description="Adds a recitation, tafsir, memorisation plan or study guide to the library."
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button icon="check" onClick={submit}>
            Add Resource
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
          placeholder="Surah Ya-Sin — Thursday evening recitation"
          containerClassName="sm:col-span-2"
        />
        <SelectField
          label="Type"
          required
          value={draft.type}
          options={[...quranResourceTypes]}
          onChange={(event) => set("type", event.target.value as QuranResourceDraft["type"])}
        />
        <SelectField
          label="Format"
          required
          value={draft.format}
          options={[...quranFormats]}
          onChange={(event) => set("format", event.target.value as QuranResourceDraft["format"])}
        />
        <TextField
          label="Surah"
          required
          value={draft.surah}
          onChange={(event) => set("surah", event.target.value)}
          error={show("surah")}
          placeholder="Ya-Sin"
        />
        <TextField
          label="Passage reference"
          required
          value={draft.reference}
          onChange={(event) => set("reference", event.target.value)}
          error={show("reference")}
          placeholder="Surah 36 · 83 ayah"
        />
        <TextField
          label="Reciter / author"
          required
          value={draft.reciter}
          onChange={(event) => set("reciter", event.target.value)}
          error={show("reciter")}
          placeholder="Imam Abdul Karim"
        />
        <SelectField
          label="Language"
          required
          value={draft.language}
          options={[...contentLanguages]}
          onChange={(event) => set("language", event.target.value as QuranResourceDraft["language"])}
        />
        <TextField
          label="Length"
          value={draft.length}
          onChange={(event) => set("length", event.target.value)}
          hint="e.g. “22 min” for audio, “6 pages” for a document."
        />
        <SelectField
          label="Status"
          required
          value={draft.status}
          options={[...quranStatuses]}
          onChange={(event) => set("status", event.target.value as QuranResourceDraft["status"])}
          hint="Draft keeps it out of the community's view until it is ready."
        />
        <TextField
          label="Summary"
          required
          value={draft.summary}
          onChange={(event) => set("summary", event.target.value)}
          error={show("summary")}
          hint="One line, shown in the table."
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
        <div className="rounded-lg border border-[#e7e6dc] bg-[#faf9f4] px-3.5 py-1 sm:col-span-2">
          <Toggle
            label="Feature on the homepage"
            description="Featured resources are highlighted for the community above the rest of the library."
            checked={draft.featured}
            onChange={(next) => set("featured", next)}
          />
        </div>
      </div>

      {submitted && !valid ? (
        <InlineNotice className="mt-4" tone="neutral" icon="alert">
          Some details still need attention — see the messages above.
        </InlineNotice>
      ) : (
        <InlineNotice className="mt-4" tone="gold">
          Front-end preview — the resource is added to this browser session only.
        </InlineNotice>
      )}
    </Modal>
  );
}
