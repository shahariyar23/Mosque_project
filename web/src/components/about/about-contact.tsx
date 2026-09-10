"use client";

import { useLanguage } from "@/components/language-provider";
import { siteConfig } from "@/config/site";
import { MapPin, Phone, Mail, Clock, ExternalLink } from "lucide-react";
import { type PublicMosqueInfo } from "@/services/publicHomeService";

interface AboutContactProps {
  mosque?: PublicMosqueInfo | null;
  loading?: boolean;
}

export function AboutContact({ mosque, loading = false }: AboutContactProps) {
  const { language } = useLanguage();
  const bn = language === "bn";

  const mosqueName = mosque?.name || (bn ? siteConfig.fullNameBn : siteConfig.fullName);
  const address = [mosque?.addressLine, mosque?.city, mosque?.district, mosque?.country]
    .filter(Boolean)
    .join(", ") || (bn ? "১২৩ পিস অ্যাভিনিউ, ঢাকা, বাংলাদেশ" : "123 Peace Avenue, Dhaka, Bangladesh");

  const phone = mosque?.phone || "+880 1712 345678";
  const email = mosque?.email || siteConfig.email;
  const mapQuery = encodeURIComponent(`${mosqueName} ${mosque?.city || "Dhaka"}`);

  return (
    <section id="contact" className="py-20 sm:py-28 bg-[#fdfbf7] text-[#17211d] border-b border-[#eae6db]">
      <div className="mx-auto max-w-7xl px-4 xs:px-6 lg:px-8">
        <div className="grid gap-12 lg:gap-16 lg:grid-cols-12">
          
          {/* Left Column: Contact Details */}
          <div className="lg:col-span-6 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 text-[#0d4d3b] text-xs xs:text-sm font-bold tracking-[0.2em] uppercase">
                <span className="text-[#c79a45]">✦</span>
                <span>{bn ? "আমাদের ঠিকানা ও যোগাযোগ" : "VISIT & CONNECT"}</span>
              </div>
              
              <h2 className="mt-3 text-3xl xs:text-4xl sm:text-5xl font-serif font-bold text-[#0e2a22] leading-tight">
                {bn ? "আমরা আপনাকে স্বাগত জানাতে প্রস্তুত" : "We Welcome You With Open Hearts"}
              </h2>

              <p className="mt-4 text-sm xs:text-base text-[#69726d] leading-relaxed">
                {bn
                  ? "যে কোনো জিজ্ঞাসা, দোয়া বা পরামর্শের জন্য আমাদের সাথে সরাসরি যোগাযোগ করতে পারেন অথবা মসজিদে সরাসরি উপস্থিত হতে পারেন।"
                  : "Have questions regarding prayer timings, educational registrations, or community assistance? Reach out to our administrative team or visit us in person."}
              </p>

              {/* Contact Information Blocks */}
              <div className="mt-8 space-y-5">
                
                {/* Address */}
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-[#e8e4d9] shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-[#0d4d3b]/10 text-[#0d4d3b] flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#0d4d3b] uppercase tracking-wider block">
                      {bn ? "মসজিদের ঠিকানা" : "Physical Address"}
                    </span>
                    <address className="not-italic text-sm text-[#384640] font-medium mt-0.5 leading-snug">
                      {mosqueName}
                      <br />
                      {address}
                    </address>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#c79a45] hover:underline mt-1.5"
                    >
                      <span>{bn ? "গুগল ম্যাপে দেখুন" : "View on Google Maps"}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-[#e8e4d9] shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-[#0d4d3b]/10 text-[#0d4d3b] flex items-center justify-center shrink-0 mt-0.5">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#0d4d3b] uppercase tracking-wider block">
                      {bn ? "টেলিফোন ও হেল্পলাইন" : "Direct Helpline"}
                    </span>
                    <a
                      href={`tel:${phone.replace(/\s+/g, '')}`}
                      className="text-sm font-semibold text-[#0e2a22] hover:text-[#c79a45] transition block mt-0.5"
                    >
                      {phone}
                    </a>
                    <span className="text-xs text-[#718079]">
                      {bn ? "সকাল ৯টা থেকে বিকাল ৫টা পর্যন্ত" : "Available 9:00 AM – 5:00 PM"}
                    </span>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-[#e8e4d9] shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-[#0d4d3b]/10 text-[#0d4d3b] flex items-center justify-center shrink-0 mt-0.5">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#0d4d3b] uppercase tracking-wider block">
                      {bn ? "অফিসিয়াল ইমেইল" : "Inquiries & Support"}
                    </span>
                    <a
                      href={`mailto:${email}`}
                      className="text-sm font-semibold text-[#0e2a22] hover:text-[#c79a45] transition block mt-0.5"
                    >
                      {email}
                    </a>
                    <span className="text-xs text-[#718079]">
                      {bn ? "আমরা সাধারণত ২৪ ঘণ্টার মধ্যে উত্তর দিই" : "Responses typically within 24 hours"}
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* Timetable info */}
            <div className="mt-8 p-5 rounded-2xl bg-[#f4f1e8] border border-[#e5e1d3] flex items-center gap-3.5">
              <Clock className="w-5 h-5 text-[#c79a45] shrink-0" />
              <div className="text-xs text-[#4a5852]">
                <span className="font-bold text-[#0e2a22] block">
                  {bn ? "মসজিদ উন্মুক্ত থাকার সময়:" : "Mosque Sanctuary Hours:"}
                </span>
                <span>
                  {bn
                    ? "প্রতিদিন ফজরের আজান থেকে এশার নামাজ শেষ হওয়া পর্যন্ত মুসল্লিদের জন্য উন্মুক্ত।"
                    : "Open daily from Fajr dawn call until completion of Isha night prayers."}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Direction Card & Quick Message Notice */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            <div className="p-8 sm:p-10 rounded-3xl bg-white border border-[#e5e1d3] shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#c79a45]/5 rounded-bl-full pointer-events-none" />

              <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#0e2a22]">
                {bn ? "মসজিদে আগমন ও দিকনির্দেশনা" : "Planning Your Visit"}
              </h3>
              
              <div className="mt-6 space-y-4 text-xs xs:text-sm text-[#5d6a64] leading-relaxed">
                <div className="p-4 rounded-xl bg-[#faf8f4] border border-[#ede9df]">
                  <b className="text-[#0d4d3b] block mb-1">
                    {bn ? "🚗 পার্কিং সুবিধা" : "🚗 Vehicle & Bicycle Parking"}
                  </b>
                  <p>
                    {bn
                      ? "মসজিদ প্রাঙ্গণে মুসুল্লিদের জন্য পর্যাপ্ত সাইকেল ও মোটরসাইকেল পার্কিং এবং আশপাশে গাড়ি পার্কিংয়ের সুব্যবস্থা রয়েছে।"
                      : "Designated bicycle racks and motorcycle stands are available inside the perimeter with street parking nearby."}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#faf8f4] border border-[#ede9df]">
                  <b className="text-[#0d4d3b] block mb-1">
                    {bn ? "♿ বিশেষ চাহিদাসম্পন্ন ব্যক্তিবর্গ" : "♿ Wheelchair & Accessibility"}
                  </b>
                  <p>
                    {bn
                      ? "প্রধান প্রবেশদ্বারে র‍্যাম্প সুবিধা এবং প্রবীণদের জন্য হুইলচেয়ার ও বসার চেয়ারের সার্বক্ষণিক ব্যবস্থা রয়েছে।"
                      : "Ramps are available at the main entrance along with chairs inside the prayer hall for elders and those in need."}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#faf8f4] border border-[#ede9df]">
                  <b className="text-[#0d4d3b] block mb-1">
                    {bn ? "🕊️ মার্জিত পোশাক পরিধান" : "🕊️ Respectful Sanctuary Attire"}
                  </b>
                  <p>
                    {bn
                      ? "আল্লাহর ঘরের মর্যাদা রক্ষার্থে মার্জিত ও শালীন পোশাক পরিধান করে মসজিদে আগমনের অনুরোধ করা হচ্ছে।"
                      : "Visitors are kindly requested to dress modestly in respect of the sacred worship environment."}
                  </p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-[#f0ede4] flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-xs text-[#718079]">
                  {bn ? "সরাসরি ফোন করুন:" : "Need immediate assistance?"}
                </span>
                <a
                  href={`tel:${phone.replace(/\s+/g, '')}`}
                  className="px-5 py-2.5 rounded-xl bg-[#0d4d3b] text-white font-semibold text-xs hover:bg-[#09382b] transition shadow-sm w-full sm:w-auto text-center"
                >
                  {bn ? `কল করুন: ${phone}` : `Call ${phone}`}
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
