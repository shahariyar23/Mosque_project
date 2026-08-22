"use client";

import { useId } from "react";

/**
 * On/off switch.
 *
 * A real `<button role="switch">` rather than a styled checkbox: `aria-checked` is what a screen
 * reader announces as "on"/"off", and the whole control is one tab stop with Space and Enter working
 * for free. The state is also written as text beside it, so the switch never depends on the knob
 * position alone.
 */
export function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  id,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  id?: string;
}) {
  const generatedId = useId();
  const labelId = `${id ?? generatedId}-label`;
  const descriptionId = `${id ?? generatedId}-description`;

  return (
    <div className="flex items-start justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <p id={labelId} className="text-[13.5px] font-semibold text-[#17211d]">
          {label}
        </p>
        {description ? (
          <p id={descriptionId} className="mt-0.5 text-[12.5px] leading-5 text-[#69726d]">
            {description}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        <span
          aria-hidden="true"
          className={`hidden text-[11px] font-bold uppercase tracking-[.1em] sm:inline ${
            checked ? "text-[#0b4634]" : "text-[#8b938d]"
          }`}
        >
          {checked ? "On" : "Off"}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-labelledby={labelId}
          aria-describedby={description ? descriptionId : undefined}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b] disabled:cursor-not-allowed disabled:opacity-50 ${
            checked ? "border-[#0b4634] bg-[#0d4d3b]" : "border-[#cfd4cd] bg-[#eceadf]"
          }`}
        >
          <span
            aria-hidden="true"
            className={`absolute top-[3px] h-4 w-4 rounded-full bg-white shadow-[0_1px_3px_rgba(7,58,45,.35)] transition-[left] duration-200 motion-reduce:transition-none ${
              checked ? "left-[23px]" : "left-[3px]"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

/** A list of toggles with hairline separators — the shape of the notifications panel. */
export function ToggleList({ children }: { children: React.ReactNode }) {
  return <div className="divide-y divide-[#f0efe6]">{children}</div>;
}
