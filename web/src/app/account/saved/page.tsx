"use client";

import Link from "next/link";
import { Bookmark } from "lucide-react";

/** Saved content has no member scoped API, so no seed records are shown. */
export default function SavedContentPage() {
  return <section className="rounded-xl border border-dashed border-[#e5e2d8] bg-white px-6 py-14 text-center"><Bookmark className="mx-auto h-9 w-9 text-[#0d4d3b]" aria-hidden="true" /><h1 className="mt-4 text-2xl font-semibold text-[#17211d]">Saved Content</h1><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#69726d]">Saved content will appear here once it is available for your account.</p><Link href="/" className="mt-6 inline-flex rounded-md bg-[#0d4d3b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#073a2d]">Explore content</Link></section>;
}
