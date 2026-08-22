import { redirect } from "next/navigation";

/**
 * The brief named this route `/dashboard/jummah`. The navigation and the page live at
 * `/dashboard/jumuah`, which is the standard transliteration of جمعة and was already in
 * `lib/navigation.ts` before this work started.
 *
 * Rather than change the spelling everywhere or leave a link in the brief broken, the requested path
 * redirects to the real one. A permanent redirect, because the destination is not going to move.
 */
export default function JummahRedirect() {
  redirect("/dashboard/jumuah");
}
