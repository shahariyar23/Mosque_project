import type { ReactNode } from "react";
import { Breadcrumb, type Crumb } from "@/components/dashboard/breadcrumb";

type Props = {
  title: string;
  subtitle?: string;
  crumbs?: Crumb[];
  /** Primary and secondary buttons. Wrap each in <Can> so nothing unavailable is shown. */
  actions?: ReactNode;
  /** Optional row under the heading, e.g. a date-range selector. */
  toolbar?: ReactNode;
};

/**
 * Standard page head for every dashboard route: breadcrumb, title, one-line explanation and
 * the page actions. Actions sit under the title on phones so the heading never gets squeezed.
 */
export function PageHeader({ title, subtitle, crumbs, actions, toolbar }: Props) {
  return (
    <div className="finance-enter">
      {crumbs && crumbs.length > 0 ? <Breadcrumb items={crumbs} /> : null}
      <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-[22px] leading-tight text-[#17211d] sm:text-[26px]">{title}</h1>
          {subtitle ? <p className="mt-1.5 max-w-2xl text-[13.5px] leading-6 text-[#69726d]">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:justify-end">{actions}</div> : null}
      </div>
      {toolbar ? <div className="mt-4">{toolbar}</div> : null}
    </div>
  );
}
