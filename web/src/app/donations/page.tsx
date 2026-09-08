import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { DonationFooterSection } from "@/components/donation-footer-section";

export default function Donations() {
  return (
    <main className="min-h-screen flex flex-col bg-[#f8f6ef]">
      <SiteHeader />
      <div className="flex-1">
        <DonationFooterSection />
      </div>
      <SiteFooter />
    </main>
  );
}
