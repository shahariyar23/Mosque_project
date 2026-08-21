"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "./icons";

type Props = {
  fullName: string;
};

export function SignupSuccess({ fullName }: Props) {
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const firstName = fullName.trim().split(/\s+/)[0];

  // Move focus to the confirmation so screen reader and keyboard users land on it.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="auth-fade-up py-4 text-center">
      <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#f1f5f0]">
        <svg
          viewBox="0 0 64 64"
          className="h-12 w-12"
          fill="none"
          aria-hidden="true"
        >
          <circle
            className="auth-check-circle"
            cx="32"
            cy="32"
            r="26"
            stroke="#0d4d3b"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            className="auth-check-mark"
            d="m20 33 8.5 8.5L44 25"
            stroke="#c79a45"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      <h2
        ref={headingRef}
        tabIndex={-1}
        className="font-heading mt-6 text-2xl font-semibold text-[#17211d] outline-none sm:text-3xl"
      >
        Account Created Successfully
      </h2>

      <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#69726d]">
        {firstName
          ? `Welcome to our community, ${firstName}. `
          : "Welcome to our community. "}
        Your account is ready.
      </p>

      <p
        className="mt-6 text-xl tracking-[.6em] text-[#c79a45]"
        aria-hidden="true"
      >
        ✦ ✦ ✦
      </p>

      <div className="mt-6 grid gap-3">
        {/* `!` on the colours: globals.css declares an unlayered `a { color:inherit }`,
            which outranks Tailwind's layered text-* utilities on links. */}
        <Link
          href="/signin"
          className="group inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#0d4d3b] px-5 py-3.5 text-sm font-semibold text-white! transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#073a2d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
        >
          Continue to Sign In
          <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
        <Link
          href="/"
          className="inline-flex w-full items-center justify-center rounded-md border border-[#d4d4ca] px-5 py-3 text-sm font-medium text-[#3f4a44]! transition-colors duration-200 hover:border-[#b9b9ac] hover:bg-[#faf9f4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
