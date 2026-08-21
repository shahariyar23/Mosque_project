import Link from "next/link";
import { Icon } from "@/components/finance/ui/icon";

export type Crumb = { label: string; href?: string };

/** Dashboard > Finance > Transactions. The last crumb is the current page and is not a link. */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-[12px] text-[#69726d]">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {index > 0 ? (
                <Icon name="chevron-right" size={13} className="text-[#a9b0aa]" />
              ) : null}
              {item.href && !last ? (
                <Link
                  href={item.href}
                  className="rounded transition-colors hover:text-[#0d4d3b] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={last ? "font-semibold text-[#3d453f]" : ""}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
