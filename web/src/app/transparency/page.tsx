import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { PublicTransparencySection } from "@/components/transparency/public-transparency-section";

export const metadata: Metadata = {
  title: "Financial Transparency & Community Funds · Noor Community Mosque",
  description:
    "Explore our verified community funds, fundraising progress, and Friday congregational collection history.",
};

export default function TransparencyPage() {
  return (
    <main className="min-h-screen bg-[#fbfbf9]">
      <SiteHeader />
      <div className="pt-28 pb-16">
        <PublicTransparencySection />
      </div>
      <SiteFooter />
    </main>
  );
}
