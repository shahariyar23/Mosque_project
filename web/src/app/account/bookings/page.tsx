"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Ticket,
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Search,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  X,
  FileText,
  Phone,
  Mail,
  Building2,
  Eye,
  Loader2,
  Calendar,
  Sparkles,
  ArrowRight,
  Info,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import type { SessionUser } from "@/lib/permissions";
import { useToast } from "@/components/ui/toast";
import {
  fetchBookings,
  createBooking,
  updateBooking,
  updateBookingStatus,
  type CreateBookingInput,
} from "@/services/bookingService";
import { fetchServices } from "@/services/serviceService";
import type { Booking, BookingStatus, Service } from "@/lib/mosque/types";

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function getStatusBadge(status: BookingStatus) {
  switch (status) {
    case "Confirmed":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
          <CheckCircle2 className="h-3 w-3" />
          Confirmed
        </span>
      );
    case "Pending":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
          <Clock className="h-3 w-3" />
          Pending Approval
        </span>
      );
    case "Completed":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20">
          <CheckCircle2 className="h-3 w-3" />
          Completed
        </span>
      );
    case "Cancelled":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">
          <XCircle className="h-3 w-3" />
          Cancelled
        </span>
      );
    case "Declined":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700 ring-1 ring-inset ring-gray-600/20">
          <XCircle className="h-3 w-3" />
          Declined
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
          {status}
        </span>
      );
  }
}

export default function AccountBookingsPage() {
  const { session } = useAuth();
  const { notify } = useToast();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "upcoming" | "past">("upcoming");

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Form States
  const [submitting, setSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    serviceId: "",
    requesterName: "",
    requesterPhone: "",
    requesterEmail: "",
    scheduledDate: "",
    scheduledTime: "14:00",
    location: "Main prayer hall",
    partySize: 1,
    notes: "",
  });

  const [rescheduleForm, setRescheduleForm] = useState({
    scheduledDate: "",
    scheduledTime: "14:00",
    notes: "",
  });

  const [cancelReason, setCancelReason] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [bookingsData, servicesData] = await Promise.all([
        fetchBookings({ all: true }),
        fetchServices().catch(() => ({ rows: [], total: 0, page: 1, pageSize: 10, pageCount: 1 })),
      ]);
      // Both list services return pagination envelopes, including when `all`
      // is requested. Store only their row arrays in this page's array state.
      setBookings(bookingsData.rows);
      setServices(servicesData.rows);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    const defaultService = services.length > 0
      ? services.find((s) => s.status === "Active") || services[0]
      : undefined;

    const todayStr = new Date().toISOString().slice(0, 10);
    const userRecord = session?.user as (SessionUser & { phone?: string; email?: string }) | undefined;

    setCreateForm({
      serviceId: defaultService ? defaultService.id : "",
      requesterName: session?.user.name || "",
      requesterPhone: userRecord?.phone || "",
      requesterEmail: userRecord?.email || "",
      scheduledDate: todayStr,
      scheduledTime: "14:00",
      location: defaultService?.location || "Main prayer hall",
      partySize: 1,
      notes: "",
    });
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.serviceId) {
      notify({ tone: "danger", message: "Validation error", description: "Please choose a service." });
      return;
    }
    if (!createForm.requesterName.trim() || !createForm.requesterPhone.trim()) {
      notify({ tone: "danger", message: "Validation error", description: "Name and phone number are required." });
      return;
    }
    if (!createForm.scheduledDate) {
      notify({ tone: "danger", message: "Validation error", description: "Please pick a scheduled date." });
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateBookingInput = {
        serviceId: createForm.serviceId,
        userId: session?.user.id,
        requesterName: createForm.requesterName.trim(),
        requesterPhone: createForm.requesterPhone.trim(),
        requesterEmail: createForm.requesterEmail.trim() || undefined,
        scheduledDate: createForm.scheduledDate,
        scheduledTime: createForm.scheduledTime || undefined,
        location: createForm.location.trim() || "Main prayer hall",
        partySize: Number(createForm.partySize) || 0,
        notes: createForm.notes.trim() || undefined,
      };

      const created = await createBooking(payload);
      setBookings((prev) => [created, ...prev]);
      setIsCreateOpen(false);
      notify({
        tone: "success",
        message: "Booking request submitted",
        description: `Your request for ${created.serviceName} has been recorded for ${formatDisplayDate(created.scheduledDate)}.`,
      });
    } catch (err: unknown) {
      notify({
        tone: "danger",
        message: "Booking failed",
        description: err instanceof Error ? err.message : "Could not submit booking request.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openRescheduleModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setRescheduleForm({
      scheduledDate: booking.scheduledDate,
      scheduledTime: booking.scheduledTime || "14:00",
      notes: booking.notes || "",
    });
    setIsRescheduleOpen(true);
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    if (!rescheduleForm.scheduledDate) {
      notify({ tone: "danger", message: "Validation error", description: "Please select a new date." });
      return;
    }

    setSubmitting(true);
    try {
      const updated = await updateBooking(selectedBooking.id, {
        scheduledDate: rescheduleForm.scheduledDate,
        scheduledTime: rescheduleForm.scheduledTime || undefined,
        notes: rescheduleForm.notes ? `${rescheduleForm.notes} (Rescheduled)` : undefined,
      });

      setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      setIsRescheduleOpen(false);
      notify({
        tone: "success",
        message: "Booking rescheduled",
        description: `Your appointment has been moved to ${formatDisplayDate(updated.scheduledDate)}.`,
      });
    } catch (err: unknown) {
      notify({
        tone: "danger",
        message: "Reschedule failed",
        description: err instanceof Error ? err.message : "Could not update the booking date.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openCancelModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setCancelReason("");
    setIsCancelOpen(true);
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;

    setSubmitting(true);
    try {
      const updated = await updateBookingStatus(selectedBooking.id, {
        status: "cancelled",
        reason: cancelReason.trim() || "Cancelled by user request.",
      });

      setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      setIsCancelOpen(false);
      notify({
        tone: "info",
        message: "Booking cancelled",
        description: `Your booking for ${selectedBooking.serviceName} has been cancelled.`,
      });
    } catch (err: unknown) {
      notify({
        tone: "danger",
        message: "Cancellation failed",
        description: err instanceof Error ? err.message : "Could not cancel booking.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openDetailsModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsDetailsOpen(true);
  };

  const upcomingBookings = useMemo(
    () => bookings.filter((b) => b.status === "Pending" || b.status === "Confirmed"),
    [bookings],
  );

  const pastBookings = useMemo(
    () => bookings.filter((b) => b.status === "Completed" || b.status === "Cancelled" || b.status === "Declined"),
    [bookings],
  );

  const filteredBookings = useMemo(() => {
    let list = bookings;
    if (activeTab === "upcoming") list = upcomingBookings;
    if (activeTab === "past") list = pastBookings;

    if (!search.trim()) return list;

    const query = search.toLowerCase();
    return list.filter(
      (b) =>
        b.serviceName.toLowerCase().includes(query) ||
        b.location.toLowerCase().includes(query) ||
        b.id.toLowerCase().includes(query) ||
        b.category.toLowerCase().includes(query) ||
        (b.notes && b.notes.toLowerCase().includes(query)),
    );
  }, [bookings, upcomingBookings, pastBookings, activeTab, search]);

  return (
    <div className="flex flex-col gap-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#17211d] tracking-tight">
            My Service Bookings
          </h1>
          <p className="mt-1 text-sm text-[#69726d]">
            Schedule, manage, and track your appointments for official mosque community services.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openCreateModal()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#073a2d] px-4 py-2.5 text-sm font-semibold !text-white shadow-sm hover:bg-[#0b503f] transition-all"
        >
          <Plus className="h-4 w-4 text-[#c79a45]" />
          <span className="!text-white font-semibold">Book a Service</span>
        </button>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5e2d8] pb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("upcoming")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "upcoming"
                ? "bg-[#073a2d] !text-white"
                : "bg-white text-[#69726d] hover:bg-[#faf9f4] border border-[#e5e2d8]"
            }`}
          >
            <span className={activeTab === "upcoming" ? "!text-white" : ""}>
              Upcoming & Pending ({upcomingBookings.length})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("past")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "past"
                ? "bg-[#073a2d] !text-white"
                : "bg-white text-[#69726d] hover:bg-[#faf9f4] border border-[#e5e2d8]"
            }`}
          >
            <span className={activeTab === "past" ? "!text-white" : ""}>
              Completed & Past ({pastBookings.length})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "all"
                ? "bg-[#073a2d] !text-white"
                : "bg-white text-[#69726d] hover:bg-[#faf9f4] border border-[#e5e2d8]"
            }`}
          >
            <span className={activeTab === "all" ? "!text-white" : ""}>
              All ({bookings.length})
            </span>
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8d948f]" />
          <input
            type="text"
            placeholder="Search bookings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[#e5e2d8] bg-white py-1.5 pl-9 pr-4 text-xs text-[#17211d] placeholder:text-[#8d948f] focus:border-[#073a2d] focus:outline-none focus:ring-1 focus:ring-[#073a2d]"
          />
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="animate-pulse rounded-2xl border border-[#e5e2d8] bg-white p-5 shadow-sm flex flex-col gap-3"
            >
              <div className="h-4 w-1/3 rounded bg-neutral-200" />
              <div className="h-6 w-3/4 rounded bg-neutral-200" />
              <div className="h-4 w-1/2 rounded bg-neutral-200" />
              <div className="mt-4 h-8 rounded bg-neutral-100" />
            </div>
          ))}
        </div>
      )}

      {/* Error Notice */}
      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50/70 p-5 text-sm text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => loadData()}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-800 underline hover:no-underline"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </button>
        </div>
      )}

      {/* Bookings List Cards */}
      {!loading && !error && filteredBookings.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBookings.map((booking) => {
            const isInactive = booking.status === "Cancelled" || booking.status === "Declined" || booking.status === "Completed";

            return (
              <div
                key={booking.id}
                className="flex flex-col justify-between rounded-2xl border border-[#e5e2d8] bg-white p-5 shadow-sm hover:border-[#c79a45]/40 hover:shadow-md transition-all group"
              >
                <div>
                  {/* Top Bar: Service Category & Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#faf9f4] px-2 py-0.5 text-[11px] font-semibold text-[#0d4d3b] border border-[#e5e2d8]">
                      <Sparkles className="h-3 w-3 text-[#c79a45]" />
                      {booking.category}
                    </span>
                    {getStatusBadge(booking.status)}
                  </div>

                  {/* Service Title */}
                  <h3 className="font-bold text-[#17211d] text-base group-hover:text-[#073a2d] transition-colors line-clamp-1">
                    {booking.serviceName}
                  </h3>
                  <p className="text-[11px] text-[#8d948f] font-mono mt-0.5">
                    Ref #{booking.id.slice(0, 8).toUpperCase()}
                  </p>

                  {/* Metadata List */}
                  <div className="mt-4 space-y-2 text-xs text-[#69726d]">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-[#c79a45] shrink-0" />
                      <span className="font-medium text-[#17211d]">
                        {formatDisplayDate(booking.scheduledDate)}
                      </span>
                      {booking.scheduledTime && (
                        <span className="text-[#8d948f] flex items-center gap-1">
                          <Clock className="h-3 w-3 inline" />
                          {booking.scheduledTime}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[#c79a45] shrink-0" />
                      <span className="truncate">{booking.location}</span>
                    </div>

                    {booking.partySize > 0 && (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-[#c79a45] shrink-0" />
                        <span>Party size: {booking.partySize} persons</span>
                      </div>
                    )}

                    {booking.notes && (
                      <div className="mt-2 rounded-lg bg-[#faf9f4] p-2.5 text-[11px] text-[#69726d] line-clamp-2 border border-[#f0ede4]">
                        <span className="font-semibold text-[#17211d]">Notes: </span>
                        {booking.notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-5 border-t border-[#e5e2d8] pt-4 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openDetailsModal(booking)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#073a2d] hover:underline"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>View Details</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {!isInactive && (
                      <>
                        <button
                          type="button"
                          onClick={() => openRescheduleModal(booking)}
                          className="rounded-lg border border-[#e5e2d8] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#17211d] hover:bg-[#faf9f4] transition-colors"
                        >
                          Reschedule
                        </button>
                        <button
                          type="button"
                          onClick={() => openCancelModal(booking)}
                          className="rounded-lg border border-red-200 bg-red-50/50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredBookings.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#d2ccc0] bg-white p-10 text-center flex flex-col items-center justify-center max-w-md mx-auto shadow-sm">
          <div className="h-14 w-14 rounded-full bg-[#faf9f4] flex items-center justify-center text-[#0d4d3b] mb-4">
            <Calendar className="h-7 w-7 text-[#c79a45]" />
          </div>
          <h3 className="font-bold text-lg text-[#17211d]">No bookings found</h3>
          <p className="text-xs text-[#69726d] mt-1 mb-6">
            {search
              ? "No booking matches your search query. Try clearing filters."
              : activeTab === "upcoming"
              ? "You do not have any upcoming bookings at the moment."
              : "You haven't made any booking requests yet."}
          </p>
          <button
            type="button"
            onClick={() => openCreateModal()}
            className="inline-flex items-center gap-2 rounded-lg bg-[#073a2d] px-4 py-2.5 text-xs font-semibold !text-white hover:bg-[#0b503f] transition-all shadow-sm"
          >
            <Plus className="h-4 w-4 text-[#c79a45]" />
            <span className="!text-white">Book a Mosque Service</span>
          </button>
        </div>
      )}

      {/* ==================================================================== *
       * MODAL 1: CREATE BOOKING REQUEST
       * ==================================================================== */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#e5e2d8] pb-3 mb-4">
              <div>
                <h3 className="font-bold text-base text-[#17211d]">Book a Mosque Service</h3>
                <p className="text-[11px] text-[#69726d]">Request an appointment with our Imam or mosque staff.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg p-1 text-[#69726d] hover:bg-[#faf9f4]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              {/* Service Selection */}
              <div>
                <label className="block font-semibold text-[#17211d] mb-1">Select Service *</label>
                <select
                  value={createForm.serviceId}
                  onChange={(e) => {
                    const sel = services.find((s) => s.id === e.target.value);
                    setCreateForm((prev) => ({
                      ...prev,
                      serviceId: e.target.value,
                      location: sel?.location || prev.location,
                    }));
                  }}
                  className="w-full rounded-lg border border-[#e5e2d8] bg-white p-2.5 text-[#17211d] focus:border-[#073a2d] focus:outline-none"
                  required
                >
                  <option value="" disabled>
                    -- Choose service --
                  </option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id} disabled={s.status !== "Active"}>
                      {s.name} ({s.category}) {s.fee ? `• $${s.fee}` : "• Free"} {s.status !== "Active" ? "(Unavailable)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Requester Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#17211d] mb-1">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={createForm.requesterName}
                    onChange={(e) => setCreateForm({ ...createForm, requesterName: e.target.value })}
                    className="w-full rounded-lg border border-[#e5e2d8] p-2.5 text-[#17211d] focus:border-[#073a2d] focus:outline-none"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#17211d] mb-1">Contact Phone *</label>
                  <input
                    type="tel"
                    required
                    value={createForm.requesterPhone}
                    onChange={(e) => setCreateForm({ ...createForm, requesterPhone: e.target.value })}
                    className="w-full rounded-lg border border-[#e5e2d8] p-2.5 text-[#17211d] focus:border-[#073a2d] focus:outline-none"
                    placeholder="+1 555-0199"
                  />
                </div>
              </div>

              {/* Email & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#17211d] mb-1">Email Address</label>
                  <input
                    type="email"
                    value={createForm.requesterEmail}
                    onChange={(e) => setCreateForm({ ...createForm, requesterEmail: e.target.value })}
                    className="w-full rounded-lg border border-[#e5e2d8] p-2.5 text-[#17211d] focus:border-[#073a2d] focus:outline-none"
                    placeholder="you@domain.com"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#17211d] mb-1">Preferred Location</label>
                  <input
                    type="text"
                    value={createForm.location}
                    onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                    className="w-full rounded-lg border border-[#e5e2d8] p-2.5 text-[#17211d] focus:border-[#073a2d] focus:outline-none"
                    placeholder="Main prayer hall"
                  />
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#17211d] mb-1">Appointment Date *</label>
                  <input
                    type="date"
                    required
                    value={createForm.scheduledDate}
                    onChange={(e) => setCreateForm({ ...createForm, scheduledDate: e.target.value })}
                    className="w-full rounded-lg border border-[#e5e2d8] p-2.5 text-[#17211d] focus:border-[#073a2d] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#17211d] mb-1">Preferred Time</label>
                  <input
                    type="time"
                    value={createForm.scheduledTime}
                    onChange={(e) => setCreateForm({ ...createForm, scheduledTime: e.target.value })}
                    className="w-full rounded-lg border border-[#e5e2d8] p-2.5 text-[#17211d] focus:border-[#073a2d] focus:outline-none"
                  />
                </div>
              </div>

              {/* Party Size */}
              <div>
                <label className="block font-semibold text-[#17211d] mb-1">Estimated Party Size</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={createForm.partySize}
                  onChange={(e) => setCreateForm({ ...createForm, partySize: Number(e.target.value) || 1 })}
                  className="w-full rounded-lg border border-[#e5e2d8] p-2.5 text-[#17211d] focus:border-[#073a2d] focus:outline-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-[#17211d] mb-1">Additional Notes / Requests</label>
                <textarea
                  rows={3}
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  placeholder="Provide any specific details or preferences for this booking request..."
                  className="w-full rounded-lg border border-[#e5e2d8] p-2.5 text-[#17211d] focus:border-[#073a2d] focus:outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-[#e5e2d8] pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-lg border border-[#e5e2d8] bg-white px-4 py-2 text-xs font-semibold text-[#17211d] hover:bg-[#faf9f4]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#073a2d] px-4 py-2 text-xs font-semibold !text-white hover:bg-[#0b503f] disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />}
                  <span className="!text-white">Submit Booking</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== *
       * MODAL 2: RESCHEDULE APPOINTMENT
       * ==================================================================== */}
      {isRescheduleOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e5e2d8] pb-3 mb-4">
              <div>
                <h3 className="font-bold text-base text-[#17211d]">Reschedule Appointment</h3>
                <p className="text-[11px] text-[#69726d]">Choose a new date and time for {selectedBooking.serviceName}.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsRescheduleOpen(false)}
                className="rounded-lg p-1 text-[#69726d] hover:bg-[#faf9f4]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRescheduleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#17211d] mb-1">New Date *</label>
                <input
                  type="date"
                  required
                  value={rescheduleForm.scheduledDate}
                  onChange={(e) => setRescheduleForm({ ...rescheduleForm, scheduledDate: e.target.value })}
                  className="w-full rounded-lg border border-[#e5e2d8] p-2.5 text-[#17211d] focus:border-[#073a2d] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#17211d] mb-1">New Time</label>
                <input
                  type="time"
                  value={rescheduleForm.scheduledTime}
                  onChange={(e) => setRescheduleForm({ ...rescheduleForm, scheduledTime: e.target.value })}
                  className="w-full rounded-lg border border-[#e5e2d8] p-2.5 text-[#17211d] focus:border-[#073a2d] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#17211d] mb-1">Reason / Note</label>
                <textarea
                  rows={2}
                  value={rescheduleForm.notes}
                  onChange={(e) => setRescheduleForm({ ...rescheduleForm, notes: e.target.value })}
                  placeholder="Optional note about the reschedule..."
                  className="w-full rounded-lg border border-[#e5e2d8] p-2.5 text-[#17211d] focus:border-[#073a2d] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-[#e5e2d8] pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsRescheduleOpen(false)}
                  className="rounded-lg border border-[#e5e2d8] bg-white px-4 py-2 text-xs font-semibold text-[#17211d] hover:bg-[#faf9f4]"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#073a2d] px-4 py-2 text-xs font-semibold !text-white hover:bg-[#0b503f] disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />}
                  <span className="!text-white">Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== *
       * MODAL 3: CANCEL BOOKING
       * ==================================================================== */}
      {isCancelOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e5e2d8] pb-3 mb-4">
              <div>
                <h3 className="font-bold text-base text-red-700">Cancel Booking</h3>
                <p className="text-[11px] text-[#69726d]">Are you sure you want to cancel this booking?</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCancelOpen(false)}
                className="rounded-lg p-1 text-[#69726d] hover:bg-[#faf9f4]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCancelSubmit} className="space-y-4 text-xs">
              <p className="text-[#17211d]">
                This will cancel your request for <strong>{selectedBooking.serviceName}</strong> scheduled on{" "}
                <strong>{formatDisplayDate(selectedBooking.scheduledDate)}</strong>.
              </p>

              <div>
                <label className="block font-semibold text-[#17211d] mb-1">Reason for cancellation</label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g., Schedule conflict, no longer needed..."
                  className="w-full rounded-lg border border-[#e5e2d8] p-2.5 text-[#17211d] focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-[#e5e2d8] pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsCancelOpen(false)}
                  className="rounded-lg border border-[#e5e2d8] bg-white px-4 py-2 text-xs font-semibold text-[#17211d] hover:bg-[#faf9f4]"
                >
                  Keep Booking
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold !text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />}
                  <span className="!text-white">Confirm Cancellation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== *
       * MODAL 4: VIEW DETAILS
       * ==================================================================== */}
      {isDetailsOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-[#e5e2d8] pb-3 mb-4">
              <div>
                <h3 className="font-bold text-base text-[#17211d]">Booking Details</h3>
                <p className="text-[11px] text-[#69726d] font-mono">
                  Ref #{selectedBooking.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailsOpen(false)}
                className="rounded-lg p-1 text-[#69726d] hover:bg-[#faf9f4]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-[#faf9f4] p-3 border border-[#e5e2d8]">
                <div>
                  <p className="text-[11px] text-[#69726d]">Service</p>
                  <p className="font-bold text-sm text-[#17211d]">{selectedBooking.serviceName}</p>
                </div>
                <div>{getStatusBadge(selectedBooking.status)}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-[#e5e2d8] p-3">
                  <p className="text-[11px] text-[#69726d]">Date & Time</p>
                  <p className="font-semibold text-[#17211d] mt-0.5">
                    {formatDisplayDate(selectedBooking.scheduledDate)}{" "}
                    {selectedBooking.scheduledTime ? `@ ${selectedBooking.scheduledTime}` : ""}
                  </p>
                </div>
                <div className="rounded-lg border border-[#e5e2d8] p-3">
                  <p className="text-[11px] text-[#69726d]">Location</p>
                  <p className="font-semibold text-[#17211d] mt-0.5 truncate">
                    {selectedBooking.location}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-[#e5e2d8] p-3">
                  <p className="text-[11px] text-[#69726d]">Assigned Staff / Imam</p>
                  <p className="font-semibold text-[#17211d] mt-0.5">
                    {selectedBooking.assignedTo || "Mosque Administration"}
                  </p>
                </div>
                <div className="rounded-lg border border-[#e5e2d8] p-3">
                  <p className="text-[11px] text-[#69726d]">Fee / Contribution</p>
                  <p className="font-semibold text-[#17211d] mt-0.5">
                    {selectedBooking.fee ? `$${selectedBooking.fee}` : "Free / Included"}
                  </p>
                </div>
              </div>

              {selectedBooking.partySize > 0 && (
                <div className="rounded-lg border border-[#e5e2d8] p-3">
                  <p className="text-[11px] text-[#69726d]">Party Size</p>
                  <p className="font-semibold text-[#17211d] mt-0.5">
                    {selectedBooking.partySize} persons
                  </p>
                </div>
              )}

              {selectedBooking.notes && (
                <div className="rounded-lg border border-[#e5e2d8] p-3">
                  <p className="text-[11px] text-[#69726d]">Notes</p>
                  <p className="text-[#17211d] mt-0.5 whitespace-pre-wrap">{selectedBooking.notes}</p>
                </div>
              )}

              {selectedBooking.submittedAt && (
                <p className="text-[11px] text-[#8d948f] text-right">
                  Submitted on {formatDisplayDate(selectedBooking.submittedAt)}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[#e5e2d8] pt-4 mt-6">
              <button
                type="button"
                onClick={() => setIsDetailsOpen(false)}
                className="rounded-lg border border-[#e5e2d8] bg-white px-4 py-2 text-xs font-semibold text-[#17211d] hover:bg-[#faf9f4]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
