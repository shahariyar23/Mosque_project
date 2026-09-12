"use client";

import Link from "next/link";
import { Building2, Clock3, Home, Landmark, Mail, MapPin, Phone, Star } from "lucide-react";
import { IslamicTexture } from "@/components/islamic-texture";
import { useMosqueBranding } from "@/components/mosque-branding-provider";
import { siteConfig } from "@/config/site";

export function NotFoundPage() {
  const { branding } = useMosqueBranding();
  const mosqueName = branding.name || siteConfig.fullName;
  const email = branding.email || siteConfig.email;
  const phone = branding.phone;
  const telephone = phone?.replace(/[^+\d]/g, "");
  const location = [branding.city, branding.country].filter(Boolean).join(", ");
  const address = [
    branding.addressLine,
    branding.city,
    branding.district,
    branding.country,
    branding.postalCode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="relative isolate overflow-hidden bg-[#073A2D] px-4 pb-16 pt-44 sm:px-6 sm:pb-24 sm:pt-48 lg:px-8">
      <IslamicTexture
        variant="hero"
        position="left"
        opacity={0.06}
        className="-left-28 top-40 h-[38rem] w-[38rem] bg-contain"
      />
      <IslamicTexture
        variant="hero"
        position="right"
        opacity={0.055}
        className="-right-28 top-24 h-[38rem] w-[38rem] bg-contain"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-32 mx-auto h-80 max-w-5xl bg-gradient-to-r from-[#d7eddd] via-[#eef8e9] to-[#e1f0d6] opacity-80 blur-3xl"
      />

      <section className="relative mx-auto max-w-[32rem] rounded-xl border border-white/80 bg-white px-6 py-10 text-center shadow-[0_18px_35px_rgba(23,33,29,0.12)] sm:px-10 sm:py-11">
        <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-[#f4f3ed] px-3 py-1.5 text-left text-[10px] text-[#69726d] sm:text-[11px]">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#073a2d] text-[#f0ca7d]">
            <Building2 aria-hidden="true" className="h-3 w-3" />
          </span>
          <span className="truncate font-semibold text-[#17211d]">{mosqueName}</span>
          <span aria-hidden="true" className="text-[#b6bbb7]">•</span>
          {location && <span className="hidden sm:inline">{location}</span>}
        </div>

        <div className="relative mt-4 inline-flex items-start">
          <span className="font-montserrat text-7xl font-semibold tracking-[-0.07em] text-[#073a2d] sm:text-8xl">40</span>
          <span className="font-montserrat text-7xl font-semibold tracking-[-0.07em] text-[#c79a45] sm:text-8xl">4</span>
          <Star aria-hidden="true" className="absolute -right-6 -top-1 h-5 w-5 fill-[#fff8df] text-[#e0be79]" />
        </div>

        <p className="mx-auto mt-2 inline-flex items-center rounded-full bg-[#f7f5ef] px-3 py-1 text-[10px] font-medium tracking-[0.08em] text-[#69726d]">
          PATH NOT FOUND · পথটি খুঁজে নেই
        </p>
        <h1 className="mt-3 font-sans text-[25px] font-bold tracking-[-0.03em] text-[#071d16] sm:text-[27px]">
          We Couldn&apos;t Find That Page
        </h1>

        <div className="mt-3 border-y border-[#f0eee7] py-3">
          <p lang="ar" dir="rtl" className="text-sm text-[#073a2d]">
            إِنَّ مَعَ الْعُسْرِ يُسْرًا
          </p>
          <p className="mt-1 text-[10px] italic leading-4 text-[#59645f]">
            “Even when a path is lost, guidance and light are always near.”
          </p>
        </div>

        <p className="mx-auto mt-4 max-w-sm text-[11px] leading-[1.45] text-[#59645f]">
          The record, khutbah, audio, or service page you requested may have moved, been updated for
          archival stewardship, or be temporarily unavailable in our community portal.
        </p>

        <nav aria-label="Helpful links" className="mt-6 grid gap-2 sm:grid-cols-3">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md bg-[#edc544] px-3 text-[11px] font-semibold text-[#17211d] transition-colors hover:bg-[#dcb137] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#073a2d]"
          >
            <Home aria-hidden="true" className="h-3.5 w-3.5" />
            Return to Home
          </Link>
          <Link
            href="/prayer-times"
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md bg-[#f5f4ef] px-3 text-[11px] font-semibold text-[#073a2d] transition-colors hover:bg-[#e9e8e1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#073a2d]"
          >
            <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
            Prayer Times
          </Link>
          <Link
            href="/transparency"
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md bg-[#f5f4ef] px-3 text-[11px] font-semibold text-[#073a2d] transition-colors hover:bg-[#e9e8e1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#073a2d]"
          >
            <Landmark aria-hidden="true" className="h-3.5 w-3.5" />
            Public Ledger
          </Link>
        </nav>

        <div className="mt-8 border-t border-[#ece9df] pt-6 text-[#69726d]">
          <p className="inline-flex items-center gap-1.5 text-[11px]">
            <MapPin aria-hidden="true" className="h-3.5 w-3.5 text-[#073a2d]" />
            Masjid Secretariat &amp; Assistance
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px]">
            <a className="inline-flex items-center gap-1 hover:text-[#073a2d] hover:underline" href={`mailto:${email}`}>
              <Mail aria-hidden="true" className="h-3 w-3" />
              {email}
            </a>
            {phone && telephone && (
              <a className="inline-flex items-center gap-1 hover:text-[#073a2d] hover:underline" href={`tel:${telephone}`}>
                <Phone aria-hidden="true" className="h-3 w-3" />
                {phone}
              </a>
            )}
          </div>
          {address && <p className="mt-2 text-[10px] text-[#8b938f]">{address}</p>}
        </div>
      </section>
    </main>
  );
}
