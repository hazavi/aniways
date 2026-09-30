"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { api, type Anime } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

export function HeroCarousel() {
  const [anime, setAnime] = useState<Anime[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const { getTitle } = useLanguage();

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await api.getTopAnime("airing", 1, 50);
        setAnime(
          [...(res.data || [])]
            .sort((a, b) => (a.popularity ?? Infinity) - (b.popularity ?? Infinity))
            .slice(0, 10)
        );
      } catch (error) {
        console.error("Failed to fetch hero anime:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Auto-advance carousel
  useEffect(() => {
    if (anime.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % anime.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [anime.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + anime.length) % anime.length);
  }, [anime.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % anime.length);
  }, [anime.length]);

  if (loading) {
    return (
      <div className="relative w-full h-[250px] sm:h-[280px] md:h-[300px] rounded-2xl overflow-hidden bg-muted">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  if (anime.length === 0) return null;

  const current = anime[currentIndex];
  const genres = current.genres?.slice(0, 3).map((g) => g.name) || [];

  return (
    <div className="relative w-full h-[250px] sm:h-[280px] md:h-[300px] rounded-2xl overflow-hidden group">
      {/* Left Column - Solid Black */}
      <div className="absolute left-0 top-0 w-full sm:w-[60%] h-full bg-black/90 sm:bg-black/100 z-0" />

      {/* Right Column - Poster Image */}
      <div className="absolute right-0 top-0 w-full sm:w-[45%] h-full">
        <Image
          src={
            current.images.webp?.large_image_url ||
            current.images.jpg.large_image_url ||
            current.images.jpg.image_url
          }
          alt={current.title}
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
          quality={100}
          unoptimized
        />
        {/* Fade/blend effects on the image */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 sm:via-black/60 via-50% sm:via-30% to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/50" />
      </div>

      {/* Content - Left side */}
      <div className="relative z-20 h-full flex flex-col justify-center p-4 sm:p-6 md:p-8 max-w-xl">
        <span className="text-xs font-semibold uppercase tracking-wider text-purple-400 mb-1">
          Popular · Airing Now
        </span>
        {/* Title */}
        <h1
          className="text-xl sm:text-2xl font-bold text-white mb-2 line-clamp-1"
          title={getTitle(current)}
        >
          {getTitle(current)}
        </h1>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {(current.episodes ?? 0) > 0 && (
            <Badge
              variant="secondary"
              className="bg-zinc-900/100 text-purple-400 border-0 text-xs px-2 py-0.5"
            >
              CC {current.episodes}
            </Badge>
          )}
          {current.type && (
            <Badge
              variant="outline"
              className="text-white border-white/30 text-xs px-2 py-0.5"
            >
              {current.type}
            </Badge>
          )}
          {genres.map((genre) => (
            <Badge
              key={genre}
              variant="outline"
              className="text-white/80 border-white/20 text-xs px-2 py-0.5 hidden sm:inline-flex"
            >
              {genre}
            </Badge>
          ))}
        </div>

        {/* Synopsis */}
        <p className="text-xs sm:text-sm text-gray-300 line-clamp-2 sm:line-clamp-3 mb-2">
          {current.synopsis || "No synopsis available."}
        </p>

        {/* Info Row */}
        <div className="flex items-center gap-4 mb-3 text-xs">
          <div className="flex flex-col">
            <span className="text-gray-400 text-[10px]">Rating</span>
            <span className="text-white font-medium">
              {current.score || "?"}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-400 text-[10px]">Release</span>
            <span className="text-white font-medium">
              {current.year || "TBA"}
            </span>
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-gray-400 text-[10px]">Quality</span>
            <span className="text-white font-medium">HD</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3">
          <Link href={`/anime/${current.mal_id}`}>
            <Button className="bg-purple-800 hover:bg-purple-700 text-white px-3 sm:px-4 py-2 rounded-full gap-2 text-xs sm:text-sm font-medium hover:cursor-pointer transition">
              <Play className="w-3 h-3 fill-white" />
              Watch Now
            </Button>
          </Link>
        </div>
      </div>

      {/* Pagination */}
      <div className="absolute bottom-4 sm:bottom-6 right-4 sm:right-6 md:right-10 z-20 flex items-center gap-2 sm:gap-3">
        <button
          onClick={goToPrevious}
          className="w-8 h-8 rounded-full hover:text-purple-400 flex items-center justify-center text-white transition-colors hover:cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-white text-sm font-medium min-w-[60px] text-center">
          <span className="text-purple-400">{currentIndex + 1}</span>
          <span className="text-gray-400"> / {anime.length}</span>
        </span>
        <button
          onClick={goToNext}
          className="w-8 h-8 rounded-full hover:text-purple-400 flex items-center justify-center text-white transition-colors hover:cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Dot Indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 hidden md:flex items-center gap-2">
        {anime.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-1.5 rounded-full transition-all hover:cursor-pointer ${
              index === currentIndex
                ? "w-6 bg-purple-600"
                : "w-1.5 bg-white/40 hover:bg-white/60"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
