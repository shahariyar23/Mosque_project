"use client";

import { useId, useState } from "react";
import { controlClass, ICON_WRAP, type FieldA11yProps } from "./form-field";
import { EyeIcon, EyeOffIcon, LockIcon } from "./icons";

type Props = {
  field: FieldA11yProps;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  placeholder: string;
  autoComplete: "new-password" | "current-password";
  hasError?: boolean;
  /** Accessible name for the toggle, e.g. "password" or "confirm password". */
  toggleLabel: string;
};

export function PasswordInput({
  field,
  value,
  onChange,
  onBlur,
  placeholder,
  autoComplete,
  hasError,
  toggleLabel,
}: Props) {
  const [visible, setVisible] = useState(false);
  const statusId = useId();

  return (
    <div className="relative">
      <LockIcon className={ICON_WRAP} />
      <input
        {...field}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`${controlClass(hasError)} pr-11`}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-pressed={visible}
        aria-controls={field.id}
        aria-describedby={statusId}
        className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded text-[#69726d] transition-colors hover:bg-[#f2f0e7] hover:text-[#0d4d3b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0d4d3b]"
      >
        {visible ? (
          <EyeOffIcon className="h-4.5 w-4.5" />
        ) : (
          <EyeIcon className="h-4.5 w-4.5" />
        )}
        <span className="sr-only">
          {visible ? `Hide ${toggleLabel}` : `Show ${toggleLabel}`}
        </span>
      </button>
      <span id={statusId} className="sr-only" aria-live="polite">
        {visible
          ? `Your ${toggleLabel} is visible.`
          : `Your ${toggleLabel} is hidden.`}
      </span>
    </div>
  );
}
