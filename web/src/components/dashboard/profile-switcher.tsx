"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import { Icon } from "@/components/finance/ui/icon";
import {
  DEMO_PROFILE_COOKIE,
  demoProfiles,
  profileKeys,
  profileLabels,
  type ProfileKey,
} from "@/lib/demo-profiles";
import { positionLabels, roleLabels } from "@/lib/permissions";

/**
 * Demo scaffolding in place of real authentication: lets the team check the permission-driven UI as
 * any of the sample people from one shared dashboard.
 *
 * It writes a *cookie*, not `localStorage`, and then refreshes. That is the whole point — the server
 * re-resolves the permission set for the new profile and re-renders, so what the browser holds is a
 * choice of identity, never a permission list (spec 0003 AC-7). When auth lands, this component and
 * `lib/demo-profiles.ts` are deleted together and nothing else notices.
 */
function switchTo(key: ProfileKey) {
  // 30 days so a refresh keeps the review context. Lax is enough — nothing here is a credential.
  document.cookie = `${DEMO_PROFILE_COOKIE}=${key}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Which profile is active. Derived from the resolved user rather than read back from the cookie, so
 * there is one source of truth per render and no chance of the menu disagreeing with the page.
 */
function activeProfile(userId: string | undefined): ProfileKey | undefined {
  return profileKeys.find((key) => demoProfiles[key].id === userId);
}

export function ProfileSwitcher({ align = "right" }: { align?: "right" | "left" }) {
  const router = useRouter();
  const { user } = useDashboardSession();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<ProfileKey | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  const current = activeProfile(user.id);
  const positions = user.positions.map((position) => positionLabels[position].en).join(", ");

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex min-h-10 items-center gap-2.5 rounded-full border border-[#deddd3] bg-white px-2 py-1 pr-3 text-left transition-colors hover:border-[#c79a45] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
      >
        <span
          aria-hidden="true"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#0d4d3b] text-[11px] font-bold tracking-wide text-white"
        >
          {initials(user.name)}
        </span>
        <span className="hidden min-w-0 leading-tight sm:block">
          <span className="block truncate text-[12.5px] font-semibold text-[#17211d]">{user.name}</span>
          <span className="block truncate text-[11px] text-[#69726d]">
            {/* The role is the authority; the position is what the person is called. Both are shown
                because the spec's whole point is that they are not the same thing. */}
            {positions ? `${positions} · ${roleLabels[user.role]}` : roleLabels[user.role]}
          </span>
        </span>
        <Icon name="chevron-down" size={15} className="text-[#69726d]" />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Switch demo profile"
          className={`finance-enter absolute top-[calc(100%+8px)] z-50 w-[300px] max-w-[calc(100vw-2rem)] rounded-lg border border-[#deddd3] bg-white p-2 shadow-[0_20px_50px_-20px_rgba(7,58,45,.32)] ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <p className="px-2 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[.16em] text-[#c79a45]">
            Preview as
          </p>
          <p className="px-2 pb-2 text-[11.5px] leading-5 text-[#69726d]">
            Demo only — the API will supply the real session and enforce access.
          </p>
          <ul className="finance-scroll max-h-[320px] overflow-y-auto">
            {profileKeys.map((key) => {
              const active = key === current;
              const label = profileLabels[key];
              return (
                <li key={key}>
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    disabled={pending !== null}
                    onClick={() => {
                      setPending(key);
                      switchTo(key);
                      setOpen(false);
                      // The server owns the permission set, so the new one arrives by re-rendering.
                      router.refresh();
                    }}
                    className={`flex w-full items-start gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-[#f4f6f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b] disabled:opacity-60 ${
                      active ? "bg-[#f1f4ef]" : ""
                    }`}
                  >
                    <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border border-[#0d4d3b] text-[#0d4d3b]">
                      {active ? <Icon name="check" size={11} /> : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-[#17211d]">{label.name}</span>
                      <span className="block text-[11.5px] leading-4 text-[#69726d]">{label.note}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The way back out of a profile that cannot open the dashboard.
 *
 * The no-access panel renders outside the shell, so the switcher above is not on screen there, and
 * the cookie outlives the visit — without this, previewing as a member or a suspended account would
 * lock the demo out of the dashboard for a month. Clearing the cookie falls back to the default
 * profile, from which every other profile is reachable again.
 */
export function ResetDemoProfile() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        setPending(true);
        document.cookie = `${DEMO_PROFILE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
        router.push("/dashboard");
        router.refresh();
      }}
      className="inline-flex min-h-10 items-center justify-center rounded-md border border-[#deddd3] bg-white px-4 text-[13px] font-semibold text-[#0d4d3b] transition-colors hover:border-[#0d4d3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b] disabled:opacity-60"
    >
      {pending ? "Switching…" : "Preview as someone else"}
    </button>
  );
}
