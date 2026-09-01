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
import { TableSkeleton } from "@/components/finance/ui/skeleton";
import { FinanceEmptyState, FinanceErrorState, InlineNotice } from "@/components/finance/ui/states";
import { DetailDrawer, DetailField, DetailGrid, DetailSection } from "@/components/ui/detail-drawer";
import { StatGrid } from "@/components/ui/stat-card";
import { AnnouncementCategoryChip, AnnouncementStatusBadge } from "@/components/ui/status-badge";
import { Toggle } from "@/components/ui/toggle";
import { useToast } from "@/components/ui/toast";
import { useApiList, useApiResource } from "@/hooks/use-api";
import { downloadCsv } from "@/lib/mosque/export";
import { formatCount, formatDayMonth, formatLongDate } from "@/lib/mosque/format";
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
import {
  archiveAnnouncement,
  createAnnouncement,
  deleteAnnouncement,
  fetchAnnouncements,
  fetchAnnouncementStats,
  publishAnnouncement,
  togglePinAnnouncement,
  updateAnnouncement,
  type AnnouncementQuery,
} from "@/services/announcementsService";

const emptyDraft: AnnouncementDraft = {
  title: "",
  message: "",
  category: "General",
  audience: "Whole community",
  status: "Draft",
  channels: ["Website", "App"],
  pinned: false,
};

/** Trim the message to a single line for the table */
const excerpt = (text: string, max = 96) => (text.length > max ? `${text.slice(0, max).trimEnd()}…` : text);

export function AnnouncementsView({ openAddOnMount = false }: { openAddOnMount?: boolean }) {
  const { notify } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [audience, setAudience] = useState("all");
  const [selected, setSelected] = useState<Announcement | null>(null);
  const [adding, setAdding] = useState(openAddOnMount);
  const [editing, setEditing] = useState<Announcement | null>(null);

  // Live stats from backend
  const { data: statsData, refetch: refetchStats } = useApiResource(
    fetchAnnouncementStats,
    [],
  );

  const stats = statsData || { total: 0, published: 0, scheduled: 0, pinned: 0 };

  const metrics: StatMetric[] = [
    {
      id: "total",
      label: "Announcements",
      value: formatCount(stats.total),
      hint: "On the board",
      icon: "megaphone",
      tone: "neutral",
    },
    {
      id: "published",
      label: "Published",
      value: formatCount(stats.published),
      hint: "Live to the community",
      icon: "check-circle",
      tone: "positive",
    },
    {
      id: "scheduled",
      label: "Scheduled",
      value: formatCount(stats.scheduled),
      hint: "Queued to go out",
      icon: "calendar-days",
      tone: "neutral",
    },
    {
      id: "pinned",
      label: "Pinned",
      value: formatCount(stats.pinned),
      hint: "Held at the top",
      icon: "star",
      tone: "gold",
    },
  ];

  // Query state for live API
  const query: AnnouncementQuery = {
    page,
    limit: 10,
    search: search.trim() || undefined,
    category: category !== "all" ? category : undefined,
    status: status !== "all" ? status : undefined,
    audience: audience !== "all" ? audience : undefined,
  };

  const { rows: announcementList, meta, loading, error, refetch } = useApiList(
    fetchAnnouncements,
    query,
  );

  const refreshAll = () => {
    refetch();
    refetchStats();
  };

  const filters: SelectFilter[] = [
    {
      id: "category",
      label: "Category",
      value: category,
      onChange: (val) => {
        setCategory(val);
        setPage(1);
      },
      options: [
        { value: "all", label: "All categories" },
        ...announcementCategories.map((value) => ({ value, label: value })),
      ],
    },
    {
      id: "status",
      label: "Status",
      value: status,
      onChange: (val) => {
        setStatus(val);
        setPage(1);
      },
      options: [
        { value: "all", label: "Any status" },
        ...announcementStatuses.map((value) => ({ value, label: value })),
      ],
    },
    {
      id: "audience",
      label: "Audience",
      value: audience,
      onChange: (val) => {
        setAudience(val);
        setPage(1);
      },
      options: [
        { value: "all", label: "Everyone" },
        ...announcementAudiences.map((value) => ({ value, label: value })),
      ],
    },
  ];

  const activeFilterCount =
    (category !== "all" ? 1 : 0) + (status !== "all" ? 1 : 0) + (audience !== "all" ? 1 : 0);

  const resetFilters = () => {
    setCategory("all");
    setStatus("all");
    setAudience("all");
    setPage(1);
  };

  const handleAddAnnouncement = async (draft: AnnouncementDraft) => {
    try {
      const created = await createAnnouncement({
        title: draft.title.trim(),
        message: draft.message.trim(),
        category: draft.category,
        audience: draft.audience,
        status: draft.status,
        channels: draft.channels,
        pinned: draft.pinned,
        author: "Mosque Office",
      });

      setAdding(false);
      refreshAll();
      notify({
        message: created.status === "Published" ? "Announcement published." : "Announcement saved.",
        description: `${created.title} is now stored in the database.`,
        tone: "success",
      });
    } catch (err: any) {
      notify({
        message: "Failed to save announcement",
        description: err?.message || "An unexpected error occurred",
        tone: "danger",
      });
    }
  };

  const handlePublishAnnouncement = async (target: Announcement) => {
    try {
      const updated = await publishAnnouncement(target.id);
      setSelected(updated);
      refreshAll();
      notify({
        message: "Announcement published.",
        description: `${updated.title} is now live and notifications have been dispatched.`,
        tone: "success",
      });
    } catch (err: any) {
      notify({
        message: "Publish failed",
        description: err?.message || "Failed to publish announcement",
        tone: "danger",
      });
    }
  };

  const handleArchiveAnnouncement = async (target: Announcement) => {
    try {
      const updated = await archiveAnnouncement(target.id);
      setSelected(updated);
      refreshAll();
      notify({
        message: "Announcement archived.",
        description: `${updated.title} has been moved to the archive.`,
        tone: "info",
      });
    } catch (err: any) {
      notify({
        message: "Archive failed",
        description: err?.message || "Failed to archive announcement",
        tone: "danger",
      });
    }
  };

  const handleTogglePin = async (target: Announcement) => {
    try {
      const updated = await togglePinAnnouncement(target.id, !target.pinned);
      if (selected?.id === target.id) {
        setSelected(updated);
      }
      refreshAll();
      notify({
        message: updated.pinned ? "Announcement pinned." : "Announcement unpinned.",
        description: `${updated.title} pin state updated.`,
        tone: "info",
      });
    } catch (err: any) {
      notify({
        message: "Pin update failed",
        description: err?.message || "Failed to update pin status",
        tone: "danger",
      });
    }
  };

  const handleDeleteAnnouncement = async (target: Announcement) => {
    try {
      await deleteAnnouncement(target.id);
      setSelected(null);
      refreshAll();
      notify({
        message: "Announcement deleted.",
        description: `${target.title} was removed.`,
        tone: "info",
      });
    } catch (err: any) {
      notify({
        message: "Delete failed",
        description: err?.message || "Failed to delete announcement",
        tone: "danger",
      });
    }
  };

  const exportCsv = () => {
    downloadCsv("noor-mosque-announcements.csv", announcementList, [
      { header: "ID", value: (announcement) => announcement.id },
      { header: "Title", value: (announcement) => announcement.title },
      { header: "Category", value: (announcement) => announcement.category },
      { header: "Audience", value: (announcement) => announcement.audience },
      { header: "Status", value: (announcement) => announcement.status },
      { header: "Channels", value: (announcement) => (announcement.channels || []).join(" / ") },
      { header: "Pinned", value: (announcement) => (announcement.pinned ? "Yes" : "No") },
      { header: "Author", value: (announcement) => announcement.author },
      { header: "Date", value: (announcement) => announcement.publishedAt || "" },
      { header: "Expires", value: (announcement) => announcement.expiresAt ?? "" },
    ]);
    notify({
      tone: "info",
      message: "Export downloaded.",
      description: `${formatCount(announcementList.length)} rows exported from current view.`,
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
          <span className="mt-0.5 block truncate text-[12px] text-[#69726d]">{excerpt(announcement.message || announcement.title)}</span>
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
        <span className="whitespace-nowrap tabular-nums text-[#4d564f]">
          {announcement.publishedAt ? formatDayMonth(announcement.publishedAt) : "—"}
        </span>
      ),
      sortValue: (announcement) => announcement.publishedAt || "",
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      align: "right",
      cell: (announcement) => (
        <span className="flex items-center justify-end gap-1">
          <IconButton
            icon="eye"
            label={`View ${announcement.title}`}
            onClick={() => setSelected(announcement)}
          />
          <Can permission="announcement.manage">
            <IconButton
              icon="star"
              label={announcement.pinned ? "Unpin" : "Pin"}
              onClick={() => handleTogglePin(announcement)}
            />
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
            onChange: (val) => {
              setSearch(val);
              setPage(1);
            },
            placeholder: "Search announcements…",
            label: "Search announcements by title, message, author or ID",
          }}
          filters={filters}
          activeCount={activeFilterCount}
          onReset={resetFilters}
        />

        {loading ? (
          <TableSkeleton rows={6} />
        ) : error ? (
          <div className="p-8">
            <FinanceErrorState
              title="Failed to load announcements"
              description={error}
              onRetry={refreshAll}
            />
          </div>
        ) : (
          <DataTable
            rows={announcementList}
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
        )}
      </Panel>

      {selected ? (
        <AnnouncementDetailDrawer
          announcement={selected}
          onClose={() => setSelected(null)}
          onPublish={handlePublishAnnouncement}
          onArchive={handleArchiveAnnouncement}
          onDelete={handleDeleteAnnouncement}
          onTogglePin={handleTogglePin}
        />
      ) : null}

      <AddAnnouncementModal
        open={adding}
        onClose={() => setAdding(false)}
        onSave={handleAddAnnouncement}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Detail drawer
 * -------------------------------------------------------------------------- */

function ChannelPills({ channels = [] }: { channels?: AnnouncementChannel[] }) {
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
  onArchive,
  onDelete,
  onTogglePin,
}: {
  announcement: Announcement;
  onClose: () => void;
  onPublish: (announcement: Announcement) => void;
  onArchive: (announcement: Announcement) => void;
  onDelete: (announcement: Announcement) => void;
  onTogglePin: (announcement: Announcement) => void;
}) {
  const canGoLive = announcement.status === "Draft" || announcement.status === "Scheduled";
  const canArchive = announcement.status === "Published";

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
            {canArchive ? (
              <Button size="sm" variant="secondary" icon="file-text" onClick={() => onArchive(announcement)}>
                Archive
              </Button>
            ) : null}
            <Button size="sm" variant="danger" icon="trash" onClick={() => onDelete(announcement)}>
              Delete
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
            Scheduled for {formatLongDate(announcement.publishedAt || "")}. Not yet visible to the community.
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
              value={announcement.publishedAt ? formatLongDate(announcement.publishedAt) : "—"}
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
      description="Set the status to Draft to keep it off the board, or Published to make it live across the community."
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

        <SelectField
          label="Category"
          value={draft.category}
          onChange={(event) => set("category", event.target.value as any)}
          options={announcementCategories.map((value) => ({ value, label: value }))}
        />

        <SelectField
          label="Audience"
          value={draft.audience}
          onChange={(event) => set("audience", event.target.value as any)}
          options={announcementAudiences.map((value) => ({ value, label: value }))}
        />

        <SelectField
          label="Initial status"
          value={draft.status}
          onChange={(event) => set("status", event.target.value as any)}
          options={announcementStatuses.map((value) => ({ value, label: value }))}
        />

        <div className="flex items-end pb-1">
          <Toggle
            label="Pin to the top"
            checked={draft.pinned}
            onChange={(checked) => set("pinned", checked)}
            description="Holds this notice above newer ones on the board."
          />
        </div>

        <TextAreaField
          label="Message"
          required
          rows={5}
          value={draft.message}
          onChange={(event) => set("message", event.target.value)}
          error={show("message")}
          placeholder="Write the notice as it should appear to the community…"
          containerClassName="sm:col-span-2"
        />

        <div className="sm:col-span-2">
          <label className="text-[12px] font-medium text-[#2d3732]">Channels</label>
          <p className="mt-0.5 text-[11px] text-[#69726d]">Where this notice will be posted when published.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {announcementChannels.map((channel) => {
              const active = draft.channels.includes(channel);
              return (
                <button
                  type="button"
                  key={channel}
                  onClick={() => toggleChannel(channel)}
                  className={`rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
                    active
                      ? "border-[#0d4d3b] bg-[#0d4d3b] text-white"
                      : "border-[#dcdacd] bg-white text-[#4d564f] hover:bg-[#f6f5ee]"
                  }`}
                >
                  {channel}
                </button>
              );
            })}
          </div>
          {show("channels") ? <p className="mt-1 text-[11px] text-[#a83232]">{show("channels")}</p> : null}
        </div>
      </div>
    </Modal>
  );
}
