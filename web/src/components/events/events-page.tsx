"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import { mosqueEvents, type EventCategory, type MosqueEvent } from "@/components/events/event-data";
import { EventsHero } from "@/components/events/events-hero";
import { FeaturedEventCard } from "@/components/events/featured-event-card";
import { EventsFilters } from "@/components/events/events-filters";
import { EventCard } from "@/components/events/event-card";
import { EventsCta } from "@/components/events/events-cta";
import { Calendar, ChevronDown, ChevronUp, History, Sparkles, Clock } from "lucide-react";

export function EventsPage() {
  const { language } = useLanguage();
  const bn = language === "bn";

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<EventCategory>("All");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [showPastEvents, setShowPastEvents] = useState(false);

  // Extract all available months from upcoming events
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    mosqueEvents
      .filter((e) => !e.past)
      .forEach((e) => {
        monthsSet.add(e.date.slice(0, 7)); // YYYY-MM
      });
    return Array.from(monthsSet).sort();
  }, []);

  // Separate upcoming and past
  const upcomingEventsAll = useMemo(() => mosqueEvents.filter((e) => !e.past), []);
  const pastEventsAll = useMemo(() => mosqueEvents.filter((e) => e.past), []);

  // Determine the featured event
  const featuredEvent = useMemo(() => {
    return upcomingEventsAll.find((e) => e.featured) || upcomingEventsAll[0];
  }, [upcomingEventsAll]);

  // Filter upcoming events based on search, category, and month
  const filteredUpcoming = useMemo(() => {
    return upcomingEventsAll.filter((event) => {
      // Exclude featured event if no active search or filter is applied (so it doesn't duplicate right away)
      const hasActiveFilter = search.trim() !== "" || selectedCategory !== "All" || selectedMonth !== "all";
      if (!hasActiveFilter && featuredEvent && event.slug === featuredEvent.slug) {
        // Keep in grid only if multiple events exist, otherwise show it
        if (upcomingEventsAll.length > 1) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== "All" && event.category !== selectedCategory) {
        return false;
      }

      // Month filter
      if (selectedMonth !== "all" && !event.date.startsWith(selectedMonth)) {
        return false;
      }

      // Search filter
      if (search.trim() !== "") {
        const query = search.toLowerCase();
        const matchesTitle = event.title.toLowerCase().includes(query);
        const matchesBnTitle = event.bnTitle?.toLowerCase().includes(query) || false;
        const matchesDesc = event.description.toLowerCase().includes(query);
        const matchesLocation = event.location.toLowerCase().includes(query);
        if (!matchesTitle && !matchesBnTitle && !matchesDesc && !matchesLocation) {
          return false;
        }
      }

      return true;
    });
  }, [upcomingEventsAll, search, selectedCategory, selectedMonth, featuredEvent]);

  // Reset filters
  const resetFilters = () => {
    setSearch("");
    setSelectedCategory("All");
    setSelectedMonth("all");
  };

  return (
    <div className="min-h-screen bg-[#f8f6ef] text-[#17211d] flex flex-col">
      {/* 1. Compact Editorial Hero */}
      <EventsHero />

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl w-full px-4 xs:px-6 lg:px-8 py-10 sm:py-14 space-y-12 sm:space-y-16">
        
        {/* 2. Featured / Next Event Spotlight */}
        {featuredEvent && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-[#0d4d3b] uppercase">
                <Sparkles className="w-4 h-4 text-[#c79a45]" />
                <span>{bn ? "আসন্ন মূল আয়োজন" : "NEXT UPCOMING GATHERING"}</span>
              </div>
            </div>
            <FeaturedEventCard event={featuredEvent} />
          </div>
        )}

        {/* 3. Filter Controls Header */}
        <section aria-label="Event filters" className="pt-4 sm:pt-6 border-t border-[#e5e1d3]">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-[#0d4d3b] uppercase">
                <Calendar className="w-4 h-4 text-[#c79a45]" />
                <span>{bn ? "কার্যক্রম ও তালিকা" : "COMMUNITY CALENDAR"}</span>
              </div>
              <h2 className="mt-2 text-2xl xs:text-3xl sm:text-4xl font-serif font-bold text-[#0e2a22]">
                {bn ? "সকল অনুষ্ঠানমালা" : "Explore Mosque Programs"}
              </h2>
            </div>
            <div className="text-xs sm:text-sm text-[#718079] font-medium">
              {bn
                ? `${filteredUpcoming.length}টি অনুষ্ঠান পাওয়া গেছে`
                : `Showing ${filteredUpcoming.length} upcoming programs`}
            </div>
          </div>

          {/* Filter Bar */}
          <EventsFilters
            search={search}
            onSearchChange={setSearch}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            availableMonths={availableMonths}
          />
        </section>

        {/* 4. Upcoming Events Grid */}
        <section aria-label="Upcoming Events Grid">
          {filteredUpcoming.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {filteredUpcoming.map((event) => (
                <EventCard key={event.slug} event={event} />
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="p-8 sm:p-14 rounded-3xl border border-dashed border-[#d2ccc0] bg-white text-center flex flex-col items-center justify-center max-w-xl mx-auto shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-[#faf7f0] border border-[#e5e1d3] flex items-center justify-center text-[#c79a45] mb-4">
                <Calendar className="w-7 h-7" />
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#0e2a22]">
                {bn ? "কোনো অনুষ্ঠান পাওয়া যায়নি" : "No Matching Events Found"}
              </h3>
              <p className="mt-2 text-xs xs:text-sm text-[#69726d] max-w-md leading-relaxed">
                {search || selectedCategory !== "All" || selectedMonth !== "all"
                  ? bn
                    ? "আপনার বর্তমান ফিল্টার অনুযায়ী কোনো অনুষ্ঠান মেলেনি। ফিল্টার রিসেট করে আবার চেষ্টা করুন।"
                    : "No events match your current search or category filter. Try clearing filters to view all scheduled dates."
                  : bn
                    ? "এই মুহূর্তে কোনো অনুষ্ঠান নির্ধারিত নেই। নামাজের সময়সূচি দেখতে পারেন।"
                    : "There are no events scheduled right now. Check back soon or explore our regular prayer timings."}
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {(search || selectedCategory !== "All" || selectedMonth !== "all") && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="px-5 py-2.5 rounded-xl bg-[#0d4d3b] text-white text-xs sm:text-sm font-semibold hover:bg-[#082a20] transition min-h-[44px]"
                  >
                    {bn ? "ফিল্টার মুছুন" : "Clear All Filters"}
                  </button>
                )}
                <Link
                  href="/prayer-times"
                  className="px-5 py-2.5 rounded-xl border border-[#d2ccc0] bg-white hover:bg-[#faf8f4] text-[#0d4d3b] text-xs sm:text-sm font-semibold transition min-h-[44px] flex items-center gap-1.5"
                >
                  <Clock className="w-4 h-4 text-[#c79a45]" />
                  <span>{bn ? "নামাজের সময়সূচি দেখুন" : "View Prayer Times"}</span>
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* 5. Past Events Toggle Section */}
        {pastEventsAll.length > 0 && (
          <section className="pt-6 border-t border-[#e5e1d3]">
            <button
              type="button"
              onClick={() => setShowPastEvents(!showPastEvents)}
              className="w-full flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-white border border-[#e5e1d3] hover:border-[#c79a45] transition text-left group shadow-sm min-h-[48px]"
              aria-expanded={showPastEvents}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#69726d]/10 text-[#69726d] flex items-center justify-center shrink-0">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-serif text-base sm:text-lg font-bold text-[#0e2a22]">
                    {bn ? "বিগত অনুষ্ঠানসমূহ" : "Archive of Past Events"}
                  </span>
                  <span className="text-xs text-[#718079] block">
                    {bn
                      ? `${pastEventsAll.length}টি সমাপ্ত হওয়া কার্যক্রম দেখুন`
                      : `Review ${pastEventsAll.length} successfully completed programs`}
                  </span>
                </div>
              </div>
              <div className="text-[#0d4d3b] group-hover:text-[#c79a45] transition">
                {showPastEvents ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </button>

            {showPastEvents && (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in opacity-90">
                {pastEventsAll.map((event) => (
                  <div key={event.slug} className="grayscale-[0.4] hover:grayscale-0 transition duration-300">
                    <EventCard event={event} />
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

      </main>

      {/* 6. Community CTA */}
      <EventsCta />
    </div>
  );
}
