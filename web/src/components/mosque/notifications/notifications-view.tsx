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
import { NotificationChannelChip, NotificationStatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { notificationStats, notifications as seedNotifications } from "@/data/notifications";
import { downloadCsv } from "@/lib/mosque/export";
import { formatCount, formatDayMonth, formatLongDate, REFERENCE_DATE } from "@/lib/mosque/format";
import {
  notificationAudiences,
  notificationChannels,
  notificationStatuses,
  type NotificationDraft,
  type NotificationMessage,
  type StatMetric,
} from "@/lib/mosque/types";

/**
 * The send log — the outgoing push, email, SMS and in-app messages the mosque has pushed to a
 * segment of the community.
 *
 * Where an announcement is the standing notice on the board, a notification is the act of reaching
 * out, so the numbers that matter here are delivery ones: how many it reached, how many opened it.
 * A sent message carries those figures; a scheduled or draft one has none yet, and a failed send
 * reached no one — the status badge carries that meaning so a row never leans on colour alone.
 */
const metrics: StatMetric[] = [
  {
    id: "total",
    label: "Messages",
    value: formatCount(notificationStats.total),
    hint: "In the send log",
    icon: "bell",
    tone: "neutral",
  },
  {
    id: "sent",
    label: "Sent",
    value: formatCount(notificationStats.sent),
    hint: "Delivered to a segment",
    icon: "check-circle",
    tone: "positive",
  },
  {
    id: "delivered",
    label: "Delivered",
    value: formatCount(notificationStats.delivered),
    hint: "Across all sent messages",
    icon: "mail",
    tone: "gold",
  },
  {
    id: "openRate",
    label: "Open rate",
    value: `${notificationStats.openRate}%`,
    hint: "Opened of delivered",
    icon: "eye",
    tone: "positive",
  },
];

const emptyDraft: NotificationDraft = {
  title: "",
  message: "",
  channel: "Push",
  audience: "Whole community",
  status: "Draft",
};

/** Trim the message to a single line for the table, so a long notification doesn't blow out the row. */
const excerpt = (text: string, max = 88) => (text.length > max ? `${text.slice(0, max).trimEnd()}…` : text);

/** Delivered ÷ recipients as a whole-number percentage, guarding the empty case. */
const rate = (part: number, whole: number) => (whole === 0 ? 0 : Math.round((part / whole) * 100));

export function NotificationsView({ openComposeOnMount = false }: { openComposeOnMount?: boolean }) {
  const { notify } = useToast();
  const [notificationList, setNotificationList] = useState<NotificationMessage[]>(seedNotifications);
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState("all");
  const [status, setStatus] = useState("all");
  const [audience, setAudience] = useState("all");
  const [selected, setSelected] = useState<NotificationMessage | null>(null);
  const [composing, setComposing] = useState(openComposeOnMount);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return notificationList.filter((notification) => {
      if (needle) {
        const haystack =
          `${notification.title} ${notification.message} ${notification.sender} ${notification.id}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (channel !== "all" && notification.channel !== channel) return false;
      if (status !== "all" && notification.status !== status) return false;
      if (audience !== "all" && notification.audience !== audience) return false;
      return true;
    });
  }, [audience, channel, notificationList, search, status]);

  const filters: SelectFilter[] = [
    {
      id: "channel",
      label: "Channel",
      value: channel,
      onChange: setChannel,
      options: [{ value: "all", label: "All channels" }, ...notificationChannels.map((value) => ({ value, label: value }))],
    },
    {
      id: "status",
      label: "Status",
      value: status,
      onChange: setStatus,
      options: [{ value: "all", label: "Any status" }, ...notificationStatuses.map((value) => ({ value, label: value }))],
    },
    {
      id: "audience",
      label: "Audience",
      value: audience,
      onChange: setAudience,
      options: [{ value: "all", label: "Everyone" }, ...notificationAudiences.map((value) => ({ value, label: value }))],
    },
  ];

  const activeFilterCount = (channel !== "all" ? 1 : 0) + (status !== "all" ? 1 : 0) + (audience !== "all" ? 1 : 0);
  const resetFilters = () => {
    setChannel("all");
    setStatus("all");
    setAudience("all");
  };

  const addNotification = (draft: NotificationDraft) => {
    const notification: NotificationMessage = {
      id: `NTF-${String(notificationList.length + 1).padStart(3, "0")}`,
      title: draft.title.trim(),
      message: draft.message.trim(),
      channel: draft.channel,
      audience: draft.audience,
      status: draft.status,
      sender: "Mosque Office",
      sentAt: draft.status === "Draft" ? "" : REFERENCE_DATE,
      recipients: 0,
      delivered: 0,
      opened: 0,
    };

    setNotificationList((current) => [notification, ...current]);
    setComposing(false);
    notify({
      message:
        draft.status === "Sent"
          ? "Message queued."
          : draft.status === "Scheduled"
            ? "Message scheduled."
            : "Draft saved.",
      description: `${notification.title} · ${notification.id} — held in this browser only, nothing was really sent.`,
    });
  };

  const sendNotification = (target: NotificationMessage) => {
    setNotificationList((current) =>
      current.map((notification) =>
        notification.id === target.id ? { ...notification, status: "Sent", sentAt: REFERENCE_DATE } : notification,
      ),
    );
    setSelected(null);
    notify({ message: "Message sent.", description: `${target.title} was pushed to ${target.audience} — front-end only.` });
  };

  const exportCsv = () => {
    downloadCsv("noor-mosque-notifications.csv", filtered, [
      { header: "ID", value: (notification) => notification.id },
      { header: "Title", value: (notification) => notification.title },
      { header: "Channel", value: (notification) => notification.channel },
      { header: "Audience", value: (notification) => notification.audience },
      { header: "Status", value: (notification) => notification.status },
      { header: "Sender", value: (notification) => notification.sender },
      { header: "Sent", value: (notification) => notification.sentAt },
      { header: "Recipients", value: (notification) => String(notification.recipients) },
      { header: "Delivered", value: (notification) => String(notification.delivered) },
      { header: "Opened", value: (notification) => String(notification.opened) },
    ]);
    notify({
      tone: "info",
      message: "Export downloaded.",
      description: `${formatCount(filtered.length)} rows, matching the filters currently applied.`,
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
      cell: (notification) =>
        notification.sentAt ? (
          <span className="whitespace-nowrap tabular-nums text-[#4d564f]">{formatDayMonth(notification.sentAt)}</span>
        ) : (
          <span className="text-[#a3a89f]">—</span>
        ),
      sortValue: (notification) => notification.sentAt,
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
            onChange: setSearch,
            placeholder: "Search messages…",
            label: "Search notifications by title, message, sender or ID",
          }}
          filters={filters}
          activeCount={activeFilterCount}
          onReset={resetFilters}
        />

        <DataTable
          rows={filtered}
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
      </Panel>

      {selected ? (
        <NotificationDetailDrawer notification={selected} onClose={() => setSelected(null)} onSend={sendNotification} />
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
}: {
  notification: NotificationMessage;
  onClose: () => void;
  onSend: (notification: NotificationMessage) => void;
}) {
  const isSent = notification.status === "Sent";
  const canSend = notification.status === "Draft" || notification.status === "Scheduled";
  const deliveredRate = rate(notification.delivered, notification.recipients);
  const openRate = rate(notification.opened, notification.delivered);

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
            {canSend ? (
              <Button size="sm" icon="bell" onClick={() => onSend(notification)}>
                Send now
              </Button>
            ) : null}
          </Can>
          <Button size="sm" variant="ghost" onClick={onClose} className="ml-auto">
            Close
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {notification.status === "Scheduled" ? (
          <InlineNotice tone="info" icon="clock">
            Scheduled to send on {formatLongDate(notification.sentAt)}. It hasn&rsquo;t gone out yet.
          </InlineNotice>
        ) : null}
        {notification.status === "Draft" ? (
          <InlineNotice tone="neutral" icon="pencil">
            Draft — not sent. Delivery figures appear once it goes out.
          </InlineNotice>
        ) : null}
        {notification.status === "Failed" ? (
          <InlineNotice tone="gold" icon="alert">
            This send failed — no messages were delivered. Check the {notification.channel} settings and try again.
          </InlineNotice>
        ) : null}

        {isSent ? (
          <DetailStats
            items={[
              { label: "Recipients", value: formatCount(notification.recipients) },
              { label: "Delivered", value: formatCount(notification.delivered), hint: `${deliveredRate}% delivered` },
              {
                label: "Opened",
                value: formatCount(notification.opened),
                hint: notification.channel === "SMS" ? "No open tracking" : `${openRate}% open rate`,
              },
            ]}
          />
        ) : null}

        <DetailSection title="Message">
          <p className="whitespace-pre-line text-[13px] leading-6 text-[#4d564f]">{notification.message}</p>
        </DetailSection>

        <DetailSection title="Details">
          <DetailGrid>
            <DetailField label="Sender" value={notification.sender} />
            <DetailField label="Channel" value={<NotificationChannelChip channel={notification.channel} />} />
            <DetailField label="Audience" value={notification.audience} />
            <DetailField label="Status" value={<NotificationStatusBadge status={notification.status} />} />
            <DetailField
              label={notification.status === "Scheduled" ? "Goes out" : "Sent"}
              value={notification.sentAt ? formatLongDate(notification.sentAt) : "Not sent"}
            />
            <DetailField
              label="Recipients"
              value={isSent ? formatCount(notification.recipients) : "—"}
            />
          </DetailGrid>
        </DetailSection>
      </div>
    </DetailDrawer>
  );
}

/* -------------------------------------------------------------------------- *
 * Compose
 * -------------------------------------------------------------------------- */

function ComposeNotificationModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (draft: NotificationDraft) => void;
}) {
  const [draft, setDraft] = useState<NotificationDraft>(emptyDraft);
  const [submitted, setSubmitted] = useState(false);

  const set = <Key extends keyof NotificationDraft>(key: Key, value: NotificationDraft[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const errors = {
    title: draft.title.trim().length === 0 ? "Give the message a title." : undefined,
    message: draft.message.trim().length === 0 ? "Write the message the community will read." : undefined,
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
      title="Compose message"
      description="Reach a segment of the community by push, email, SMS or in-app. Save as a draft, schedule it, or send in this preview."
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button icon="check" onClick={submit}>
            Save Message
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
        <TextAreaField
          label="Message"
          required
          rows={4}
          value={draft.message}
          onChange={(event) => set("message", event.target.value)}
          error={show("message")}
          hint="Keep it short — this is a notification, not an article."
          containerClassName="sm:col-span-2"
        />
        <SelectField
          label="Channel"
          required
          value={draft.channel}
          options={[...notificationChannels]}
          onChange={(event) => set("channel", event.target.value as NotificationDraft["channel"])}
        />
        <SelectField
          label="Audience"
          required
          value={draft.audience}
          options={[...notificationAudiences]}
          onChange={(event) => set("audience", event.target.value as NotificationDraft["audience"])}
        />
        <SelectField
          label="Status"
          required
          value={draft.status}
          options={[
            { value: "Draft", label: "Save as draft" },
            { value: "Scheduled", label: "Schedule" },
            { value: "Sent", label: "Send now" },
          ]}
          onChange={(event) => set("status", event.target.value as NotificationDraft["status"])}
          containerClassName="sm:col-span-2"
        />
      </div>

      {submitted && !valid ? (
        <InlineNotice className="mt-4" tone="neutral" icon="alert">
          Some details still need attention — see the messages above.
        </InlineNotice>
      ) : (
        <InlineNotice className="mt-4" tone="gold">
          Front-end preview — the message is added to this browser session only. Nothing is really sent.
        </InlineNotice>
      )}
    </Modal>
  );
}
