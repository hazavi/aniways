import type {
  User,
  UserProfile,
  AuthResponse,
  ListStatus,
  AnimeListItem,
  AnimeListResponse,
} from "@/types";

// Re-export types for backward compatibility
export type { User, UserProfile, AuthResponse, ListStatus, AnimeListItem, AnimeListResponse };
export { statusLabels, statusColors, statusOptions } from "@/types/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4444";

// Helper to get auth header
function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("aniways-token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Auth API
export const authApi = {
  signup: async (username: string, password: string): Promise<AuthResponse> => {
    const res = await fetch(`${API_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || "Signup failed");
    }
    return res.json();
  },

  login: async (username: string, password: string): Promise<AuthResponse> => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || "Login failed");
    }
    return res.json();
  },

  getMe: async (): Promise<User> => {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error("Not authenticated");
    return res.json();
  },

  getProfile: async (): Promise<UserProfile> => {
    const res = await fetch(`${API_URL}/api/auth/profile`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error("Failed to get profile");
    return res.json();
  },
};

// Anime List API
export const listApi = {
  getList: async (status?: ListStatus): Promise<AnimeListResponse> => {
    const url = new URL(`${API_URL}/api/list`);
    if (status) url.searchParams.set("status", status);
    
    const res = await fetch(url.toString(), {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error("Failed to get list");
    return res.json();
  },

  checkAnime: async (anidbId: number): Promise<{ in_list: boolean; item: AnimeListItem | null }> => {
    const res = await fetch(`${API_URL}/api/list/check/${anidbId}`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) return { in_list: false, item: null };
    return res.json();
  },

  addToList: async (data: {
    anidb_id: number;
    title: string;
    title_english?: string;
    image_url?: string;
    total_episodes?: number;
    status?: ListStatus;
  }): Promise<AnimeListItem> => {
    const res = await fetch(`${API_URL}/api/list`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || "Failed to add to list");
    }
    return res.json();
  },

  updateListItem: async (anidbId: number, data: {
    status?: ListStatus;
    episodes_watched?: number;
    score?: number;
    notes?: string;
  }): Promise<AnimeListItem> => {
    const res = await fetch(`${API_URL}/api/list/${anidbId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update list item");
    return res.json();
  },

  removeFromList: async (anidbId: number): Promise<void> => {
    const res = await fetch(`${API_URL}/api/list/${anidbId}`, {
      method: "DELETE",
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error("Failed to remove from list");
  },

  quickAdd: async (
    anidbId: number,
    status: ListStatus,
    title: string,
    titleEnglish?: string,
    imageUrl?: string,
    totalEpisodes?: number
  ): Promise<AnimeListItem> => {
    const url = new URL(`${API_URL}/api/list/quick-add/${anidbId}/${status}`);
    url.searchParams.set("title", title);
    if (titleEnglish) url.searchParams.set("title_english", titleEnglish);
    if (imageUrl) url.searchParams.set("image_url", imageUrl);
    if (totalEpisodes) url.searchParams.set("total_episodes", String(totalEpisodes));

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error("Failed to add to list");
    return res.json();
  },
};
