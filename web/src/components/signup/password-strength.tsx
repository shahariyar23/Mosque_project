import { getPasswordStrength, passwordRequirements } from "./signup-validation";
import { CheckIcon, CircleIcon } from "./icons";

type Props = {
  id: string;
  password: string;
};

const meterColors = [
  "bg-[#d8d5c8]",
  "bg-[#b0472f]",
  "bg-[#c79a45]",
  "bg-[#4e8a5f]",
  "bg-[#0d4d3b]",
];
const labelColors = [
  "text-[#8d948f]",
  "text-[#9c3a22]",
  "text-[#9a7328]",
  "text-[#3f7550]",
  "text-[#0d4d3b]",
];

/**
 * Strength meter plus the live requirement checklist.
 * Status is carried by both an icon shape and a text label, never by colour alone.
 */
export function PasswordStrength({ id, password }: Props) {
  const { score, label } = getPasswordStrength(password);
  const percent = password ? Math.max(score, 1) * 25 : 0;

  return (
    <div
      id={id}
      className="mt-3 rounded-md border border-[#ece9df] bg-[#faf9f4] p-3"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11.5px] font-medium uppercase tracking-[.12em] text-[#8d948f]">
          Password strength
        </span>
        <span
          className={`text-[12px] font-semibold ${labelColors[score]}`}
          aria-live="polite"
        >
          {password ? label : "—"}
        </span>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#e7e4d8]">
        <div
          className={`h-full rounded-full transition-[width,background-color] duration-300 ease-out ${meterColors[score]}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {passwordRequirements.map((requirement) => {
          const met = requirement.test(password);
          return (
            <li
              key={requirement.id}
              className="flex items-center gap-1.5 text-[12px] leading-5"
            >
              {met ? (
                <CheckIcon className="h-3.5 w-3.5 shrink-0 text-[#0d4d3b]" />
              ) : (
                <CircleIcon className="h-3.5 w-3.5 shrink-0 text-[#b6bcb6]" />
              )}
              <span className={met ? "text-[#3f5d4f]" : "text-[#8d948f]"}>
                {requirement.label}
              </span>
              <span className="sr-only">
                {met ? " — met" : " — not met yet"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
