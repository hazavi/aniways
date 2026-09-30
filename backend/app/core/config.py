"""
Application Configuration
=========================

Centralized settings with environment variable support.
"""

import os
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

# Environment helpers
_env = os.getenv
_env_bool = lambda k, d=False: _env(k, str(d)).lower() in ("true", "1", "yes")
_env_int = lambda k, d=0: int(_env(k, str(d)) or d)


@dataclass(frozen=True, slots=True)
class Settings:
    """Immutable application settings."""

    # Server
    DEBUG: bool = field(default_factory=lambda: _env_bool("DEBUG"))
    HOST: str = field(default_factory=lambda: _env("HOST", "127.0.0.1"))
    PORT: int = field(default_factory=lambda: _env_int("PORT", 4444))

    # API Info
    API_TITLE: str = "Aniways API"
    API_VERSION: str = "1.6.2"
    API_DESCRIPTION: str = "Anime streaming API - MyAnimeList v2 + AnimeX"

    # External URLs
    MAL_BASE_URL: str = "https://api.myanimelist.net/v2"
    MAL_CLIENT_ID: str = field(default_factory=lambda: _env("MAL_CLIENT_ID", ""))

    # Cache TTL (seconds)
    CACHE_TTL_SHORT: int = 300   # 5 min: top, seasonal, search
    CACHE_TTL_LONG: int = 3600   # 1 hour: anime details, episodes

    # HTTP
    HTTP_TIMEOUT: float = 30.0


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
