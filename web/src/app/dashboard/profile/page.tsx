import { redirect } from "next/navigation";

/**
 * The brief named this route `/dashboard/profile`. The sidebar's "Profile" row already pointed at
 * `/dashboard/mosque` before this work started, and that path is the more accurate one — the page is
 * the *mosque's* profile, not the signed-in person's, which will live in the account area.
 *
 * Keeping both working costs three lines, so the requested path redirects rather than the navigation
 * being rewritten around a name that would read wrongly next to a future user profile.
 */
export default function ProfileRedirect() {
  redirect("/dashboard/mosque");
}
