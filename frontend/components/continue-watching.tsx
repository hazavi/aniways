"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  getWatchHistory,
  removeFromWatchHistory,
  formatTime,
  type WatchHistoryItem,
} from "@/lib/watch-history";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Play, HelpCircle } from "lucide-react";

export function ContinueWatching() {
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const { language } = useLanguage();

  useEffect(() => {
    const refresh = () => {
      const items = getWatchHistory();
      setHistory(items);
      setIsVisible(items.length > 0);
    };
    refresh();
    window.addEventListener("aniways-history-migrated", refresh);
    // Load expanded state from localStorage
    const savedState = localStorage.getItem(
      "aniways-continue-watching-expanded",
    );
    if (savedState !== null) {
      setIsExpanded(savedState === "true");
    }
    return () => window.removeEventListener("aniways-history-migrated", refresh);
  }, []);

  const toggleExpanded = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    localStorage.setItem(
      "aniways-continue-watching-expanded",
      String(newState),
    );
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !isExpanded) return;

    const checkScroll = () => {
      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(
        container.scrollLeft <
          container.scrollWidth - container.clientWidth - 10,
      );
    };

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(checkScroll, 50);

    container.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);

    return () => {
      clearTimeout(timeoutId);
      container.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [history, isExpanded]);

  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = 300;
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const handleRemove = (
    e: React.MouseEvent,
    anidbId: number,
    episode: number,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    removeFromWatchHistory(anidbId, episode);
    setHistory((prev) =>
      prev.filter((h) => !(h.anidbId === anidbId && h.episode === episode)),
    );
  };

  const getTitle = (item: WatchHistoryItem) => {
    if (language === "en" && item.animeTitleEnglish) {
      return item.animeTitleEnglish;
    }
    return item.animeTitle;
  };

  if (!isVisible || history.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4 min-w-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl sm:text-2xl font-bold">Continue Watching</h2>
          <button
            onClick={toggleExpanded}
            className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors hover:cursor-pointer ${
              isExpanded
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {isExpanded ? "on" : "off"}
          </button>
          <div className="relative group/help">
            <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 p-2 bg-popover text-popover-foreground text-xs rounded-md shadow-lg border opacity-0 invisible group-hover/help:opacity-100 group-hover/help:visible transition-all z-50">
              <p>
                Videos won&apos;t auto-resume from the saved timestamp.
                You&apos;ll need to manually seek to the displayed time.
              </p>
              <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-popover border-l border-t rotate-45"></div>
            </div>
          </div>
        </div>
        {isExpanded && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:cursor-pointer"
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:cursor-pointer"
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {isExpanded && (
        <div
          ref={scrollContainerRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide pb-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {history.map((item) => {
            const progress =
              item.duration > 0 ? (item.timestamp / item.duration) * 100 : 0;

            return (
              <Link
                key={`${item.anidbId}-${item.episode}`}
                href={`/watch/${item.anidbId}/${item.episode}?t=${item.timestamp}`}
                className="group relative flex-shrink-0 w-[calc(50%-6px)] sm:w-[calc(33.333%-11px)] md:w-[calc(25%-12px)] lg:w-[calc(20%-13px)] xl:w-[calc(16.666%-14px)]"
              >
                {/* Image Container */}
                <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-muted">
                  <Image
                    src={item.imageUrl || "/placeholder.png"}
                    alt={getTitle(item)}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />

                  {/* Play overlay on hover */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                      <Play className="h-6 w-6 text-primary-foreground ml-0.5" />
                    </div>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={(e) => handleRemove(e, item.anidbId, item.episode)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 hover:bg-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    <X className="h-3.5 w-3.5 text-white hover:cursor-pointer" />
                  </button>

                  {/* Progress bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Info */}
                <div className="mt-2 space-y-1">
                  <h3
                    className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors"
                    title={getTitle(item)}
                  >
                    {getTitle(item)}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded font-medium">
                      EP {item.episode}
                    </span>
                    <span>
                      {formatTime(item.timestamp)} / {formatTime(item.duration)}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
