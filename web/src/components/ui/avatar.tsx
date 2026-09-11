"use client";

import { useState } from "react";
import { initialsOf } from "@/lib/mosque/format";

/**
 * Monogram and photograph avatar. Renders a photograph from Cloudinary when
 * available, falling back to a deterministic coloured monogram.
 *
 * Always `aria-hidden`: the name it stands for is invariably rendered next to it.
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
  imageUrl,
  avatarUrl,
  size = "md",
  className = "",
}: {
  name: string;
  imageUrl?: string | null;
  avatarUrl?: string | null;
  size?: AvatarSize;
  className?: string;
}) {
  const photo = imageUrl || avatarUrl;
  const [imageFailed, setImageFailed] = useState(false);

  if (photo && !imageFailed) {
    return (
      <span
        aria-hidden="true"
        className={`relative inline-block shrink-0 overflow-hidden rounded-full border border-[#dcdacd] bg-[#f2f1ea] ${sizes[size]} ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      </span>
    );
  }

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
 * Avatar plus name and a line of supporting text — the first cell of the members, volunteers,
 * committee and registrations tables.
 */
export function PersonCell({
  name,
  meta,
  imageUrl,
  avatarUrl,
  size = "md",
}: {
  name: string;
  meta?: string;
  imageUrl?: string | null;
  avatarUrl?: string | null;
  size?: AvatarSize;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Avatar name={name} imageUrl={imageUrl} avatarUrl={avatarUrl} size={size} />
      <span className="min-w-0">
        <span className="block truncate font-medium text-[#17211d]">{name}</span>
        {meta ? <span className="block truncate text-[12px] font-normal text-[#69726d]">{meta}</span> : null}
      </span>
    </span>
  );
}

