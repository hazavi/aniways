"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { api, type Anime } from "@/lib/api";
import { useLanguage } from "@/components/language-provider";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Calendar, Star } from "lucide-react";

const DAYS = [
  { value: "monday", label: "Mon", full: "Monday" },
  { value: "tuesday", label: "Tue", full: "Tuesday" },
  { value: "wednesday", label: "Wed", full: "Wednesday" },
  { value: "thursday", label: "Thu", full: "Thursday" },
  { value: "friday", label: "Fri", full: "Friday" },
  { value: "saturday", label: "Sat", full: "Saturday" },
  { value: "sunday", label: "Sun", full: "Sunday" },
];

function getCurrentDay(): string {
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return days[new Date().getDay()];
}

function ScheduleCard({
  anime,
  getTitle,
}: {
  anime: Anime;
  getTitle: (anime: {
    title?: string;
    title_english?: string;
    title_japanese?: string;
  }) => string;
}) {
  const broadcast = anime.broadcast;
  const imageUrl =
    anime.images?.webp?.large_image_url ||
    anime.images?.jpg?.large_image_url ||
    "/placeholder.png";
  const title = getTitle(anime);

  return (
    <Link href={`/anime/${anime.anidb_id}`} className="group block">
      <div className="flex gap-3 p-2 rounded-xl hover:bg-white/5 transition-all duration-200">
        <div className="relative w-12 h-16 flex-shrink-0 overflow-hidden rounded-lg shadow-md">
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="48px"
          />
        </div>
        <div className="flex-1 min-w-0 py-0.5">
          <h3 className="font-medium text-sm line-clamp-1 group-hover:text-purple-400 transition-colors">
            {title}
          </h3>

          <div className="flex items-center gap-2 mt-1">
            {broadcast?.time && (
              <span className="text-xs text-purple-400 font-mono font-medium">
                {broadcast.time}
              </span>
            )}
            {anime.type && (
              <span className="text-xs text-muted-foreground">
                {anime.type}
              </span>
            )}
            {anime.score && (
              <span className="text-xs text-yellow-500 flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-yellow-500" />
                {anime.score}
              </span>
            )}
          </div>

          {anime.genres && anime.genres.length > 0 && (
            <p className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-1">
              {anime.genres
                .slice(0, 2)
                .map((g) => g.name)
                .join(" · ")}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function ScheduleSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-3 p-2 rounded-lg bg-muted/30">
          <Skeleton className="w-12 h-16 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2 py-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SchedulePage() {
  const { getTitle } = useLanguage();
  const [schedule, setSchedule] = useState<Record<string, Anime[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [activeDay, setActiveDay] = useState(getCurrentDay());

  useEffect(() => {
    document.title = "Schedule - Aniways";
  }, []);

  const fetchScheduleForDay = useCallback(
    async (day: string) => {
      if (schedule[day] || loading[day]) return;

      setLoading((prev) => ({ ...prev, [day]: true }));
      try {
        const res = await api.getSchedule(day);
        setSchedule((prev) => ({ ...prev, [day]: res.data || [] }));
      } catch (error) {
        console.error(`Failed to fetch schedule for ${day}:`, error);
        setSchedule((prev) => ({ ...prev, [day]: [] }));
      } finally {
        setLoading((prev) => ({ ...prev, [day]: false }));
      }
    },
    [schedule, loading],
  );

  useEffect(() => {
    fetchScheduleForDay(activeDay);
  }, [activeDay, fetchScheduleForDay]);

  const currentDay = getCurrentDay();

  // Sort anime by broadcast time and deduplicate
  const sortedSchedule = (day: string) => {
    const anime = schedule[day] || [];
    const seen = new Set<number>();
    return [...anime]
      .filter((a) => {
        if (seen.has(a.anidb_id)) return false;
        seen.add(a.anidb_id);
        return true;
      })
      .sort((a, b) => {
        const timeA = a.broadcast?.time || "99:99";
        const timeB = b.broadcast?.time || "99:99";
        return timeA.localeCompare(timeB);
      });
  };

  return (
    <div className="max-w-6xl mx-auto mt-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          Weekly Schedule
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Airing times in JST (Japan Standard Time)
        </p>
      </div>

      {/* Day selector - compact pills */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-2">
        {DAYS.map((day) => {
          const isActive = activeDay === day.value;
          const isToday = currentDay === day.value;
          return (
            <button
              key={day.value}
              onClick={() => setActiveDay(day.value)}
              className={`
                relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap hover:cursor-pointer
                ${
                  isActive
                    ? "bg-purple-500 text-white shadow-lg shadow-purple-500/25"
                    : "bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground"
                }
              `}
            >
              <span className="hidden sm:inline">{day.full}</span>
              <span className="sm:hidden">{day.label}</span>
              {isToday && (
                <span
                  className={`absolute -top-0 -right-1 w-2 h-2 rounded-full ${isActive ? "bg-white" : "bg-purple-500"}`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Schedule grid */}
      <div className="rounded-2xl border border-b/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-semibold text-sm">
            {DAYS.find((d) => d.value === activeDay)?.full}
          </h2>
          <span className="text-xs text-muted-foreground">
            {sortedSchedule(activeDay).length} anime
          </span>
        </div>

        <div className="p-2 max-h-[600px] overflow-y-auto">
          {loading[activeDay] ? (
            <ScheduleSkeleton />
          ) : sortedSchedule(activeDay).length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-1">
              {sortedSchedule(activeDay).map((anime) => (
                <ScheduleCard
                  key={anime.anidb_id}
                  anime={anime}
                  getTitle={getTitle}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No anime scheduled</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
