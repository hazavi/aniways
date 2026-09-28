"""Resolve AnimeX episode embeds from a MyAnimeList ID."""

import html
import logging
import re
import unicodedata
from urllib.parse import urlparse

from app.core.config import settings
from app.core.dependencies import get_client
from app.utils import cache

logger = logging.getLogger(__name__)

_MEDIA_QUERY = """query ($id: Int) {
  Media(idMal: $id, type: ANIME) {
    id
    episodes
    title { english romaji }
  }
}"""
_PLAYER_URL = re.compile(r'player_url\s*:\s*"([^"]+)"')


def _slug(title: str) -> str:
    normalized = unicodedata.normalize("NFKD", title)
    ascii_title = normalized.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "-", ascii_title.lower()).strip("-") or "anime"


async def get_media(mal_id: int) -> dict | None:
    """Map a MAL ID to the AniList ID used by AnimeX."""
    key = f"animex:media:{mal_id}"
    if cached := cache.get(key, settings.CACHE_TTL_LONG):
        return cached

    try:
        response = await get_client().post(
            "https://graphql.anilist.co",
            json={"query": _MEDIA_QUERY, "variables": {"id": mal_id}},
        )
        response.raise_for_status()
        media = (response.json().get("data") or {}).get("Media")
        if media and isinstance(media.get("id"), int):
            cache.set(key, media)
            return media
    except Exception as exc:
        logger.warning("AnimeX ID lookup failed for MAL %s: %s", mal_id, exc)
    return None


async def get_episode_source(media: dict, episode: int) -> dict | None:
    """Read a FlixCloud embed URL from AnimeX's rendered episode data."""
    if episode < 1 or (media.get("episodes") and episode > media["episodes"]):
        return None

    title = media.get("title") or {}
    slug = _slug(title.get("english") or title.get("romaji") or "anime")
    url = f"https://animex.one/watch/{slug}-{media['id']}-episode-{episode}"
    try:
        response = await get_client().get(url, follow_redirects=True)
        response.raise_for_status()
        for match in _PLAYER_URL.finditer(response.text):
            embed_url = html.unescape(match.group(1)).replace("\\/", "/")
            parsed = urlparse(embed_url)
            if parsed.scheme == "https" and parsed.hostname == "flixcloud.cc" and parsed.path.startswith("/e/"):
                return {
                    "embed_url": embed_url,
                    "fansub": "AnimeX / FlixCloud",
                    "resolution": 0,
                    "quality": "Auto",
                    "audio": "jpn",
                    "av1": False,
                }
    except Exception as exc:
        logger.warning("AnimeX episode lookup failed for %s episode %s: %s", media.get("id"), episode, exc)
    return None
