import type { Metadata } from "next";
import { PublicMosquePage } from "@/components/mosque/public-mosque-page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const formattedName = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return {
    title: `${formattedName} · Noor Mosque Management`,
    description: `Official prayer times, community announcements, and services for ${formattedName}.`,
  };
}

export default async function MosqueSpecificPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PublicMosquePage slug={slug} />;
}

