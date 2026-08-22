import { Icon } from "@/components/finance/ui/icon";
import { formatClockTime } from "@/lib/mosque/format";
import type { PrayerSlot } from "@/lib/mosque/types";

/**
 * One prayer in the daily strip. Shared by the overview and the prayer-times page so the two can
 * never show the same prayer two different ways.
 *
 * The "next" state is carried by a visible label as well as the emerald fill, because a highlight
 * that is only a background colour tells a colour-blind or high-contrast user nothing.
 */
export function PrayerCard({
  slot,
  timeFormat = "12h",
  next = false,
  showIqamah = true,
}: {
  slot: PrayerSlot;
  timeFormat?: "12h" | "24h";
  next?: boolean;
  showIqamah?: boolean;
}) {
  const congregation = slot.isCongregation;

  return (
    <article
      aria-current={next ? "time" : undefined}
      className={`relative overflow-hidden rounded-lg border px-3 py-3.5 text-center transition-colors sm:px-3.5 ${
        next
          ? "border-[#0b4634] bg-[#0d4d3b] text-white shadow-[0_10px_28px_-18px_rgba(7,58,45,.55)]"
          : congregation
            ? "border-[#deddd3] bg-white"
            : "border-dashed border-[#deddd3] bg-[#faf9f4]"
      }`}
    >
      {next ? (
        <span className="absolute right-0 top-0 rounded-bl-md bg-[#c79a45] px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[.12em] text-[#15251f]">
          Next
        </span>
      ) : null}

      <span
        className={`mx-auto grid h-8 w-8 place-items-center rounded-md border ${
          next
            ? "border-white/25 bg-white/10 text-[#e0be79]"
            : congregation
              ? "border-[#e3ce9d] bg-[#f7f0df] text-[#a97b23]"
              : "border-[#dcdacd] bg-[#f2f1ea] text-[#8b938d]"
        }`}
      >
        <Icon name={slot.icon} size={16} />
      </span>

      <h3
        className={`mt-2.5 text-[12px] font-bold uppercase tracking-[.12em] ${
          next ? "text-white/85" : congregation ? "text-[#5c655f]" : "text-[#8b938d]"
        }`}
      >
        {slot.name}
      </h3>
      <p aria-hidden="true" className={`text-[13px] leading-5 ${next ? "text-[#e0be79]" : "text-[#a9b0aa]"}`}>
        {slot.arabic}
      </p>

      <p
        className={`mt-1.5 text-[17px] font-semibold leading-tight tabular-nums sm:text-[18px] ${
          next ? "text-white" : congregation ? "text-[#17211d]" : "text-[#69726d]"
        }`}
      >
        {formatClockTime(slot.adhan, timeFormat)}
      </p>

      {showIqamah ? (
        <p className={`mt-1 text-[11.5px] leading-4 ${next ? "text-white/70" : "text-[#8b938d]"}`}>
          {slot.iqamah ? (
            <>
              Iqamah <span className="font-semibold tabular-nums">{formatClockTime(slot.iqamah, timeFormat)}</span>
            </>
          ) : (
            "No congregation"
          )}
        </p>
      ) : null}
    </article>
  );
}

/** The faint eight-point girih star used behind the next-prayer panel. Decorative, so it is hidden. */
export function GirihWatermark({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 120"
      className={`pointer-events-none absolute ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.1}
    >
      <path d="M60 6 74 26 98 22 94 46 114 60 94 74 98 98 74 94 60 114 46 94 22 98 26 74 6 60 26 46 22 22 46 26z" />
      <path d="M60 26 70 40 87 37 84 54 98 60 84 66 87 83 70 80 60 94 50 80 33 83 36 66 22 60 36 54 33 37 50 40z" />
      <circle cx="60" cy="60" r="16" />
    </svg>
  );
}
