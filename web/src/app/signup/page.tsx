import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SignupPage } from "@/components/signup/signup-page";
import { RequireGuest } from "@/components/auth/route-guards";

export const metadata: Metadata = {
  title: "Create Your Account | Noor Community Mosque",
  description:
    "Join our mosque community to stay connected with prayer times, events, Islamic programs and community activities.",
  openGraph: {
    title: "Create Your Account | Noor Community Mosque",
    description:
      "Join our mosque community to stay connected with prayer times, events, Islamic programs and community activities.",
    type: "website",
  },
};

export default function Signup() {
  return (
    <RequireGuest>
      <main>
        <SiteHeader />
        <SignupPage />
        <SiteFooter />
      </main>
    </RequireGuest>
  );
}
