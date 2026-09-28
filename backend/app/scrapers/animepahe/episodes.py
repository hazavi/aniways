"""
Animepahe Episodes
==================
"""

import logging
import re
from typing import TYPE_CHECKING

from bs4 import BeautifulSoup

from app.core.config import settings
from app.scrapers.animepahe.errors import AnimepaheAccessError

if TYPE_CHECKING:
    from app.scrapers.animepahe.client import AnimepaheScraper

logger = logging.getLogger(__name__)


async def get_anime_info(scraper: "AnimepaheScraper", uuid: str) -> dict:
    """Get anime info including episode count."""
    try:
        resp = await scraper._request(f"{settings.ANIMEPAHE_BASE_URL}/anime/{uuid}")
        resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "html.parser")

        # Episode count
        count = 0
        if div := soup.select_one(".episode-count"):
            if m := re.search(r"\((\d+)\)", div.text):
                count = int(m.group(1))

        # Title
        title = None
        if elem := soup.select_one(".title-wrapper h1 span"):
            title = elem.text.strip()

        return {"uuid": uuid, "title": title, "total_episodes": count}
    except AnimepaheAccessError:
        raise
    except Exception as e:
        logger.error("Anime info error: %s", e)
        return {"uuid": uuid, "total_episodes": 0}


async def get_episodes(scraper: "AnimepaheScraper", uuid: str, page: int = 1) -> dict:
    """Get episodes for an anime."""
    try:
        resp = await scraper._request(
            f"{settings.animepahe_api}?m=release&id={uuid}&sort=episode_asc&page={page}"
        )
        resp.raise_for_status()
        data = resp.json()

        return {
            "episodes": [
                {
                    "episode": d.get("episode"),
                    "session": d.get("session"),
                    "title": d.get("title", ""),
                    "snapshot": d.get("snapshot"),
                    "duration": d.get("duration"),
                }
                for d in data.get("data", [])
            ],
            "total": data.get("total", 0),
            "last_page": data.get("last_page", 1),
        }
    except AnimepaheAccessError:
        raise
    except Exception as e:
        logger.error("Episodes error: %s", e)
        return {"episodes": [], "total": 0, "last_page": 1}


async def find_episode(scraper: "AnimepaheScraper", uuid: str, ep_num: int) -> dict | None:
    """Find episode across all pages."""
    data = await get_episodes(scraper, uuid)

    for ep in data["episodes"]:
        if ep.get("episode") == ep_num:
            return ep

    for page in range(2, data["last_page"] + 1):
        page_data = await get_episodes(scraper, uuid, page)
        for ep in page_data["episodes"]:
            if ep.get("episode") == ep_num:
                return ep

    return None
