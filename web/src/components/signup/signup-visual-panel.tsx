import { IslamicTexture } from "@/components/islamic-texture";
import { CheckIcon } from "./icons";

const benefits = [
  "Stay updated with mosque events",
  "Manage your community profile",
  "Access Islamic resources",
];

/**
 * Static visual half of the sign up screen — no client JavaScript.
 * Desktop: sticky column beside the form. Mobile: compact banner above it.
 */
export function SignupVisualPanel() {
  return (
    <aside className="auth-panel-wash relative isolate flex min-h-60 flex-col justify-between overflow-hidden rounded-xl px-5 pb-8 pt-10 text-white sm:min-h-72 sm:px-8 sm:pb-10 lg:sticky lg:top-28 lg:min-h-140 lg:px-10 lg:py-12">
      <div className="auth-panel-skyline -z-10" aria-hidden="true" />
      <IslamicTexture
        variant="hero"
        position="left"
        opacity={0.1}
        className="-left-32 top-6 -z-10 h-125 w-125 bg-contain"
      />
      <IslamicTexture
        variant="hero"
        position="right"
        opacity={0.07}
        className="-right-24 bottom-0 -z-10 hidden h-100 w-100 bg-contain lg:block"
      />

      <div className="relative z-10 max-w-md">
        <h2 className="font-heading text-2xl font-semibold leading-tight sm:text-3xl lg:text-[38px]">
          Welcome to Our Community
        </h2>
        <p className="mt-4 hidden text-[15px] leading-7 text-white/75 sm:block">
          Connect with your mosque, stay informed about prayer times, events,
          Islamic programs, and community activities.
        </p>
      </div>

      <ul className="relative z-10 mt-7 hidden gap-3.5 sm:grid sm:grid-cols-3 sm:gap-5 lg:mt-0 lg:grid-cols-1 lg:gap-3.5">
        {benefits.map((benefit) => (
          <li
            key={benefit}
            className="flex items-start gap-3 text-sm leading-6 text-white/85 lg:items-center"
          >
            <span className="mt-px grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[#e0be79]/50 bg-[#e0be79]/10 text-[#e0be79] lg:mt-0">
              <CheckIcon className="h-3 w-3" />
            </span>
            {benefit}
          </li>
        ))}
      </ul>

      <div className="relative z-10 mt-7 lg:mt-0">
        <span className="block h-px w-16 bg-[#e0be79]/60" aria-hidden="true" />
        <p className="mt-4 text-[11px] font-semibold tracking-[.24em] text-[#e0be79] sm:text-xs">
          FAITH · KNOWLEDGE · COMMUNITY
        </p>
      </div>
    </aside>
  );
}
