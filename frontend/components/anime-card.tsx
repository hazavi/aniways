"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimeInfoPopover } from "@/components/anime-info-popover";
import { useLanguage } from "@/components/language-provider";
import { Play } from "lucide-react";
import type { Anime } from "@/lib/api";

interface AnimeCardProps {
  anime: Anime;
  compact?: boolean;
  hideDuration?: boolean;
  upcoming?: boolean;
}

export function AnimeCard({
  anime,
  compact = false,
  hideDuration = false,
  upcoming = false,
}: AnimeCardProps) {
  const { getTitle } = useLanguage();

  return (
    <Card className="group overflow-hidden border-0 bg-transparent gap-0 py-2 shadow-none transition-transform hover:scale-105">
      <CardContent className="p-0">
        <div className="relative aspect-[3/4] overflow-hidden rounded-lg">
          <Link href={`/anime/${anime.anidb_id}`}>
            <Image
              src={
                anime.images.jpg.large_image_url || anime.images.jpg.image_url
              }
              alt={anime.title}
              fill
              className="object-cover"
              sizes={
                compact
                  ? "(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 12vw"
                  : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              }
            />

            {/* Play overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Play
                className={
                  compact
                    ? "w-6 h-6 text-white fill-white"
                    : "w-10 h-10 text-white fill-white"
                }
              />
            </div>
          </Link>

          {/* Info button with hover popup */}
          <AnimeInfoPopover
            anime={anime}
            compact={compact}
            upcoming={upcoming}
          />

          {/* CC & Episode badge */}
          {(anime.episodes ?? 0) > 0 && (
            <div
              className={
                compact
                  ? "absolute bottom-1.5 right-1.5 flex items-center gap-1"
                  : "absolute bottom-2 right-2 flex items-center gap-1"
              }
            >
              <Badge
                className={
                  compact
                    ? "bg-zinc-900/100 text-white text-[10px] px-1 py-0.5 flex items-center gap-0.5"
                    : "bg-zinc-900/100 text-white text-xs px-1.5 py-0.5 flex items-center gap-1"
                }
              >
                <span className="text-white">CC</span>
                <span className="text-purple-400">{anime.episodes}</span>
              </Badge>
            </div>
          )}
        </div>
        <Link href={`/anime/${anime.anidb_id}`}>
          <div className={compact ? "mt-1.5" : "mt-2"}>
            <h3
              className={
                compact
                  ? "line-clamp-1 text-xs font-medium leading-tight"
                  : "line-clamp-1 text-sm font-medium leading-tight"
              }
              title={getTitle(anime)}
            >
              {getTitle(anime)}
            </h3>
            <p
              className={
                compact
                  ? "text-[11px] text-muted-foreground mt-0.5"
                  : "text-xs text-muted-foreground mt-1"
              }
            >
              {anime.type || "TV"}
              {!hideDuration &&
                anime.duration &&
                anime.duration !== "Unknown" && (
                  <>
                    {" "}
                    •{" "}
                    {anime.duration.replace(" per ep", "").replace(" min", "m")}
                  </>
                )}
            </p>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}

interface AnimeCardSkeletonProps {
  compact?: boolean;
}

export function AnimeCardSkeleton({ compact = false }: AnimeCardSkeletonProps) {
  return (
    <Card className="overflow-hidden border-0 bg-transparent gap-0 py-2 shadow-none">
      <CardContent className="p-0">
        <Skeleton className="aspect-[3/4] w-full rounded-lg" />
        <div className={compact ? "mt-1.5 space-y-1" : "mt-2 space-y-1"}>
          <Skeleton className={compact ? "h-3 w-full" : "h-4 w-full"} />
          <Skeleton className={compact ? "h-2.5 w-2/3" : "h-3 w-1/2"} />
        </div>
      </CardContent>
    </Card>
  );
}
