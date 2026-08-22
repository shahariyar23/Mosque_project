"use client";

import { useId, useRef, type ReactNode } from "react";
import { Icon } from "@/components/finance/ui/icon";
import { useDialogFocus } from "@/components/finance/ui/use-dialog-focus";
import { Avatar } from "@/components/ui/avatar";

/**
 * Side sheet for opening one record — a member, a volunteer, an event, a registration.
 *
 * The finance kit already has a `Drawer`, but it is a bottom sheet sized for a short filter form. A
 * record has a header, several sections and a pair of actions, which wants the full height of the
 * viewport; so this one comes in from the right on tablets and up, and stays a near-full-height sheet
 * on phones where there is no room for a side panel.
 *
 * The focus contract is the same `useDialogFocus` every other dialog in the project uses: labelled by
 * its heading, Escape and backdrop to close, Tab trapped inside, focus returned to the opener.
 */
type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  /** Renders an initials avatar in the header. Pass the person's name. */
  avatarName?: string;
  /** Status badge or chips shown under the subtitle. */
  badge?: ReactNode;
  /** Optional tab strip, rendered directly under the header. */
  tabs?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

export function DetailDrawer({
  open,
  onClose,
  title,
  subtitle,
  eyebrow,
  avatarName,
  badge,
  tabs,
  children,
  footer,
}: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();

  useDialogFocus(open, panelRef, onClose);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end sm:items-stretch">
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className="finance-backdrop absolute inset-0 cursor-default bg-[#0b1f19]/45"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="detail-sheet relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-xl bg-white shadow-[0_-16px_50px_rgba(7,58,45,.3)] sm:max-h-none sm:max-w-130 sm:rounded-none sm:shadow-[-16px_0_50px_rgba(7,58,45,.26)]"
      >
        <div className="flex items-start gap-3 border-b border-[#e7e6dc] px-5 py-4 sm:px-6">
          {avatarName ? <Avatar name={avatarName} size="lg" className="mt-0.5" /> : null}
          <div className="min-w-0 flex-1">
            {eyebrow ? (
              <p className="text-[10.5px] font-bold uppercase tracking-[.16em] text-[#c79a45]">{eyebrow}</p>
            ) : null}
            <h2 id={titleId} className="mt-0.5 truncate text-[17px] font-semibold text-[#17211d]">
              {title}
            </h2>
            {subtitle ? <p className="mt-0.5 truncate text-[12.5px] text-[#69726d]">{subtitle}</p> : null}
            {badge ? <div className="mt-2 flex flex-wrap items-center gap-1.5">{badge}</div> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 grid h-10 w-10 shrink-0 place-items-center rounded-md text-[#69726d] transition-colors hover:bg-[#f2f1ea] hover:text-[#17211d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {tabs ? <div className="border-b border-[#e7e6dc] px-4 py-2.5 sm:px-6">{tabs}</div> : null}

        <div className="panel-scroll min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>

        {footer ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-[#e7e6dc] bg-[#faf9f4] px-5 py-3.5 sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Titled block inside a drawer. */
export function DetailSection({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[11px] font-bold uppercase tracking-[.14em] text-[#8b938d]">{title}</h3>
        {action}
      </div>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

/**
 * Label/value grid. A real `<dl>` so the pairing survives a screen reader — a two-column flex row of
 * `<span>`s reads as a stream of disconnected words.
 */
export function DetailGrid({ children, columns = 2 }: { children: ReactNode; columns?: 1 | 2 }) {
  return (
    <dl className={`grid gap-x-4 gap-y-3.5 ${columns === 2 ? "sm:grid-cols-2" : ""}`}>{children}</dl>
  );
}

export function DetailField({
  label,
  value,
  full = false,
}: {
  label: string;
  value: ReactNode;
  /** Spans both columns — for addresses and free text. */
  full?: boolean;
}) {
  return (
    <div className={`min-w-0 ${full ? "sm:col-span-2" : ""}`}>
      <dt className="text-[11px] font-semibold uppercase tracking-[.08em] text-[#8b938d]">{label}</dt>
      <dd className="mt-0.5 text-[13.5px] leading-6 text-[#17211d]">{value}</dd>
    </div>
  );
}

/** Three or four figures in a row — service hours, events attended, contributions. */
export function DetailStats({ items }: { items: Array<{ label: string; value: string; hint?: string }> }) {
  return (
    <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-[#e7e6dc] bg-[#faf9f4] px-3 py-2.5">
          <dt className="text-[10.5px] font-bold uppercase tracking-[.08em] text-[#8b938d]">{item.label}</dt>
          <dd className="mt-1 text-[17px] font-semibold leading-tight tabular-nums text-[#17211d]">{item.value}</dd>
          {item.hint ? <p className="mt-0.5 text-[11px] leading-4 text-[#8b938d]">{item.hint}</p> : null}
        </div>
      ))}
    </dl>
  );
}
