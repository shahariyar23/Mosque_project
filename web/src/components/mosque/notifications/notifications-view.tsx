"use client";

import { useState } from "react";
import { Button, IconButton } from "@/components/finance/ui/button";
import { DataTable, type Column } from "@/components/finance/ui/data-table";
import { FinanceFilters, type SelectFilter } from "@/components/finance/ui/filters";
import { SelectField, TextAreaField, TextField } from "@/components/finance/ui/form-field";
import { Modal } from "@/components/finance/ui/modal";
import { Panel, PanelHeader } from "@/components/finance/ui/panel";
import { Can } from "@/components/finance/ui/permission-gate";
import { TableSkeleton } from "@/components/finance/ui/skeleton";
import { FinanceEmptyState, FinanceErrorState, InlineNotice } from "@/components/finance/ui/states";
import { DetailDrawer, DetailField, DetailGrid, DetailSection, DetailStats } from "@/components/ui/detail-drawer";
import { StatGrid } from "@/components/ui/stat-card";
import { NotificationChannelChip, NotificationStatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { useApiList, useApiResource } from "@/hooks/use-api";
import { downloadCsv } from "@/lib/mosque/export";
import { formatCount, formatDayMonth, formatLongDate } from "@/lib/mosque/format";
import {
  notificationAudiences,
  notificationChannels,
  notificationStatuses,
  type NotificationDraft,
  type NotificationMessage,
  type StatMetric,
} from "@/lib/mosque/types";
import {
  createBroadcast,
  deleteBroadcast,
  fetchBroadcasts,
  fetchBroadcastStats,
  sendBroadcast,
  type BroadcastQuery,
} from "@/services/notificationsService";

const emptyDraft: NotificationDraft = {
  title: "",
  message: "",
  channel: "Push",
  audience: "Whole community",
  status: "Draft",
  scheduledAt: "",
};

/** Trim the message to a single line for the table, so a long notification doesn't blow out the row. */
const excerpt = (text: string, max = 88) => (text.length > max ? `${text.slice(0, max).trimEnd()}…` : text);

/** Delivered ÷ recipients as a whole-number percentage, guarding the empty case. */
const rate = (part: number, whole: number) => (whole === 0 ? 0 : Math.round((part / whole) * 100));

export function NotificationsView({ openComposeOnMount = false }: { openComposeOnMount?: boolean }) {
  const { notify } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState("all");
  const [status, setStatus] = useState("all");
  const [audience, setAudience] = useState("all");
  const [selected, setSelected] = useState<NotificationMessage | null>(null);
  const [composing, setComposing] = useState(openComposeOnMount);

  // Live broadcast stats from API
  const { data: statsData, refetch: refetchStats } = useApiResource(
    fetchBroadcastStats,
    [],
  );

  const stats = statsData || { total: 0, sent: 0, delivered: 0, openRate: 0 };

  const metrics: StatMetric[] = [
    {
      id: "total",
      label: "Messages",
      value: formatCount(stats.total),
      hint: "In the send log",
      icon: "bell",
      tone: "neutral",
    },
    {
      id: "sent",
      label: "Sent",
      value: formatCount(stats.sent),
      hint: "Delivered to a segment",
      icon: "check-circle",
      tone: "positive",
    },
    {
      id: "delivered",
      label: "Delivered",
      value: formatCount(stats.delivered),
      hint: "Across all sent messages",
      icon: "mail",
      tone: "gold",
    },
    {
      id: "openRate",
      label: "Open rate",
      value: `${stats.openRate}%`,
      hint: "Opened of delivered",
      icon: "eye",
      tone: "positive",
    },
  ];

  // Query state for live API
  const query: BroadcastQuery = {
    page,
    limit: 10,
    search: search.trim() || undefined,
    channel: channel !== "all" ? channel : undefined,
    status: status !== "all" ? status : undefined,
    audience: audience !== "all" ? audience : undefined,
  };

  const { rows: notificationList, meta, loading, error, refetch } = useApiList(
    fetchBroadcasts,
    query,
  );

  const refreshAll = () => {
    refetch();
    refetchStats();
  };

  const filters: SelectFilter[] = [
    {
      id: "channel",
      label: "Channel",
      value: channel,
      onChange: (val) => {
        setChannel(val);
        setPage(1);
      },
      options: [{ value: "all", label: "All channels" }, ...notificationChannels.map((value) => ({ value, label: value }))],
    },
    {
      id: "status",
      label: "Status",
      value: status,
      onChange: (val) => {
        setStatus(val);
        setPage(1);
      },
      options: [{ value: "all", label: "Any status" }, ...notificationStatuses.map((value) => ({ value, label: value }))],
    },
    {
      id: "audience",
      label: "Audience",
      value: audience,
      onChange: (val) => {
        setAudience(val);
        setPage(1);
      },
      options: [{ value: "all", label: "Everyone" }, ...notificationAudiences.map((value) => ({ value, label: value }))],
    },
  ];

  const activeFilterCount = (channel !== "all" ? 1 : 0) + (status !== "all" ? 1 : 0) + (audience !== "all" ? 1 : 0);
  const resetFilters = () => {
    setChannel("all");
    setStatus("all");
    setAudience("all");
    setPage(1);
  };

  const addNotification = async (draft: NotificationDraft) => {
    try {
      const scheduledIso =
        draft.status === "Scheduled" && draft.scheduledAt
          ? new Date(draft.scheduledAt).toISOString()
          : undefined;

      const created = await createBroadcast({
        title: draft.title.trim(),
        message: draft.message.trim(),
        channel: draft.channel,
        audience: draft.audience,
        status: draft.status,
        scheduledAt: scheduledIso,
        sender: "Mosque Office",
      });

      setComposing(false);
      refreshAll();
      notify({
        message:
          draft.status === "Sent"
            ? "Message dispatched."
            : draft.status === "Scheduled"
              ? "Message scheduled."
              : "Draft saved.",
        description:
          draft.status === "Scheduled" && draft.scheduledAt
            ? `${created.title} scheduled for delivery on ${new Date(draft.scheduledAt).toLocaleString()}.`
            : `${created.title} has been recorded in the database.`,
        tone: "success",
      });
    } catch (err: any) {
      notify({
        message: "Failed to save message",
        description: err?.message || "An unexpected error occurred",
        tone: "danger",
      });
      throw err;
    }
  };

  const handleSendNotification = async (target: NotificationMessage) => {
    try {
      const updated = await sendBroadcast(target.id);
      setSelected(updated);
      refreshAll();
      notify({
        message: "Message sent.",
        description: `${target.title} was pushed to ${target.audience}.`,
        tone: "success",
      });
    } catch (err: any) {
      notify({
        message: "Failed to send message",
        description: err?.message || "An unexpected error occurred",
        tone: "danger",
      });
      throw err;
    }
  };

  const handleDeleteNotification = async (target: NotificationMessage) => {
    try {
      await deleteBroadcast(target.id);
      setSelected(null);
      refreshAll();
      notify({
        message: "Message deleted.",
        description: `${target.title} was removed from the send log.`,
        tone: "info",
      });
    } catch (err: any) {
      notify({
        message: "Delete failed",
        description: err?.message || "Failed to delete message",
        tone: "danger",
      });
      throw err;
    }
  };

  const exportCsv = () => {
    downloadCsv("noor-mosque-notifications.csv", notificationList, [
      { header: "ID", value: (notification) => notification.id },
      { header: "Title", value: (notification) => notification.title },
      { header: "Channel", value: (notification) => notification.channel },
      { header: "Audience", value: (notification) => notification.audience },
      { header: "Status", value: (notification) => notification.status },
      { header: "Sender", value: (notification) => notification.sender },
      { header: "Sent", value: (notification) => notification.sentAt || "" },
      { header: "Scheduled", value: (notification) => notification.scheduledAt || "" },
      { header: "Recipients", value: (notification) => String(notification.recipients) },
      { header: "Delivered", value: (notification) => String(notification.delivered) },
      { header: "Opened", value: (notification) => String(notification.opened) },
    ]);
    notify({
      tone: "info",
      message: "Export downloaded.",
      description: `${formatCount(notificationList.length)} rows exported from current view.`,
    });
  };

  const columns: Column<NotificationMessage>[] = [
    {
      key: "message",
      header: "Message",
      cell: (notification) => (
        <span className="min-w-0">
          <span className="block truncate font-medium text-[#17211d]">{notification.title}</span>
          <span className="mt-0.5 block truncate text-[12px] text-[#69726d]">{excerpt(notification.message)}</span>
        </span>
      ),
      sortValue: (notification) => notification.title,
    },
    {
      key: "channel",
      header: "Channel",
      cell: (notification) => <NotificationChannelChip channel={notification.channel} />,
      sortValue: (notification) => notification.channel,
    },
    {
      key: "audience",
      header: "Audience",
      cell: (notification) => <span className="text-[#3d453f]">{notification.audience}</span>,
      sortValue: (notification) => notification.audience,
    },
    {
      key: "delivered",
      header: "Delivered",
      align: "right",
      cell: (notification) =>
        notification.status === "Sent" ? (
          <span className="whitespace-nowrap tabular-nums text-[#17211d]">{formatCount(notification.delivered)}</span>
        ) : (
          <span className="text-[#a3a89f]">—</span>
        ),
      sortValue: (notification) => notification.delivered,
    },
    {
      key: "status",
      header: "Status",
      cell: (notification) => <NotificationStatusBadge status={notification.status} />,
      sortValue: (notification) => notification.status,
    },
    {
      key: "sent",
      header: "Date",
      align: "right",
      cell: (notification) => {
        const dateToShow = notification.sentAt || notification.scheduledAt;
        return dateToShow ? (
          <span className="whitespace-nowrap tabular-nums text-[#4d564f]">{formatDayMonth(dateToShow)}</span>
        ) : (
          <span className="text-[#a3a89f]">—</span>
        );
      },
      sortValue: (notification) => notification.sentAt || notification.scheduledAt || "",
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      align: "right",
      cell: (notification) => (
        <span className="flex items-center justify-end gap-1">
          <IconButton icon="eye" label={`View ${notification.title}`} onClick={() => setSelected(notification)} />
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <StatGrid metrics={metrics} />

      <Panel>
        <PanelHeader
          title="Notifications"
          description="The send log — push, email, SMS and in-app messages, with how far each one reached."
          icon="bell"
          actions={
            <>
              <Button variant="secondary" size="sm" icon="download" onClick={exportCsv}>
                Export
              </Button>
              <Can permission="notification.send">
                <Button size="sm" icon="plus" onClick={() => setComposing(true)}>
                  Compose
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
            placeholder: "Search messages…",
            label: "Search notifications by title, message, sender or ID",
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
              title="Failed to load notifications"
              description={error}
              onRetry={refreshAll}
            />
          </div>
        ) : (
          <DataTable
            rows={notificationList}
            columns={columns}
            getRowKey={(notification) => notification.id}
            caption="Sent notifications with channel, audience, delivery and status"
            initialSort={{ key: "sent", direction: "desc" }}
            pageSize={10}
            mobileTitle={(notification) => notification.title}
            mobileSubtitle={(notification) => `${notification.channel} · ${notification.audience}`}
            mobileTrailing={(notification) => <NotificationStatusBadge status={notification.status} />}
            mobileHiddenKeys={["message", "status"]}
            emptyState={
              <FinanceEmptyState
                icon="bell"
                title="No notifications found."
                description={
                  activeFilterCount > 0 || search
                    ? "Nothing matches the current search and filters. Try clearing them."
                    : "The send log is empty. Compose the first message to reach the community."
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
                    <Can permission="notification.send">
                      <Button icon="plus" onClick={() => setComposing(true)}>
                        Compose
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
        <NotificationDetailDrawer
          notification={selected}
          onClose={() => setSelected(null)}
          onSend={handleSendNotification}
          onDelete={handleDeleteNotification}
        />
      ) : null}
      <ComposeNotificationModal open={composing} onClose={() => setComposing(false)} onSave={addNotification} />
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Detail drawer
 * -------------------------------------------------------------------------- */

function NotificationDetailDrawer({
  notification,
  onClose,
  onSend,
  onDelete,
}: {
  notification: NotificationMessage;
  onClose: () => void;
  onSend: (notification: NotificationMessage) => Promise<void>;
  onDelete: (notification: NotificationMessage) => Promise<void>;
}) {
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isSent = notification.status === "Sent";
  const deliveryRate = rate(notification.delivered, notification.recipients);
  const openRate = rate(notification.opened, notification.delivered);

  const handleSend = async () => {
    try {
      setSending(true);
      await onSend(notification);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await onDelete(notification);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DetailDrawer
      open
      onClose={onClose}
      eyebrow={notification.id}
      title={notification.title}
      subtitle={`${notification.channel} · ${notification.audience}`}
      badge={
        <>
          <NotificationStatusBadge status={notification.status} />
          <NotificationChannelChip channel={notification.channel} />
        </>
      }
      footer={
        <>
          <Can permission="notification.send">
            {notification.status === "Draft" || notification.status === "Scheduled" ? (
              <Button
                size="sm"
                icon="check"
                onClick={handleSend}
                loading={sending}
                disabled={deleting}
              >
                Send now
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="danger"
              icon="trash"
              onClick={handleDelete}
              loading={deleting}
              disabled={sending}
            >
              Delete
            </Button>
          </Can>
          <Button size="sm" variant="ghost" onClick={onClose} disabled={sending || deleting} className="ml-auto">
            Close
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {notification.status === "Scheduled" ? (
          <InlineNotice tone="info" icon="clock">
            {notification.scheduledAt
              ? `Scheduled to go out on ${formatLongDate(notification.scheduledAt)}. Recipients haven't been notified yet.`
              : "Scheduled message — recipients haven't been notified yet."}
          </InlineNotice>
        ) : null}
        {notification.status === "Draft" ? (
          <InlineNotice tone="neutral" icon="pencil">
            Draft message — not yet sent to the community.
          </InlineNotice>
        ) : null}
        {notification.status === "Failed" ? (
          <InlineNotice tone="danger" icon="alert">
            Failed send — no recipients were reached. Check the channel settings and retry.
          </InlineNotice>
        ) : null}

        {isSent ? (
          <DetailSection title="Delivery">
            <DetailStats
              items={[
                {
                  label: "Recipients",
                  value: formatCount(notification.recipients),
                  hint: "Targeted segment",
                },
                {
                  label: "Delivered",
                  value: formatCount(notification.delivered),
                  hint: `${deliveryRate}% of targeted`,
                },
                {
                  label: "Opened",
                  value: notification.channel === "SMS" ? "—" : formatCount(notification.opened),
                  hint: notification.channel === "SMS" ? "SMS has no open tracking" : `${openRate}% of delivered`,
                },
              ]}
            />
          </DetailSection>
        ) : null}

        <DetailSection title="Message">
          <p className="whitespace-pre-line text-[13px] leading-6 text-[#4d564f]">{notification.message}</p>
        </DetailSection>

        <DetailSection title="Details">
          <DetailGrid>
            <DetailField label="Sender" value={notification.sender} />
            <DetailField label="Audience" value={notification.audience} />
            <DetailField label="Channel" value={<NotificationChannelChip channel={notification.channel} />} />
            <DetailField label="Status" value={<NotificationStatusBadge status={notification.status} />} />
            <DetailField
              label={notification.status === "Scheduled" ? "Scheduled for" : "Sent date"}
              value={
                notification.status === "Scheduled" && notification.scheduledAt
                  ? formatLongDate(notification.scheduledAt)
                  : notification.sentAt
                    ? formatLongDate(notification.sentAt)
                    : "Not yet sent"
              }
            />
          </DetailGrid>
        </DetailSection>
      </div>
    </DetailDrawer>
  );
}

/* -------------------------------------------------------------------------- *
 * Compose modal
 * -------------------------------------------------------------------------- */

function ComposeNotificationModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (draft: NotificationDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState<NotificationDraft>(emptyDraft);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = <Key extends keyof NotificationDraft>(key: Key, value: NotificationDraft[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const errors = {
    title: draft.title.trim().length === 0 ? "Give the notification a title." : undefined,
    message: draft.message.trim().length === 0 ? "Write the message to send." : undefined,
    scheduledAt:
      draft.status === "Scheduled" && (!draft.scheduledAt || draft.scheduledAt.trim().length === 0)
        ? "Please select a date and time for scheduled delivery."
        : undefined,
  };
  const valid = Object.values(errors).every((error) => error === undefined);
  const show = (key: keyof typeof errors) => (submitted ? errors[key] : undefined);

  const close = () => {
    if (saving) return;
    setDraft(emptyDraft);
    setSubmitted(false);
    onClose();
  };

  const submit = async () => {
    setSubmitted(true);
    if (!valid || saving) return;
    try {
      setSaving(true);
      await onSave(draft);
      setDraft(emptyDraft);
      setSubmitted(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Compose message"
      description="Send a direct notification to a segment of the community across push, email, SMS or in-app."
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button icon="check" onClick={submit} loading={saving}>
            Save message
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
          placeholder="Jumu'ah reminder: two sessions today"
          containerClassName="sm:col-span-2"
        />

        <SelectField
          label="Channel"
          value={draft.channel}
          onChange={(event) => set("channel", event.target.value as any)}
          options={notificationChannels.map((value) => ({ value, label: value }))}
        />

        <SelectField
          label="Audience"
          value={draft.audience}
          onChange={(event) => set("audience", event.target.value as any)}
          options={notificationAudiences.map((value) => ({ value, label: value }))}
        />

        <SelectField
          label="Status"
          value={draft.status}
          onChange={(event) => set("status", event.target.value as any)}
          options={notificationStatuses.map((value) => ({ value, label: value }))}
          containerClassName={draft.status === "Scheduled" ? "" : "sm:col-span-2"}
        />

        {draft.status === "Scheduled" ? (
          <TextField
            label="Schedule Date & Time"
            required
            type="datetime-local"
            value={draft.scheduledAt || ""}
            onChange={(event) => set("scheduledAt", event.target.value)}
            error={show("scheduledAt")}
            hint="The system will automatically dispatch this message when this time arrives."
          />
        ) : null}

        <TextAreaField
          label="Message"
          required
          rows={5}
          value={draft.message}
          onChange={(event) => set("message", event.target.value)}
          error={show("message")}
          placeholder="Write the message that will be delivered…"
          containerClassName="sm:col-span-2"
        />
      </div>
    </Modal>
  );
}
