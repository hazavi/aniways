import type {
  Anime,
  WatchResponse,
  EpisodeInfo,
} from "@/types";
import { resolveImageUrl } from "@/lib/images";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4444";

// Re-export types for backward compatibility
export type { Anime, WatchResponse, EpisodeInfo };
export type { Episode, VideoSource } from "@/types";

// Retry configuration for API calls
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 10000; // 10 seconds

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry<T>(
  url: string,
  retries = MAX_RETRIES,
  delay = INITIAL_RETRY_DELAY
): Promise<T> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  } catch (error) {
    // Check if it's a network error (backend not ready) and we have retries left
    if (retries > 0 && (error instanceof TypeError || (error instanceof Error && error.message.includes("fetch")))) {
      console.log(`API not ready, retrying in ${delay}ms... (${retries} retries left)`);
      await sleep(delay);
      // Exponential backoff with max delay cap
      const nextDelay = Math.min(delay * 1.5, MAX_RETRY_DELAY);
      return fetchWithRetry<T>(url, retries - 1, nextDelay);
    }
    throw error;
  }
}

async function fetchApi<T>(
  endpoint: string,
  params?: Record<string, string | number>
): Promise<T> {
  const url = new URL(`${API_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
  }

  return fetchWithRetry<T>(url.toString());
}

// API endpoints (AniDB catalogue and AnimeX streams)
export const api = {
  // Search anime
  searchAnime: (q: string, page = 1) =>
    fetchApi<{ data: Anime[]; pagination: { last_visible_page: number; has_next_page: boolean } }>("/api/anime", { q, page }),

  // Get anime details
  getAnime: async (id: number) => {
    const result = await fetchApi<{ data: Anime }>(`/api/anime/${id}`);
    for (const format of ["jpg", "webp"] as const) {
      const image = result.data.images?.[format];
      if (image) {
        image.image_url = resolveImageUrl(image.image_url);
        image.large_image_url = resolveImageUrl(image.large_image_url);
      }
    }
    return result;
  },
  
  // Get anime recommendations
  getRecommendations: (id: number, limit = 12) =>
    fetchApi<{ data: { anidb_id: number; title: string; title_english?: string; images: Anime["images"]; votes: number }[] }>(`/api/anime/${id}/recommendations`, { limit }),

  // Get anime characters
  getCharacters: (id: number, limit = 12) =>
    fetchApi<{ data: { anidb_id: number; name: string; images: { jpg?: { image_url?: string } }; role: string; voice_actor?: { anidb_id: number; name: string; images: { jpg?: { image_url?: string } } } | null }[] }>(`/api/anime/${id}/characters`, { limit }),

  // Top anime lists
  getTopAnime: (filter = "airing", page = 1, limit = 24, type?: string) =>
    fetchApi<{ data: Anime[]; pagination: { last_visible_page: number; has_next_page: boolean } }>("/api/top/anime", { filter, page, limit, ...(type && { type }) }),
  
  // Browse anime with filters and sorting
  browseAnime: (params: { status?: string; order_by?: string; sort?: string; page?: number; limit?: number } = {}) =>
    fetchApi<{ data: Anime[]; pagination: { last_visible_page: number; has_next_page: boolean } }>("/api/browse/anime", {
      ...(params.status && { status: params.status }),
      ...(params.order_by && { order_by: params.order_by }),
      ...(params.sort && { sort: params.sort }),
      page: params.page || 1,
      limit: params.limit || 24,
    }),

  // Seasonal anime
  getCurrentSeason: (page = 1, limit = 24) =>
    fetchApi<{ data: Anime[]; pagination: { last_visible_page: number; has_next_page: boolean } }>("/api/seasons/now", { page, limit }),
  getUpcoming: (page = 1, limit = 24) =>
    fetchApi<{ data: Anime[]; pagination: { last_visible_page: number; has_next_page: boolean } }>("/api/seasons/upcoming", { page, limit }),
  getSeason: (year: number, season: string, page = 1, limit = 24) =>
    fetchApi<{ data: Anime[]; pagination: { last_visible_page: number; has_next_page: boolean } }>(`/api/seasons/${year}/${season}`, { page, limit }),

  // AnimeX video sources and availability by AniDB ID
  getWatchSources: (anidbId: number, episode: number) =>
    fetchApi<WatchResponse>(`/api/watch/${anidbId}/${episode}`),
  getAnimeXInfo: (anidbId: number) =>
    fetchApi<{ anidb_id: number; title: string; match: { uuid: string; title: string; provider: string }; total_episodes: number }>(`/api/anime/${anidbId}/animex`),

  // Get episode titles from the backend
  getEpisodes: (anidbId: number) =>
    fetchApi<{ anidb_id: number; total: number; episodes: EpisodeInfo[] }>(`/api/anime/${anidbId}/episodes`),

  // Schedule
  getSchedule: (day?: string) =>
    fetchApi<{ data: Anime[]; pagination: { last_visible_page: number; has_next_page: boolean } }>("/api/schedules", day ? { filter: day } : {}),
};
