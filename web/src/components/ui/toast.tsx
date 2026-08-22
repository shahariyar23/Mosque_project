"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/finance/ui/icon";

/**
 * Toast notifications for the dashboard.
 *
 * There was no toast system in the project, so this is the one. Two rules shape it:
 *
 *  - The live region is rendered once, always, and is never conditionally mounted. A screen reader
 *    only announces changes *inside* an existing live region; a region that appears at the same
 *    moment as its first message is frequently missed entirely.
 *  - A toast is an acknowledgement, never the only place information appears. Every action that
 *    raises one also updates the screen behind it, so dismissing early loses nothing.
 */

export type ToastTone = "success" | "info" | "warning" | "danger";

type Toast = {
  id: number;
  tone: ToastTone;
  message: string;
  description?: string;
};

type ToastInput = {
  message: string;
  description?: string;
  tone?: ToastTone;
};

type ToastContextValue = {
  /** Raises a toast. Returns nothing — a caller should never need to track one. */
  notify: (input: ToastInput | string) => void;
};

const ToastContext = createContext<ToastContextValue>({ notify: () => {} });

const DURATION_MS = 4500;

const toneStyles: Record<ToastTone, { icon: IconName; chip: string; border: string }> = {
  success: { icon: "check-circle", chip: "border-[#c2d8cb] bg-[#eaf2ed] text-[#0d4d3b]", border: "border-l-[#0d4d3b]" },
  info: { icon: "info", chip: "border-[#c5dae2] bg-[#ebf2f5] text-[#1d5265]", border: "border-l-[#2c6b80]" },
  warning: { icon: "alert", chip: "border-[#e6d3a6] bg-[#faf2e0] text-[#a97b23]", border: "border-l-[#c79a45]" },
  danger: { icon: "alert", chip: "border-[#ebc8c4] bg-[#fbeceb] text-[#a13228]", border: "border-l-[#a13228]" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (input: ToastInput | string) => {
      const resolved: ToastInput = typeof input === "string" ? { message: input } : input;
      const id = nextId.current++;
      const toast: Toast = {
        id,
        tone: resolved.tone ?? "success",
        message: resolved.message,
        description: resolved.description,
      };

      // Three at a time. More than that and the stack covers the change it is describing.
      setToasts((current) => [...current.slice(-2), toast]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), DURATION_MS),
      );
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/*
        `pointer-events-none` on the stack with `pointer-events-auto` on each card keeps the region
        from swallowing clicks on the page beneath it while it is empty.
      */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-3 pb-3 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:items-end sm:px-0 sm:pb-0"
      >
        {toasts.map((toast) => {
          const tone = toneStyles[toast.tone];
          return (
            <div
              key={toast.id}
              className={`toast-enter pointer-events-auto flex w-full max-w-[420px] items-start gap-3 rounded-lg border border-[#deddd3] border-l-4 bg-white px-3.5 py-3 shadow-[0_16px_40px_-18px_rgba(7,58,45,.38)] ${tone.border}`}
            >
              <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md border ${tone.chip}`}>
                <Icon name={tone.icon} size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold leading-5 text-[#17211d]">{toast.message}</p>
                {toast.description ? (
                  <p className="mt-0.5 text-[12.5px] leading-5 text-[#69726d]">{toast.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label={`Dismiss: ${toast.message}`}
                className="-mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-md text-[#8b938d] transition-colors hover:bg-[#f2f1ea] hover:text-[#17211d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
              >
                <Icon name="close" size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
