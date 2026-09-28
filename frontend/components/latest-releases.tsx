"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { api, type LatestRelease } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AnimeInfoPopover } from "@/components/anime-info-popover";
import { Clock, Play } from "lucide-react";

interface LatestReleasesProps {
  className?: string;
}

export function LatestReleases({ className }: LatestReleasesProps) {
  const [releases, setReleases] = useState<LatestRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setBlocked(false);
    try {
      const res = await api.getLatestReleases(1, 12);
      setReleases(res.data || []);
    } catch (error) {
      if (error instanceof Error && error.message.includes("503")) {
        setBlocked(true);
      } else {
        console.error("Failed to fetch latest releases:", error);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function formatTime(dateStr: string) {
    const date = new Date(dateStr + " UTC");
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  if (loading) {
    return (
      <section className={className}>
        <h2 className="text-xl sm:text-2xl font-bold mb-4">Latest Episodes</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[3/4] rounded-lg" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (blocked) {
    return (
      <section className={className}>
        <h2 className="text-xl sm:text-2xl font-bold mb-4">Latest Episodes</h2>
        <p className="text-sm text-muted-foreground" role="status">
          AnimePahe&apos;s latest-release feed is blocked. Anime pages may still play through AnimeX.
        </p>
        <button type="button" onClick={fetchData} className="mt-2 text-sm text-primary hover:underline">
          Retry AnimePahe
        </button>
      </section>
    );
  }

  return (
    <section className={className}>
      <h2 className="text-xl sm:text-2xl font-bold mb-4">Latest Episodes</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        {releases.map((release) => (
          <LatestReleaseCard
            key={`${release.anime_uuid}-${release.episode}`}
            release={release}
            formatTime={formatTime}
          />
        ))}
      </div>
    </section>
  );
}

function LatestReleaseCard({
  release,
  formatTime,
}: {
  release: LatestRelease;
  formatTime: (d: string) => string;
}) {
  const cardContent = (
    <>
      {release.poster ? (
        <Image
          src={release.poster}
          alt={release.anime_title}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Play className="w-8 h-8 text-muted-foreground" />
        </div>
      )}

      {/* Play overlay */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Play className="w-10 h-10 text-white fill-white" />
      </div>
    </>
  );

  const content = (
    <div className="group relative transition-transform hover:scale-105">
      {/* Poster */}
      <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-muted">
        {release.watch_url && release.mal_id ? (
          <Link href={release.watch_url} className="block w-full h-full">
            {cardContent}
          </Link>
        ) : (
          cardContent
        )}

        {/* Info button with hover popup */}
        {release.mal_id && (
          <AnimeInfoPopover
            anime={{
              mal_id: release.mal_id,
              title: release.anime_title,
              type: release.type,
              duration: release.duration,
            }}
            episode={release.episode}
            watchUrl={release.watch_url || undefined}
          />
        )}

        {/* CC & Episode badge */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1">
          <Badge className="bg-zinc-900/100 text-white text-xs px-1.5 py-0.5 flex items-center gap-1">
            <span className="text-white">CC</span>
            <span className="text-purple-400">{release.episode}</span>
          </Badge>
        </div>
      </div>

      {/* Title */}
      <h3
        className="mt-2 text-sm font-medium line-clamp-1 leading-tight"
        title={release.anime_title}
      >
        {release.anime_title}
      </h3>

      {/* Type, Duration & Time */}
      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
        <span>
          {release.type || "TV"}
          {release.duration && release.duration !== "Unknown" && (
            <>
              {" "}
              • {release.duration.replace(" per ep", "").replace(" min", "m")}
            </>
          )}
        </span>
        <span>•</span>
        <Clock className="w-3 h-3" />
        <span>{formatTime(release.created_at)}</span>
      </p>
    </div>
  );

  if (release.watch_url && release.mal_id) {
    return <div className="block">{content}</div>;
  }

  return <div className="opacity-60 cursor-not-allowed">{content}</div>;
}
