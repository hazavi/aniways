// API response types
import type { Anime, EpisodeInfo } from "./anime";

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    last_visible_page: number;
    has_next_page: boolean;
  };
}

export interface AnimeRecommendation {
  mal_id: number;
  title: string;
  title_english?: string;
  images: Anime["images"];
  votes: number;
}

export interface AnimeCharacter {
  mal_id: number;
  name: string;
  images: { jpg?: { image_url?: string } };
  role: string;
  voice_actor?: {
    mal_id: number;
    name: string;
    images: { jpg?: { image_url?: string } };
  } | null;
}

export interface EpisodesResponse {
  mal_id: number;
  total: number;
  episodes: EpisodeInfo[];
}

