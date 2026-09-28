"""
Application Configuration
=========================

Centralized settings with environment variable support.
"""

import json
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
    API_VERSION: str = "2.0.0"
    API_DESCRIPTION: str = "Anime streaming API - MyAnimeList v2 + Animepahe"

    # External URLs
    MAL_BASE_URL: str = "https://api.myanimelist.net/v2"
    MAL_CLIENT_ID: str = field(default_factory=lambda: _env("MAL_CLIENT_ID", ""))
    ANIMEPAHE_BASE_URL: str = field(default_factory=lambda: _env("ANIMEPAHE_BASE_URL", "https://animepahe.pw").rstrip("/"))

    # Cache TTL (seconds)
    CACHE_TTL_SHORT: int = 300   # 5 min: top, seasonal, search
    CACHE_TTL_LONG: int = 3600   # 1 hour: anime details, episodes

    # HTTP
    HTTP_TIMEOUT: float = 30.0
    USER_AGENT: str = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/131.0.0.0 Safari/537.36"
    )

    @property
    def animepahe_api(self) -> str:
        return f"{self.ANIMEPAHE_BASE_URL}/api"

    @property
    def animepahe_headers(self) -> dict[str, str]:
        return {
            "User-Agent": self.USER_AGENT,
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Accept-Language": "en-US,en;q=0.9",
            "X-Requested-With": "XMLHttpRequest",
            "Referer": f"{self.ANIMEPAHE_BASE_URL}/",
        }

    @property
    def kwik_headers(self) -> dict[str, str]:
        return {
            "User-Agent": self.USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Referer": f"{self.ANIMEPAHE_BASE_URL}/",
        }


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()


# =============================================================================
# DDoS-Guard Cookies
# =============================================================================
#
# ⚠️  Configure these for Animepahe to work!
#
# Get fresh cookies:
#   1. Use a VPN (recommended)
#   2. Visit https://animepahe.pw in browser
#   3. DevTools (F12) → Application → Cookies
#   4. Copy __ddg* values below or set env vars
#
# Env vars: ANIMEPAHE_DDG1, ANIMEPAHE_DDG2, etc.
# =============================================================================

def get_default_cookies() -> dict[str, str]:
    """Get Animepahe cookies from a JSON bundle or individual variables."""
    cookies: dict[str, str] = {}
    if raw_cookies := _env("ANIMEPAHE_COOKIES", ""):
        try:
            parsed = json.loads(raw_cookies)
            if isinstance(parsed, dict):
                cookies = {str(name): str(value) for name, value in parsed.items()}
        except json.JSONDecodeError:
            pass

    cookie_names = {
        "cf_clearance": "ANIMEPAHE_CF_CLEARANCE",
        "__ddg1_": "ANIMEPAHE_DDG1",
        "__ddg2_": "ANIMEPAHE_DDG2",
        "__ddg8_": "ANIMEPAHE_DDG8",
        "__ddg9_": "ANIMEPAHE_DDG9",
        "__ddg10_": "ANIMEPAHE_DDG10",
        "__ddgid_": "ANIMEPAHE_DDGID",
        "__ddgmark_": "ANIMEPAHE_DDGMARK",
    }
    cookies.update({name: value for name, env_name in cookie_names.items() if (value := _env(env_name))})
    return cookies
