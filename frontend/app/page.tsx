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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Home - Aniways";
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const seasonRes = await api.getUpcoming(1, 12);

        setCurrentSeason(seasonRes.data || []);
      } catch (error) {
        console.error("Failed to fetch anime:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 sm:space-y-10 mt-6 sm:mt-10 px-2 sm:px-4 md:px-10 lg:px-20">
        {/* Hero Skeleton */}
        <Skeleton className="w-full h-[250px] sm:h-[280px] md:h-[300px] rounded-xl" />

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-8 sm:space-y-10">
            {/* Airing anime skeleton */}
            <div className="space-y-4">
              <Skeleton className="h-7 w-40" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="aspect-[3/4] rounded-lg" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-2.5 w-2/3" />
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Season Skeleton */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-20" />
              </div>
              <AnimeGridSkeleton count={12} />
            </div>
          </div>

          {/* Sidebar Skeleton - Hidden on mobile */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <div className="space-y-3">
              <Skeleton className="h-7 w-32" />
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-12 h-16 rounded-md flex-shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
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
              <h2 className="text-xl sm:text-2xl font-bold">Upcoming Season</h2>
              <Link
                href="/season/upcoming"
                className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
              >
                View more
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <AnimeGrid anime={currentSeason} hideDuration />
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
