import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { DonationPage } from "@/components/donation/donation-page";

export default function Donations() {
  return (
    <main className="min-h-screen flex flex-col bg-[#f8f6ef]">
      <SiteHeader />
      <div className="flex-1">
        <DonationPage />
      </div>
      <SiteFooter />
    </main>
  );
}
