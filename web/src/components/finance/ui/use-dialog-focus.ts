"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Shared behaviour for every overlay in the module — the record modals, the mobile filter drawer
 * and the mobile navigation panel. Locks background scrolling, closes on Escape, keeps Tab inside
 * the panel and hands focus back to whatever opened it.
 *
 * The Tab cycle is the part that is easy to skip: `aria-modal` only tells assistive tech that the
 * rest of the page is unavailable, it does nothing to sequential focus. Without this, Tab walks
 * straight out of the panel into the controls hidden behind the backdrop.
 *
 * `onClose` is held in a ref so the effect depends on `open` alone. Callers pass inline arrows,
 * and re-running this on every render would re-capture the return target and yank focus back to
 * the first control each time the panel's contents changed.
 */
export function useDialogFocus(open: boolean, panelRef: RefObject<HTMLElement | null>, onClose: () => void) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const returnFocusTo = document.activeElement as HTMLElement | null;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null,
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    // A frame's grace so the panel is painted before focus moves into it.
    const timer = window.setTimeout(() => {
      (panel?.querySelector<HTMLElement>(FOCUSABLE) ?? panel)?.focus();
    }, 20);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      returnFocusTo?.focus();
    };
  }, [open, panelRef]);
}
