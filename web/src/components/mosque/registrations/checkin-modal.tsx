"use client";

import { useState, useEffect, useRef } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import {
  QrCode,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  CalendarDays,
  MapPin,
  RefreshCw,
  Camera,
  X,
} from "lucide-react";
import {
  verifyTicket,
  checkInTicket,
  type TicketVerificationResult,
} from "@/services/eventService";

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialId?: string | null;
}

export function CheckInModal({ isOpen, onClose, onSuccess, initialId }: CheckInModalProps) {
  const [inputVal, setInputVal] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [ticket, setTicket] = useState<TicketVerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const cameraElementId = "event-attendee-qr-camera";

  const sanitizeInput = (val: string): string => {
    let cleaned = val.trim();
    if (cleaned.includes("/events/verify/")) {
      cleaned = cleaned.split("/events/verify/")[1].split("?")[0].trim();
    }
    return cleaned;
  };

  useEffect(() => {
    if (isOpen && initialId) {
      const cleaned = sanitizeInput(initialId);
      setInputVal(cleaned);
      setVerifying(true);
      setError(null);
      setSuccessMsg(null);
      setTicket(null);
      verifyTicket(cleaned)
        .then((data) => setTicket(data))
        .catch((err: unknown) => {
          setError(
            err instanceof Error
              ? err.message
              : "Registration not found or invalid ticket.",
          );
        })
        .finally(() => setVerifying(false));
    } else if (isOpen && !initialId) {
      setInputVal("");
      setTicket(null);
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, initialId]);

  const stopCamera = async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    setCameraOpen(false);
    if (!scanner) return;
    try {
      await scanner.stop();
    } catch {
      // The camera may already have stopped after a successful scan.
    }
    try {
      await scanner.clear();
    } catch {
      // Clearing is only cosmetic after a camera start failure.
    }
  };

  useEffect(() => () => { void stopCamera(); }, []);

  const verifyId = async (rawValue: string) => {
    const id = sanitizeInput(rawValue);
    if (!id) return;
    setInputVal(id);
    setVerifying(true);
    setError(null);
    setSuccessMsg(null);
    setTicket(null);
    try {
      setTicket(await verifyTicket(id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration not found or invalid ticket.");
    } finally {
      setVerifying(false);
    }
  };

  if (!isOpen) return null;

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await verifyId(inputVal);
  };

  const openCamera = async () => {
    setCameraStarting(true);
    setError(null);
    setCameraOpen(true);
    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const scanner = new Html5Qrcode(cameraElementId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 230, height: 230 } },
        (decodedText) => {
          void stopCamera().then(() => verifyId(decodedText));
        },
        () => undefined,
      );
    } catch (err: unknown) {
      await stopCamera();
      setError(err instanceof Error ? `Unable to open camera: ${err.message}` : "Unable to open the camera. Check camera permission and try again.");
    } finally {
      setCameraStarting(false);
    }
  };

  const handleConfirmCheckIn = async () => {
    if (!ticket || checkingIn) return;
    setCheckingIn(true);
    setError(null);

    try {
      const res = await checkInTicket(ticket.registrationId);
      if (res.success || res.alreadyCheckedIn) {
        setSuccessMsg(res.message);
        setTicket((prev) =>
          prev
            ? {
                ...prev,
                isCheckedIn: true,
                checkedInAt: res.checkedInAt,
                checkedInByName: res.checkedInByName,
              }
            : null,
        );
        if (onSuccess) onSuccess();
      } else {
        setError(res.message);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record check-in.");
    } finally {
      setCheckingIn(false);
    }
  };

  const resetAll = () => {
    setInputVal("");
    setTicket(null);
    setError(null);
    setSuccessMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl bg-white border border-[#e5e2d8] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#e5e2d8] bg-[#faf9f4] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#073a2d] text-[#f0ca7d]">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-[#17211d] text-base">
                Event Attendee Check-In
              </h3>
              <p className="text-xs text-[#69726d]">
                Scan QR or enter Registration ID
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Input form */}
          <form onSubmit={handleVerify} className="space-y-2">
            <label
              htmlFor="ticket-input"
              className="block text-xs font-semibold uppercase tracking-wider text-[#52605a]"
            >
              Registration UUID or Scanned QR Link
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="ticket-input"
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="e.g. 3651b4de-280c-4eb2-97af-5d3290b3e9cb"
                  className="w-full rounded-xl border border-[#e5e2d8] pl-9 pr-3 py-2 text-xs sm:text-sm focus:border-[#073a2d] focus:outline-none focus:ring-1 focus:ring-[#073a2d]"
                />
              </div>
              <button
                type="submit"
                disabled={verifying || !inputVal.trim()}
                className="rounded-xl bg-[#073a2d] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#0b503f] disabled:opacity-50 flex items-center gap-1.5 shrink-0"
              >
                {verifying ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Verify"
                )}
              </button>
            </div>
            {!cameraOpen ? (
              <button
                type="button"
                onClick={() => void openCamera()}
                disabled={cameraStarting}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#073a2d] px-3 py-2 text-xs font-semibold text-[#073a2d] hover:bg-[#073a2d]/5 disabled:opacity-50"
              >
                {cameraStarting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                Open Camera
              </button>
            ) : (
              <div className="space-y-2 rounded-xl border border-[#e5e2d8] bg-black p-2">
                <div id={cameraElementId} className="overflow-hidden rounded-lg" />
                <button type="button" onClick={() => void stopCamera()} className="w-full rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#17211d]">
                  Close Camera
                </button>
              </div>
            )}
          </form>

          {/* Error notice */}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success notice */}
          {successMsg && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Verified Ticket Card */}
          {ticket && (
            <div className="rounded-xl border border-[#e5e2d8] bg-[#faf9f4] p-4 space-y-4">
              {/* Attendee */}
              <div className="flex items-center justify-between border-b border-[#e5e2d8] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#073a2d] text-white">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#17211d]">
                      {ticket.participantName}
                    </h4>
                    {ticket.participantEmail && (
                      <p className="text-[11px] text-[#69726d]">
                        {ticket.participantEmail}
                      </p>
                    )}
                  </div>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    ticket.isCheckedIn
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {ticket.isCheckedIn ? "Checked In" : "Confirmed"}
                </span>
              </div>

              {/* Event details */}
              <div className="space-y-1.5 text-xs text-[#52605a]">
                <p className="font-semibold text-sm text-[#17211d]">
                  {ticket.event.title}
                </p>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5 text-[#073a2d]" />
                  <span>{ticket.event.date}</span>
                  <Clock className="h-3.5 w-3.5 text-[#073a2d] ml-2" />
                  <span>{ticket.event.startTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-[#073a2d]" />
                  <span>{ticket.event.location}</span>
                </div>
              </div>

              {/* Check-in Action Button */}
              <div className="pt-2">
                {ticket.isCheckedIn ? (
                  <div className="rounded-lg bg-emerald-100/80 p-2.5 text-center text-xs font-bold text-emerald-800 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                    <span>
                      Admitted
                      {ticket.checkedInAt
                        ? ` at ${new Date(ticket.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                        : ""}
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleConfirmCheckIn}
                    disabled={checkingIn}
                    className="w-full rounded-xl bg-[#073a2d] hover:bg-[#0b503f] py-2.5 px-4 text-xs font-bold text-white shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {checkingIn ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-[#f0ca7d]" />
                    )}
                    <span>Confirm Attendee Check-In</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-[#e5e2d8] bg-[#faf9f4] px-6 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={resetAll}
            className="text-xs text-gray-500 hover:text-gray-900"
          >
            Clear Search
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#e5e2d8] bg-white px-3 py-1.5 text-xs font-semibold text-[#17211d] hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
