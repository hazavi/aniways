"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useLanguage } from "@/components/language-provider";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";

import { Play, Info, Star } from "lucide-react";
import { AddToListButton } from "@/components/add-to-list-button";

interface AnimeData {
  mal_id: number;
  title: string;
  title_english?: string;
  title_japanese?: string;
  synopsis?: string;
  score?: number;
  rating?: string;
  status?: string;
  type?: string;
  duration?: string;
  episodes?: number;
  aired?: { string?: string; from?: string; to?: string };
  genres?: { mal_id: number; name: string }[];
  images?: {
    jpg: {
      image_url?: string;
      large_image_url?: string;
    };
  };
}

interface AnimeInfoPopoverProps {
  anime: AnimeData;
  compact?: boolean;
  /** For latest releases - shows episode info and watch URL */
  episode?: number;
  watchUrl?: string;
  /** For upcoming anime - shows only Details button */
  upcoming?: boolean;
}

export function AnimeInfoPopover({
  anime: initialAnime,
  compact = false,
  episode,
  watchUrl,
  upcoming = false,
}: AnimeInfoPopoverProps) {
  const { getTitle } = useLanguage();
  const { user } = useAuth();
  const [anime, setAnime] = useState<AnimeData>(initialAnime);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  // Check if we need to fetch more data (missing key fields like synopsis, genres)
  const needsFetch = !initialAnime.synopsis && !initialAnime.genres;

  const handleOpenChange = async (open: boolean) => {
    if (open && needsFetch && !fetched && !loading) {
      setLoading(true);
      try {
        const res = await api.getAnime(initialAnime.mal_id);
        setAnime(res.data);
        setFetched(true);
      } catch (error) {
        console.error("Failed to fetch anime details:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  // Format aired date
  const airedString =
    anime.aired?.string ||
    (anime.aired?.from
      ? `${new Date(anime.aired.from).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })} to ${anime.aired?.to ? new Date(anime.aired.to).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : "?"}`
      : null);

  const title = getTitle(anime);
  const detailsUrl = `/anime/${anime.mal_id}`;
  const linkUrl = watchUrl || detailsUrl;

  return (
    <HoverCard openDelay={100} closeDelay={200} onOpenChange={handleOpenChange}>
      <HoverCardTrigger asChild>
        <button
          className={
            compact
              ? "absolute top-1.5 right-1.5 w-5 h-5 bg-black rounded-full flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-opacity shadow-md cursor-pointer"
              : "absolute top-2 right-2 w-6 h-6 bg-black rounded-full flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-opacity shadow-md cursor-pointer"
          }
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Info
            className={compact ? "w-4 h-4 text-white" : "w-4 h-4 text-white"}
          />
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        side="right"
        align="start"
        sideOffset={8}
        className="w-80 p-0 bg-popover border-0 rounded-xl overflow-visible shadow-xl z-[100]"
      >
        <div className="relative">
          <div className="p-4 space-y-3 text-primary">
            {/* Title */}
            <div>
              <h3 className="font-bold text-lg leading-tight">{title}</h3>
              {anime.title_japanese && (
                <p className="text-sm mt-0.5">{anime.title_japanese}</p>
              )}
            </div>

            {/* Badges row */}
            <div className="flex items-center gap-2 flex-wrap">
              {episode !== undefined && (
                <Badge className="bg-black/100 text-white text-xs px-1.5 py-0.5">
                  EP {episode}
                </Badge>
              )}
              {anime.rating && (
                <Badge className="bg-black/100 text-xs text-white px-2 py-0.5">
                  {anime.rating.split(" - ")[0]}
                </Badge>
              )}
              {anime.score && (
                <div className="flex items-center gap-1 text-sm">
                  <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                  <span>{anime.score}</span>
                </div>
              )}
              {anime.type && (
                <div className="flex items-center gap-1 text-sm font-medium ml-1.5">
                  <span>{anime.type}</span>
                </div>
              )}
            </div>

            {/* Loading state */}
            {loading && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            )}

            {/* Synopsis */}
            {!loading && anime.synopsis && (
              <p className="text-sm line-clamp-3">{anime.synopsis}</p>
            )}

            {/* Details */}
            {!loading &&
              (airedString ||
                anime.status ||
                (anime.genres && anime.genres.length > 0)) && (
                <div className="space-y-1 text-sm">
                  {airedString && (
                    <p>
                      <span className="text-sm">Aired: </span>
                      <span className="font-medium">{airedString}</span>
                    </p>
                  )}
                  {anime.status && (
                    <p>
                      <span className="text-sm">Status: </span>
                      <span className="font-medium text-green-500">
                        {anime.status}
                      </span>
                    </p>
                  )}
                  {anime.genres && anime.genres.length > 0 && (
                    <p className="flex items-center gap-1 flex-wrap">
                      <span className="text-sm">Genres: </span>
                      {anime.genres.map((g, index) => (
                        <span
                          key={`${g.mal_id ?? g.name}-${index}`}
                          className="text-white font-medium bg-black/100 px-1.5 py-0.5 rounded-lg text-xs"
                        >
                          {g.name}
                        </span>
                      ))}
                    </p>
                  )}
                </div>
              )}
          </div>

          {/* Action buttons */}
          <div className="p-3 pt-0 flex gap-2">
            {upcoming || anime.status === "Not yet aired" ? (
              <Link
                href={detailsUrl}
                className="flex items-center justify-center rounded-2xl gap-2 flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 transition-colors text-white text-sm"
              >
                <span className="font-semibold">Details</span>
              </Link>
            ) : (
              <Link
                href={linkUrl}
                className="flex items-center justify-center rounded-2xl gap-2 flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 transition-colors text-white text-sm"
              >
                <span className="font-semibold">
                  {watchUrl ? "Watch" : "Watch now"}
                </span>
                <Play className="w-4 h-4 fill-white" />
              </Link>
            )}

            {/* Add to List Button */}
            {user && (
              <AddToListButton
                malId={initialAnime.mal_id}
                title={initialAnime.title}
                titleEnglish={initialAnime.title_english}
                imageUrl={
                  initialAnime.images?.jpg?.large_image_url ||
                  initialAnime.images?.jpg?.image_url
                }
                totalEpisodes={initialAnime.episodes}
                compact
              />
            )}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
