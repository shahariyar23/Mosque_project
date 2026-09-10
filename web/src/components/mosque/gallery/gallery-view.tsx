"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/finance/ui/button";
import { FinanceFilters, type SelectFilter } from "@/components/finance/ui/filters";
import { SelectField, TextAreaField, TextField } from "@/components/finance/ui/form-field";
import { Icon } from "@/components/finance/ui/icon";
import { Modal } from "@/components/finance/ui/modal";
import { Panel, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { FinanceEmptyState, InlineNotice } from "@/components/finance/ui/states";
import { ConfirmDialog } from "@/components/finance/ui/dialogs";
import { DetailDrawer, DetailField, DetailGrid, DetailSection } from "@/components/ui/detail-drawer";
import { StatGrid } from "@/components/ui/stat-card";
import { MediaAlbumChip, MediaTypeBadge, MediaVisibilityBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
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
import {
  fetchGalleryItems,
  uploadGalleryPhoto,
  deleteGalleryItem,
  type GalleryItem,
} from "@/services/galleryService";

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

function mapBackendGalleryToMediaItem(item: GalleryItem): MediaItem {
  // Map category to known MediaAlbum if matching, or default
  const albumMatch = mediaAlbums.find(
    (a) => a.toLowerCase() === (item.category || "").toLowerCase(),
  );

  return {
    id: item.id,
    title: item.title || "Untitled Photo",
    album: albumMatch || "Building & Grounds",
    type: "Image",
    visibility: item.isPublished ? "Public" : "Hidden",
    caption: item.altText || "",
    tags: [item.category || "General"],
    uploadedBy: "Admin",
    uploadedAt: item.createdAt ? item.createdAt.slice(0, 10) : REFERENCE_DATE,
    fileName: item.cloudinaryPublicId || "photo.jpg",
    imageUrl: item.imageUrl,
    sizeKb: 1200,
  };
}

/** The photo tile — renders actual Cloudinary photo, or falls back to stylized gradient placeholder. */
function MediaThumb({ item, className = "" }: { item: MediaItem; className?: string }) {
  const tint = albumTile[item.album] || { from: "#0d4d3b", to: "#0b4634" };

  if (item.imageUrl) {
    return (
      <div className={`relative overflow-hidden bg-[#17211d] ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt={item.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {item.visibility !== "Public" ? (
          <span className="absolute left-1.5 top-1.5">
            <MediaVisibilityBadge visibility={item.visibility} />
          </span>
        ) : null}
      </div>
    );
  }

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
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [album, setAlbum] = useState("all");
  const [type, setType] = useState("all");
  const [visibility, setVisibility] = useState("all");
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [uploading, setUploading] = useState(openUploadOnMount);
  const [deletingItem, setDeletingItem] = useState<MediaItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadGallery = async () => {
    try {
      setLoading(true);
      const items = await fetchGalleryItems();
      setMediaList(items.map(mapBackendGalleryToMediaItem));
    } catch {
      notify({
        tone: "warning",
        message: "Could not load gallery from server.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGallery();
  }, []);

  const metrics: StatMetric[] = useMemo(() => {
    const total = mediaList.length;
    const photos = mediaList.filter((m) => m.type === "Image").length;
    const videos = mediaList.filter((m) => m.type === "Video").length;
    const distinctAlbums = new Set(mediaList.map((m) => m.album)).size;

    return [
      {
        id: "total",
        label: "Media items",
        value: formatCount(total),
        hint: "In Cloudinary library",
        icon: "image",
        tone: "neutral",
      },
      {
        id: "photos",
        label: "Photos",
        value: formatCount(photos),
        hint: "Still images",
        icon: "camera",
        tone: "positive",
      },
      {
        id: "videos",
        label: "Videos",
        value: formatCount(videos),
        hint: "Clips and recordings",
        icon: "play",
        tone: "gold",
      },
      {
        id: "albums",
        label: "Albums",
        value: formatCount(distinctAlbums),
        hint: "Categories",
        icon: "grid",
        tone: "neutral",
      },
    ];
  }, [mediaList]);

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

  const handleMediaUploaded = (newItem: GalleryItem) => {
    const mapped = mapBackendGalleryToMediaItem(newItem);
    setMediaList((current) => [mapped, ...current]);
    setUploading(false);
    notify({
      tone: "success",
      message: "Photo uploaded to Cloudinary successfully!",
      description: mapped.title,
    });
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;
    try {
      setDeleting(true);
      await deleteGalleryItem(deletingItem.id);
      setMediaList((current) => current.filter((item) => item.id !== deletingItem.id));
      if (selected?.id === deletingItem.id) {
        setSelected(null);
      }
      setDeletingItem(null);
      notify({
        tone: "success",
        message: "Photo deleted from Cloudinary.",
      });
    } catch {
      notify({
        tone: "danger",
        message: "Failed to delete photo from Cloudinary.",
      });
    } finally {
      setDeleting(false);
    }
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
      { header: "Image URL", value: (item) => item.imageUrl || "" },
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
          description="The mosque's photos and media library powered by Cloudinary."
          icon="image"
          actions={
            <>
              <Button variant="secondary" size="sm" icon="download" onClick={exportCsv}>
                Export
              </Button>
              <Can permission="gallery.manage">
                <Button size="sm" icon="upload" onClick={() => setUploading(true)}>
                  Upload photo
                </Button>
              </Can>
            </>
          }
        />

        <FinanceFilters
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "Search photos…",
            label: "Search media by title, caption, tag or ID",
          }}
          filters={filters}
          activeCount={activeFilterCount}
          onReset={resetFilters}
        />

        <div className="px-4 pb-5 pt-1 sm:px-5">
          <p className="mb-3 text-[12.5px] text-[#69726d]" role="status" aria-live="polite">
            {loading
              ? "Loading photos from Cloudinary…"
              : filtered.length === mediaList.length
                ? `${formatCount(mediaList.length)} items`
                : `${formatCount(filtered.length)} of ${formatCount(mediaList.length)} items`}
          </p>

          {!loading && filtered.length === 0 ? (
            <FinanceEmptyState
              icon="image"
              title="No media found."
              description={
                activeFilterCount > 0 || search
                  ? "Nothing matches the current search and filters. Try clearing them."
                  : "The gallery is empty. Upload the first photos to build the mosque's library."
              }
              action={
                activeFilterCount > 0 || search ? (
                  <Button variant="secondary" icon="close" onClick={clearAll}>
                    Clear search and filters
                  </Button>
                ) : (
                  <Can permission="gallery.manage">
                    <Button icon="upload" onClick={() => setUploading(true)}>
                      Upload photo
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

      {selected ? (
        <MediaDetailDrawer
          item={selected}
          onClose={() => setSelected(null)}
          onDelete={() => setDeletingItem(selected)}
        />
      ) : null}

      <UploadMediaModal
        open={uploading}
        onClose={() => setUploading(false)}
        onUploaded={handleMediaUploaded}
      />

      <ConfirmDialog
        open={Boolean(deletingItem)}
        onClose={() => setDeletingItem(null)}
        onConfirm={confirmDelete}
        title="Delete Photo from Cloudinary?"
        description={`Are you sure you want to permanently delete "${deletingItem?.title}"? This cannot be undone and will remove it from the gallery and About page.`}
        confirmLabel={deleting ? "Deleting…" : "Delete Photo"}
        tone="danger"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Detail drawer
 * -------------------------------------------------------------------------- */

function MediaDetailDrawer({
  item,
  onClose,
  onDelete,
}: {
  item: MediaItem;
  onClose: () => void;
  onDelete: () => void;
}) {
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
        <div className="flex w-full items-center justify-between">
          <Can permission="gallery.manage">
            <Button
              size="sm"
              variant="secondary"
              icon="trash"
              onClick={onDelete}
              className="text-[#94291f] hover:bg-[#faeae7]"
            >
              Delete
            </Button>
          </Can>
          <Button size="sm" variant="ghost" onClick={onClose} className="ml-auto">
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {item.visibility === "Hidden" ? (
          <InlineNotice tone="neutral" icon="eye">
            Hidden — not shown on the community site while it is being sorted and captioned.
          </InlineNotice>
        ) : null}

        <MediaThumb item={item} className="aspect-video w-full rounded-xl" />

        {item.caption ? (
          <DetailSection title="Caption">
            <p className="text-[13px] leading-6 text-[#4d564f]">{item.caption}</p>
          </DetailSection>
        ) : null}

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
            <DetailField label="Album / Category" value={<MediaAlbumChip album={item.album} />} />
            <DetailField label="Visibility" value={<MediaVisibilityBadge visibility={item.visibility} />} />
            <DetailField label="Uploaded by" value={item.uploadedBy} />
            <DetailField label="Date" value={formatLongDate(item.uploadedAt)} />
            {item.imageUrl ? (
              <DetailField
                label="Direct Image Link"
                value={
                  <a
                    href={item.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-[#0d4d3b] underline"
                  >
                    Open in Cloudinary
                  </a>
                }
                full
              />
            ) : null}
          </DetailGrid>
        </DetailSection>
      </div>
    </DetailDrawer>
  );
}

/* -------------------------------------------------------------------------- *
 * Upload Modal with Real File Input
 * -------------------------------------------------------------------------- */

function UploadMediaModal({
  open,
  onClose,
  onUploaded,
}: {
  open: boolean;
  onClose: () => void;
  onUploaded: (item: GalleryItem) => void;
}) {
  const { notify } = useToast();
  const [title, setTitle] = useState("");
  const [album, setAlbum] = useState<MediaAlbum>("Building & Grounds");
  const [visibility, setVisibility] = useState<"Public" | "Hidden">("Public");
  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const reset = () => {
    setTitle("");
    setAlbum("Building & Grounds");
    setVisibility("Public");
    setCaption("");
    setSelectedFile(null);
    setPreviewUrl(null);
    setSubmitted(false);
    setSubmitting(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        notify({ tone: "danger", message: "Please select a valid image file (JPG, PNG, WebP)." });
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      if (!title) {
        // Auto-fill title from filename if title is empty
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
    }
  };

  const errors = {
    file: !selectedFile ? "Choose an image file to upload." : undefined,
    title: title.trim().length === 0 ? "Give the photo a title." : undefined,
  };
  const valid = Object.values(errors).every((error) => error === undefined);

  const submit = async () => {
    setSubmitted(true);
    if (!valid || !selectedFile || submitting) return;

    try {
      setSubmitting(true);
      const created = await uploadGalleryPhoto({
        file: selectedFile,
        title: title.trim(),
        altText: caption.trim() || title.trim(),
        category: album,
        isPublished: visibility === "Public",
      });
      reset();
      onUploaded(created);
    } catch (err: unknown) {
      notify({
        tone: "danger",
        message: err instanceof Error ? err.message : "Failed to upload photo to Cloudinary.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Upload Photo to Cloudinary"
      description="Select an image file from your device. It will be uploaded directly to Cloudinary and added to the mosque gallery."
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button icon="upload" onClick={submit} disabled={submitting}>
            {submitting ? "Uploading to Cloudinary…" : "Upload Photo"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {/* File selection */}
        <div className="sm:col-span-2">
          <label className="block text-[13px] font-semibold text-[#3d453f] mb-1">
            Choose Photo File <span className="text-[#94291f]">*</span>
          </label>
          <div className="mt-1 flex items-center gap-4">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
              disabled={submitting}
              className="block w-full text-sm text-[#4d564f] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#e8f2ee] file:text-[#0d4d3b] hover:file:bg-[#d0e5dd] cursor-pointer"
            />
          </div>
          {submitted && errors.file ? (
            <p role="alert" className="mt-1.5 text-[12px] font-medium text-[#94291f]">
              {errors.file}
            </p>
          ) : (
            <p className="mt-1 text-[11.5px] text-[#69726d]">
              Supports JPG, PNG, WebP, GIF up to 5MB.
            </p>
          )}

          {previewUrl ? (
            <div className="mt-3 relative h-40 w-full overflow-hidden rounded-xl border border-[#dcdacd] bg-[#f6f5ee]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Preview" className="h-full w-full object-contain" />
            </div>
          ) : null}
        </div>

        <TextField
          label="Title"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          error={submitted ? errors.title : undefined}
          placeholder="Eid al-Fitr prayer in the main hall"
          containerClassName="sm:col-span-2"
        />

        <SelectField
          label="Album / Category"
          required
          value={album}
          options={[...mediaAlbums]}
          onChange={(event) => setAlbum(event.target.value as MediaAlbum)}
        />

        <SelectField
          label="Visibility"
          required
          value={visibility}
          options={["Public", "Hidden"]}
          onChange={(event) => setVisibility(event.target.value as "Public" | "Hidden")}
        />

        <TextAreaField
          label="Caption / Alt Text"
          rows={3}
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          hint="A short line describing the photo for accessibility."
          containerClassName="sm:col-span-2"
        />
      </div>

      {submitting ? (
        <InlineNotice className="mt-4" tone="info" icon="clock">
          Uploading and optimizing image with Cloudinary…
        </InlineNotice>
      ) : null}
    </Modal>
  );
}
