export interface WatchHistoryItem {
  malId: number;
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

export function getEpisodeWatchProgress(malId: number): WatchHistoryItem[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(EPISODE_PROGRESS_KEY);
    const episodes: WatchHistoryItem[] = stored ? JSON.parse(stored) : [];
    const saved = episodes.filter((item) => item.malId === malId);
    const recent = getWatchHistory().find(
      (item) => item.malId === malId && !saved.some((episode) => episode.episode === item.episode),
    );
    return recent ? [...saved, recent] : saved;
  } catch {
    return getWatchHistory().filter((item) => item.malId === malId);
  }
}

export function getWatchHistory(): WatchHistoryItem[] {
  if (typeof window === "undefined") return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
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
      (h) => h.malId !== item.malId
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
      (episode) => episode.malId !== item.malId || episode.episode !== item.episode,
    )].slice(0, MAX_EPISODE_PROGRESS_ITEMS);
    localStorage.setItem(EPISODE_PROGRESS_KEY, JSON.stringify(updatedProgress));
  } catch (error) {
    console.error("Failed to save watch progress:", error);
  }
}

export function getWatchProgressForAnime(malId: number): WatchHistoryItem | null {
  const history = getWatchHistory();
  // Get the most recent episode watched for this anime
  return history.find((h) => h.malId === malId) || null;
}

export function removeFromWatchHistory(malId: number, episode: number): void {
  if (typeof window === "undefined") return;
  
  try {
    const history = getWatchHistory();
    const filtered = history.filter(
      (h) => !(h.malId === malId && h.episode === episode)
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    const storedProgress = localStorage.getItem(EPISODE_PROGRESS_KEY);
    const episodeProgress: WatchHistoryItem[] = storedProgress ? JSON.parse(storedProgress) : [];
    localStorage.setItem(EPISODE_PROGRESS_KEY, JSON.stringify(episodeProgress.filter(
      (item) => item.malId !== malId || item.episode !== episode,
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
