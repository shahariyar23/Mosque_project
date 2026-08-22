"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/signup/icons";

type Props = {
  /** Whatever the visitor typed — shown back so they can confirm the right account. */
  identifier: string;
};

export function SigninSuccess({ identifier }: Props) {
  const headingRef = useRef<HTMLHeadingElement | null>(null);

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
        You&rsquo;re Signed In
      </h2>

      <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#69726d]">
        Welcome back{identifier ? " — " : ""}
        {identifier ? (
          <span className="font-medium text-[#17211d]">{identifier}</span>
        ) : null}
        . May Allah accept your prayers.
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
          href="/"
          className="group inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#0d4d3b] px-5 py-3.5 text-sm font-semibold text-white! transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#073a2d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
        >
          Go to Homepage
          <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
        <Link
          href="/prayer-times"
          className="inline-flex w-full items-center justify-center rounded-md border border-[#d4d4ca] px-5 py-3 text-sm font-medium text-[#3f4a44]! transition-colors duration-200 hover:border-[#b9b9ac] hover:bg-[#faf9f4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
        >
          View Prayer Times
        </Link>
      </div>
    </div>
  );
}
