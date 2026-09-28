"""
Animepahe Latest Releases
=========================
"""

import asyncio
import logging
import re
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from bs4 import BeautifulSoup

from app.core.config import settings
from app.scrapers.animepahe.errors import AnimepaheAccessError
from app.utils.matching import similarity

if TYPE_CHECKING:
    from app.scrapers.animepahe.client import AnimepaheScraper

logger = logging.getLogger(__name__)

# MAL ID cache
_mal_cache: dict[str, tuple] = {}


async def get_latest_releases(scraper: "AnimepaheScraper", page: int = 1, limit: int = 12) -> dict:
    """Get latest episode releases with MAL IDs."""
    try:
        resp = await scraper._request(f"{settings.ANIMEPAHE_BASE_URL}/?page={page}")
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        items = _parse_latest_releases(soup)[:limit]
        releases = []

        for i in range(0, len(items), 4):
            batch = items[i : i + 4]
            results = await asyncio.gather(*[_resolve_mal(item) for item in batch])
            releases.extend(results)

            if i + 4 < len(items):
                await asyncio.sleep(0.5)

        return {
            "total": len(items),
            "current_page": page,
            "last_page": _last_page(soup),
            "data": releases,
        }
    except AnimepaheAccessError:
        raise
    except Exception as e:
        logger.error("Latest releases error: %s", e)
        return {"total": 0, "current_page": 1, "last_page": 1, "data": []}


def _parse_latest_releases(soup: BeautifulSoup) -> list[dict]:
    """Extract latest-release cards from Animepahe's rendered home page."""
    releases = []
    for card in soup.select(".latest-release .episode-wrap"):
        anime_link = card.select_one('.episode-title a[href^="/anime/"]')
        play_link = card.select_one('a.play[href^="/play/"]')
        snapshot = card.select_one(".episode-snapshot img")
        if not anime_link or not play_link:
            continue

        parts = play_link["href"].strip("/").split("/")
        if len(parts) != 3 or parts[0] != "play":
            continue

        episode_match = re.search(r"Episode\s+(\d+)", play_link.get_text(" ", strip=True))
        if not episode_match:
            continue

        releases.append({
            "anime_title": anime_link.get("title") or anime_link.get_text(" ", strip=True),
            "anime_session": parts[1],
            "session": parts[2],
            "episode": int(episode_match.group(1)),
            "snapshot": snapshot.get("src") if snapshot else None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    return releases


def _last_page(soup: BeautifulSoup) -> int:
    """Read the final page number from Animepahe's pager."""
    last_page = 1
    for link in soup.select(".pagination a[data-page]"):
        try:
            last_page = max(last_page, int(link["data-page"]))
        except (KeyError, TypeError, ValueError):
            continue
    return last_page


async def _resolve_mal(item: dict) -> dict:
    """Resolve MAL info for a release item."""
    title = item.get("anime_title", "")
    mal_id, poster, anime_type, duration = await _search_mal(title)

    return {
        "anime_title": title,
        "anime_uuid": item.get("anime_session"),
        "episode": item.get("episode"),
        "poster": poster or item.get("snapshot"),
        "fansub": item.get("fansub"),
        "created_at": item.get("created_at"),
        "mal_id": mal_id,
        "watch_url": f"/watch/{mal_id}/{item.get('episode')}" if mal_id else None,
        "type": anime_type,
        "duration": duration,
    }


async def _search_mal(title: str) -> tuple[Optional[int], Optional[str], Optional[str], Optional[str]]:
    """Search MAL for anime info (cached)."""
    from app.scrapers.mal import search_anime

    key = title.lower().strip()
    if key in _mal_cache:
        return _mal_cache[key]

    try:
        results, _ = await search_anime(title, page=1, limit=5)
        if not results:
            return None, None, None, None

        # Find best match
        best = results[0]
        best_score = 0.0

        for anime in results:
            anime_title = anime.get("title", "")

            if anime_title.lower() == title.lower():
                best = anime
                break

            score = similarity(anime_title, title)
            if score > best_score:
                best_score, best = score, anime

        result = (
            best["mal_id"],
            best.get("images", {}).get("jpg", {}).get("large_image_url"),
            best.get("type"),
            best.get("duration"),
        )
        _mal_cache[key] = result
        return result
    except Exception as e:
        logger.error("MAL search error: %s", e)
        return None, None, None, None
