"""
Dependency Injection
====================

Shared resources with lazy initialization.
"""

from typing import TYPE_CHECKING
import httpx

if TYPE_CHECKING:
    from app.scrapers.animepahe import AnimepaheScraper

# Singleton instances
_client: httpx.AsyncClient | None = None
_scraper: "AnimepaheScraper | None" = None


def get_client() -> httpx.AsyncClient:
    """Get HTTP client (raises if not initialized)."""
    if not _client:
        raise RuntimeError("HTTP client not initialized")
    return _client


def get_scraper() -> "AnimepaheScraper":
    """Get Animepahe scraper (raises if not initialized)."""
    if not _scraper:
        raise RuntimeError("Scraper not initialized")
    return _scraper


def init_dependencies(client: httpx.AsyncClient, scraper: "AnimepaheScraper") -> None:
    """Initialize dependencies on startup."""
    global _client, _scraper
    _client, _scraper = client, scraper


async def cleanup_dependencies() -> None:
    """Cleanup on shutdown."""
    global _client, _scraper
    if _client:
        await _client.aclose()
    if _scraper:
        await _scraper.close()
    _client = _scraper = None
