"""Resolve AnimeX episode embeds from an AniDB ID."""

import html
import logging
import re
import unicodedata
from urllib.parse import urlencode, urlparse

from app.core.config import settings
from app.core.dependencies import get_client
from app.utils import cache
from app.scrapers.anidb import get_anilist_id

logger = logging.getLogger(__name__)

_MEDIA_QUERY = """query ($id: Int) {
  Media(id: $id, type: ANIME) {
    id
    episodes
    title { english romaji }
  }
}"""
_PLAYER_URL = re.compile(r'player_url\s*:\s*"([^"]+)"')
_MEDIA_SLUG = re.compile(r'\bslug:"([a-z0-9-]+)",')
_SERVER_ID = re.compile(r"^[a-z0-9-]{1,32}$")


def _slug(title: str) -> str:
    normalized = unicodedata.normalize("NFKD", title)
    ascii_title = normalized.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "-", ascii_title.lower()).strip("-") or "anime"


async def get_media(anidb_id: int) -> dict | None:
    """Map an AniDB ID to the AniList ID used by AnimeX."""
    key = f"animex:media:{anidb_id}"
    if cached := cache.get(key, settings.CACHE_TTL_LONG):
        return cached

    anilist_id = await get_anilist_id(anidb_id)
    if not anilist_id:
        return None
    try:
        response = await get_client().post(
            "https://graphql.anilist.co",
            json={"query": _MEDIA_QUERY, "variables": {"id": anilist_id}},
        )
        response.raise_for_status()
        media = (response.json().get("data") or {}).get("Media")
        if media and isinstance(media.get("id"), int):
            cache.set(key, media)
            return media
    except Exception as exc:
        logger.warning("AnimeX ID lookup failed for AniDB %s: %s", anidb_id, exc)
    return None


async def get_animex_episodes(anidb_id: int, media: dict) -> list[dict]:
    """Read AnimeX's numbered episode metadata for an AniDB anime."""
    key = f"animex:episodes:{anidb_id}"
    if cached := cache.get(key, settings.CACHE_TTL_LONG):
        return cached

    title = media.get("title") or {}
    slug = _slug(title.get("english") or title.get("romaji") or "anime")
    try:
        page = await get_client().get(
            f"https://animex.one/anime/{slug}-{media['id']}",
            follow_redirects=True,
        )
        page.raise_for_status()
        match = _MEDIA_SLUG.search(page.text)
        if not match:
            return []

        response = await get_client().get(
            "https://pp.animex.one/rest/api/episodes",
            params={"id": match.group(1)},
        )
        response.raise_for_status()
        data = response.json()
        if not isinstance(data, list):
            return []

        found = {}
        for item in data:
            if not isinstance(item, dict):
                continue
            number = item.get("number")
            if not isinstance(number, int) or isinstance(number, bool) or number < 1:
                continue
            titles = item.get("titles") or {}
            if not isinstance(titles, dict):
                titles = {}
            found[number] = {
                "anidb_id": anidb_id,
                "episode": number,
                "title": titles.get("en") or None,
                "title_japanese": titles.get("ja") or None,
                "title_romanji": titles.get("x-jat") or None,
                "aired": item.get("airDateUtc"),
                "filler": bool(item.get("isFiller")),
                "recap": False,
                "has_sub": item.get("hasSub") is True,
                "has_dub": item.get("hasDub") is True,
                "image": item.get("img"),
                "description": item.get("description"),
                "duration": item.get("length") * 60 if isinstance(item.get("length"), (int, float)) else None,
            }

        count = max(media.get("episodes") or 0, max(found, default=0))
        episodes = [found.get(number) or {
            "anidb_id": anidb_id, "episode": number, "title": None,
            "title_japanese": None, "title_romanji": None, "aired": None,
            "filler": False, "recap": False,
            "has_sub": False, "has_dub": False, "image": None,
            "description": None, "duration": None,
        } for number in range(1, count + 1)]
        if found:
            cache.set(key, episodes)
        return episodes
    except Exception as exc:
        logger.warning("AnimeX episode metadata failed for AniDB %s: %s", anidb_id, exc)
        return []


async def get_episode_sources(media: dict, episode: int) -> list[dict]:
    """Read AnimeX's per-episode Sub/Dub servers and ZEN embed."""
    if episode < 1 or (media.get("episodes") and episode > media["episodes"]):
        return []

    title = media.get("title") or {}
    slug = _slug(title.get("english") or title.get("romaji") or "anime")
    url = f"https://animex.one/watch/{slug}-{media['id']}-episode-{episode}"
    try:
        response = await get_client().get(url, follow_redirects=True)
        response.raise_for_status()
        sources = []
        slug_match = _MEDIA_SLUG.search(response.text)
        if slug_match:
            media_slug = slug_match.group(1)
            try:
                servers = await get_client().get(
                    "https://pp.animex.one/rest/api/servers",
                    params={"id": media_slug, "epNum": episode},
                )
                servers.raise_for_status()
                data = servers.json()
                for audio, key, language in (("jpn", "subProviders", "sub"), ("eng", "dubProviders", "dub")):
                    providers = data.get(key, [])
                    if not isinstance(providers, list):
                        continue
                    for provider in sorted(providers, key=lambda item: not (isinstance(item, dict) and item.get("default", False))):
                        if not isinstance(provider, dict) or not _SERVER_ID.fullmatch(str(provider.get("id", ""))):
                            continue
                        server_id = provider["id"]
                        query = urlencode({"lang": language, "s": server_id, "autoplay": "0"})
                        sources.append({
                            "embed_url": f"/animex-player/e/{media_slug}/{episode}?{query}",
                            "fansub": provider.get("tip", ""),
                            "server": f"ANMX {server_id.capitalize()}",
                            "resolution": 0,
                            "quality": "Auto",
                            "audio": audio,
                            "av1": False,
                        })
            except Exception as exc:
                logger.warning("AnimeX server list failed for %s episode %s: %s", media_slug, episode, exc)

        for match in _PLAYER_URL.finditer(response.text):
            embed_url = html.unescape(match.group(1)).replace("\\/", "/")
            parsed = urlparse(embed_url)
            if parsed.scheme == "https" and parsed.hostname == "flixcloud.cc" and parsed.path.startswith("/e/"):
                sources.append({
                    "embed_url": embed_url,
                    "fansub": "AnimeX / FlixCloud",
                    "server": "ZEN",
                    "resolution": 0,
                    "quality": "Auto",
                    "audio": "jpn",
                    "av1": False,
                })
                break
        return sources
    except Exception as exc:
        logger.warning("AnimeX episode lookup failed for %s episode %s: %s", media.get("id"), episode, exc)
    return []
