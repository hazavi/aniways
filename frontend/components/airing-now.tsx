"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { api, type Anime } from "@/lib/api";
import { AnimeGrid, AnimeGridSkeleton } from "@/components/anime-grid";

export function AiringNow() {
  const [anime, setAnime] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTopAnime("airing", 1, 12)
      .then((response) => setAnime(response.data || []))
      .catch((error) => console.error("Failed to fetch airing anime:", error))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl sm:text-2xl font-bold">Airing Now</h2>
        <Link
          href="/browse/airing"
          className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
        >
          View more
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      {loading ? <AnimeGridSkeleton count={12} embedded /> : <AnimeGrid anime={anime} hideDuration />}
    </section>
  );
}
