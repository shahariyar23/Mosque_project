import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { mockSavedContent } from "@/data/mock-user-data";
import { Bookmark, BookmarkMinus, FileText, CalendarDays, GraduationCap } from "lucide-react";

export default async function SavedContentPage() {
  const session = await getSession();

  if (!session) {
    redirect("/signin");
  }

  const getIcon = (category: string) => {
    switch (category) {
      case "Events": return <CalendarDays className="h-5 w-5" />;
      case "Classes": return <GraduationCap className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-[#17211d]">Saved Content</h1>
        <p className="mt-1 text-sm text-[#69726d]">
          Your personalized library of saved articles, khutbahs, and events.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {/* Category Tabs (Static mock) */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {["All", "Quran", "Khutbah", "Articles", "Events", "Classes"].map((tab) => (
            <button
              key={tab}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === "All"
                  ? "bg-[#0d4d3b] text-white"
                  : "bg-white text-[#69726d] border border-[#e5e2d8] hover:bg-[#faf9f4]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {mockSavedContent.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mockSavedContent.map((item) => (
              <div key={item.id} className="group relative flex flex-col overflow-hidden rounded-xl border border-[#e5e2d8] bg-white shadow-sm transition-shadow hover:shadow-md">
                <div className="p-5 flex flex-col h-full">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#faf9f4] text-[#0d4d3b]">
                        {getIcon(item.category)}
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#c79a45]">
                          {item.category}
                        </span>
                        <h3 className="line-clamp-2 font-semibold text-[#17211d] mt-0.5">
                          {item.title}
                        </h3>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-auto pt-6 flex items-center justify-between">
                    <span className="text-xs text-[#8d948f]">Saved on {item.dateSaved}</span>
                    <div className="flex items-center gap-2">
                      <button className="rounded p-1.5 text-[#8d948f] hover:bg-red-50 hover:text-red-500 transition-colors" title="Remove from saved">
                        <BookmarkMinus className="h-4 w-4" />
                      </button>
                      <button className="rounded bg-[#faf9f4] px-3 py-1.5 text-xs font-medium text-[#0d4d3b] hover:bg-[#e5e2d8] transition-colors">
                        Open
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-[#e5e2d8] border-dashed bg-[#faf9f4]/50 py-16 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm text-[#0d4d3b] mb-4">
               <Bookmark className="h-8 w-8" />
            </div>
            <h3 className="font-semibold text-[#17211d]">Nothing saved yet</h3>
            <p className="mt-2 text-sm text-[#69726d] max-w-sm">
              When you find Quran verses, khutbahs, or articles you want to read later, save them to find them here.
            </p>
            <Link href="/" className="mt-6 inline-flex items-center justify-center rounded-md bg-[#0d4d3b] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#073a2d]">
              Explore Content
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
