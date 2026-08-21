"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Icon } from "@/components/finance/ui/icon";

const controlBase =
  "w-full rounded-md border bg-white px-3 text-sm text-[#17211d] transition-colors placeholder:text-[#9aa19c] focus:border-[#0d4d3b] focus:outline-2 focus:outline-offset-1 focus:outline-[#0d4d3b]/40 disabled:bg-[#f6f5ee] disabled:text-[#8b938d]";

type FieldProps = {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  error?: string;
  hintId?: string;
  errorId?: string;
  children: ReactNode;
  className?: string;
};

/**
 * Every finance field is wrapped in this: visible label bound to the control, optional hint
 * and an error message that is announced when it appears.
 */
export function Field({ label, htmlFor, required, hint, error, hintId, errorId, children, className = "" }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-[#3d453f]">
        {label}
        {required ? (
          <span className="ml-1 text-[#a13228]" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="ml-1.5 text-[11px] font-normal text-[#8b938d]">optional</span>
        )}
        {required ? <span className="sr-only"> (required)</span> : null}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && !error ? (
        <p id={hintId} className="mt-1.5 text-[12px] leading-5 text-[#69726d]">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 flex items-start gap-1.5 text-[12px] font-medium leading-5 text-[#94291f]">
          <span className="mt-0.5">
            <Icon name="alert" size={13} />
          </span>
          {error}
        </p>
      ) : null}
    </div>
  );
}

type TextFieldProps = {
  label: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
} & InputHTMLAttributes<HTMLInputElement>;

export function TextField({ label, hint, error, containerClassName, id, className = "", ...rest }: TextFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  return (
    <Field
      label={label}
      htmlFor={fieldId}
      required={rest.required}
      hint={hint}
      error={error}
      hintId={hintId}
      errorId={errorId}
      className={containerClassName}
    >
      <input
        id={fieldId}
        name={rest.name ?? fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={`${controlBase} min-h-11 ${error ? "border-[#d99b93]" : "border-[#cfd4cd]"} ${className}`}
        {...rest}
      />
    </Field>
  );
}

/** Money input with a fixed ৳ prefix so the unit is never ambiguous. */
export function AmountField({ label, hint, error, containerClassName, id, className = "", ...rest }: TextFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  return (
    <Field
      label={label}
      htmlFor={fieldId}
      required={rest.required}
      hint={hint}
      error={error}
      hintId={hintId}
      errorId={errorId}
      className={containerClassName}
    >
      <div
        className={`flex min-h-11 items-center overflow-hidden rounded-md border bg-white focus-within:border-[#0d4d3b] focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-[#0d4d3b]/40 ${
          error ? "border-[#d99b93]" : "border-[#cfd4cd]"
        }`}
      >
        <span aria-hidden="true" className="grid h-11 w-10 shrink-0 place-items-center border-r border-[#e7e6dc] bg-[#faf9f4] text-sm text-[#5c655f]">
          ৳
        </span>
        <input
          id={fieldId}
          name={rest.name ?? fieldId}
          type="number"
          inputMode="numeric"
          min={0}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={`min-w-0 flex-1 bg-transparent px-3 text-sm tabular-nums text-[#17211d] outline-none placeholder:text-[#9aa19c] ${className}`}
          {...rest}
        />
      </div>
    </Field>
  );
}

type SelectFieldProps = {
  label: string;
  hint?: string;
  error?: string;
  options: readonly string[] | ReadonlyArray<{ value: string; label: string }>;
  placeholder?: string;
  containerClassName?: string;
} & SelectHTMLAttributes<HTMLSelectElement>;

export function SelectField({
  label,
  hint,
  error,
  options,
  placeholder,
  containerClassName,
  id,
  className = "",
  ...rest
}: SelectFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  const normalised = options.map((option) => (typeof option === "string" ? { value: option, label: option } : option));
  return (
    <Field
      label={label}
      htmlFor={fieldId}
      required={rest.required}
      hint={hint}
      error={error}
      hintId={hintId}
      errorId={errorId}
      className={containerClassName}
    >
      <div className="relative">
        <select
          id={fieldId}
          name={rest.name ?? fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={`${controlBase} min-h-11 appearance-none pr-9 ${error ? "border-[#d99b93]" : "border-[#cfd4cd]"} ${className}`}
          {...rest}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {normalised.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#69726d]">
          <Icon name="chevron-down" size={16} />
        </span>
      </div>
    </Field>
  );
}

type TextAreaFieldProps = {
  label: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextAreaField({ label, hint, error, containerClassName, id, className = "", rows = 3, ...rest }: TextAreaFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  return (
    <Field
      label={label}
      htmlFor={fieldId}
      required={rest.required}
      hint={hint}
      error={error}
      hintId={hintId}
      errorId={errorId}
      className={containerClassName}
    >
      <textarea
        id={fieldId}
        name={rest.name ?? fieldId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={`${controlBase} py-2.5 leading-6 ${error ? "border-[#d99b93]" : "border-[#cfd4cd]"} ${className}`}
        {...rest}
      />
    </Field>
  );
}

/**
 * Attachment picker. Front-end only — the chosen file name is held in component state so the
 * upload endpoint can be wired in later without touching this markup.
 */
export function AttachmentField({
  label = "Attachment",
  hint = "Receipt, bill or invoice. Uploading is not connected yet — the file name is recorded for now.",
  fileName,
  onSelect,
  onClear,
  id,
}: {
  label?: string;
  hint?: string;
  fileName?: string;
  onSelect: (name: string) => void;
  onClear: () => void;
  id?: string;
}) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const hintId = `${fieldId}-hint`;
  return (
    <Field label={label} htmlFor={fieldId} hint={hint} hintId={hintId}>
      {/*
        The input stays mounted in both states. Unmounting it once a file is chosen would leave the
        visible "Attachment" label pointing at a missing id and drop the hint's aria-describedby,
        so the field would lose both its name and its description exactly when it has a value.
        Keeping it also means the field still works as a replace-the-file control.
      */}
      <input
        id={fieldId}
        name={fieldId}
        type="file"
        className="peer sr-only"
        aria-describedby={hintId}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onSelect(file.name);
        }}
      />
      {fileName ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-[#cfd4cd] bg-[#faf9f4] pl-3 peer-focus-visible:border-[#0d4d3b] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-[#0d4d3b]/40">
          <span className="flex min-w-0 items-center gap-2 py-2.5 text-sm text-[#3d453f]">
            <Icon name="file-text" size={16} />
            <span className="truncate">{fileName}</span>
          </span>
          <button
            type="button"
            onClick={onClear}
            aria-label={`Remove ${fileName}`}
            className="grid min-h-11 shrink-0 place-items-center rounded-r-md px-3 text-[12px] font-semibold text-[#94291f] hover:bg-[#fbeceb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
          >
            Remove
          </button>
        </div>
      ) : (
        <label
          htmlFor={fieldId}
          className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-[#c9cec7] bg-[#faf9f4] px-3 py-3 text-sm font-medium text-[#4d564f] transition-colors hover:border-[#0d4d3b] hover:text-[#0d4d3b] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#0d4d3b]"
        >
          <Icon name="upload" size={16} />
          Choose a file
        </label>
      )}
    </Field>
  );
}

/** Label + value pair used in confirmation summaries and detail panels. */
export function SummaryRow({ label, value, emphasis = false }: { label: string; value: ReactNode; emphasis?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="text-[13px] text-[#69726d]">{label}</dt>
      <dd className={`text-right text-[13px] ${emphasis ? "text-base font-semibold text-[#17211d]" : "font-medium text-[#17211d]"}`}>
        {value}
      </dd>
    </div>
  );
}

export function Fieldset({ legend, children, className = "" }: { legend: string; children: ReactNode; className?: string }) {
  return (
    <fieldset className={className}>
      <legend className="text-[13px] font-semibold text-[#3d453f]">{legend}</legend>
      <div className="mt-2">{children}</div>
    </fieldset>
  );
}
