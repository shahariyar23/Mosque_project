import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/finance/ui/icon";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "gold" | "danger";
export type ButtonSize = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b] cursor-pointer disabled:cursor-not-allowed disabled:opacity-55";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-[#0d4d3b] text-white hover:bg-[#0a3f30]",
  secondary: "border border-[#cfd4cd] bg-white text-[#17211d] hover:border-[#0d4d3b] hover:text-[#0d4d3b]",
  ghost: "text-[#0d4d3b] hover:bg-[#eef2ec]",
  gold: "bg-[#c79a45] text-[#15251f] hover:bg-[#b98c37]",
  danger: "border border-[#e0bab4] bg-white text-[#94291f] hover:bg-[#fbeceb]",
};

/** 44px tall at md so every action stays comfortable on touch screens. */
const sizes: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-[13px]",
  md: "min-h-11 px-4 text-sm",
};

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconAfter?: IconName;
  loading?: boolean;
  children?: ReactNode;
  className?: string;
};

function Spinner({ size }: { size?: ButtonSize }) {
  const dim = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <svg className={`animate-spin ${dim} shrink-0 text-current`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconAfter,
  loading = false,
  disabled,
  children,
  className = "",
  type = "button",
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      disabled={isDisabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {loading ? <Spinner size={size} /> : icon ? <Icon name={icon} size={size === "sm" ? 15 : 17} /> : null}
      {children}
      {!loading && iconAfter ? <Icon name={iconAfter} size={size === "sm" ? 15 : 17} /> : null}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "secondary",
  size = "md",
  icon,
  iconAfter,
  children,
  className = "",
  ariaLabel,
}: CommonProps & { href: string; ariaLabel?: string }) {
  return (
    <Link href={href} aria-label={ariaLabel} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}>
      {icon ? <Icon name={icon} size={size === "sm" ? 15 : 17} /> : null}
      {children}
      {iconAfter ? <Icon name={iconAfter} size={size === "sm" ? 15 : 17} /> : null}
    </Link>
  );
}

/** Compact icon-only action for table rows. The label is required for screen readers. */
export function IconButton({
  icon,
  label,
  tone = "neutral",
  loading = false,
  disabled,
  className = "",
  ...rest
}: { icon: IconName; label: string; tone?: "neutral" | "danger"; loading?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const toneClass =
    tone === "danger"
      ? "text-[#94291f] hover:border-[#e0bab4] hover:bg-[#fbeceb]"
      : "text-[#4d564f] hover:border-[#0d4d3b] hover:text-[#0d4d3b]";
  const isDisabled = disabled || loading;
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={isDisabled}
      className={`grid h-9 w-9 place-items-center rounded-md border border-transparent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b] cursor-pointer disabled:cursor-not-allowed disabled:opacity-55 ${toneClass} ${className}`}
      {...rest}
    >
      {loading ? <Spinner size="sm" /> : <Icon name={icon} size={16} />}
    </button>
  );
}

export function IconButtonLink({
  href,
  icon,
  label,
  tone = "neutral",
  className = "",
}: {
  href: string;
  icon: IconName;
  label: string;
  tone?: "neutral" | "danger";
  className?: string;
}) {
  const toneClass =
    tone === "danger"
      ? "text-[#94291f] hover:border-[#e0bab4] hover:bg-[#fbeceb]"
      : "text-[#4d564f] hover:border-[#0d4d3b] hover:text-[#0d4d3b]";
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className={`grid h-9 w-9 place-items-center rounded-md border border-transparent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b] cursor-pointer ${toneClass} ${className}`}
    >
      <Icon name={icon} size={16} />
    </Link>
  );
}
