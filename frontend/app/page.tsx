"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Anime } from "@/lib/api";
import { AnimeGrid, AnimeGridSkeleton } from "@/components/anime-grid";
import { TopAnimeSidebar } from "@/components/top-anime-sidebar";
import { AiringNow } from "@/components/airing-now";
import { HeroCarousel } from "@/components/hero-carousel";
import { ContinueWatching } from "@/components/continue-watching";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight } from "lucide-react";

export default function HomePage() {
  const [currentSeason, setCurrentSeason] = useState<Anime[]>([]);
  const [upcomingSeason, setUpcomingSeason] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Home - Aniways";
  }, []);

  useEffect(() => {
    async function fetchData() {
      const [currentRes, upcomingRes] = await Promise.allSettled([
        api.getCurrentSeason(1, 12),
        api.getUpcoming(1, 12),
      ]);
      if (currentRes.status === "fulfilled") {
        setCurrentSeason(currentRes.value.data || []);
      }
      if (upcomingRes.status === "fulfilled") {
        setUpcomingSeason(upcomingRes.value.data || []);
      }
      setLoading(false);
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 sm:space-y-10 mt-6 sm:mt-10 px-2 sm:px-4 md:px-10 lg:px-20">
        <div className="relative w-full h-[250px] sm:h-[280px] md:h-[300px] rounded-2xl overflow-hidden bg-black">
          <Skeleton className="absolute inset-y-0 right-0 w-[45%] rounded-none opacity-40" />
          <div className="relative h-full max-w-xl flex flex-col justify-center gap-3 p-4 sm:p-6 md:p-8">
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-7 w-2/3" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-8 w-28 rounded-full" />
          </div>
          <div className="absolute bottom-5 right-5 flex items-center gap-2">
            <Skeleton className="h-7 w-7 rounded-full" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-7 w-7 rounded-full" />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0 space-y-8 sm:space-y-10">
            {["Airing Now", "Current Season", "Upcoming Season"].map((section) => (
              <section key={section}>
                <div className="flex items-center justify-between mb-4">
                  <Skeleton className="h-7 w-40 sm:w-48" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <AnimeGridSkeleton count={12} embedded />
              </section>
            ))}
          </div>

          <aside className="hidden lg:block w-80 flex-shrink-0">
            <div className="rounded-xl border border-border/50 bg-background/50 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-8 w-28 rounded-md" />
              </div>
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />
                  <Skeleton className="h-14 w-10 rounded flex-shrink-0" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-10 mt-6 sm:mt-10 px-2 sm:px-4 md:px-10 lg:px-20">
      {/* Hero Carousel */}
      <HeroCarousel />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content */}
        <div className="flex-1 space-y-8 sm:space-y-10">
          <ContinueWatching />

          <AiringNow />

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl sm:text-2xl font-bold">Current Season</h2>
              <Link
                href="/season/current"
                className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
              >
                View more
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <AnimeGrid anime={currentSeason} hideDuration />
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl sm:text-2xl font-bold">Upcoming Season</h2>
              <Link
                href="/season/upcoming"
                className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
              >
                View more
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <AnimeGrid anime={upcomingSeason} hideDuration />
          </section>
        </div>

        {/* Sidebar - Hidden on mobile */}
        <aside className="hidden lg:block w-80 flex-shrink-0">
          <div className="sticky top-20">
            <TopAnimeSidebar />
          </div>
        </aside>
      </div>
    </div>
  );
}
