// Anime-related types

export interface Anime {
  mal_id: number;
  title: string;
  title_english?: string;
  title_japanese?: string;
  images: {
    jpg: { large_image_url: string; image_url: string };
    webp: { large_image_url: string; image_url: string };
  };
  synopsis?: string;
  background?: string;
  score?: number;
  scored_by?: number;
  rank?: number;
  popularity?: number;
  members?: number;
  favorites?: number;
  status?: string;
  rating?: string;
  episodes?: number;
  duration?: string;
  source?: string;
  aired?: { string: string; from?: string; to?: string };
  broadcast?: {
    string?: string;
    day?: string;
    time?: string;
    timezone?: string;
  };
  season?: string;
  year?: number;
  studios?: { mal_id: number; name: string }[];
  producers?: { mal_id: number; name: string }[];
  licensors?: { mal_id: number; name: string }[];
  genres?: { mal_id: number; name: string }[];
  themes?: { mal_id: number; name: string }[];
  demographics?: { mal_id: number; name: string }[];
  type?: string;
  airing?: boolean;
  relations?: {
    relation: string;
    entry: { mal_id: number; type: string; name: string; url: string }[];
  }[];
}

export interface Episode {
  episode: number;
  session: string;
  snapshot?: string;
  filler?: boolean;
  created_at?: string;
}

export interface VideoSource {
  embed_url: string;
  fansub: string;
  server?: string;
  resolution: number;
  quality: string;
  audio: string;
  av1: boolean;
}

export interface EpisodeInfo {
  episode: number;
  title?: string;
  title_japanese?: string;
  title_romanji?: string;
  aired?: string;
  has_sub?: boolean;
  has_dub?: boolean;
  image?: string;
  description?: string;
  duration?: number;
}

export interface WatchResponse {
  mal_id: number;
  title: string;
  episode: number;
  total_episodes?: number;
  episode_info?: EpisodeInfo;
  uuid: string;
  session: string;
  snapshot?: string;
  sources: VideoSource[];
}

