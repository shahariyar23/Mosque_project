import { initialsOf } from "@/lib/mosque/format";

/**
 * Initials avatar. There are no member photographs in the system, so an avatar is a coloured
 * monogram — and the colour is derived from the name rather than stored, so the same person is the
 * same colour on every screen without a field to keep in sync.
 *
 * Always `aria-hidden`: the name it stands for is invariably rendered next to it, and announcing
 * "AR" before "Ahmed Rahman" adds nothing.
 */

const palettes = [
  "border-[#c2d8cb] bg-[#eaf2ed] text-[#0b4634]",
  "border-[#e3ce9d] bg-[#f7f0df] text-[#7d5f18]",
  "border-[#c5dae2] bg-[#ebf2f5] text-[#1d5265]",
  "border-[#dcdacd] bg-[#f2f1ea] text-[#4d564f]",
  "border-[#d3cfe0] bg-[#f1eff6] text-[#493f66]",
] as const;

const sizes = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-[13px]",
  lg: "h-14 w-14 text-[17px]",
  xl: "h-20 w-20 text-[24px]",
} as const;

export type AvatarSize = keyof typeof sizes;

/** Stable index from the name. Sum of code points, so it never depends on insertion order. */
function paletteFor(name: string): string {
  let total = 0;
  for (let index = 0; index < name?.length; index += 1) total += name.charCodeAt(index);
  return palettes[total % palettes.length];
}

export function Avatar({
  name,
  size = "md",
  className = "",
}: {
  name: string;
  size?: AvatarSize;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full border font-semibold tracking-[.02em] ${paletteFor(name)} ${sizes[size]} ${className}`}
    >
      {initialsOf(name)}
    </span>
  );
}

/**
 * Avatar plus name and a line of supporting text — the first cell of the members, volunteers and
 * registrations tables. One component so those three tables cannot drift apart.
 */
export function PersonCell({
  name,
  meta,
  size = "md",
}: {
  name: string;
  meta?: string;
  size?: AvatarSize;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Avatar name={name} size={size} />
      <span className="min-w-0">
        <span className="block truncate font-medium text-[#17211d]">{name}</span>
        {meta ? <span className="block truncate text-[12px] font-normal text-[#69726d]">{meta}</span> : null}
      </span>
    </span>
  );
}
