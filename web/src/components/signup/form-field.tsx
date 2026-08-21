import type { ReactNode } from "react";
import { AlertIcon } from "./icons";

/** Props a control needs so its label, hint and error stay wired up for screen readers. */
export type FieldA11yProps = {
  id: string;
  name: string;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
};

type Props = {
  id: string;
  name: string;
  label: string;
  error?: string;
  hint?: string;
  /** Renders an "Optional" tag next to the label. */
  optional?: boolean;
  /** Extra element ids to append to aria-describedby (e.g. a password strength region). */
  extraDescribedBy?: string;
  /** Muted label styling for secondary profile fields. */
  secondary?: boolean;
  children: (field: FieldA11yProps) => ReactNode;
};

export const CONTROL_BASE =
  "w-full min-w-0 rounded-md border bg-white py-3 text-sm text-[#17211d] transition-colors duration-200 placeholder:text-[#a3aaa5] focus:outline-none";

export function controlClass(hasError?: boolean, withIcon = true) {
  return [
    CONTROL_BASE,
    withIcon ? "pl-10 pr-3" : "px-3",
    hasError
      ? "border-[#b0472f] focus:border-[#b0472f] focus:ring-2 focus:ring-[#b0472f]/20"
      : "border-[#d4d4ca] hover:border-[#b9b9ac] focus:border-[#0d4d3b] focus:ring-2 focus:ring-[#0d4d3b]/20",
  ].join(" ");
}

export const ICON_WRAP =
  "pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[#8d948f]";

export function FormField({
  id,
  name,
  label,
  error,
  hint,
  optional,
  extraDescribedBy,
  secondary,
  children,
}: Props) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  // The hint element is replaced by the error, so only reference the id that is actually rendered.
  const describedBy =
    [
      hint && !error ? hintId : null,
      extraDescribedBy ?? null,
      error ? errorId : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label
          htmlFor={id}
          className={
            secondary
              ? "text-[13px] font-medium text-[#69726d]"
              : "text-[13px] font-medium text-[#17211d]"
          }
        >
          {label}
        </label>
        {optional ? (
          <span className="text-[11px] tracking-wide text-[#9aa19c]">
            Optional
          </span>
        ) : null}
      </div>

      {children({
        id,
        name,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })}

      {hint && !error ? (
        <p
          id={hintId}
          className="mt-1.5 text-[11.5px] leading-5 text-[#8d948f]"
        >
          {hint}
        </p>
      ) : null}

      {error ? (
        <p
          id={errorId}
          className="mt-1.5 flex items-start gap-1.5 text-[12.5px] font-medium leading-5 text-[#9c3a22]"
        >
          <AlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
