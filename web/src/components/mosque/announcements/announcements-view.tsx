"use client";

import { useMemo, useState } from "react";
import { Button, IconButton } from "@/components/finance/ui/button";
import { DataTable, type Column } from "@/components/finance/ui/data-table";
import { FinanceFilters, type SelectFilter } from "@/components/finance/ui/filters";
import { SelectField, TextAreaField, TextField } from "@/components/finance/ui/form-field";
import { Icon } from "@/components/finance/ui/icon";
import { Modal } from "@/components/finance/ui/modal";
import { Panel, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { FinanceEmptyState, InlineNotice } from "@/components/finance/ui/states";
import { DetailDrawer, DetailField, DetailGrid, DetailSection } from "@/components/ui/detail-drawer";
import { StatGrid } from "@/components/ui/stat-card";
import { AnnouncementCategoryChip, AnnouncementStatusBadge } from "@/components/ui/status-badge";
import { Toggle } from "@/components/ui/toggle";
import { useToast } from "@/components/ui/toast";
import { announcementStats, announcements as seedAnnouncements } from "@/data/announcements";
import { downloadCsv } from "@/lib/mosque/export";
import { formatCount, formatDayMonth, formatLongDate, REFERENCE_DATE } from "@/lib/mosque/format";
import {
  announcementAudiences,
  announcementCategories,
  announcementChannels,
  announcementStatuses,
  type Announcement,
  type AnnouncementChannel,
  type AnnouncementDraft,
  type StatMetric,
} from "@/lib/mosque/types";

/**
 * The noticeboard — the standing messages the mosque shows the community.
 *
 * Same register shape as the other modules, with two wrinkles a notice needs: it goes out over more
 * than one channel (an array, toggled in the composer), and the important ones are pinned to the top.
 * The life-cycle badge carries the meaning — a draft isn't public, a scheduled one hasn't gone yet,
 * an archived one is kept only for the record — so the row never relies on colour alone.
 */
const metrics: StatMetric[] = [
  {
    id: "total",
    label: "Announcements",
    value: formatCount(announcementStats.total),
    hint: "On the board",
    icon: "megaphone",
    tone: "neutral",
  },
  {
    id: "published",
    label: "Published",
    value: formatCount(announcementStats.published),
    hint: "Live to the community",
    icon: "check-circle",
    tone: "positive",
  },
  {
    id: "scheduled",
    label: "Scheduled",
    value: formatCount(announcementStats.scheduled),
    hint: "Queued to go out",
    icon: "calendar-days",
    tone: "neutral",
  },
  {
    id: "pinned",
    label: "Pinned",
    value: formatCount(announcementStats.pinned),
    hint: "Held at the top",
    icon: "star",
    tone: "gold",
  },
];

const emptyDraft: AnnouncementDraft = {
  title: "",
  message: "",
  category: "General",
  audience: "Whole community",
  status: "Draft",
  channels: ["Website", "App"],
  pinned: false,
};

/** Trim the message to a single line for the table, so a long notice doesn't blow out the row. */
const excerpt = (text: string, max = 96) => (text.length > max ? `${text.slice(0, max).trimEnd()}…` : text);

export function AnnouncementsView({ openAddOnMount = false }: { openAddOnMount?: boolean }) {
  const { notify } = useToast();
  const [announcementList, setAnnouncementList] = useState<Announcement[]>(seedAnnouncements);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [audience, setAudience] = useState("all");
  const [selected, setSelected] = useState<Announcement | null>(null);
  const [adding, setAdding] = useState(openAddOnMount);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return announcementList.filter((announcement) => {
      if (needle) {
        const haystack =
          `${announcement.title} ${announcement.message} ${announcement.author} ${announcement.id}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (category !== "all" && announcement.category !== category) return false;
      if (status !== "all" && announcement.status !== status) return false;
      if (audience !== "all" && announcement.audience !== audience) return false;
      return true;
    });
  }, [announcementList, audience, category, search, status]);

  const filters: SelectFilter[] = [
    {
      id: "category",
      label: "Category",
      value: category,
      onChange: setCategory,
      options: [
        { value: "all", label: "All categories" },
        ...announcementCategories.map((value) => ({ value, label: value })),
      ],
    },
    {
      id: "status",
      label: "Status",
      value: status,
      onChange: setStatus,
      options: [{ value: "all", label: "Any status" }, ...announcementStatuses.map((value) => ({ value, label: value }))],
    },
    {
      id: "audience",
      label: "Audience",
      value: audience,
      onChange: setAudience,
      options: [{ value: "all", label: "Everyone" }, ...announcementAudiences.map((value) => ({ value, label: value }))],
    },
  ];

  const activeFilterCount = (category !== "all" ? 1 : 0) + (status !== "all" ? 1 : 0) + (audience !== "all" ? 1 : 0);
  const resetFilters = () => {
    setCategory("all");
    setStatus("all");
    setAudience("all");
  };

  const addAnnouncement = (draft: AnnouncementDraft) => {
    const announcement: Announcement = {
      id: `ANC-${String(announcementList.length + 1).padStart(3, "0")}`,
      title: draft.title.trim(),
      message: draft.message.trim(),
      category: draft.category,
      audience: draft.audience,
      status: draft.status,
      channels: draft.channels,
      pinned: draft.pinned,
      author: "Mosque Office",
      publishedAt: REFERENCE_DATE,
    };

    setAnnouncementList((current) => [announcement, ...current]);
    setAdding(false);
    notify({
      message: draft.status === "Published" ? "Announcement published." : "Announcement saved.",
      description: `${announcement.title} · ${announcement.id} — held in this browser only.`,
    });
  };

  const publishAnnouncement = (target: Announcement) => {
    setAnnouncementList((current) =>
      current.map((announcement) =>
        announcement.id === target.id ? { ...announcement, status: "Published", publishedAt: REFERENCE_DATE } : announcement,
      ),
    );
    setSelected(null);
    notify({ message: "Announcement published.", description: `${target.title} is now live — front-end only.` });
  };

  const exportCsv = () => {
    downloadCsv("noor-mosque-announcements.csv", filtered, [
      { header: "ID", value: (announcement) => announcement.id },
      { header: "Title", value: (announcement) => announcement.title },
      { header: "Category", value: (announcement) => announcement.category },
      { header: "Audience", value: (announcement) => announcement.audience },
      { header: "Status", value: (announcement) => announcement.status },
      { header: "Channels", value: (announcement) => announcement.channels.join(" / ") },
      { header: "Pinned", value: (announcement) => (announcement.pinned ? "Yes" : "No") },
      { header: "Author", value: (announcement) => announcement.author },
      { header: "Date", value: (announcement) => announcement.publishedAt },
      { header: "Expires", value: (announcement) => announcement.expiresAt ?? "" },
    ]);
    notify({
      tone: "info",
      message: "Export downloaded.",
      description: `${formatCount(filtered.length)} rows, matching the filters currently applied.`,
    });
  };

  const columns: Column<Announcement>[] = [
    {
      key: "announcement",
      header: "Announcement",
      cell: (announcement) => (
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 font-medium text-[#17211d]">
            {announcement.pinned ? (
              <Icon name="star" size={13} className="shrink-0 text-[#c79a45]" aria-hidden="true" />
            ) : null}
            <span className="truncate">{announcement.title}</span>
          </span>
          <span className="mt-0.5 block truncate text-[12px] text-[#69726d]">{excerpt(announcement.message)}</span>
        </span>
      ),
      sortValue: (announcement) => announcement.title,
    },
    {
      key: "category",
      header: "Category",
      cell: (announcement) => <AnnouncementCategoryChip category={announcement.category} />,
      sortValue: (announcement) => announcement.category,
    },
    {
      key: "audience",
      header: "Audience",
      cell: (announcement) => <span className="text-[#3d453f]">{announcement.audience}</span>,
      sortValue: (announcement) => announcement.audience,
    },
    {
      key: "status",
      header: "Status",
      cell: (announcement) => <AnnouncementStatusBadge status={announcement.status} />,
      sortValue: (announcement) => announcement.status,
    },
    {
      key: "date",
      header: "Date",
      align: "right",
      cell: (announcement) => (
        <span className="whitespace-nowrap tabular-nums text-[#4d564f]">{formatDayMonth(announcement.publishedAt)}</span>
      ),
      sortValue: (announcement) => announcement.publishedAt,
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      align: "right",
      cell: (announcement) => (
        <span className="flex items-center justify-end gap-1">
          <IconButton icon="eye" label={`View ${announcement.title}`} onClick={() => setSelected(announcement)} />
          <Can permission="announcement.manage">
            <IconButton icon="pencil" label={`Edit ${announcement.title}`} onClick={() => setSelected(announcement)} />
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
          title="Announcements"
          description="What the mosque is telling the community — pinned notices, scheduled posts and the archive."
          icon="megaphone"
          actions={
            <>
              <Button variant="secondary" size="sm" icon="download" onClick={exportCsv}>
                Export
              </Button>
              <Can permission="announcement.manage">
                <Button size="sm" icon="plus" onClick={() => setAdding(true)}>
                  New Announcement
                </Button>
              </Can>
            </>
          }
        />

        <FinanceFilters
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "Search announcements…",
            label: "Search announcements by title, message, author or ID",
          }}
          filters={filters}
          activeCount={activeFilterCount}
          onReset={resetFilters}
        />

        <DataTable
          rows={filtered}
          columns={columns}
          getRowKey={(announcement) => announcement.id}
          caption="Mosque announcements with category, audience, status and date"
          initialSort={{ key: "date", direction: "desc" }}
          pageSize={10}
          mobileTitle={(announcement) => (
            <span className="flex items-center gap-1.5">
              {announcement.pinned ? (
                <Icon name="star" size={13} className="shrink-0 text-[#c79a45]" aria-hidden="true" />
              ) : null}
              {announcement.title}
            </span>
          )}
          mobileSubtitle={(announcement) => `${announcement.category} · ${announcement.audience}`}
          mobileTrailing={(announcement) => <AnnouncementStatusBadge status={announcement.status} />}
          mobileHiddenKeys={["announcement", "status"]}
          emptyState={
            <FinanceEmptyState
              icon="megaphone"
              title="No announcements found."
              description={
                activeFilterCount > 0 || search
                  ? "Nothing matches the current search and filters. Try clearing them."
                  : "The board is empty. Post the first announcement to reach the community."
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
                  <Can permission="announcement.manage">
                    <Button icon="plus" onClick={() => setAdding(true)}>
                      New Announcement
                    </Button>
                  </Can>
                )
              }
            />
          }
        />
      </Panel>

      {selected ? (
        <AnnouncementDetailDrawer
          announcement={selected}
          onClose={() => setSelected(null)}
          onPublish={publishAnnouncement}
        />
      ) : null}
      <AddAnnouncementModal open={adding} onClose={() => setAdding(false)} onSave={addAnnouncement} />
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Detail drawer
 * -------------------------------------------------------------------------- */

function ChannelPills({ channels }: { channels: AnnouncementChannel[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {channels.map((channel) => (
        <span
          key={channel}
          className="rounded-full border border-[#dcdacd] bg-[#f6f5ee] px-2.5 py-1 text-[12px] font-medium text-[#4d564f]"
        >
          {channel}
        </span>
      ))}
    </div>
  );
}

function AnnouncementDetailDrawer({
  announcement,
  onClose,
  onPublish,
}: {
  announcement: Announcement;
  onClose: () => void;
  onPublish: (announcement: Announcement) => void;
}) {
  const canGoLive = announcement.status === "Draft" || announcement.status === "Scheduled";

  return (
    <DetailDrawer
      open
      onClose={onClose}
      eyebrow={announcement.id}
      title={announcement.title}
      subtitle={`${announcement.category} · ${announcement.audience}`}
      badge={
        <>
          <AnnouncementStatusBadge status={announcement.status} />
          <AnnouncementCategoryChip category={announcement.category} />
          {announcement.pinned ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#e3ce9d] bg-[#f7f0df] px-2 py-0.5 text-[11px] font-semibold text-[#7d5f18]">
              <Icon name="star" size={11} aria-hidden="true" />
              Pinned
            </span>
          ) : null}
        </>
      }
      footer={
        <>
          <Can permission="announcement.publish">
            {canGoLive ? (
              <Button size="sm" icon="megaphone" onClick={() => onPublish(announcement)}>
                Publish now
              </Button>
            ) : null}
          </Can>
          <Can permission="announcement.manage">
            <Button size="sm" variant="secondary" icon="pencil">
              Edit
            </Button>
          </Can>
          <Button size="sm" variant="ghost" onClick={onClose} className="ml-auto">
            Close
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {announcement.status === "Scheduled" ? (
          <InlineNotice tone="info" icon="clock">
            Scheduled for {formatLongDate(announcement.publishedAt)}. Not yet visible to the community.
          </InlineNotice>
        ) : null}
        {announcement.status === "Draft" ? (
          <InlineNotice tone="neutral" icon="pencil">
            Draft — not published. It isn&rsquo;t shown on the board or the app yet.
          </InlineNotice>
        ) : null}
        {announcement.status === "Archived" ? (
          <InlineNotice tone="neutral" icon="info">
            Archived — kept for the record and no longer shown to the community.
          </InlineNotice>
        ) : null}
        {announcement.status === "Published" && announcement.category === "Urgent" ? (
          <InlineNotice tone="gold" icon="alert">
            Urgent notice — shown prominently across every channel it was sent on.
          </InlineNotice>
        ) : null}

        <DetailSection title="Message">
          <p className="whitespace-pre-line text-[13px] leading-6 text-[#4d564f]">{announcement.message}</p>
        </DetailSection>

        <DetailSection title="Channels">
          <ChannelPills channels={announcement.channels} />
        </DetailSection>

        <DetailSection title="Details">
          <DetailGrid>
            <DetailField label="Author" value={announcement.author} />
            <DetailField label="Audience" value={announcement.audience} />
            <DetailField label="Category" value={<AnnouncementCategoryChip category={announcement.category} />} />
            <DetailField label="Status" value={<AnnouncementStatusBadge status={announcement.status} />} />
            <DetailField
              label={announcement.status === "Scheduled" ? "Goes out" : "Date"}
              value={formatLongDate(announcement.publishedAt)}
            />
            <DetailField label="Expires" value={announcement.expiresAt ? formatLongDate(announcement.expiresAt) : "No end date"} />
            <DetailField label="Pinned" value={announcement.pinned ? "Yes — held at the top" : "No"} full />
          </DetailGrid>
        </DetailSection>
      </div>
    </DetailDrawer>
  );
}

/* -------------------------------------------------------------------------- *
 * Add announcement
 * -------------------------------------------------------------------------- */

function AddAnnouncementModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (draft: AnnouncementDraft) => void;
}) {
  const [draft, setDraft] = useState<AnnouncementDraft>(emptyDraft);
  const [submitted, setSubmitted] = useState(false);

  const set = <Key extends keyof AnnouncementDraft>(key: Key, value: AnnouncementDraft[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const toggleChannel = (channel: AnnouncementChannel) =>
    setDraft((current) => ({
      ...current,
      channels: current.channels.includes(channel)
        ? current.channels.filter((item) => item !== channel)
        : [...current.channels, channel],
    }));

  const errors = {
    title: draft.title.trim().length === 0 ? "Give the announcement a title." : undefined,
    message: draft.message.trim().length === 0 ? "Write the message the community will read." : undefined,
    channels: draft.channels.length === 0 ? "Pick at least one channel." : undefined,
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
      title="New announcement"
      description="Set the status to Draft to keep it off the board, or Published to make it live in this preview."
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button icon="check" onClick={submit}>
            Save Announcement
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
          placeholder="New autumn prayer timetable now in effect"
          containerClassName="sm:col-span-2"
        />
        <TextAreaField
          label="Message"
          required
          rows={5}
          value={draft.message}
          onChange={(event) => set("message", event.target.value)}
          error={show("message")}
          hint="Plain language, a few sentences. This is what the community reads."
          containerClassName="sm:col-span-2"
        />
        <SelectField
          label="Category"
          required
          value={draft.category}
          options={[...announcementCategories]}
          onChange={(event) => set("category", event.target.value as AnnouncementDraft["category"])}
        />
        <SelectField
          label="Audience"
          required
          value={draft.audience}
          options={[...announcementAudiences]}
          onChange={(event) => set("audience", event.target.value as AnnouncementDraft["audience"])}
        />
        <SelectField
          label="Status"
          required
          value={draft.status}
          options={[...announcementStatuses]}
          onChange={(event) => set("status", event.target.value as AnnouncementDraft["status"])}
          containerClassName="sm:col-span-2"
        />

        <fieldset className="sm:col-span-2">
          <legend className="text-[13px] font-semibold text-[#3d453f]">
            Channels
            <span className="ml-1 text-[#a13228]" aria-hidden="true">
              *
            </span>
          </legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {announcementChannels.map((channel) => {
              const active = draft.channels.includes(channel);
              return (
                <button
                  key={channel}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleChannel(channel)}
                  className={`min-h-9 rounded-full border px-3.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b] ${
                    active
                      ? "border-[#0d4d3b] bg-[#0d4d3b] text-white"
                      : "border-[#cfd4cd] bg-white text-[#4d564f] hover:border-[#0d4d3b] hover:text-[#0d4d3b]"
                  }`}
                >
                  {channel}
                </button>
              );
            })}
          </div>
          {show("channels") ? (
            <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium text-[#94291f]">
              <Icon name="alert" size={13} />
              {errors.channels}
            </p>
          ) : null}
        </fieldset>

        <div className="rounded-lg border border-[#e7e6dc] bg-[#faf9f4] px-3.5 py-1 sm:col-span-2">
          <Toggle
            label="Pin to the top"
            description="Pinned announcements sit above the rest on the community site."
            checked={draft.pinned}
            onChange={(next) => set("pinned", next)}
          />
        </div>
      </div>

      {submitted && !valid ? (
        <InlineNotice className="mt-4" tone="neutral" icon="alert">
          Some details still need attention — see the messages above.
        </InlineNotice>
      ) : (
        <InlineNotice className="mt-4" tone="gold">
          Front-end preview — the announcement is added to this browser session only.
        </InlineNotice>
      )}
    </Modal>
  );
}
