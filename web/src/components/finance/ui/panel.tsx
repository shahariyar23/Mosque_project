import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/finance/ui/icon";

/** Standard surface for every finance block: ivory page, white panel, hairline border. */
export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-lg border border-[#deddd3] bg-white shadow-[0_1px_2px_rgba(7,58,45,.04),0_10px_28px_-22px_rgba(7,58,45,.28)] ${className}`}
    >
      {children}
    </section>
  );
}

type PanelHeaderProps = {
  title: string;
  description?: string;
  icon?: IconName;
  actions?: ReactNode;
  /** Renders the title as the given heading level so page outlines stay sensible. */
  as?: "h2" | "h3";
};

export function PanelHeader({ title, description, icon, actions, as = "h2" }: PanelHeaderProps) {
  const Heading = as;
  return (
    <div className="flex flex-col gap-3 border-b border-[#e7e6dc] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md border border-[#e3ce9d] bg-[#f7f0df] text-[#a97b23]">
            <Icon name={icon} size={17} />
          </span>
        ) : null}
        <div className="min-w-0">
          <Heading className="truncate text-base font-semibold text-[#17211d]">{title}</Heading>
          {description ? <p className="mt-1 text-sm leading-6 text-[#69726d]">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function PanelBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`px-4 py-5 sm:px-6 ${className}`}>{children}</div>;
}

export function PanelFooter({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 border-t border-[#e7e6dc] px-4 py-3 sm:px-6 ${className}`}>
      {children}
    </div>
  );
}

/** Small gold eyebrow used across the public site and reused here for section labels. */
export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-[11px] font-bold uppercase tracking-[.2em] text-[#c79a45] ${className}`}>{children}</p>;
}
