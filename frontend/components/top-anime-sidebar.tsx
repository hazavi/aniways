"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { api, type Anime } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/components/language-provider";
import { Star } from "lucide-react";

interface TopAnimeSidebarProps {
  className?: string;
}

export function TopAnimeSidebar({ className }: TopAnimeSidebarProps) {
  const [topUpcoming, setTopUpcoming] = useState<Anime[]>([]);
  const [topAiring, setTopAiring] = useState<Anime[]>([]);
  const [topPopular, setTopPopular] = useState<Anime[]>([]);
  const [topFavorite, setTopFavorite] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("airing");

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await api.getTopAnime("airing", 1, 10);
        setTopAiring(res.data || []);
      } catch (error) {
        console.error("Failed to fetch airing:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  async function loadTab(tab: string) {
    setActiveTab(tab);
    if (tab === "airing" && topAiring.length === 0) {
      setLoading(true);
      try {
        const res = await api.getTopAnime("airing", 1, 10);
        setTopAiring(res.data || []);
      } catch (error) {
        console.error("Failed to fetch airing:", error);
      } finally {
        setLoading(false);
      }
    } else if (tab === "upcoming" && topUpcoming.length === 0) {
      setLoading(true);
      try {
        const res = await api.getTopAnime("upcoming", 1, 10);
        setTopUpcoming(res.data || []);
      } catch (error) {
        console.error("Failed to fetch top upcoming:", error);
      } finally {
        setLoading(false);
      }
    } else if (tab === "popular" && topPopular.length === 0) {
      setLoading(true);
      try {
        const res = await api.getTopAnime("bypopularity", 1, 10);
        setTopPopular(res.data || []);
      } catch (error) {
        console.error("Failed to fetch top popular:", error);
      } finally {
        setLoading(false);
      }
    } else if (tab === "favorite" && topFavorite.length === 0) {
      setLoading(true);
      try {
        const res = await api.getTopAnime("favorite", 1, 10);
        setTopFavorite(res.data || []);
      } catch (error) {
        console.error("Failed to fetch top favorite:", error);
      } finally {
        setLoading(false);
      }
    }
  }

  const getAnimeList = () => {
    switch (activeTab) {
      case "upcoming":
        return topUpcoming;
      case "popular":
        return topPopular;
      case "favorite":
        return topFavorite;
      default:
        return topAiring;
    }
  };

  return (
    <Card className={`${className} bg-background/50  border-border/50`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold">Top Anime</CardTitle>
          <Select value={activeTab} onValueChange={loadTab}>
            <SelectTrigger className="w-28 h-8 text-xs bg-muted/50 border-border/50 hover:bg-accent/50 hover:cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem className="hover:cursor-pointer" value="airing">
                Airing
              </SelectItem>
              <SelectItem className="hover:cursor-pointer" value="upcoming">
                Upcoming
              </SelectItem>
              <SelectItem className="hover:cursor-pointer" value="popular">
                Popular
              </SelectItem>
              <SelectItem className="hover:cursor-pointer" value="favorite">
                Favorite
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-14 w-10 rounded" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {getAnimeList().length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No anime found
              </p>
            ) : (
              getAnimeList().map((anime, index) => (
                <TopAnimeItem
                  key={`${anime.anidb_id}-${index}`}
                  anime={anime}
                  rank={index + 1}
                />
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TopAnimeItem({ anime, rank }: { anime: Anime; rank: number }) {
  const { getTitle } = useLanguage();

  const getRankColor = (rank: number) => {
    if (rank === 1) return "bg-muted text-purple-500";
    if (rank === 2) return "bg-muted text-purple-500";
    if (rank === 3) return "bg-muted text-purple-500";
    return "bg-muted text-muted-foreground";
  };

  return (
    <Link
      href={`/anime/${anime.anidb_id}`}
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors group"
    >
      <div
        className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${getRankColor(
          rank,
        )}`}
      >
        {rank}
      </div>
      <div className="relative h-12 w-9 rounded overflow-hidden flex-shrink-0 bg-muted/50">
        <Image
          src={anime.images.jpg.image_url}
          alt={anime.title}
          fill
          className="object-cover"
          sizes="36px"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
          {getTitle(anime)}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="bg-zinc-900/80 text-white px-1.5 py-0.5 rounded-full flex items-center gap-1">
            <span>CC</span>
            <span className="text-purple-400">{anime.episodes || "?"}</span>
          </span>
          {anime.type && <span className="text-purple-400">{anime.type}</span>}
        </div>
      </div>
    </Link>
  );
}

export function TopAnimeSidebarSkeleton({ className }: { className?: string }) {
  return (
    <Card
      className={`${className} bg-background/50 backdrop-blur-sm border-border/50`}
    >
      <CardHeader className="pb-3">
        <Skeleton className="h-6 w-24" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-12 w-9 rounded" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
