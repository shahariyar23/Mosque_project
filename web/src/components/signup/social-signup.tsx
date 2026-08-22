"use client";

import { useState } from "react";
import { GoogleIcon } from "./icons";

/**
 * Secondary auth route shared by the sign up and sign in screens. Google OAuth
 * is not wired up yet, so the button explains that politely instead of failing
 * silently.
 */
export function SocialSignup({
  mode = "signup",
}: {
  mode?: "signup" | "signin";
}) {
  const [notice, setNotice] = useState<string | null>(null);
  const label = mode === "signin" ? "Google sign in" : "Google sign up";

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-[#e5e2d8]" />
        <span className="text-[11px] font-semibold tracking-[.18em] text-[#9aa19c]">
          OR
        </span>
        <span className="h-px flex-1 bg-[#e5e2d8]" />
      </div>

      <button
        type="button"
        onClick={() =>
          setNotice(
            `${label} is coming soon. Please use the form above for now.`,
          )
        }
        className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-md border border-[#d4d4ca] bg-white px-4 py-3 text-sm font-medium text-[#3f4a44] transition-colors duration-200 hover:border-[#b9b9ac] hover:bg-[#faf9f4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
      >
        <GoogleIcon className="h-4.5 w-4.5" />
        Continue with Google
      </button>

      <p
        aria-live="polite"
        className="mt-2 min-h-0 text-[12px] leading-5 text-[#69726d]"
      >
        {notice}
      </p>
    </div>
  );
}
