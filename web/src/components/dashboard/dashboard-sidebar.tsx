"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { useFinanceSession } from "@/components/dashboard/session-provider";
import { Icon, type IconName } from "@/components/finance/ui/icon";
import { useDialogFocus } from "@/components/finance/ui/use-dialog-focus";
import { dashboardNav, type NavItem } from "@/lib/finance/nav";
import type { Permission } from "@/lib/finance/permissions";

type Check = (permissions: Permission[]) => boolean;

/** An item is visible when the role holds at least one of its permissions. */
function visibleFor(item: NavItem, canAny: Check): boolean {
  if (!item.anyOf || item.anyOf.length === 0) return true;
  return canAny(item.anyOf);
}

/** People who only see their own records get "My Salary" instead of "Salaries". */
function labelFor(item: NavItem, canAny: Check): string {
  if (!item.selfLabel || !item.selfOnly) return item.label;
  const broad = (item.anyOf ?? []).filter((permission) => !item.selfOnly?.includes(permission));
  if (canAny(item.selfOnly) && !canAny(broad)) return item.selfLabel;
  return item.label;
}

/**
 * The panel contents, shared by the desktop rail and the mobile drawer. `onNavigate` is only
 * supplied by the drawer — the desktop rail has nothing to close.
 */
function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { canAny, user } = useFinanceSession();
  const [financeOpen, setFinanceOpen] = useState(true);
  const [lastPath, setLastPath] = useState(pathname);

  // Re-expand Finance when the user lands on a finance route, even if they collapsed it earlier.
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (!financeOpen && pathname.startsWith("/dashboard/finance")) setFinanceOpen(true);
  }

  const items = dashboardNav.filter((item) => visibleFor(item, canAny));

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

      <nav className="finance-scroll min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {items.map((item) => {
            const children = (item.children ?? []).filter((child) => visibleFor(child, canAny));
            const hasChildren = children.length > 0;
            const sectionActive = hasChildren ? pathname.startsWith(item.href) : pathname === item.href;
            const subnavId = `subnav-${item.href.replace(/\W+/g, "-")}`;

            if (hasChildren) {
              return (
                <li key={item.href}>
                  <button
                    type="button"
                    onClick={() => setFinanceOpen((value) => !value)}
                    aria-expanded={financeOpen}
                    aria-controls={subnavId}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e0be79] ${
                      sectionActive ? "bg-white/10 text-white" : "text-white/75 hover:bg-white/[.07] hover:text-white"
                    }`}
                  >
                    <Icon name={item.icon as IconName} size={17} className={sectionActive ? "text-[#e0be79]" : ""} />
                    <span className="flex-1 text-left">{item.label}</span>
                    <Icon
                      name="chevron-down"
                      size={15}
                      className={`transition-transform motion-reduce:transition-none ${financeOpen ? "" : "-rotate-90"}`}
                    />
                  </button>

                  {financeOpen ? (
                    <ul id={subnavId} className="ml-4 mt-1 space-y-0.5 border-l border-white/15 pl-3">
                      {children.map((child) => {
                        const active = pathname === child.href;
                        return (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              onClick={onNavigate}
                              aria-current={active ? "page" : undefined}
                              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e0be79] ${
                                active
                                  ? "bg-[#0d4d3b] font-semibold text-white shadow-[inset_2px_0_0_#c79a45]"
                                  : "text-white/70 hover:bg-white/[.07] hover:text-white"
                              }`}
                            >
                              <Icon
                                name={child.icon as IconName}
                                size={15}
                                className={active ? "text-[#e0be79]" : "opacity-70"}
                              />
                              {labelFor(child, canAny)}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </li>
              );
            }

            return (
              <li key={item.href}>
                {item.comingSoon ? (
                  <span
                    aria-disabled="true"
                    className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-medium text-white/35"
                  >
                    <Icon name={item.icon as IconName} size={17} />
                    <span className="flex-1">{item.label}</span>
                    <span className="rounded-full border border-white/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[.1em]">
                      Soon
                    </span>
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={sectionActive ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e0be79] ${
                      sectionActive ? "bg-white/10 text-white" : "text-white/75 hover:bg-white/[.07] hover:text-white"
                    }`}
                  >
                    <Icon name={item.icon as IconName} size={17} className={sectionActive ? "text-[#e0be79]" : ""} />
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

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
      <aside
        aria-label="Dashboard sections"
        className="hidden w-[272px] shrink-0 flex-col bg-[#073a2d] text-white lg:sticky lg:top-0 lg:flex lg:h-dvh"
      >
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
