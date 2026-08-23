"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/finance/ui/button";
import { FinanceFilters, type SelectFilter } from "@/components/finance/ui/filters";
import { AttachmentField, SelectField, TextAreaField, TextField } from "@/components/finance/ui/form-field";
import { Icon } from "@/components/finance/ui/icon";
import { Modal } from "@/components/finance/ui/modal";
import { Panel, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { FinanceEmptyState, InlineNotice } from "@/components/finance/ui/states";
import { DetailDrawer, DetailField, DetailGrid, DetailSection } from "@/components/ui/detail-drawer";
import { StatGrid } from "@/components/ui/stat-card";
import { MediaAlbumChip, MediaTypeBadge, MediaVisibilityBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { galleryStats, media as seedMedia } from "@/data/gallery";
import { downloadCsv } from "@/lib/mosque/export";
import { formatCount, formatLongDate, REFERENCE_DATE } from "@/lib/mosque/format";
import {
  mediaAlbums,
  mediaTypes,
  mediaVisibilities,
  type MediaAlbum,
  type MediaDraft,
  type MediaItem,
  type StatMetric,
} from "@/lib/mosque/types";

/**
 * The media gallery — the mosque's photos and videos as a wall of tiles, not a table.
 *
 * A gallery is looked at, so it is shown as a responsive grid of cards rather than rows. There are no
 * real files: each tile is a generated placeholder, tinted per album from the existing palette and
 * marked with a camera or a play glyph, so the module carries its own visual weight without pulling a
 * single external image. Everything else is the shared kit — the same filters, drawer and composer as
 * every other module — so a future upload endpoint drops straight in behind it.
 */
const metrics: StatMetric[] = [
  {
    id: "total",
    label: "Media items",
    value: formatCount(galleryStats.total),
    hint: "In the library",
    icon: "image",
    tone: "neutral",
  },
  {
    id: "photos",
    label: "Photos",
    value: formatCount(galleryStats.images),
    hint: "Still images",
    icon: "camera",
    tone: "positive",
  },
  {
    id: "videos",
    label: "Videos",
    value: formatCount(galleryStats.videos),
    hint: "Clips and recordings",
    icon: "play",
    tone: "gold",
  },
  {
    id: "albums",
    label: "Albums",
    value: formatCount(galleryStats.albums),
    hint: "Collections",
    icon: "grid",
    tone: "neutral",
  },
];

const emptyDraft: MediaDraft = {
  title: "",
  album: "Eid al-Fitr",
  type: "Image",
  visibility: "Public",
  caption: "",
  fileName: "",
};

/** Per-album tile tints, all drawn from the project's greens, teal and gold — no new colours. */
const albumTile: Record<MediaAlbum, { from: string; to: string }> = {
  "Eid al-Fitr": { from: "#b98a34", to: "#97701f" },
  "Eid al-Adha": { from: "#17211d", to: "#0d4d3b" },
  "Ramadan Nights": { from: "#12564a", to: "#1d5265" },
  "Weekend Madrasah": { from: "#0d4d3b", to: "#0b4634" },
  "Community Iftar": { from: "#6f776f", to: "#4d564f" },
  "Youth Programme": { from: "#12564a", to: "#1d5265" },
  Fundraising: { from: "#0d4d3b", to: "#0b4634" },
  "Qur'an Competition": { from: "#b98a34", to: "#97701f" },
  "Building & Grounds": { from: "#6f776f", to: "#4d564f" },
  Volunteers: { from: "#17211d", to: "#0d4d3b" },
};

const formatSize = (kb: number) => (kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`);
const formatDuration = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/** The placeholder tile — a tinted panel with a camera/play glyph. Stands in for a real thumbnail. */
function MediaThumb({ item, className = "" }: { item: MediaItem; className?: string }) {
  const tint = albumTile[item.album];
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{ backgroundImage: `linear-gradient(135deg, ${tint.from}, ${tint.to})` }}
      aria-hidden="true"
    >
      <Icon name={item.type === "Video" ? "play" : "camera"} size={30} className="text-white/85" />
      {item.type === "Video" && item.durationSeconds ? (
        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/45 px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums text-white">
          {formatDuration(item.durationSeconds)}
        </span>
      ) : null}
      {item.visibility !== "Public" ? (
        <span className="absolute left-1.5 top-1.5">
          <MediaVisibilityBadge visibility={item.visibility} />
        </span>
      ) : null}
    </div>
  );
}

export function GalleryView({ openUploadOnMount = false }: { openUploadOnMount?: boolean }) {
  const { notify } = useToast();
  const [mediaList, setMediaList] = useState<MediaItem[]>(seedMedia);
  const [search, setSearch] = useState("");
  const [album, setAlbum] = useState("all");
  const [type, setType] = useState("all");
  const [visibility, setVisibility] = useState("all");
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [uploading, setUploading] = useState(openUploadOnMount);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return mediaList
      .filter((item) => {
        if (needle) {
          const haystack = `${item.title} ${item.caption} ${item.tags.join(" ")} ${item.uploadedBy} ${item.id}`.toLowerCase();
          if (!haystack.includes(needle)) return false;
        }
        if (album !== "all" && item.album !== album) return false;
        if (type !== "all" && item.type !== type) return false;
        if (visibility !== "all" && item.visibility !== visibility) return false;
        return true;
      })
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }, [album, mediaList, search, type, visibility]);

  const filters: SelectFilter[] = [
    {
      id: "album",
      label: "Album",
      value: album,
      onChange: setAlbum,
      options: [{ value: "all", label: "All albums" }, ...mediaAlbums.map((value) => ({ value, label: value }))],
    },
    {
      id: "type",
      label: "Type",
      value: type,
      onChange: setType,
      options: [{ value: "all", label: "All types" }, ...mediaTypes.map((value) => ({ value, label: value }))],
    },
    {
      id: "visibility",
      label: "Visibility",
      value: visibility,
      onChange: setVisibility,
      options: [{ value: "all", label: "Any visibility" }, ...mediaVisibilities.map((value) => ({ value, label: value }))],
    },
  ];

  const activeFilterCount = (album !== "all" ? 1 : 0) + (type !== "all" ? 1 : 0) + (visibility !== "all" ? 1 : 0);
  const resetFilters = () => {
    setAlbum("all");
    setType("all");
    setVisibility("all");
  };
  const clearAll = () => {
    resetFilters();
    setSearch("");
  };

  const addMedia = (draft: MediaDraft) => {
    const item: MediaItem = {
      id: `GAL-${String(mediaList.length + 1).padStart(3, "0")}`,
      title: draft.title.trim(),
      album: draft.album,
      type: draft.type,
      visibility: draft.visibility,
      caption: draft.caption.trim(),
      tags: [draft.album],
      uploadedBy: "Media Team",
      uploadedAt: REFERENCE_DATE,
      fileName: draft.fileName,
      sizeKb: draft.type === "Video" ? 24000 : 2000,
      ...(draft.type === "Video" ? { durationSeconds: 120 } : {}),
    };

    setMediaList((current) => [item, ...current]);
    setUploading(false);
    notify({
      message: "Media added.",
      description: `${item.title} · ${item.id} — held in this browser only, nothing was really uploaded.`,
    });
  };

  const exportCsv = () => {
    downloadCsv("noor-mosque-gallery.csv", filtered, [
      { header: "ID", value: (item) => item.id },
      { header: "Title", value: (item) => item.title },
      { header: "Album", value: (item) => item.album },
      { header: "Type", value: (item) => item.type },
      { header: "Visibility", value: (item) => item.visibility },
      { header: "Tags", value: (item) => item.tags.join(" / ") },
      { header: "Uploaded by", value: (item) => item.uploadedBy },
      { header: "Date", value: (item) => item.uploadedAt },
      { header: "File", value: (item) => item.fileName },
      { header: "Size KB", value: (item) => String(item.sizeKb) },
    ]);
    notify({
      tone: "info",
      message: "Export downloaded.",
      description: `${formatCount(filtered.length)} rows, matching the filters currently applied.`,
    });
  };

  return (
    <div className="space-y-4">
      <StatGrid metrics={metrics} />

      <Panel>
        <PanelHeader
          title="Gallery"
          description="The mosque's photos and videos, grouped into albums across the year."
          icon="image"
          actions={
            <>
              <Button variant="secondary" size="sm" icon="download" onClick={exportCsv}>
                Export
              </Button>
              <Can permission="gallery.manage">
                <Button size="sm" icon="upload" onClick={() => setUploading(true)}>
                  Upload
                </Button>
              </Can>
            </>
          }
        />

        <FinanceFilters
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "Search photos and videos…",
            label: "Search media by title, caption, tag, uploader or ID",
          }}
          filters={filters}
          activeCount={activeFilterCount}
          onReset={resetFilters}
        />

        <div className="px-4 pb-5 pt-1 sm:px-5">
          <p className="mb-3 text-[12.5px] text-[#69726d]" role="status" aria-live="polite">
            {filtered.length === mediaList.length
              ? `${formatCount(mediaList.length)} items`
              : `${formatCount(filtered.length)} of ${formatCount(mediaList.length)} items`}
          </p>

          {filtered.length === 0 ? (
            <FinanceEmptyState
              icon="image"
              title="No media found."
              description={
                activeFilterCount > 0 || search
                  ? "Nothing matches the current search and filters. Try clearing them."
                  : "The gallery is empty. Upload the first photos and videos to build the library."
              }
              action={
                activeFilterCount > 0 || search ? (
                  <Button variant="secondary" icon="close" onClick={clearAll}>
                    Clear search and filters
                  </Button>
                ) : (
                  <Can permission="gallery.manage">
                    <Button icon="upload" onClick={() => setUploading(true)}>
                      Upload media
                    </Button>
                  </Can>
                )
              }
            />
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(item)}
                    aria-label={`Open ${item.title} — ${item.type} in ${item.album}`}
                    className="group block w-full overflow-hidden rounded-xl border border-[#e7e6dc] bg-white text-left transition-shadow hover:shadow-[0_8px_24px_rgba(7,58,45,.12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
                  >
                    <MediaThumb item={item} className="aspect-4/3 w-full" />
                    <div className="p-2.5">
                      <p className="truncate text-[13px] font-medium text-[#17211d]">{item.title}</p>
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <MediaAlbumChip album={item.album} />
                        <span className="shrink-0 text-[11px] tabular-nums text-[#8b938d]">{formatLongDate(item.uploadedAt)}</span>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>

      {selected ? <MediaDetailDrawer item={selected} onClose={() => setSelected(null)} /> : null}
      <UploadMediaModal open={uploading} onClose={() => setUploading(false)} onSave={addMedia} />
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Detail drawer
 * -------------------------------------------------------------------------- */

function MediaDetailDrawer({ item, onClose }: { item: MediaItem; onClose: () => void }) {
  return (
    <DetailDrawer
      open
      onClose={onClose}
      eyebrow={item.id}
      title={item.title}
      subtitle={`${item.album} · ${item.type}`}
      badge={
        <>
          <MediaTypeBadge type={item.type} />
          <MediaVisibilityBadge visibility={item.visibility} />
          <MediaAlbumChip album={item.album} />
        </>
      }
      footer={
        <>
          <Can permission="gallery.manage">
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
        {item.visibility === "Hidden" ? (
          <InlineNotice tone="neutral" icon="eye">
            Hidden — not shown on the community site while it is being sorted and captioned.
          </InlineNotice>
        ) : null}
        {item.visibility === "Members" ? (
          <InlineNotice tone="info" icon="lock">
            Members only — visible on the members&rsquo; area of the site, not to the public.
          </InlineNotice>
        ) : null}

        <MediaThumb item={item} className="aspect-video w-full rounded-xl" />

        <DetailSection title="Caption">
          <p className="text-[13px] leading-6 text-[#4d564f]">{item.caption}</p>
        </DetailSection>

        {item.tags.length > 0 ? (
          <DetailSection title="Tags">
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[#dcdacd] bg-[#f6f5ee] px-2.5 py-1 text-[12px] font-medium text-[#4d564f]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </DetailSection>
        ) : null}

        <DetailSection title="Details">
          <DetailGrid>
            <DetailField label="Album" value={<MediaAlbumChip album={item.album} />} />
            <DetailField label="Type" value={<MediaTypeBadge type={item.type} />} />
            <DetailField label="Visibility" value={<MediaVisibilityBadge visibility={item.visibility} />} />
            <DetailField label="Uploaded by" value={item.uploadedBy} />
            <DetailField label="Date" value={formatLongDate(item.uploadedAt)} />
            <DetailField
              label={item.type === "Video" ? "Duration" : "Size"}
              value={item.type === "Video" && item.durationSeconds ? formatDuration(item.durationSeconds) : formatSize(item.sizeKb)}
            />
            <DetailField label="File" value={<span className="break-all">{item.fileName}</span>} full />
          </DetailGrid>
        </DetailSection>
      </div>
    </DetailDrawer>
  );
}

/* -------------------------------------------------------------------------- *
 * Upload
 * -------------------------------------------------------------------------- */

function UploadMediaModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (draft: MediaDraft) => void;
}) {
  const [draft, setDraft] = useState<MediaDraft>(emptyDraft);
  const [submitted, setSubmitted] = useState(false);

  const set = <Key extends keyof MediaDraft>(key: Key, value: MediaDraft[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const errors = {
    title: draft.title.trim().length === 0 ? "Give the item a title." : undefined,
    fileName: draft.fileName.trim().length === 0 ? "Choose a file to upload." : undefined,
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
      title="Upload media"
      description="Add a photo or video to an album. Uploading is not connected — the file name is recorded so the endpoint can wire in later."
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button icon="check" onClick={submit}>
            Add to Gallery
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
          placeholder="Eid al-Fitr prayer in the main hall"
          containerClassName="sm:col-span-2"
        />
        <SelectField
          label="Album"
          required
          value={draft.album}
          options={[...mediaAlbums]}
          onChange={(event) => set("album", event.target.value as MediaDraft["album"])}
        />
        <SelectField
          label="Type"
          required
          value={draft.type}
          options={[...mediaTypes]}
          onChange={(event) => set("type", event.target.value as MediaDraft["type"])}
        />
        <SelectField
          label="Visibility"
          required
          value={draft.visibility}
          options={[...mediaVisibilities]}
          onChange={(event) => set("visibility", event.target.value as MediaDraft["visibility"])}
          containerClassName="sm:col-span-2"
        />
        <TextAreaField
          label="Caption"
          rows={3}
          value={draft.caption}
          onChange={(event) => set("caption", event.target.value)}
          hint="A short line describing the photo or video."
          containerClassName="sm:col-span-2"
        />
        <div className="sm:col-span-2">
          <AttachmentField
            label="File"
            hint="Photo or video. Uploading is not connected yet — the file name is recorded for now."
            fileName={draft.fileName || undefined}
            onSelect={(name) => set("fileName", name)}
            onClear={() => set("fileName", "")}
          />
          {show("fileName") ? (
            <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium text-[#94291f]">
              <Icon name="alert" size={13} />
              {errors.fileName}
            </p>
          ) : null}
        </div>
      </div>

      {submitted && !valid ? (
        <InlineNotice className="mt-4" tone="neutral" icon="alert">
          Some details still need attention — see the messages above.
        </InlineNotice>
      ) : (
        <InlineNotice className="mt-4" tone="gold">
          Front-end preview — the item is added to this browser session only. Nothing is really uploaded.
        </InlineNotice>
      )}
    </Modal>
  );
}
