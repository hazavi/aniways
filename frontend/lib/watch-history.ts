import { resolveImageUrl } from "@/lib/images";

export interface WatchHistoryItem {
  anidbId: number;
  episode: number;
  timestamp: number; // seconds into the episode
  duration: number; // total episode duration in seconds
  animeTitle: string;
  animeTitleEnglish?: string;
  imageUrl: string;
  lastWatched: number; // Date timestamp
}

const STORAGE_KEY = "aniways-watch-history";
const EPISODE_PROGRESS_KEY = "aniways-episode-progress";
const MAX_HISTORY_ITEMS = 20;
const MAX_EPISODE_PROGRESS_ITEMS = 500;
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4444";

export async function migrateWatchHistory(): Promise<void> {
  if (typeof window === "undefined") return;
  const keys = [STORAGE_KEY, EPISODE_PROGRESS_KEY];
  const rows = keys.map((key) => {
    try {
      const value: unknown = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value as (WatchHistoryItem & { malId?: number })[] : [];
    } catch {
      return [];
    }
  });
  const oldIds = [...new Set(rows.flat().map((item) => item.malId).filter((id): id is number => typeof id === "number"))];
  if (!oldIds.length) return;
  try {
    const response = await fetch(`${API_URL}/api/ids/legacy`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(oldIds.slice(0, 500)),
    });
    if (!response.ok) return;
    const { data } = await response.json() as { data: Record<string, number> };
    rows.forEach((items, index) => {
      const updated = items.map((item) => {
        if (item.anidbId || !item.malId || !data[item.malId]) return item;
        const { malId, ...rest } = item;
        return { ...rest, anidbId: data[malId] };
      });
      const seen = new Set<string>();
      const unique = updated.filter((item) => {
        if (!item.anidbId) return true;
        const key = index === 0 ? `${item.anidbId}` : `${item.anidbId}:${item.episode}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      localStorage.setItem(keys[index], JSON.stringify(unique));
    });
    window.dispatchEvent(new Event("aniways-history-migrated"));
  } catch {
    // Retain old entries and retry on the next app load.
  }
}

export function getEpisodeWatchProgress(anidbId: number): WatchHistoryItem[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(EPISODE_PROGRESS_KEY);
    const episodes: WatchHistoryItem[] = stored ? JSON.parse(stored) : [];
    const saved = episodes.filter((item) => item.anidbId === anidbId);
    const recent = getWatchHistory().find(
      (item) => item.anidbId === anidbId && !saved.some((episode) => episode.episode === item.episode),
    );
    return recent ? [...saved, recent] : saved;
  } catch {
    return getWatchHistory().filter((item) => item.anidbId === anidbId);
  }
}

export function getWatchHistory(): WatchHistoryItem[] {
  if (typeof window === "undefined") return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return (JSON.parse(stored) as WatchHistoryItem[])
      .filter((item) => Number.isInteger(item.anidbId))
      .map((item) => ({ ...item, imageUrl: resolveImageUrl(item.imageUrl) }));
  } catch {
    return [];
  }
}

export function saveWatchProgress(item: WatchHistoryItem): void {
  if (typeof window === "undefined") return;
  
  try {
    const history = getWatchHistory();
    
    // Remove existing entry for the same anime (any episode)
    const filtered = history.filter(
      (h) => h.anidbId !== item.anidbId
    );
    
    // Add new entry at the beginning
    filtered.unshift({
      ...item,
      lastWatched: Date.now(),
    });
    
    // Keep only the most recent items
    const trimmed = filtered.slice(0, MAX_HISTORY_ITEMS);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));

    const storedProgress = localStorage.getItem(EPISODE_PROGRESS_KEY);
    const episodeProgress: WatchHistoryItem[] = storedProgress ? JSON.parse(storedProgress) : [];
    const updatedProgress = [item, ...episodeProgress.filter(
      (episode) => episode.anidbId !== item.anidbId || episode.episode !== item.episode,
    )].slice(0, MAX_EPISODE_PROGRESS_ITEMS);
    localStorage.setItem(EPISODE_PROGRESS_KEY, JSON.stringify(updatedProgress));
  } catch (error) {
    console.error("Failed to save watch progress:", error);
  }
}

export function getWatchProgressForAnime(anidbId: number): WatchHistoryItem | null {
  const history = getWatchHistory();
  // Get the most recent episode watched for this anime
  return history.find((h) => h.anidbId === anidbId) || null;
}

export function removeFromWatchHistory(anidbId: number, episode: number): void {
  if (typeof window === "undefined") return;
  
  try {
    const history = getWatchHistory();
    const filtered = history.filter(
      (h) => !(h.anidbId === anidbId && h.episode === episode)
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    const storedProgress = localStorage.getItem(EPISODE_PROGRESS_KEY);
    const episodeProgress: WatchHistoryItem[] = storedProgress ? JSON.parse(storedProgress) : [];
    localStorage.setItem(EPISODE_PROGRESS_KEY, JSON.stringify(episodeProgress.filter(
      (item) => item.anidbId !== anidbId || item.episode !== episode,
    )));
  } catch (error) {
    console.error("Failed to remove from watch history:", error);
  }
}

export function clearWatchHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(EPISODE_PROGRESS_KEY);
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
