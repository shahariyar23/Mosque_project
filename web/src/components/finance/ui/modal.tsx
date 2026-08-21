"use client";

import { useId, useRef, type ReactNode } from "react";
import { Icon } from "@/components/finance/ui/icon";
import { useDialogFocus } from "@/components/finance/ui/use-dialog-focus";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
};

const widths = { sm: "sm:max-w-md", md: "sm:max-w-2xl", lg: "sm:max-w-4xl" } as const;

/**
 * Accessible dialog: labelled by its heading, closes on Escape and backdrop click, traps Tab
 * inside itself and returns focus to whatever opened it.
 */
export function Modal({ open, onClose, title, description, children, footer, size = "md" }: ModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useDialogFocus(open, panelRef, onClose);

  if (!open) return null;


  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Close dialog" onClick={onClose} className="finance-backdrop absolute inset-0 cursor-default bg-[#0b1f19]/45" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={`finance-modal relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-xl bg-white shadow-[0_24px_70px_rgba(7,58,45,.32)] sm:rounded-xl ${widths[size]}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#e7e6dc] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-[#17211d]">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 text-sm leading-6 text-[#69726d]">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-[#69726d] transition-colors hover:bg-[#f2f1ea] hover:text-[#17211d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>

        {footer ? (
          <div className="flex flex-col-reverse gap-2 border-t border-[#e7e6dc] bg-[#faf9f4] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Slide-in panel used for mobile filter drawers. Same focus contract as Modal. */
export function Drawer({ open, onClose, title, children, footer }: Omit<ModalProps, "size" | "description">) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();

  useDialogFocus(open, panelRef, onClose);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <button type="button" aria-label="Close filters" onClick={onClose} className="finance-backdrop absolute inset-0 cursor-default bg-[#0b1f19]/45" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="finance-drawer relative flex max-h-[88dvh] w-full flex-col rounded-t-xl bg-white shadow-[0_-16px_50px_rgba(7,58,45,.3)]"
      >
        <div className="flex items-center justify-between border-b border-[#e7e6dc] px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold text-[#17211d]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-10 w-10 place-items-center rounded-md text-[#69726d] hover:bg-[#f2f1ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer ? <div className="flex gap-2 border-t border-[#e7e6dc] bg-[#faf9f4] px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}
