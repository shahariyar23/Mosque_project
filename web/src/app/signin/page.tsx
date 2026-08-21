import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SigninPage } from "@/components/signin/signin-page";

const description =
  "Sign in to your Noor Community Mosque account with your email address or phone number to access prayer reminders, events and your community profile.";

export const metadata: Metadata = {
  title: "Sign In | Noor Community Mosque",
  description,
  openGraph: {
    title: "Sign In | Noor Community Mosque",
    description,
    type: "website",
  },
};

export default function Signin() {
  return (
    <main>
      <SiteHeader />
      <SigninPage />
      <SiteFooter />
    </main>
  );
}
