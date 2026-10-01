"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

type Language = "en" | "jp";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  getTitle: (anime: {
    title?: string;
    title_english?: string;
    title_japanese?: string;
  }) => string;
  getEpisodeTitle: (
    episode: {
      title?: string;
      title_romanji?: string;
      title_japanese?: string;
    },
    epNum: number,
  ) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");
  useEffect(() => {
    const stored = localStorage.getItem("language") as Language;
    if (stored === "en" || stored === "jp") {
      queueMicrotask(() => setLanguage(stored));
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("language", lang);
  };

  const getTitle = useCallback(
    (anime: {
      title?: string;
      title_english?: string;
      title_japanese?: string;
    }) => {
      if (language === "en") {
        // Prefer English, fallback to Romaji (title)
        return anime.title_english || anime.title || "Unknown";
      } else {
        // Use Romaji for Japanese preference
        return anime.title || anime.title_english || "Unknown";
      }
    },
    [language],
  );

  const getEpisodeTitle = useCallback(
    (
      episode: {
        title?: string;
        title_romanji?: string;
        title_japanese?: string;
      },
      epNum: number,
    ) => {
      if (language === "en") {
        // English: prefer English title, fallback to Romanji
        return episode.title || episode.title_romanji || `Episode ${epNum}`;
      } else {
        // Japanese: prefer Romanji, fallback to English
        return episode.title_romanji || episode.title || `Episode ${epNum}`;
      }
    },
    [language],
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage: handleSetLanguage,
        getTitle,
        getEpisodeTitle,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
