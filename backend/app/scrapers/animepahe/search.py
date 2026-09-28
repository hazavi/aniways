"""
Animepahe Search
================
"""

import logging
from typing import TYPE_CHECKING

from app.core.config import settings
from app.scrapers.animepahe.errors import AnimepaheAccessError
from app.utils.matching import best_match

if TYPE_CHECKING:
    from app.scrapers.animepahe.client import AnimepaheScraper

logger = logging.getLogger(__name__)


async def search(scraper: "AnimepaheScraper", query: str) -> list[dict]:
    """Search anime on Animepahe."""
    try:
        resp = await scraper._request(settings.animepahe_api, params={"m": "search", "q": query})
        resp.raise_for_status()

        return [
            {
                "title": d.get("title"),
                "uuid": d.get("session"),
                "type": d.get("type"),
                "episodes": d.get("episodes"),
                "status": d.get("status"),
                "season": d.get("season"),
                "year": d.get("year"),
                "score": d.get("score"),
                "poster": d.get("poster"),
            }
            for d in resp.json().get("data", [])
        ]
    except AnimepaheAccessError:
        raise
    except Exception as e:
        logger.error("Search error: %s", e)
        return []


def find_best_match(results: list[dict], title: str, title_en: str = None) -> dict:
    """Find best matching anime from results."""
    return best_match(results, title, title_en, key="title")
