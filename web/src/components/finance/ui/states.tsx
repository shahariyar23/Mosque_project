import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/finance/ui/icon";

type EmptyStateProps = {
  icon?: IconName;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

export function FinanceEmptyState({ icon = "inbox", title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-14 text-center ${className}`}>
      <span className="grid h-14 w-14 place-items-center rounded-full border border-[#e3ce9d] bg-[#f7f0df] text-[#a97b23]">
        <Icon name={icon} size={24} />
      </span>
      <h3 className="mt-5 text-lg font-semibold text-[#17211d]">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#69726d]">{description}</p>
      {action ? <div className="mt-6 flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
    </div>
  );
}

/**
 * Shown when a request fails. The message stays in plain language — raw API, server or
 * database errors are never surfaced to mosque staff.
 */
export function FinanceErrorState({
  title = "Unable to load financial data.",
  description = "Something went wrong while loading this section. Your records are safe — please try again.",
  onRetry,
  className = "",
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-14 text-center ${className}`}>
      <span className="grid h-14 w-14 place-items-center rounded-full border border-[#ebc8c4] bg-[#fbeceb] text-[#a13228]">
        <Icon name="alert" size={24} />
      </span>
      <h3 className="mt-5 text-lg font-semibold text-[#17211d]">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#69726d]">{description}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md bg-[#0d4d3b] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0a3f30] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
        >
          <Icon name="refresh" size={16} />
          Try Again
        </button>
      ) : null}
    </div>
  );
}

/** Rendered in place of a page body when the signed-in role holds none of the needed permissions. */
export function NoAccessState({
  area,
  description = "Your role does not include access to this area. Speak to the mosque administrator if you need it.",
}: {
  area: string;
  description?: string;
}) {
  return (
    <div className="rounded-lg border border-[#deddd3] bg-white">
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full border border-[#dcdacd] bg-[#f2f1ea] text-[#565f59]">
          <Icon name="lock" size={24} />
        </span>
        <h2 className="mt-5 text-lg font-semibold text-[#17211d]">{area} is not available for your role</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#69726d]">{description}</p>
      </div>
    </div>
  );
}

/** Quiet inline note, used for scope explanations and "backend not connected yet" hints. */
export function InlineNotice({
  icon = "info",
  tone = "info",
  children,
  className = "",
}: {
  icon?: IconName;
  tone?: "info" | "gold" | "neutral" | "danger";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    info: "border-[#c5dae2] bg-[#ebf2f5] text-[#1d5265]",
    gold: "border-[#e3ce9d] bg-[#f7f0df] text-[#7d5f18]",
    neutral: "border-[#dcdacd] bg-[#f6f5ee] text-[#4d564f]",
    danger: "border-[#ebc8c4] bg-[#fbeceb] text-[#a13228]",
  } as const;
  return (
    <div className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-[13px] leading-6 ${tones[tone]} ${className}`}>
      <span className="mt-0.5 shrink-0">
        <Icon name={icon} size={16} />
      </span>
      <p>{children}</p>
    </div>
  );
}
