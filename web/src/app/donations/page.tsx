import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { DonationPage } from "@/components/donation/donation-page";

export default function Donations() {
  return (
    <main>
      <SiteHeader />
      <DonationPage />
      <SiteFooter />
    </main>
  );
}
