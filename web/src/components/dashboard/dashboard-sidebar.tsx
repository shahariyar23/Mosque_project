"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useRef } from "react";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import { useLanguage } from "@/components/language-provider";
import { Icon } from "@/components/finance/ui/icon";
import { useDialogFocus } from "@/components/finance/ui/use-dialog-focus";
import { filterNavigation } from "@/lib/navigation";

/**
 * The panel contents, shared by the desktop rail and the mobile drawer. `onNavigate` is only
 * supplied by the drawer — the desktop rail has nothing to close.
 *
 * Every role's menu comes out of one `filterNavigation()` call over `lib/navigation.ts`. There is no
 * per-role menu anywhere, which is what stops a new module appearing for the wrong people: a row is
 * visible exactly when the viewer holds the permission it names (spec 0003).
 */
function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { permissions, user } = useDashboardSession();
  const { language } = useLanguage();

  const groups = useMemo(() => filterNavigation(permissions), [permissions]);

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-3" onClick={onNavigate}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#e0be79] text-[#e0be79]">
            <Icon name="mosque" size={18} />
          </span>
          <span className="min-w-0">
            <b className="block truncate text-[13px] tracking-[.16em]">NOOR</b>
            <span className="block truncate text-[10px] tracking-[.2em] text-white/60">MOSQUE ADMIN</span>
          </span>
        </Link>
        {onNavigate ? (
          <button
            type="button"
            onClick={onNavigate}
            aria-label="Close navigation"
            className="grid h-10 w-10 place-items-center rounded-md text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e0be79]"
          >
            <Icon name="close" size={18} />
          </button>
        ) : null}
      </div>

      <nav aria-label="Dashboard sections" className="finance-scroll min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {groups.length === 0 ? (
          <p className="px-2 py-3 text-[12px] leading-5 text-white/55">
            This account has no dashboard sections assigned.
          </p>
        ) : null}

        {groups.map((group) => (
          // A group with no visible items never reaches here — `filterNavigation` drops it, heading
          // and all, so nobody sees an empty "Finance" label (spec 0003 AC-2).
          <section key={group.heading} className="mb-4 last:mb-0">
            <h2 className="px-3 pb-1.5 text-[9.5px] font-bold uppercase tracking-[.18em] text-white/40">
              {language === "bn" ? group.headingBn : group.heading}
            </h2>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e0be79] ${
                        active
                          ? "bg-[#0d4d3b] font-semibold text-white shadow-[inset_2px_0_0_#c79a45]"
                          : "font-medium text-white/75 hover:bg-white/[.07] hover:text-white"
                      }`}
                    >
                      <Icon name={item.icon} size={17} className={active ? "text-[#e0be79]" : "opacity-75"} />
                      <span className="min-w-0 truncate">
                        {language === "bn" ? item.labelBn : item.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </nav>

      {user ? (
        <div className="border-t border-white/10 px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#e0be79]">Signed in</p>
          <p className="mt-1.5 truncate text-[13px] font-semibold">{user.name}</p>
          <p className="truncate text-[11px] text-white/55">{user.mosqueName}</p>
          <Link
            href="/"
            className="mt-3 inline-flex items-center gap-1.5 rounded text-[12px] text-white/70 transition-colors hover:text-[#e0be79] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e0be79]"
          >
            <Icon name="arrow-right" size={14} />
            View public website
          </Link>
        </div>
      ) : null}
    </>
  );
}

type Props = { open: boolean; onClose: () => void };

/**
 * Two presentations of the same navigation. Above lg it is a permanent rail; below lg it is a
 * dialog that is mounted only while open — a closed panel parked off-screen with a transform
 * stays in the tab order and the accessibility tree, so keyboard users would walk through a
 * dozen invisible links with no focus ring on screen.
 */
export function DashboardSidebar({ open, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  useDialogFocus(open, panelRef, onClose);

  return (
    <>
      <aside className="hidden w-[272px] shrink-0 flex-col bg-[#073a2d] text-white lg:sticky lg:top-0 lg:flex lg:h-dvh">
        <SidebarBody />
      </aside>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className="finance-backdrop absolute inset-0 cursor-default bg-[#0b1f19]/45"
          />
          <div
            id="dashboard-sidebar"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Dashboard navigation"
            tabIndex={-1}
            className="finance-drawer-left absolute inset-y-0 left-0 flex w-[272px] max-w-[85vw] flex-col bg-[#073a2d] text-white shadow-[10px_0_44px_rgba(7,58,45,.42)]"
          >
            <SidebarBody onNavigate={onClose} />
          </div>
        </div>
      ) : null}
    </>
  );
}
