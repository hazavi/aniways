"use client";

import { useEffect, useState } from "react";
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
      <h2 className="text-xl sm:text-2xl font-bold mb-4">Airing Now</h2>
      {loading ? <AnimeGridSkeleton count={12} /> : <AnimeGrid anime={anime} hideDuration />}
    </section>
  );
}
