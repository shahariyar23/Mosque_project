"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CalendarDays, CheckCircle2, HandCoins, Info, Ticket } from "lucide-react";
import {
  deleteNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type InAppNotification,
} from "@/services/notificationsService";

export default function NotificationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("All");
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchNotifications({
        limit: 50,
        category: activeTab === "All" ? undefined : activeTab.toLowerCase(),
      });
      setNotifications(res.rows || []);
      setUnreadCount(res.meta?.unreadCount || 0);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleMarkRead = async (id: string, actionUrl?: string | null) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (actionUrl) {
        router.push(actionUrl);
      }
    } catch {
      // Continue
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Continue
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // Continue
    }
  };

  const getIcon = (category: string, type: string) => {
    if (category === "jumuah" || type === "jummah_collection") {
      return <CalendarDays className="h-5 w-5 text-[#0d4d3b]" />;
    }
    switch (category) {
      case "finance":
      case "donations":
        return <HandCoins className="h-5 w-5 text-[#c79a45]" />;
      case "events":
        return <CalendarDays className="h-5 w-5 text-blue-600" />;
      case "bookings":
        return <Ticket className="h-5 w-5 text-purple-600" />;
      case "announcements":
        return <Info className="h-5 w-5 text-amber-600" />;
      default:
        return <Bell className="h-5 w-5 text-[#8d948f]" />;
    }
  };

  const getIconBg = (category: string, type: string) => {
    if (category === "jumuah" || type === "jummah_collection") {
      return "bg-[#0d4d3b]/10";
    }
    switch (category) {
      case "finance":
      case "donations":
        return "bg-amber-50";
      case "events":
        return "bg-blue-50";
      case "bookings":
        return "bg-purple-50";
      case "announcements":
        return "bg-amber-50";
      default:
        return "bg-gray-50";
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#17211d]">Notifications</h1>
          <p className="mt-1 text-sm text-[#69726d]">
            Stay updated with your mosque activities, collections, and financial receipts.
          </p>
        </div>

        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="flex items-center gap-2 rounded-md bg-white border border-[#e5e2d8] px-3 py-1.5 text-sm font-medium text-[#17211d] hover:bg-[#faf9f4] shrink-0 self-start sm:self-auto"
          >
            <CheckCircle2 className="h-4 w-4 text-[#8d948f]" />
            Mark all as read
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {["All", "Finance", "Jumuah", "Announcements", "Events", "Bookings", "System"].map(
            (tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-[#0d4d3b] text-white"
                    : "bg-white text-[#69726d] border border-[#e5e2d8] hover:bg-[#faf9f4]"
                }`}
              >
                {tab}
              </button>
            ),
          )}
        </div>

        {loading ? (
          <div className="rounded-xl border border-[#e5e2d8] bg-white p-12 text-center text-sm text-[#8b938d]">
            Loading your notifications…
          </div>
        ) : notifications.length > 0 ? (
          <div className="flex flex-col rounded-xl border border-[#e5e2d8] bg-white shadow-sm overflow-hidden divide-y divide-[#e5e2d8]">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex gap-4 p-5 sm:p-6 transition-colors hover:bg-[#faf9f4]/50 ${
                  !notification.isRead ? "bg-[#faf9f4]" : "bg-white"
                }`}
              >
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${getIconBg(
                      notification.category,
                      notification.type,
                    )}`}
                  >
                    {getIcon(notification.category, notification.type)}
                  </div>
                  {!notification.isRead && (
                    <span className="h-2 w-2 rounded-full bg-[#c79a45]" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1">
                    <h3
                      className={`text-base ${
                        !notification.isRead
                          ? "font-semibold text-[#17211d]"
                          : "font-medium text-[#17211d]"
                      }`}
                    >
                      {notification.title}
                    </h3>
                    <span className="text-xs text-[#8d948f] shrink-0">
                      {new Date(notification.createdAt).toLocaleDateString()}{" "}
                      {new Date(notification.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p
                    className={`text-sm ${
                      !notification.isRead ? "text-[#17211d]" : "text-[#69726d]"
                    }`}
                  >
                    {notification.message}
                  </p>

                  <div className="mt-3 flex items-center gap-4 text-xs font-medium">
                    {notification.actionUrl ? (
                      <Link
                        href={notification.actionUrl}
                        onClick={() => handleMarkRead(notification.id)}
                        className="text-[#0d4d3b] hover:underline"
                      >
                        View details →
                      </Link>
                    ) : null}
                    {!notification.isRead ? (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(notification.id)}
                        className="text-[#69726d] hover:text-[#17211d] hover:underline"
                      >
                        Mark as read
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => handleDelete(notification.id)}
                      className="text-[#a13228] hover:underline"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-[#e5e2d8] border-dashed bg-[#faf9f4]/50 py-16 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm text-[#0d4d3b] mb-4">
              <Bell className="h-8 w-8" />
            </div>
            <h3 className="font-semibold text-[#17211d]">No notifications</h3>
            <p className="mt-2 text-sm text-[#69726d] max-w-sm">
              You're all caught up! You will be notified when there are updates on your payments,
              Jummah collections, or mosque events.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
