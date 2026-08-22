import type { ReactNode } from "react";
import { AlertIcon } from "./icons";

type Props = {
  id: string;
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  children: ReactNode;
};

/** Native checkbox with mosque-green accent — keeps built-in semantics and focus behaviour. */
export function CheckboxRow({
  id,
  name,
  checked,
  onChange,
  error,
  children,
}: Props) {
  const errorId = `${id}-error`;

  return (
    <div>
      <div className="flex items-start gap-2.5">
        <input
          id={id}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={[
            "mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded accent-[#0d4d3b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]",
            error ? "outline outline-1 outline-[#b0472f]" : "",
          ].join(" ")}
        />
        <label
          htmlFor={id}
          className="cursor-pointer text-[13px] leading-6 text-[#3f4a44]"
        >
          {children}
        </label>
      </div>

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
