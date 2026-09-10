"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  CalendarDays,
  MapPin,
  Clock,
  User,
  Users,
  ShieldCheck,
  ArrowLeft,
  Sparkles,
  RefreshCw,
  LogIn,
} from "lucide-react";
import {
  verifyTicket,
  checkInTicket,
  type TicketVerificationResult,
} from "@/services/eventService";
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

export default function EventTicketVerifyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const registrationId = resolvedParams.id;

  const [ticket, setTicket] = useState<TicketVerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);

  const loadTicket = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await verifyTicket(registrationId);
      setTicket(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not verify this event ticket. Please check the QR code.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTicket();
  }, [registrationId]);

  const handleCheckIn = async () => {
    if (!ticket || checkingIn) return;
    setCheckingIn(true);
    setCheckInError(null);

    try {
      const res = await checkInTicket(ticket.registrationId);
      if (res.success || res.alreadyCheckedIn) {
        setCheckInSuccess(true);
        setTicket((prev) =>
          prev
            ? {
                ...prev,
                isCheckedIn: true,
                checkedInAt: res.checkedInAt,
                checkedInByName: res.checkedInByName,
                message: res.message,
              }
            : null,
        );
      } else {
        setCheckInError(res.message);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Check-in failed. Please ensure you are logged in as an authorized mosque admin.";
      setCheckInError(msg);
    } finally {
      setCheckingIn(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#faf9f4] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="w-full max-w-lg rounded-3xl border border-[#e5e2d8] bg-white p-8 shadow-md text-center animate-pulse space-y-6">
          <div className="h-14 w-14 rounded-full bg-[#f2f0e8] mx-auto" />
          <div className="h-6 w-3/4 bg-[#f2f0e8] rounded mx-auto" />
          <div className="h-24 bg-[#f2f0e8] rounded-xl" />
          <div className="h-10 bg-[#f2f0e8] rounded-lg" />
        </div>
      </main>
    );
  }

  if (error || !ticket) {
    return (
      <main className="min-h-screen bg-[#faf9f4] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="w-full max-w-md rounded-3xl border border-red-200 bg-white p-8 shadow-lg text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600 mb-4 border border-red-100">
            <XCircle className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold text-red-900">Invalid Event Ticket</h1>
          <p className="mt-2 text-sm text-[#69726d] leading-relaxed">
            {error || "This registration could not be verified or does not exist in our mosque records."}
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={loadTicket}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#073a2d] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0b503f] transition-all"
            >
              <RefreshCw className="h-4 w-4" /> Try Again
            </button>
            <Link
              href="/events"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#e5e2d8] bg-white px-5 py-2.5 text-sm font-semibold text-[#17211d] hover:bg-[#faf9f4] transition-all"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Mosque Events
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const isCheckedIn = ticket.isCheckedIn || checkInSuccess;
  const event = ticket.event;
  const timeFormatted =
    event.timeLabel || (event.endTime ? `${event.startTime} – ${event.endTime}` : event.startTime);

  return (
    <main className="min-h-screen bg-[#031711] py-10 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-white">
      {/* Container Box */}
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-[#c79a45]/30 bg-gradient-to-b from-[#062c22] to-[#041e17] shadow-2xl">
        {/* Top Header */}
        <div className="border-b border-[#c79a45]/20 bg-[#031711]/60 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#f0ca7d]" />
            <span className="text-xs font-bold tracking-widest text-[#f0ca7d] uppercase">
              Mosque Check-In Desk
            </span>
          </div>
          <span className="font-mono text-[11px] text-white/50">
            REG-{ticket.registrationId.slice(0, 8).toUpperCase()}
          </span>
        </div>

        {/* Verification Status Banner */}
        <div className="p-6 text-center border-b border-white/10">
          {isCheckedIn ? (
            <div className="flex flex-col items-center gap-2 animate-fadeIn">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-white">ADMITTED & CHECKED IN</h2>
              <p className="text-xs text-emerald-300/90 font-medium">
                Verified on{" "}
                {ticket.checkedInAt
                  ? new Date(ticket.checkedInAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "recently"}
                {ticket.checkedInByName ? ` by ${ticket.checkedInByName}` : ""}
              </p>
            </div>
          ) : ticket.valid ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f0ca7d]/20 text-[#f0ca7d] border border-[#f0ca7d]/40">
                <Sparkles className="h-7 w-7" />
              </div>
              <h2 className="text-xl font-bold text-white">VALID EVENT TICKET</h2>
              <span className="inline-flex rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-0.5 text-xs font-semibold text-emerald-300">
                Confirmed Registration · Ready for Entry
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <h2 className="text-xl font-bold text-amber-300">{ticket.message}</h2>
            </div>
          )}
        </div>

        {/* Ticket Details Body */}
        <div className="p-6 space-y-5">
          {/* Attendee Info Box */}
          <div className="rounded-2xl bg-[#031d16] border border-[#c79a45]/30 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#8ea39b]">
              Registered Attendee
            </p>
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#08362a] border border-[#c79a45]/40 text-[#f0ca7d]">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-base font-bold text-white">{ticket.participantName}</p>
                  {ticket.participantEmail && (
                    <p className="text-xs text-[#8ea39b]">{ticket.participantEmail}</p>
                  )}
                </div>
              </div>

              {ticket.guests > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-white/10 px-2.5 py-1 rounded-full text-white">
                  <Users className="h-3.5 w-3.5 text-[#f0ca7d]" />
                  +{ticket.guests} guest{ticket.guests > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>

          {/* Event Info Box */}
          <div className="space-y-3 rounded-2xl bg-[#031d16] border border-[#c79a45]/20 p-4 text-xs text-[#bad1c7]">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#8ea39b]">
              Event Information
            </p>
            <h3 className="text-base font-bold text-white">{event.title}</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[#f0ca7d] shrink-0" />
                <span>{formatDisplayDate(event.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#f0ca7d] shrink-0" />
                <span>{timeFormatted}</span>
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <MapPin className="h-4 w-4 text-[#f0ca7d] shrink-0" />
                <span>{event.location}</span>
              </div>
            </div>
          </div>

          {/* Check-In Action Button for Desk Staff */}
          {!isCheckedIn && ticket.valid && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleCheckIn}
                disabled={checkingIn}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#f0ca7d] hover:bg-[#fadfa3] py-3.5 px-4 text-sm font-bold text-[#06241b] shadow-lg transition-all active:scale-98 disabled:opacity-50"
              >
                {checkingIn ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Verifying Check-In...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    <span>Confirm Mosque Check-In</span>
                  </>
                )}
              </button>

              {checkInError && (
                <div className="mt-3 rounded-xl bg-red-950/60 border border-red-500/40 p-3 text-center">
                  <p className="text-xs text-red-300 leading-relaxed">{checkInError}</p>
                  <p className="mt-1 text-[11px] text-red-400">
                    If you are mosque staff, please{" "}
                    <Link href="/signin" className="underline font-bold text-white">
                      sign in
                    </Link>{" "}
                    to perform check-in.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Already checked in notice */}
          {isCheckedIn && (
            <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/30 p-3 text-center">
              <p className="text-xs text-emerald-300">
                This participant has been admitted to the mosque event.
              </p>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="border-t border-[#c79a45]/20 bg-[#031711]/60 px-6 py-4 flex items-center justify-between text-xs text-[#8ea39b]">
          <Link
            href="/events"
            className="hover:text-white transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All Events
          </Link>
          <Link
            href="/account/events"
            className="text-[#f0ca7d] hover:underline font-medium"
          >
            My Registrations →
          </Link>
        </div>
      </div>
    </main>
  );
}
