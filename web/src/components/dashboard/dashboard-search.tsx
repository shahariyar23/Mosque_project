"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/finance/ui/icon";
import { searchGlobal, type SearchItem, type SearchResultData } from "@/services/searchService";

const TYPE_ICONS: Record<string, IconName> = {
  user: "users",
  transaction: "list",
  donation: "gift",
  fund: "vault",
  campaign: "megaphone",
  expense: "receipt-minus",
  salary: "badge",
  receipt: "receipt",
  announcement: "megaphone",
  event: "calendar-days",
  volunteer: "hands-heart",
};

export function DashboardSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Flattened items array for keyboard navigation
  const allItems: SearchItem[] = results?.categories.flatMap((c) => c.items) ?? [];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Global Ctrl+K / Cmd+K shortcut to focus search
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Debounced search trigger
  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setResults(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const data = await searchGlobal(trimmed);
        setResults(data);
        setSelectedIndex(-1);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load search results.");
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (item: SearchItem) => {
    setIsOpen(false);
    setQuery("");
    router.push(item.href);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (allItems.length === 0) return;
      setSelectedIndex((prev) => (prev + 1 < allItems.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (allItems.length === 0) return;
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : allItems.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < allItems.length) {
        handleSelect(allItems[selectedIndex]);
      }
    }
  };

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1 md:max-w-sm">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < allItems.length) {
            handleSelect(allItems[selectedIndex]);
          }
        }}
      >
        <label htmlFor="dashboard-search" className="sr-only">
          Search the dashboard
        </label>
        <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b938d]">
          {isLoading ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#0d4d3b] border-t-transparent" />
          ) : (
            <Icon name="search" size={16} />
          )}
        </span>
        <input
          ref={inputRef}
          id="dashboard-search"
          name="dashboard-search"
          type="search"
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search transactions, members, funds…"
          className="min-h-10 w-full rounded-md border border-[#deddd3] bg-white pl-9 pr-3 text-[13px] text-[#17211d] placeholder:text-[#9aa19c] focus:border-[#0d4d3b] focus:outline-2 focus:outline-offset-1 focus:outline-[#0d4d3b]/40"
        />
      </form>

      {/* Results Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-[75vh] w-full overflow-y-auto rounded-lg border border-[#deddd3] bg-white p-2 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150 sm:min-w-[380px]">
          {/* Minimum Query Hint */}
          {query.trim().length < 2 && (
            <div className="p-3 text-center">
              <p className="text-xs font-medium text-[#17211d]">Global Mosque Search</p>
              <p className="mt-1 text-[11.5px] text-[#8b938d]">
                Type at least 2 characters to search across members, transactions, funds, donations, and receipts.
              </p>
            </div>
          )}

          {/* Loading State */}
          {isLoading && query.trim().length >= 2 && !results && (
            <div className="flex items-center justify-center gap-2 p-6 text-xs text-[#5b6b66]">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#0d4d3b] border-t-transparent" />
              Searching mosque records…
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-xs text-red-700">
              <Icon name="alert" size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* No Results Empty State */}
          {!isLoading && query.trim().length >= 2 && results && results.totalResults === 0 && (
            <div className="p-4 text-center">
              <p className="text-xs font-semibold text-[#17211d]">No results found</p>
              <p className="mt-1 text-[11.5px] text-[#8b938d]">
                Try searching by a member name, phone number, receipt number, transaction reference, or fund.
              </p>
            </div>
          )}

          {/* Grouped Results */}
          {results && results.categories.length > 0 && (
            <div className="space-y-3">
              {results.categories.map((category) => (
                <div key={category.category}>
                  <div className="flex items-center justify-between px-2 py-1 text-[10.5px] font-bold uppercase tracking-wider text-[#8b938d]">
                    <span>{category.label}</span>
                    <span className="rounded bg-[#f0eee6] px-1.5 py-0.5 text-[10px] text-[#4d564f]">
                      {category.totalMatches}
                    </span>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {category.items.map((item) => {
                      const itemFlatIndex = allItems.findIndex((i) => i.id === item.id);
                      const isHighlighted = itemFlatIndex === selectedIndex;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelect(item)}
                          className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors ${
                            isHighlighted ? "bg-[#0d4d3b] text-white" : "hover:bg-[#f8f6ef] text-[#17211d]"
                          }`}
                        >
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded border ${
                              isHighlighted
                                ? "border-white/20 bg-white/10 text-white"
                                : "border-[#e5e2d8] bg-[#f8f6ef] text-[#0d4d3b]"
                            }`}
                          >
                            <Icon name={TYPE_ICONS[item.type] || "search"} size={14} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium leading-tight">{item.title}</p>
                            <p
                              className={`truncate text-[11px] leading-tight ${
                                isHighlighted ? "text-white/75" : "text-[#8b938d]"
                              }`}
                            >
                              {item.subtitle}
                            </p>
                          </div>
                          {item.badge && (
                            <span
                              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                                isHighlighted
                                  ? "bg-white/20 text-white"
                                  : "bg-[#e5f0ec] text-[#0d4d3b]"
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
