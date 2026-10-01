// Authentication and user-related types

export interface User {
  id: number;
  username: string;
  email: string;
  avatar_url?: string;
  created_at: string;
}

export interface UserProfile extends User {
  stats: {
    plan_to_watch: number;
    watching: number;
    completed: number;
    paused: number;
    dropped: number;
    total: number;
  };
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// Anime list types
export type ListStatus =
  | "plan_to_watch"
  | "watching"
  | "completed"
  | "paused"
  | "dropped";

export interface AnimeListItem {
  id: number;
  anidb_id: number;
  title: string;
  title_english?: string;
  image_url?: string;
  total_episodes?: number;
  status: ListStatus;
  episodes_watched: number;
  score?: number;
  notes?: string;
  added_at: string;
  updated_at: string;
}

export interface AnimeListResponse {
  items: AnimeListItem[];
  total: number;
}

// Status display helpers
export const statusLabels: Record<ListStatus, string> = {
  plan_to_watch: "Plan to Watch",
  watching: "Watching",
  completed: "Completed",
  paused: "Paused",
  dropped: "Dropped",
};

export const statusColors: Record<ListStatus, string> = {
  plan_to_watch: "bg-blue-500",
  watching: "bg-green-500",
  completed: "bg-purple-500",
  paused: "bg-yellow-500",
  dropped: "bg-red-500",
};

// Status options for dropdowns
export const statusOptions: { value: ListStatus; label: string }[] = [
  { value: "plan_to_watch", label: "Plan to Watch" },
  { value: "watching", label: "Watching" },
  { value: "completed", label: "Completed" },
  { value: "paused", label: "Paused" },
  { value: "dropped", label: "Dropped" },
];
