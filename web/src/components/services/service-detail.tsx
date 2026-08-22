"use client";

import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import type { MosqueService } from "@/components/services/service-data";

export function ServiceDetail({ service }: { service: MosqueService }) {
  const { language } = useLanguage();
  const bengali = language === "bn";
  return (
    <div className="grid gap-10 lg:grid-cols-[1.2fr_.8fr]">
      <article>
        <div
          className="grid h-64 place-items-center bg-[#ecece3] text-7xl text-[#c79a45]"
          aria-hidden="true"
        >
          {service.icon}
        </div>
        <div className="mt-10">
          <p className="text-xs font-bold tracking-[.2em] text-[#c79a45]">
            {bengali ? "সেবা সম্পর্কে" : "ABOUT THIS SERVICE"}
          </p>
          <h2 className="mt-3 text-3xl font-semibold">
            {bengali ? service.bnTitle : service.title}
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#69726d]">
            {bengali ? service.bnDescription : service.description}
          </p>
          <div className="mt-10 border-t border-[#deddd3] pt-8">
            <h3 className="text-2xl font-semibold">
              {bengali ? "পরবর্তী ধাপ" : "What happens next"}
            </h3>
            <p className="mt-3 leading-7 text-[#69726d]">
              {bengali
                ? "আমাদের টিম আপনার অনুরোধ পর্যালোচনা করে প্রয়োজনীয় তথ্য ও পরবর্তী ধাপ জানাবে।"
                : "Our team will review your request and share the information and next steps you need."}
            </p>
          </div>
        </div>
      </article>
      <aside className="h-fit bg-[#ecece3] p-7">
        <p className="text-xs font-bold tracking-[.18em] text-[#c79a45]">
          {service.category.toUpperCase()}
        </p>
        <p className="mt-5 text-sm leading-7 text-[#69726d]">
          {bengali
            ? "সময়, স্থান এবং প্রয়োজনীয় তথ্য জানতে আমাদের সঙ্গে যোগাযোগ করুন।"
            : "Contact us to confirm schedules, locations and any information you may need."}
        </p>
        <Link
          href={
            service.href === "/contact"
              ? "/contact"
              : `/contact?service=${service.slug}`
          }
          className="mt-7 block bg-[#0d4d3b] p-3 text-center font-semibold text-white"
        >
          {bengali ? "যোগাযোগ করুন" : service.action} ↗
        </Link>
        <Link
          href="/services"
          className="mt-3 block text-center text-sm font-semibold text-[#0d4d3b]"
        >
          ← {bengali ? "সব সেবা" : "All services"}
        </Link>
      </aside>
    </div>
  );
}
