import { notFound } from "next/navigation";
import { InnerPage } from "@/components/inner-page";
import { getSurah } from "@/components/quran/quran-data";
import { QuranReader } from "@/components/quran/quran-reader";

export default async function SurahPage({ params }: { params: Promise<{ surah: string }> }) {
  const { surah: slug } = await params;
  const surah = getSurah(slug);
  if (!surah) notFound();

  return <InnerPage eyebrow="AL-QURAN" title={surah.english}><QuranReader surah={surah} /></InnerPage>;
}
