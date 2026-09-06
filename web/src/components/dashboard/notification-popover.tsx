"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/finance/ui/icon";
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  type InAppNotification,
} from "@/services/notificationsService";

export function NotificationPopover() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const loadUnreadCount = async () => {
    try {
      const res = await fetchUnreadCount();
      setUnreadCount(res?.unreadCount || 0);
    } catch {
      // Graceful fallback
    }
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetchNotifications({ limit: 10 });
      setNotifications(res.rows || []);
      if (typeof res.meta?.unreadCount === "number") {
        setUnreadCount(res.meta.unreadCount);
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000); // Polling every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (open) {
      loadNotifications();
    }
  }, [open]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleNotificationClick = async (notif: InAppNotification) => {
    if (!notif.isRead) {
      try {
        await markNotificationRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // Continue navigation anyway
      }
    }
    setOpen(false);
    if (notif.actionUrl) {
      router.push(notif.actionUrl);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="relative grid h-10 w-10 place-items-center rounded-md border border-[#deddd3] bg-white text-[#4d564f] transition-colors hover:border-[#0d4d3b] hover:text-[#0d4d3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
      >
        <Icon name="bell" size={17} />
        {unreadCount > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#c79a45] px-1 text-[10px] font-bold text-white shadow-sm"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-[#deddd3] bg-white shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#e5e4da] bg-[#fbfbf9] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#17211d]">Notifications</span>
              {unreadCount > 0 ? (
                <span className="rounded-full bg-[#0d4d3b] px-2 py-0.5 text-[10px] font-bold text-white">
                  {unreadCount} new
                </span>
              ) : null}
            </div>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-[#0d4d3b] hover:underline"
              >
                Mark all read
              </button>
            ) : null}
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-[#f0efe6]">
            {loading ? (
              <div className="p-6 text-center text-xs text-[#8b938d]">Loading notifications…</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Icon name="bell" size={24} className="mx-auto text-[#8b938d]/60 mb-2" />
                <p className="text-xs font-semibold text-[#17211d]">No notifications</p>
                <p className="text-[11px] text-[#8b938d] mt-0.5">You're all caught up!</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`flex cursor-pointer gap-3 p-3.5 transition-colors hover:bg-[#faf9f4] ${
                    !notif.isRead ? "bg-[#0d4d3b]/5" : "bg-white"
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    <span
                      className={`grid h-7 w-7 place-items-center rounded-full text-xs ${
                        notif.category === "jumuah" || notif.type === "jummah_collection"
                          ? "bg-[#0d4d3b]/10 text-[#0d4d3b]"
                          : notif.category === "finance"
                          ? "bg-[#c79a45]/15 text-[#a17726]"
                          : notif.category === "workflow"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-[#ecebe1] text-[#4d564f]"
                      }`}
                    >
                      <Icon
                        name={
                          notif.type === "jummah_collection"
                            ? "calendar"
                            : notif.type === "receipt_ready" || notif.category === "finance"
                            ? "wallet"
                            : "bell"
                        }
                        size={13}
                      />
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`text-xs truncate ${
                          !notif.isRead ? "font-bold text-[#17211d]" : "font-semibold text-[#3d4640]"
                        }`}
                      >
                        {notif.title}
                      </p>
                      {!notif.isRead ? (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#c79a45]" />
                      ) : null}
                    </div>
                    <p className="text-[11px] text-[#69726d] line-clamp-2 mt-0.5">{notif.message}</p>
                    <span className="text-[10px] text-[#9aa19c] block mt-1">
                      {notif.createdAt
                        ? `${new Date(notif.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })} · ${new Date(notif.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}`
                        : ""}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[#e5e4da] bg-[#fbfbf9] p-2.5 text-center">
            <Link
              href="/account/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-[#0d4d3b] hover:underline"
            >
              View all notifications →
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
