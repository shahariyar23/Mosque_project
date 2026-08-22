"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { IslamicTexture } from "@/components/islamic-texture";
import { useLanguage } from "@/components/language-provider";
import {
  mosqueServices,
  serviceActionLabels,
  serviceCategories,
  type MosqueService,
  type ServiceCategory,
} from "@/components/services/service-data";

type DirectoryCategory = "All" | ServiceCategory;

function ServiceCard({
  service,
  language,
  featured = false,
}: {
  service: MosqueService;
  language: "en" | "bn";
  featured?: boolean;
}) {
  const bengali = language === "bn";
  const label = bengali ? service.bnTitle : service.title;
  const description = bengali ? service.bnDescription : service.description;
  const action = bengali ? "আরও জানুন" : serviceActionLabels[service.action];
  return (
    <article
      className={`group flex flex-col border ${featured ? "min-h-[300px] border-[#0d4d3b] bg-[#0d4d3b] text-white" : "border-[#deddd3] bg-white"} p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[0_14px_35px_rgba(7,58,45,.12)]`}
    >
      <span
        className={`grid h-11 w-11 place-items-center border text-lg ${featured ? "border-[#e0be79] text-[#e0be79]" : "border-[#c79a45] text-[#c79a45]"}`}
        aria-hidden="true"
      >
        {service.icon}
      </span>
      <p
        className={`mt-7 text-xs font-bold tracking-[.18em] ${featured ? "text-[#e0be79]" : "text-[#c79a45]"}`}
      >
        {service.category.toUpperCase()}
      </p>
      <h3 className="mt-2 text-2xl font-semibold">{label}</h3>
      <p
        className={`mt-3 leading-7 ${featured ? "text-white/70" : "text-[#69726d]"}`}
      >
        {description}
      </p>
      <Link
        href={service.href}
        className={`mt-auto pt-7 text-sm font-semibold ${featured ? "text-[#e0be79]" : "text-[#0d4d3b]"}`}
      >
        {action} <span className="transition group-hover:translate-x-1">↗</span>
      </Link>
    </article>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  light = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  light?: boolean;
}) {
  return (
    <div className="max-w-2xl">
      <p
        className={`text-xs font-bold tracking-[.2em] ${light ? "text-[#e0be79]" : "text-[#c79a45]"}`}
      >
        {eyebrow}
      </p>
      <h2
        className={`mt-3 text-4xl font-semibold ${light ? "text-white" : "text-[#17211d]"}`}
      >
        {title}
      </h2>
      <p
        className={`mt-4 leading-7 ${light ? "text-white/70" : "text-[#69726d]"}`}
      >
        {description}
      </p>
    </div>
  );
}

export function ServicesPage() {
  const { language } = useLanguage();
  const bengali = language === "bn";
  const [category, setCategory] = useState<DirectoryCategory>("All");
  const [query, setQuery] = useState("");
  const featured = mosqueServices.filter((service) => service.featured);
  const filtered = useMemo(
    () =>
      mosqueServices.filter((service) => {
        const matchesCategory =
          category === "All" || service.category === category;
        const text =
          `${service.title} ${service.bnTitle} ${service.description} ${service.bnDescription}`.toLowerCase();
        return matchesCategory && text.includes(query.toLowerCase());
      }),
    [category, query],
  );
  const getCategoryServices = (value: ServiceCategory) =>
    mosqueServices.filter((service) => service.category === value);
  const labels: Record<ServiceCategory, [string, string, string]> = {
    Worship: [
      "WORSHIP & SPIRITUAL LIFE",
      "Supporting your daily connection with Allah.",
      "Daily prayer, Jumu'ah and special spiritual programmes.",
    ],
    Education: [
      "LEARNING & EDUCATION",
      "Knowledge that strengthens faith.",
      "Quran learning and thoughtful programmes for every age.",
    ],
    Community: [
      "COMMUNITY SUPPORT",
      "Standing together when help is needed.",
      "Practical support, charity and ways to serve your neighbours.",
    ],
    Family: [
      "FAMILY & PERSONAL SERVICES",
      "Support for life's important moments.",
      "Private, respectful care for individuals and families.",
    ],
    Funeral: [
      "JANAZAH & FUNERAL SERVICES",
      "Dignity, compassion and care when families need it most.",
      "Our team can help coordinate the next steps with respect.",
    ],
    Facilities: [
      "MOSQUE FACILITIES",
      "Spaces for worship, learning and community.",
      "Find the right space or request an approved booking.",
    ],
  };

  return (
    <div>
      <section className="relative overflow-hidden bg-[#073a2d] px-5 pb-20 pt-36 text-white">
        <IslamicTexture
          variant="hero"
          position="left"
          className="left-[-180px] top-16 h-[600px] w-[540px] bg-contain opacity-10"
        />
        <div className="relative z-10 mx-auto max-w-7xl lg:px-8">
          <p className="text-xs font-bold tracking-[.22em] text-[#e0be79]">
            {bengali
              ? "নূর কমিউনিটি মসজিদ · ঢাকা"
              : "NOOR COMMUNITY MOSQUE · DHAKA"}
          </p>
          <h1 className="mt-4 max-w-4xl text-5xl font-semibold leading-tight sm:text-7xl">
            {bengali ? "আমাদের সেবাসমূহ।" : "Services for our community."}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70">
            {bengali
              ? "দৈনিক ইবাদত, কুরআন শিক্ষা, কমিউনিটি সহায়তা এবং জীবনের প্রতিটি পর্যায়ে নূর আপনার পাশে।"
              : "From daily worship and Quran education to community support and family services, Noor is here to serve our community at every stage of life."}
          </p>
        </div>
      </section>

      <nav
        aria-label={bengali ? "সেবা বিভাগ" : "Service categories"}
        className="sticky top-0 z-20 border-b border-[#deddd3] bg-[#f8f6ef]/95 px-5 py-3 backdrop-blur"
      >
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto lg:px-8">
          {serviceCategories.map((item) => (
            <button
              type="button"
              onClick={() => {
                setCategory(item);
                document
                  .getElementById(
                    item === "All" ? "featured-services" : item.toLowerCase(),
                  )
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={`shrink-0 border px-4 py-2 text-sm font-semibold transition ${category === item ? "border-[#0d4d3b] bg-[#0d4d3b] text-white" : "border-[#deddd3] hover:border-[#c79a45]"}`}
              key={item}
            >
              {bengali && item === "All" ? "সব" : item}
            </button>
          ))}
        </div>
      </nav>

      <section
        id="featured-services"
        className="mx-auto max-w-7xl px-5 py-16 lg:px-8"
      >
        <SectionHeading
          eyebrow={
            bengali ? "সবচেয়ে বেশি প্রয়োজনীয়" : "OUR MOST REQUESTED SERVICES"
          }
          title={
            bengali
              ? "আপনার যা প্রয়োজন, সেখান থেকেই শুরু করুন।"
              : "Start with what you need most."
          }
          description={
            bengali
              ? "সঠিক সেবাটি খুঁজে পেতে বিভাগ বেছে নিন বা নিচে অনুসন্ধান করুন।"
              : "Find the right support quickly by choosing a category or searching the directory below."
          }
        />
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {featured.map((service) => (
            <ServiceCard
              key={service.slug}
              service={service}
              language={language}
              featured
            />
          ))}
        </div>
      </section>

      <section className="bg-[#ecece3] px-5 py-16">
        <div className="mx-auto max-w-7xl lg:px-8">
          <div className="flex flex-col gap-6 border-b border-[#d9d8cd] pb-8 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeading
              eyebrow={bengali ? "সেবা ডিরেক্টরি" : "SERVICE DIRECTORY"}
              title={bengali ? "কীভাবে সাহায্য করতে পারি?" : "How can we help?"}
              description={
                bengali
                  ? "বিভাগ বা সেবার নাম দিয়ে খুঁজুন।"
                  : "Search by service name, category or the kind of support you need."
              }
            />
            <label className="w-full lg:max-w-sm">
              <span className="sr-only">
                {bengali ? "সেবা খুঁজুন" : "Search services"}
              </span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={bengali ? "সেবা খুঁজুন..." : "Search services..."}
                className="w-full border border-[#cfcfc3] bg-white px-4 py-3 outline-none focus:border-[#0d4d3b]"
              />
            </label>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((service) => (
              <ServiceCard
                key={service.slug}
                service={service}
                language={language}
              />
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="mt-8 border border-dashed border-[#cfcfc3] bg-white p-10 text-center">
              <h3 className="text-2xl font-semibold">
                {bengali ? "কোনো সেবা পাওয়া যায়নি।" : "No services found."}
              </h3>
              <p className="mt-2 text-[#69726d]">
                {bengali
                  ? "অন্য শব্দ বা বিভাগ দিয়ে চেষ্টা করুন।"
                  : "Try another search term or category."}
              </p>
            </div>
          )}
        </div>
      </section>

      {(
        [
          "Worship",
          "Education",
          "Community",
          "Family",
          "Facilities",
        ] as ServiceCategory[]
      ).map((section) => {
        const content = labels[section];
        return (
          <section
            id={section.toLowerCase()}
            className="mx-auto max-w-7xl scroll-mt-16 px-5 py-16 lg:px-8"
            key={section}
          >
            <SectionHeading
              eyebrow={content[0]}
              title={content[1]}
              description={content[2]}
            />
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {getCategoryServices(section).map((service) => (
                <ServiceCard
                  key={service.slug}
                  service={service}
                  language={language}
                />
              ))}
            </div>
          </section>
        );
      })}

      <section id="funeral" className="bg-[#073a2d] px-5 py-16 text-white">
        <div className="mx-auto max-w-7xl lg:px-8">
          <SectionHeading
            eyebrow={labels.Funeral[0]}
            title={labels.Funeral[1]}
            description={labels.Funeral[2]}
            light
          />
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_.8fr] lg:items-end">
            <ul className="grid gap-3 text-white/75 sm:grid-cols-2">
              <li>• Janazah prayer</li>
              <li>• Funeral coordination</li>
              <li>• Burial information</li>
              <li>• Family guidance</li>
            </ul>
            <Link
              href="/services/janazah"
              className="inline-block justify-self-start border border-[#e0be79] px-5 py-3 font-semibold text-[#e0be79] transition hover:bg-[#c79a45] hover:text-[#153128]"
            >
              {bengali ? "জানাজা টিমে যোগাযোগ করুন" : "Contact Janazah Team"} ↗
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 text-center lg:px-8">
        <p className="text-xs font-bold tracking-[.2em] text-[#c79a45]">
          {bengali ? "আমাদের সহায়তা প্রয়োজন?" : "NEED OUR HELP?"}
        </p>
        <h2 className="mx-auto mt-4 max-w-2xl text-4xl font-semibold">
          {bengali
            ? "আপনার প্রয়োজনীয় সেবাটি খুঁজে পাচ্ছেন না?"
            : "Not sure which service you need?"}
        </h2>
        <p className="mx-auto mt-4 max-w-xl leading-7 text-[#69726d]">
          {bengali
            ? "আমাদের টিম আপনাকে সঠিক পথে সাহায্য করতে প্রস্তুত।"
            : "Our team is here to help you find the right next step."}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href="/contact"
            className="bg-[#0d4d3b] px-6 py-3 font-semibold text-white"
          >
            {bengali ? "যোগাযোগ করুন" : "Contact Us"} ↗
          </Link>
          <Link
            href="/contact?request=service"
            className="border border-[#0d4d3b] px-6 py-3 font-semibold text-[#0d4d3b]"
          >
            {bengali ? "সেবা অনুরোধ" : "Request a Service"} ↗
          </Link>
        </div>
      </section>
    </div>
  );
}
