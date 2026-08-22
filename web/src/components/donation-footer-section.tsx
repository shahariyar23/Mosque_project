"use client";
import { useLanguage } from "@/components/language-provider";

export function DonationFooterSection() {
  const { language } = useLanguage();
  const bn = language === "bn";
  const amounts = bn
    ? ["৳৫০০", "৳১,০০০", "৳২,৫০০", "৳৫,০০০", "ইচ্ছামতো"]
    : ["৳500", "৳1,000", "৳2,500", "৳5,000", "Custom"];
  return (
    <section id="donations" className="bg-[#073a2d] py-20 text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 lg:grid-cols-2 lg:px-8">
        <div>
          <p className="text-xs font-bold tracking-[.2em] text-[#e0be79]">
            {bn ? "উদ্দেশ্যপূর্ণ দান" : "GIVE WITH PURPOSE"}
          </p>
          <h2 className="mt-4 text-4xl font-semibold">
            {bn ? "আপনার মসজিদকে সহায়তা করুন।" : "Support your mosque."}
          </h2>
          <p className="mt-5 max-w-lg leading-7 text-white/70">
            {bn
              ? "আপনার দান ইবাদত, ইসলামী শিক্ষা, কমিউনিটি কার্যক্রম এবং প্রয়োজনীয় পরিবারগুলোর সহায়তা বজায় রাখে।"
              : "Your generosity sustains worship, Islamic education, community programmes and care for families in need."}
          </p>
        </div>
        <div className="bg-white p-6 text-[#17211d]">
          <p className="font-semibold">
            {bn ? "দানের পরিমাণ বেছে নিন" : "Choose a donation amount"}
          </p>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {amounts.map((amount) => (
              <button
                className="border border-[#d8d8ce] p-3 text-sm font-semibold hover:border-[#0d4d3b]"
                key={amount}
              >
                {amount}
              </button>
            ))}
          </div>
          <button className="mt-5 w-full bg-[#c79a45] p-3 font-semibold">
            {bn ? "এখনই দান করুন" : "Donate Now"}
          </button>
        </div>
      </div>
    </section>
  );
}
