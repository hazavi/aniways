import { AnimeCard, AnimeCardSkeleton } from "@/components/anime-card";
import type { Anime } from "@/lib/api";

interface AnimeGridProps {
  anime: Anime[];
  title?: string;
  compact?: boolean;
  hideDuration?: boolean;
  upcoming?: boolean;
}

export function AnimeGrid({
  anime,
  title,
  compact = false,
  hideDuration = false,
  upcoming = false,
}: AnimeGridProps) {
  const animeList = Array.isArray(anime) ? anime : [];

  return (
    <section className="space-y-4">
      {title && <h2 className="text-2xl font-bold">{title}</h2>}
      <div
        className={
          compact
            ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-x-3 gap-y-2"
            : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
        }
      >
        {animeList.map((item, index) => (
          <AnimeCard
            key={`${item.anidb_id}-${index}`}
            anime={item}
            compact={compact}
            hideDuration={hideDuration}
            upcoming={upcoming}
          />
        ))}
      </div>
    </section>
  );
}

interface AnimeGridSkeletonProps {
  count?: number;
  title?: string;
  compact?: boolean;
  embedded?: boolean;
}

export function AnimeGridSkeleton({
  count = 12,
  title,
  compact = false,
  embedded = false,
}: AnimeGridSkeletonProps) {
  return (
    <section className={embedded ? "space-y-4" : "space-y-10 mt-10 px-4 md:px-10 lg:px-20"}>
      {title && <h2 className="text-2xl font-bold">{title}</h2>}
      <div
        className={
          compact
            ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-x-3 gap-y-2"
            : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
        }
      >
        {Array.from({ length: count }).map((_, i) => (
          <AnimeCardSkeleton key={i} compact={compact} />
        ))}
      </div>
    </section>
  );
}
