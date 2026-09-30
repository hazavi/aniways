"use client";

import { useEffect, useState, use, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { api, type VideoSource, type Anime, type EpisodeInfo } from "@/lib/api";
import { getEpisodeWatchProgress, saveWatchProgress, type WatchHistoryItem } from "@/lib/watch-history";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useLanguage } from "@/components/language-provider";
import {
  Play,
  Star,
  List,
  Grid3X3,
  SkipBack,
  SkipForward,
  ArrowUp,
  ArrowDown,
  Hash,
  Maximize2,
  Minimize2,
  Focus,
  ChevronRight,
  Captions,
  Mic2,
} from "lucide-react";

interface WatchPageProps {
  params: Promise<{ id: string; episode: string }>;
}

export default function WatchPage({ params }: WatchPageProps) {
  const { id, episode } = use(params);
  const searchParams = useSearchParams();
  const malId = parseInt(id);
  const episodeNum = parseInt(episode);
  const startTime = parseInt(searchParams.get("t") || "0");

  const [sources, setSources] = useState<VideoSource[]>([]);
  const [totalEpisodes, setTotalEpisodes] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [selectedQuality, setSelectedQuality] = useState<string | null>(null);
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  const [selectedServer, setSelectedServer] = useState<"sub" | "dub">("sub");
  const [anime, setAnime] = useState<Anime | null>(null);
  const [episodeInfo, setEpisodeInfo] = useState<EpisodeInfo | null>(null);
  const [allEpisodes, setAllEpisodes] = useState<EpisodeInfo[]>([]);
  const [episodeProgress, setEpisodeProgress] = useState<Record<number, WatchHistoryItem>>({});
  const [episodeListView, setEpisodeListView] = useState<"grid" | "list">(
    "list",
  );
  const [error, setError] = useState<string | null>(null);
  const [episodeRange, setEpisodeRange] = useState<string>("1-100");
  const [episodeSearch, setEpisodeSearch] = useState<string>("");
  const [episodeSort, setEpisodeSort] = useState<"asc" | "desc">("asc");
  const [highlightedEp, setHighlightedEp] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [watchTime, setWatchTime] = useState(startTime);
  const [isPlaying, setIsPlaying] = useState(false);
  const { language, getTitle, getEpisodeTitle } = useLanguage();

  // Default episode duration (24 minutes for most anime)
  const DEFAULT_DURATION = 24 * 60;

  // Refs
  const watchTimeRef = useRef(startTime);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastSavedTimeRef = useRef(0);

  useEffect(() => {
    watchTimeRef.current = startTime;
    lastSavedTimeRef.current = 0;
    setWatchTime(startTime);
  }, [malId, episodeNum, startTime]);

  useEffect(() => {
    setEpisodeProgress(Object.fromEntries(
      getEpisodeWatchProgress(malId).map((item) => [item.episode, item]),
    ));
  }, [malId]);

  // Keep watch progress and the outer server picker in sync with the embedded player.
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data;

      if (
        event.origin === window.location.origin &&
        data?.source === "aniembed" &&
        data.version === 1 &&
        data.type === "event"
      ) {
        if (typeof data.data?.currentTime === "number") {
          const currentTime = Math.floor(data.data.currentTime);
          watchTimeRef.current = currentTime;
          setWatchTime(currentTime);
        }
        if (data.name === "play") setIsPlaying(true);
        if (data.name === "pause" || data.name === "ended") setIsPlaying(false);
        if (data.name === "ready" || data.name === "providerchange") {
          const language = data.data?.language;
          const providerId = data.data?.providerId;
          const match = sources.find((source) => {
            if (!source.embed_url.startsWith("/animex-player/e/")) return false;
            const url = new URL(source.embed_url, window.location.origin);
            return url.searchParams.get("lang") === language && url.searchParams.get("s") === providerId;
          });
          if (match) {
            setSelectedServer(language === "dub" ? "dub" : "sub");
            setSelectedQuality(match.embed_url);
          }
        }
        return;
      }

      // Some external players send the current time as a number.
      if (typeof data === "number" && data >= 0) {
        const currentTime = Math.floor(data);
        watchTimeRef.current = currentTime;
        setWatchTime(currentTime);
        return;
      }

      // Handle string messages
      if (typeof data === "string") {
        if (data === "play") {
          setIsPlaying(true);
        } else if (data === "pause" || data === "stop" || data === "ended") {
          setIsPlaying(false);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [sources]);

  // Save watch progress when time updates (every 10 seconds to avoid spam)
  useEffect(() => {
    if (!anime || !selectedQuality) return;

    const imageUrl =
      anime.images?.webp?.large_image_url ||
      anime.images?.jpg?.large_image_url ||
      "/placeholder.png";

    const episodeDuration = allEpisodes.find((item) => item.episode === episodeNum)?.duration || DEFAULT_DURATION;

    const saveProgress = (timestamp: number) => {
      // Only save if time has changed by at least 5 seconds
      if (Math.abs(timestamp - lastSavedTimeRef.current) < 5) return;
      lastSavedTimeRef.current = timestamp;

      const item = {
        malId,
        episode: episodeNum,
        timestamp,
        duration: episodeDuration,
        animeTitle: anime.title || "",
        animeTitleEnglish: anime.title_english,
        imageUrl,
        lastWatched: Date.now(),
      };
      saveWatchProgress(item);
      setEpisodeProgress((progress) => ({ ...progress, [episodeNum]: item }));
    };

    // Save progress every 10 seconds based on actual watchTime from player
    const interval = setInterval(() => {
      if (watchTimeRef.current > 0) {
        saveProgress(watchTimeRef.current);
      }
    }, 10000);

    // Save progress when user leaves the page
    const handleBeforeUnload = () => {
      saveProgress(watchTimeRef.current);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Also listen for visibility change (user switches tabs)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveProgress(watchTimeRef.current);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      // Save final progress on cleanup
      saveProgress(watchTimeRef.current);
    };
  }, [anime, selectedQuality, malId, episodeNum, allEpisodes]);

  // Set page title
  useEffect(() => {
    if (anime) {
      const episode = allEpisodes.find((item) => item.episode === episodeNum);
      const episodeTitle = episode ? getEpisodeTitle(episode, episodeNum) : `Episode ${episodeNum}`;
      const label = episodeTitle === `Episode ${episodeNum}`
        ? episodeTitle
        : `Episode ${episodeNum}: ${episodeTitle}`;
      document.title = `${getTitle(anime)} - ${label} - Aniways`;
    } else {
      document.title = `Episode ${episodeNum} - Aniways`;
    }
  }, [anime, episodeNum, getTitle, allEpisodes, getEpisodeTitle]);

  // Load sort preference from localStorage
  useEffect(() => {
    const savedSort = localStorage.getItem("episode-sort") as "asc" | "desc";
    if (savedSort === "asc" || savedSort === "desc") {
      setEpisodeSort(savedSort);
    }
  }, []);

  // Toggle sort and save to localStorage
  const toggleSort = () => {
    const newSort = episodeSort === "asc" ? "desc" : "asc";
    setEpisodeSort(newSort);
    localStorage.setItem("episode-sort", newSort);
  };

  // Handle episode search - highlight and scroll to episode
  const handleEpisodeSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const epNum = parseInt(episodeSearch);
      if (epNum > 0 && (totalEpisodes === 0 || epNum <= totalEpisodes)) {
        // Update range to include the searched episode
        const rangeStart = Math.floor((epNum - 1) / 100) * 100 + 1;
        const maxEp =
          totalEpisodes > 0 ? totalEpisodes : Math.max(epNum + 100, 100);
        const rangeEnd = Math.min(rangeStart + 99, maxEp);
        setEpisodeRange(`${rangeStart}-${rangeEnd}`);

        // Highlight the episode
        setHighlightedEp(epNum);

        // Remove highlight after animation
        setTimeout(() => setHighlightedEp(null), 2000);

        // Scroll to element after a brief delay for range to update
        setTimeout(() => {
          const element = document.getElementById(`ep-${epNum}`);
          element?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      }
    }
  };

  // Filter sources by server type
  const getSourcesByServer = (server: "sub" | "dub") => {
    const audioType = server === "sub" ? "jpn" : "eng";
    return sources.filter((s) => s.audio === audioType);
  };

  const subSources = getSourcesByServer("sub");
  const dubSources = getSourcesByServer("dub");
  const currentSources = selectedServer === "sub" ? subSources : dubSources;

  // Get highest quality source for a server
  const getHighestQuality = (serverSources: VideoSource[]) => {
    if (serverSources.length === 0) return null;
    return serverSources.reduce((best, current) =>
      current.resolution > best.resolution ? current : best,
    );
  };

  const getSourceLabel = (source: VideoSource) =>
    source.server || (source.resolution > 0 ? `${source.resolution}p` : source.quality);

  // Handle server change
  const handleServerChange = (server: "sub" | "dub") => {
    setSelectedServer(server);
    const serverSources = getSourcesByServer(server);
    const highest = getHighestQuality(serverSources);
    if (highest) {
      setSelectedQuality(highest.embed_url);
      setPlayerUrl(highest.embed_url);
    }
  };

  useEffect(() => {
    let active = true;
    setAllEpisodes([]);
    setTotalEpisodes(0);
    api.getEpisodes(malId)
      .then((res) => {
        if (active) {
          setAllEpisodes(res.episodes || []);
          setTotalEpisodes((count) => Math.max(count, res.total || 0));
        }
      })
      .catch((err) => console.error("Failed to fetch episode titles:", err));
    return () => {
      active = false;
    };
  }, [malId]);

  const toggleEpisodeView = () => {
    setEpisodeListView((view) => view === "grid" ? "list" : "grid");
  };

  // Get episode title by number using language preference
  const getEpisodeTitleByNum = (epNum: number) => {
    const ep = allEpisodes.find((e) => e.episode === epNum);
    if (!ep) return `Episode ${epNum}`;
    return getEpisodeTitle(ep, epNum);
  };

  const getProgressPercent = (epNum: number, info?: EpisodeInfo) => {
    const saved = episodeProgress[epNum];
    const timestamp = epNum === episodeNum
      ? Math.max(watchTime, saved?.timestamp || 0)
      : saved?.timestamp || 0;
    const duration = info?.duration || saved?.duration || DEFAULT_DURATION;
    return timestamp > 0 ? Math.min(100, Math.round((timestamp / duration) * 100)) : 0;
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setSources([]);
    setSelectedQuality(null);
    setPlayerUrl(null);
    setEpisodeInfo(null);
    setError(null);

    // Get anime info from MAL
    try {
      const animeRes = await api.getAnime(malId);
      if (animeRes.data) {
        setAnime(animeRes.data);
        // Initial episode count from MAL (may be 0 for ongoing)
        setTotalEpisodes((count) => Math.max(count, animeRes.data.episodes || 0));
      }
    } catch (err) {
      console.error("Failed to fetch MAL data:", err);
    }

    try {
      const watchRes = await api.getWatchSources(malId, episodeNum);
      setSources(watchRes.sources || []);
      if (watchRes.total_episodes && watchRes.total_episodes > 0) {
        setTotalEpisodes((count) => Math.max(count, watchRes.total_episodes || 0));
      }

      // Set episode info
      if (watchRes.episode_info) {
        setEpisodeInfo(watchRes.episode_info);
      }

      // Auto-select SUB server with highest quality, fallback to DUB
      if (watchRes.sources && watchRes.sources.length > 0) {
        const subSources = watchRes.sources.filter((s) => s.audio === "jpn");
        const dubSources = watchRes.sources.filter((s) => s.audio === "eng");

        if (subSources.length > 0) {
          setSelectedServer("sub");
          const highest = subSources.reduce((best, current) =>
            current.resolution > best.resolution ? current : best,
          );
          setSelectedQuality(highest.embed_url);
          setPlayerUrl(highest.embed_url);
        } else if (dubSources.length > 0) {
          setSelectedServer("dub");
          const highest = dubSources.reduce((best, current) =>
            current.resolution > best.resolution ? current : best,
          );
          setSelectedQuality(highest.embed_url);
          setPlayerUrl(highest.embed_url);
        }
      }
    } catch (err) {
      setSources([]);
      const errorMsg = err instanceof Error ? err.message : "";
      if (errorMsg.includes("404")) {
        setError("not_found");
      } else {
        setError("retry");
      }
    } finally {
      setLoading(false);
    }
  }, [malId, episodeNum]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRetry = () => {
    window.location.reload();
  };

  // Calculate episode ranges for dropdown
  const getEpisodeRanges = () => {
    const ranges = [];
    // Include every episode returned by the title endpoint, even if another
    // provider reports a smaller count.
    const maxEp =
      totalEpisodes > 0 || allEpisodes.length > 0
        ? Math.max(totalEpisodes, allEpisodes.length, episodeNum)
        : Math.max(episodeNum + 100, 100);
    for (let i = 0; i < maxEp; i += 100) {
      const start = i + 1;
      const end = Math.min(i + 100, maxEp);
      ranges.push({
        label: `${start.toString().padStart(3, "0")}-${end
          .toString()
          .padStart(3, "0")}`,
        value: `${start}-${end}`,
      });
    }
    return ranges.length > 0 ? ranges : [{ label: "001-100", value: "1-100" }];
  };

  // Get episodes for current range
  const getEpisodesInRange = () => {
    const [start, end] = episodeRange.split("-").map(Number);
    const episodes = [];
    // Use totalEpisodes to limit the range
    const maxEp =
      totalEpisodes > 0 || allEpisodes.length > 0
        ? Math.max(totalEpisodes, allEpisodes.length, episodeNum)
        : Math.max(episodeNum + 100, end);
    for (let i = start; i <= Math.min(end, maxEp); i++) {
      episodes.push(i);
    }
    return episodes;
  };

  // Set initial episode range based on current episode when totalEpisodes changes
  useEffect(() => {
    const maxEp =
      totalEpisodes > 0 || allEpisodes.length > 0
        ? Math.max(totalEpisodes, allEpisodes.length, episodeNum)
        : Math.max(episodeNum + 100, 100);
    const rangeStart = Math.floor((episodeNum - 1) / 100) * 100 + 1;
    const rangeEnd = Math.min(rangeStart + 99, maxEp);
    setEpisodeRange(`${rangeStart}-${rangeEnd}`);
  }, [totalEpisodes, allEpisodes.length, episodeNum]);

  if (loading) {
    return <WatchSkeleton />;
  }

  const relatedAnime = (anime?.relations || []).flatMap((relation) =>
    (relation.entry || [])
      .filter((entry) => entry.mal_id && entry.mal_id !== malId)
      .map((entry) => ({ ...entry, relation: relation.relation })),
  );

  return (
    <div className="space-y-4 mt-6 mb-10 px-4 md:px-10 lg:px-20">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {anime?.type && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <span>{anime.type}</span>
              </BreadcrumbItem>
            </>
          )}
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/anime/${id}`} className="truncate max-w-[200px]">
                {anime ? getTitle(anime) : "..."}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Episode {episodeNum}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Focus Mode Overlay */}
      {isFocused && (
        <div
          className="fixed inset-0 bg-black/80 z-40"
          onClick={() => setIsFocused(false)}
        />
      )}

      {/* Player and episodes */}
      <div className={`flex flex-col gap-4 lg:mt-10 ${isExpanded ? "lg:flex-col" : "lg:flex-row lg:items-start"}`}>
        {/* Video Player */}
        <div className="flex-1 min-w-0 space-y-3">
          <div
            className={`relative w-full bg-black rounded-lg overflow-hidden ${isFocused ? "relative z-50" : ""}`}
            style={{ aspectRatio: "16/9" }}
          >
            {error === "not_found" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4">
                <p className="text-muted-foreground text-center text-lg">
                  Episode not available
                </p>
                <Link href={`/anime/${id}`}>
                  <Button variant="outline">Back to Anime</Button>
                </Link>
              </div>
            ) : error ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4">
                <button
                  onClick={handleRetry}
                  aria-label="Retry stream lookup"
                  className="group flex items-center justify-center w-20 h-20 rounded-full bg-primary/90 hover:bg-primary transition-all hover:scale-110"
                >
                  <Play className="h-10 w-10 text-primary-foreground ml-1" />
                </button>
              </div>
            ) : playerUrl ? (
              <iframe
                ref={iframeRef}
                src={`${playerUrl}${playerUrl.includes("?") ? "&" : "#"}t=${startTime}`}
                className="w-full h-full"
                title="Episode player"
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                scrolling="no"
                allowFullScreen
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <Play className="h-16 w-16 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {sources.length > 0
                    ? "Select a quality to start"
                    : "No sources available"}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-[2rem_minmax(0,1fr)_2rem] items-center gap-2 sm:grid-cols-[1fr_auto_1fr]">
            {episodeNum > 1 ? (
              <Link href={`/watch/${id}/${episodeNum - 1}`} className="justify-self-start">
                <Button variant="ghost" size="sm" className="h-8 w-8 gap-1 text-muted-foreground hover:text-foreground sm:w-auto">
                  <SkipBack className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Prev</span>
                </Button>
              </Link>
            ) : <span />}

            <div className="mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-1 rounded-lg border border-white/15 bg-black/80 p-1 text-white">
              {sources.length > 0 && (
                <>
                  <div className="flex shrink-0 overflow-hidden rounded-md border border-white/20">
                    <button
                      type="button"
                      aria-label="Subtitled servers"
                      onClick={() => handleServerChange("sub")}
                      disabled={subSources.length === 0}
                      className={`px-2 py-1.5 text-[11px] font-semibold disabled:opacity-40 ${selectedServer === "sub" ? "bg-primary text-primary-foreground" : "hover:bg-white/15"}`}
                    >
                      SUB
                    </button>
                    {dubSources.length > 0 && (
                      <button
                        type="button"
                        aria-label="Dubbed servers"
                        onClick={() => handleServerChange("dub")}
                        className={`border-l border-white/20 px-2 py-1.5 text-[11px] font-semibold ${selectedServer === "dub" ? "bg-primary text-primary-foreground" : "hover:bg-white/15"}`}
                      >
                        DUB
                      </button>
                    )}
                  </div>
                  <Select
                    value={selectedQuality || ""}
                    onValueChange={(url) => {
                      setSelectedQuality(url);
                      setPlayerUrl(url);
                    }}
                  >
                    <SelectTrigger className="h-7 w-20 border-white/20 bg-transparent text-xs text-white sm:w-32">
                      <SelectValue placeholder="Server">
                        {(() => {
                          const selected = currentSources.find(
                            (source) => source.embed_url === selectedQuality,
                          );
                          return selected ? getSourceLabel(selected) : "Server";
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {[...currentSources]
                        .sort((a, b) => b.resolution - a.resolution)
                        .map((source, index) => (
                          <SelectItem
                            key={`${source.embed_url}-${index}`}
                            value={source.embed_url}
                            className="text-xs"
                          >
                            {getSourceLabel(source)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white hover:bg-white/15 hover:text-white"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Show info" : "Expand player"}
                aria-label={isExpanded ? "Show info" : "Expand player"}
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 hover:bg-white/15 hover:text-white ${isFocused ? "text-primary" : "text-white"}`}
                onClick={() => setIsFocused(!isFocused)}
                title={isFocused ? "Exit focus" : "Focus mode"}
                aria-label={isFocused ? "Exit focus" : "Focus mode"}
              >
                <Focus className="h-4 w-4" />
              </Button>
            </div>
            {(totalEpisodes === 0 || episodeNum < totalEpisodes) && (
              <Link href={`/watch/${id}/${episodeNum + 1}`} className="justify-self-end">
                <Button variant="ghost" size="sm" className="h-8 w-8 gap-1 text-muted-foreground hover:text-foreground sm:w-auto">
                  <span className="hidden sm:inline">Next</span>
                  <SkipForward className="h-3.5 w-3.5" />
                </Button>
              </Link>
            )}
          </div>
        </div>
        {/* Right: Episode List */}
        <div className={`w-full flex-shrink-0 space-y-3 ${isExpanded ? "" : "lg:w-72 2xl:w-80"}`}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium shrink-0">Episodes</h3>
            <div className="relative flex items-center">
              <Hash className="absolute left-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="number"
                placeholder="Find"
                value={episodeSearch}
                onChange={(e) => setEpisodeSearch(e.target.value)}
                onKeyDown={handleEpisodeSearch}
                className="h-7 w-16 sm:w-20 text-xs pl-7 pr-2"
              />
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:cursor-pointer"
                onClick={toggleSort}
                title={
                  episodeSort === "asc" ? "Sort descending" : "Sort ascending"
                }
              >
                {episodeSort === "asc" ? (
                  <ArrowUp className="h-4 w-4" />
                ) : (
                  <ArrowDown className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:cursor-pointer"
                onClick={toggleEpisodeView}
                title={episodeListView === "grid" ? "Show titles" : "Show grid"}
              >
                {episodeListView === "grid" ? (
                  <List className="h-4 w-4" />
                ) : (
                  <Grid3X3 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Episode Range Selector */}
          <div className="flex items-center gap-2 ">
            <Select value={episodeRange} onValueChange={setEpisodeRange}>
              <SelectTrigger className="h-8 text-xs hover:cursor-pointer">
                <SelectValue placeholder="EPS: 001-100" />
              </SelectTrigger>
              <SelectContent>
                {getEpisodeRanges().map((range) => (
                  <SelectItem
                    key={range.value}
                    value={range.value}
                    className="hover:cursor-pointer"
                  >
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Episode Grid View */}
          {episodeListView === "grid" && (
            <ScrollArea
              className={
                isExpanded
                  ? "h-[250px] sm:h-[400px] lg:h-[500px]"
                  : "h-[200px] sm:h-[300px] lg:h-[340px]"
              }
            >
              <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-5 gap-1.5 pr-2">
                {(episodeSort === "asc"
                  ? getEpisodesInRange()
                  : [...getEpisodesInRange()].reverse()
                ).map((ep) => (
                  <Link key={ep} href={`/watch/${id}/${ep}`} id={`ep-${ep}`}>
                    <Button
                      variant={ep === episodeNum ? "default" : "ghost"}
                      size="sm"
                      className={`relative w-full h-8 overflow-hidden text-xs hover:cursor-pointer ${
                        ep === episodeNum
                          ? "bg-primary"
                          : "bg-muted/50 hover:bg-muted"
                      } ${highlightedEp === ep ? "animate-pulse ring-2 ring-primary" : ""}`}
                    >
                      {ep}
                      {getProgressPercent(ep, allEpisodes.find((item) => item.episode === ep)) > 0 && (
                        <span
                          className={`absolute bottom-0 left-0 h-0.5 ${ep === episodeNum ? "bg-primary-foreground" : "bg-primary"}`}
                          style={{ width: `${getProgressPercent(ep, allEpisodes.find((item) => item.episode === ep))}%` }}
                        />
                      )}
                    </Button>
                  </Link>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Episode List View (with titles) */}
          {episodeListView === "list" && (
            <ScrollArea
              className="w-full"
              style={{ height: `${Math.max(1, Math.min(6, getEpisodesInRange().length)) * 88 + 4}px` }}
            >
              <div className="flex flex-col gap-2 px-1.5 py-1.5 pr-3">
                {(episodeSort === "asc"
                  ? getEpisodesInRange()
                  : [...getEpisodesInRange()].reverse()
                ).map((ep) => {
                  const info = allEpisodes.find((item) => item.episode === ep);
                  const title = getEpisodeTitleByNum(ep);
                  const displayTitle = title === `Episode ${ep}` ? title : `${ep}. ${title}`;
                  const progress = getProgressPercent(ep, info);
                  return (
                    <Link
                      key={ep}
                      href={`/watch/${id}/${ep}`}
                      id={`ep-${ep}`}
                      aria-current={ep === episodeNum ? "page" : undefined}
                      className={`group relative block h-20 overflow-hidden rounded-md bg-muted/50 transition-colors hover:bg-muted ${ep === episodeNum ? "ring-1 ring-zinc-500" : ""} ${highlightedEp === ep ? "animate-pulse ring-2 ring-primary" : ""}`}
                    >
                      <div className="flex h-full gap-2 p-1.5">
                        {info?.image?.startsWith("https://artworks.thetvdb.com/") && (
                          <div className="relative w-20 shrink-0 overflow-hidden rounded">
                            <Image src={info.image} alt="" fill sizes="80px" className="object-cover" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-1">
                            <span className="line-clamp-1 text-xs font-semibold group-hover:text-primary">
                              {displayTitle}
                            </span>
                            <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
                              {info?.has_sub && <Captions className="h-3.5 w-3.5" aria-label="Subtitles available" />}
                              {info?.has_dub && <Mic2 className="h-3.5 w-3.5" aria-label="Dub available" />}
                            </span>
                          </div>
                          {info?.description && (
                            <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                              {info.description}
                            </p>
                          )}
                        </div>
                      </div>
                      {progress > 0 && (
                        <div
                          role="progressbar"
                          aria-label={`Episode ${ep} watched`}
                          aria-valuenow={progress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          className="absolute inset-x-0 bottom-0 h-0.5 bg-muted"
                        >
                          <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      {anime && (
        <section className={`grid gap-6 pt-6 ${relatedAnime.length > 0 ? "lg:grid-cols-[minmax(0,1fr)_minmax(18rem,25rem)]" : ""}`}>
          <div className="min-w-0 space-y-4">
            <div className="flex items-start gap-4">
              <div className="relative h-44 w-32 shrink-0 overflow-hidden rounded-md bg-muted">
                <Image
                  src={anime.images.jpg.large_image_url || anime.images.jpg.image_url}
                  alt={getTitle(anime)}
                  fill
                  sizes="128px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 space-y-2">
                <h2 className="text-lg font-bold">{getTitle(anime)}</h2>
                {anime.title_japanese && (
                  <p className="text-xs text-muted-foreground">{anime.title_japanese}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {anime.type && <span>{anime.type}</span>}
                  {anime.status && <span className={anime.airing ? "text-green-500" : "text-muted-foreground"}>{anime.status}</span>}
                  {anime.year && <span>{anime.year}</span>}
                  {!!anime.episodes && <span>{anime.episodes} episodes</span>}
                </div>
                <div className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
                  {anime.season && anime.year && <span>Season: {anime.season.charAt(0).toUpperCase() + anime.season.slice(1)} {anime.year}</span>}
                  {anime.duration && <span>Duration: {anime.duration.replace(" per ep", "")}</span>}
                  {anime.score && <span>MAL Score: {anime.score.toFixed(2)}</span>}
                  {!!anime.studios?.length && <span className="truncate">Studio: {anime.studios.map((studio) => studio.name).join(", ")}</span>}
                </div>
                {!!anime.genres?.length && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {anime.genres.map((genre, index) => (
                      <Badge key={`${genre.mal_id ?? genre.name}-${index}`} variant="outline" className="text-[11px]">
                        {genre.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {anime.synopsis && (
              <p className="line-clamp-4 text-sm leading-relaxed text-muted-foreground">{anime.synopsis}</p>
            )}
          </div>

          {relatedAnime.length > 0 && (
            <aside className="min-w-0 space-y-3" aria-labelledby="related-anime-heading">
              <h2 id="related-anime-heading" className="text-base font-semibold">Related Anime</h2>
              <div className="max-h-[440px] space-y-2 overflow-y-auto pr-1">
                {relatedAnime.map((entry) => (
                  <Link
                    key={`${entry.relation}-${entry.mal_id}`}
                    href={`/anime/${entry.mal_id}`}
                    className="group flex min-w-0 items-center gap-3 rounded-md bg-muted/50 p-2 transition-colors hover:bg-muted"
                  >
                    {entry.image && (
                      <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded bg-muted">
                        <Image src={entry.image} alt="" fill sizes="48px" className="object-cover" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold group-hover:text-primary">{entry.name}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{entry.relation}</p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </aside>
          )}
        </section>
      )}
    </div>
  );
}

function WatchSkeleton() {
  return (
    <div className="space-y-4 mt-6 mb-10 px-4 md:px-10 lg:px-20">
      <Skeleton className="h-5 w-64" />
      <div className="flex flex-col lg:flex-row lg:items-start gap-4 mt-10">
        {/* Video */}
        <div className="flex-1 min-w-0 space-y-3">
          <Skeleton
            className="w-full rounded-lg"
            style={{ aspectRatio: "16/9" }}
          />
          <div className="flex items-center justify-between gap-1">
            <Skeleton className="h-8 w-12" />
            <div className="flex gap-1">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            </div>
            <Skeleton className="h-8 w-12" />
          </div>
        </div>
        {/* Episodes */}
        <div className="lg:w-64 flex-shrink-0 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-7 w-20" />
            <div className="flex gap-1">
              <Skeleton className="h-7 w-7" />
              <Skeleton className="h-7 w-7" />
            </div>
          </div>
          <Skeleton className="h-8 w-full" />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-6 pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,25rem)]">
        <div className="flex gap-4">
          <Skeleton className="h-44 w-32 shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-6 w-36" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
