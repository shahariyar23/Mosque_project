"use client";

import { useState } from "react";

type ContentType = "announcement" | "article" | "khutbah" | "event";

export function ContentGenerator() {
  const [contentType, setContentType] = useState<ContentType>("announcement");
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("warm and welcoming");
  const [language, setLanguage] = useState("English");
  const [length, setLength] = useState("medium length");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function generateDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setDraft("");

    try {
      const response = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType, topic, tone, language, length }),
      });
      const result = (await response.json()) as {
        content?: string;
        error?: string;
      };
      if (!response.ok)
        throw new Error(result.error ?? "Could not generate a draft.");
      setDraft(result.content ?? "");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not generate a draft.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <form
        onSubmit={generateDraft}
        className="rounded-xl border border-[#e2e1d6] bg-white p-5 shadow-[0_18px_44px_-28px_rgba(7,58,45,.3)] sm:p-7"
      >
        <div className="grid gap-5">
          <label className="grid gap-2 text-[13px] font-semibold text-[#17211d]">
            Content type
            <select
              value={contentType}
              onChange={(event) =>
                setContentType(event.target.value as ContentType)
              }
              className="min-h-11 rounded-md border border-[#d9d8cd] bg-white px-3 font-normal outline-none focus:border-[#0d4d3b]"
            >
              <option value="announcement">Announcement</option>
              <option value="article">Article</option>
              <option value="khutbah">Khutbah</option>
              <option value="event">Event description</option>
            </select>
          </label>
          <label className="grid gap-2 text-[13px] font-semibold text-[#17211d]">
            Topic or key details
            <textarea
              required
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Eid gathering, Saturday 10 AM, community hall"
              rows={5}
              className="resize-y rounded-md border border-[#d9d8cd] px-3 py-2.5 font-normal outline-none placeholder:text-[#9ba19c] focus:border-[#0d4d3b]"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-[13px] font-semibold text-[#17211d]">
              Tone
              <select
                value={tone}
                onChange={(event) => setTone(event.target.value)}
                className="min-h-11 rounded-md border border-[#d9d8cd] bg-white px-3 font-normal outline-none focus:border-[#0d4d3b]"
              >
                <option>warm and welcoming</option>
                <option>formal and clear</option>
                <option>educational</option>
                <option>concise</option>
              </select>
            </label>
            <label className="grid gap-2 text-[13px] font-semibold text-[#17211d]">
              Language
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="min-h-11 rounded-md border border-[#d9d8cd] bg-white px-3 font-normal outline-none focus:border-[#0d4d3b]"
              >
                <option>English</option>
                <option>Bangla</option>
                <option>English and Bangla</option>
              </select>
            </label>
          </div>
          <label className="grid gap-2 text-[13px] font-semibold text-[#17211d]">
            Length
            <select
              value={length}
              onChange={(event) => setLength(event.target.value)}
              className="min-h-11 rounded-md border border-[#d9d8cd] bg-white px-3 font-normal outline-none focus:border-[#0d4d3b]"
            >
              <option>short</option>
              <option>medium length</option>
              <option>detailed</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={loading}
            className="min-h-12 rounded-md bg-[#0d4d3b] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#073a2d] disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? "Generating..." : "Generate draft"}
          </button>
        </div>
        {error && (
          <p
            role="alert"
            className="mt-4 border-l-2 border-[#b85c46] bg-[#fff4ef] p-3 text-sm text-[#7d3829]"
          >
            {error}
          </p>
        )}
      </form>

      <section
        aria-labelledby="draft-heading"
        className="min-h-[420px] rounded-xl border border-[#e2e1d6] bg-[#f1f4ef] p-5 sm:p-7"
      >
        <div className="flex items-center justify-between gap-4 border-b border-[#d9ded6] pb-4">
          <div>
            <p className="text-[11px] font-bold tracking-[.18em] text-[#b08335]">
              AI DRAFT
            </p>
            <h2
              id="draft-heading"
              className="mt-1 text-[19px] font-semibold text-[#17211d]"
            >
              Review before publishing
            </h2>
          </div>
          {draft && (
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(draft)}
              className="min-h-10 rounded-md border border-[#0d4d3b] px-3 text-xs font-semibold text-[#0d4d3b]"
            >
              Copy
            </button>
          )}
        </div>
        {draft ? (
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            aria-label="Generated draft"
            className="mt-5 min-h-[330px] w-full resize-y rounded-md border border-[#d9ded6] bg-white p-4 text-sm leading-7 text-[#17211d] outline-none focus:border-[#0d4d3b]"
          />
        ) : (
          <div className="grid min-h-[330px] place-items-center text-center text-sm leading-6 text-[#69726d]">
            <p>
              Generated content will appear here.
              <br />
              Check every date, time, link, and religious reference before
              publishing.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
