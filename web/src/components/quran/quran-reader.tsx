"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { getAudioUrl, sampleAyahs, type Surah } from "@/components/quran/quran-data";

type Translation = "none" | "bangla" | "english" | "both";

export function QuranReader({ surah }: { surah: Surah }) {
  const { language } = useLanguage();
  const bengali = language === "bn";
  const [translation, setTranslation] = useState<Translation>(bengali ? "bangla" : "english");
  const [bookmarked, setBookmarked] = useState<number[]>([]);
  const [playing, setPlaying] = useState(false);
  const ayahs = sampleAyahs[surah.number];

  useEffect(() => {
    const saved = localStorage.getItem(`noor-quran-bookmarks-${surah.slug}`);
    if (saved) setBookmarked(JSON.parse(saved) as number[]);
  }, [surah.slug]);

  const toggleBookmark = (number: number) => {
    const next = bookmarked.includes(number) ? bookmarked.filter((item) => item !== number) : [...bookmarked, number];
    setBookmarked(next);
    localStorage.setItem(`noor-quran-bookmarks-${surah.slug}`, JSON.stringify(next));
  };

  const copyAyah = async (arabic: string, english: string) => { await navigator.clipboard?.writeText(`${arabic}\n${english}`); };
  const shareAyah = async (number: number) => { const url = `${window.location.origin}/quran/${surah.slug}#ayah-${number}`; if (navigator.share) await navigator.share({ title: `${surah.english} · Ayah ${number}`, url }); else await navigator.clipboard?.writeText(url); };

  return <div><section className="bg-[#073a2d] px-5 py-16 text-center text-white"><p className="text-5xl text-[#e0be79]" lang="ar" dir="rtl">{surah.arabic}</p><h1 className="mt-5 text-4xl font-semibold">{surah.english}</h1><p className="mt-2 text-white/65">{surah.meaning} · {surah.ayahs} Ayahs</p><button type="button" onClick={() => setPlaying((value) => !value)} className="mt-7 border border-[#e0be79] px-5 py-3 font-semibold text-[#e0be79]">{playing ? "Pause" : "Listen"} ▷</button>{playing && <audio controls autoPlay src={getAudioUrl(surah.number)} className="mx-auto mt-5 h-8 max-w-sm" />}</section><div className="mx-auto max-w-3xl px-5 py-14 lg:px-8"><div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#deddd3] pb-5"><p className="text-xs font-bold tracking-[.2em] text-[#c79a45]">TRANSLATION</p><select value={translation} onChange={(event) => setTranslation(event.target.value as Translation)} className="border border-[#deddd3] bg-white px-4 py-2 text-sm outline-none"><option value="none">None</option><option value="bangla">বাংলা</option><option value="english">English</option><option value="both">বাংলা + English</option></select></div>{ayahs ? <div className="mt-10 space-y-10">{ayahs.map((ayah) => <article id={`ayah-${ayah.number}`} className="group border-b border-[#ecebe3] pb-9 text-center" key={ayah.number}><div className="mb-6 flex items-center justify-between text-sm text-[#c79a45]"><span className="grid h-8 w-8 place-items-center rounded-full border border-[#c79a45]">{ayah.number}</span><div className="flex gap-3 opacity-0 transition group-hover:opacity-100"><button type="button" onClick={() => toggleBookmark(ayah.number)} aria-label="Bookmark Ayah">{bookmarked.includes(ayah.number) ? "★" : "☆"}</button><button type="button" onClick={() => copyAyah(ayah.arabic, ayah.english)} aria-label="Copy Ayah">▣</button><button type="button" onClick={() => shareAyah(ayah.number)} aria-label="Share Ayah">↗</button></div></div><p className="text-3xl leading-[2.2] text-[#17211d]" lang="ar" dir="rtl">{ayah.arabic} ۝</p>{translation !== "none" && <div className="mt-6 space-y-2 text-lg leading-8 text-[#69726d]">{(translation === "bangla" || translation === "both") && <p lang="bn">{ayah.bangla}</p>}{(translation === "english" || translation === "both") && <p>{ayah.english}</p>}</div>}</article>)}</div> : <div className="mt-12 border border-dashed border-[#cfcfc3] p-8 text-center"><h2 className="text-2xl font-semibold">Unable to load the Quran text.</h2><p className="mt-3 text-[#69726d]">This reading data is not available offline yet. Please check your connection and try again.</p><button type="button" onClick={() => window.location.reload()} className="mt-6 bg-[#0d4d3b] px-5 py-3 font-semibold text-white">Try again</button></div>}<div className="mt-12 flex justify-between border-t border-[#deddd3] pt-6"><Link href="/quran" className="text-sm font-semibold text-[#0d4d3b]">← All Surahs</Link>{bookmarked.length > 0 && <span className="text-sm text-[#69726d]">{bookmarked.length} bookmarked</span>}</div></div></div>;
}
