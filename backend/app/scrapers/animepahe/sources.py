"""
Animepahe Video Sources
=======================
"""

import logging
from typing import TYPE_CHECKING

from bs4 import BeautifulSoup

from app.core.config import settings
from app.scrapers.animepahe.errors import AnimepaheAccessError

if TYPE_CHECKING:
    from app.scrapers.animepahe.client import AnimepaheScraper

logger = logging.getLogger(__name__)

async def get_sources(scraper: "AnimepaheScraper", uuid: str, session: str) -> dict:
    """Get video sources for an episode."""
    try:
        resp = await scraper._request(f"{settings.ANIMEPAHE_BASE_URL}/play/{uuid}/{session}")
        resp.raise_for_status()

        sources = parse_sources(resp.text)

        return {"sources": sources, "episode_url": str(resp.url)}
    except AnimepaheAccessError:
        raise
    except Exception as e:
        logger.error("Sources error: %s", e)
        return {"sources": []}


def parse_sources(html: str) -> list[dict]:
    """Read player options regardless of HTML attribute order or quote style."""
    sources = []
    for option in BeautifulSoup(html, "html.parser").select("[data-src][data-resolution]"):
        url = option.get("data-src", "")
        resolution = option.get("data-resolution", "")
        if not url.startswith(("https://", "http://")) or not resolution.isdigit():
            continue
        sources.append({
            "embed_url": url,
            "fansub": option.get("data-fansub", ""),
            "resolution": int(resolution),
            "quality": f"{resolution}p",
            "audio": option.get("data-audio", ""),
            "av1": option.get("data-av1", "0") == "1",
        })
    return sorted(sources, key=lambda source: source["resolution"], reverse=True)


async def get_video_url(scraper: "AnimepaheScraper", mal_id: int, episode: int, quality: str = "1080") -> dict:
    """Complete flow: MAL ID -> video URL."""
    from app.scrapers.mal import scrape_anime_details
    from app.scrapers.animepahe.search import search, find_best_match
    from app.scrapers.animepahe.episodes import find_episode

    result = {"mal_id": mal_id, "episode": episode, "error": None}

    try:
        # Get anime from MAL
        anime = await scrape_anime_details(mal_id)
        if not anime:
            return {**result, "error": "Anime not found on MAL"}

        title, title_en = anime.get("title"), anime.get("title_english")
        result["mal_title"] = title

        # Search Animepahe
        results = await search(scraper, title) or (await search(scraper, title_en) if title_en else [])
        if not results:
            return {**result, "error": f"'{title}' not found on Animepahe"}

        match = find_best_match(results, title, title_en)
        result.update(anime_uuid=match["uuid"], animepahe_title=match["title"])

        # Find episode
        ep = await find_episode(scraper, match["uuid"], episode)
        if not ep:
            return {**result, "error": f"Episode {episode} not found"}

        result["episode_session"] = ep["session"]

        # Get sources
        sources_data = await get_sources(scraper, match["uuid"], ep["session"])
        sources = sources_data.get("sources", [])
        result["sources"] = sources

        if not sources:
            return {**result, "error": "No sources found"}

        # Select quality
        target = int(quality)
        source = next((s for s in sources if s["resolution"] == target), sources[0])
        result.update(selected_quality=source["quality"], embed_url=source["embed_url"])

        # Extract video URL
        result["video_url"] = await scraper.kwik.extract(source["embed_url"])
        if not result["video_url"]:
            result["error"] = "Could not extract video URL"

        return result
    except Exception as e:
        logger.exception("get_video_url error")
        return {**result, "error": str(e)}
