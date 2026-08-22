import Link from "next/link";
import { Icon, type IconName } from "@/components/finance/ui/icon";
import { toneBadgeClass, type Tone } from "@/lib/finance/status";
import { formatRelativeTime } from "@/lib/mosque/format";
import type { ActivityItem, ActivityKind } from "@/lib/mosque/types";

/**
 * Recent-activity feed.
 *
 * An ordered list, not a stack of divs: the order is the information. The connecting rule is drawn on
 * the `<li>` with a border rather than an absolutely-positioned element, so it cannot fall out of step
 * with a row that wraps onto two lines.
 */
const kindStyle: Record<ActivityKind, { icon: IconName; tone: Tone }> = {
  member: { icon: "user-plus", tone: "success" },
  registration: { icon: "clipboard-check", tone: "info" },
  volunteer: { icon: "hands-heart", tone: "gold" },
  prayer: { icon: "moon", tone: "info" },
  event: { icon: "calendar-days", tone: "gold" },
  settings: { icon: "settings", tone: "neutral" },
  finance: { icon: "coins", tone: "success" },
};

export function ActivityTimeline({ items }: { items: ActivityItem[] }) {
  return (
    <ol className="space-y-0">
      {items.map((item, index) => {
        const style = kindStyle[item.kind];
        const last = index === items.length - 1;
        return (
          <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
            {/* The rail. Hidden on the final row so the line stops at the last dot. */}
            {last ? null : (
              <span aria-hidden="true" className="absolute left-[15px] top-8 bottom-0 w-px bg-[#eceae0]" />
            )}
            <span
              aria-hidden="true"
              className={`relative z-[1] mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border ${toneBadgeClass[style.tone]}`}
            >
              <Icon name={style.icon} size={15} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="text-[13.5px] font-semibold leading-5 text-[#17211d]">
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="rounded underline-offset-2 transition-colors hover:text-[#0d4d3b] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"
                    >
                      {item.title}
                    </Link>
                  ) : (
                    item.title
                  )}
                </p>
                <p className="shrink-0 text-[11.5px] text-[#8b938d]">{formatRelativeTime(item.at)}</p>
              </div>
              <p className="mt-0.5 text-[12.5px] leading-5 text-[#69726d]">{item.description}</p>
              {item.actor ? <p className="mt-1 text-[11.5px] text-[#9aa19c]">by {item.actor}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
