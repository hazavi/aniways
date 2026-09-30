"""MyAnimeList v2 client for public anime catalogue data."""

import asyncio
import logging
from datetime import date
from typing import Any

from app.core.config import settings
from app.core.dependencies import get_client
from app.utils import cache

logger = logging.getLogger(__name__)

_FIELDS = (
    "id,title,main_picture,alternative_titles,start_date,end_date,synopsis,mean,rank,"
    "popularity,num_list_users,num_scoring_users,media_type,status,genres,num_episodes,"
    "start_season,broadcast,source,average_episode_duration,rating,pictures,background,"
    "related_anime,recommendations,studios"
)


def _normalize_relations(relations: list[dict]) -> list[dict]:
    """Adapt MAL v2's one-node relations to the frontend's grouped schema."""
    normalized = []
    for relation in relations:
        node = relation.get("node") or {}
        if not node.get("id"):
            continue
        normalized.append({
            "relation": relation.get("relation_type_formatted") or relation.get("relation_type", "Related").replace("_", " ").title(),
            "entry": [{
                "mal_id": node["id"],
                "type": "anime",
                "name": node.get("title"),
                "url": f"https://myanimelist.net/anime/{node['id']}",
            }],
        })
    return normalized


async def _request(endpoint: str, params: dict[str, Any] | None = None) -> dict | None:
    """Request MAL's public v2 API using the application's client ID."""
    if not settings.MAL_CLIENT_ID:
        logger.error("MAL_CLIENT_ID is not configured")
        return None

    try:
        response = await get_client().get(
            f"{settings.MAL_BASE_URL}{endpoint}",
            params=params,
            headers={"X-MAL-CLIENT-ID": settings.MAL_CLIENT_ID},
        )
        response.raise_for_status()
        return response.json()
    except Exception as exc:
        logger.warning("MyAnimeList request failed for %s: %s", endpoint, exc)
        return None


def _normalize(item: dict) -> dict:
    """Translate a MAL v2 anime node to the frontend's existing response shape."""
    anime = item.get("node", item)
    titles = anime.get("alternative_titles") or {}
    picture = anime.get("main_picture") or {}
    season = anime.get("start_season") or {}
    broadcast = anime.get("broadcast") or {}
    duration = anime.get("average_episode_duration")
    status = anime.get("status")

    return {
        "mal_id": anime.get("id"),
        "url": f"https://myanimelist.net/anime/{anime.get('id')}",
        "title": anime.get("title"),
        "title_english": titles.get("en"),
        "title_japanese": titles.get("ja"),
        "title_synonyms": titles.get("synonyms", []),
        "images": {
            "jpg": {
                "image_url": picture.get("medium"),
                "small_image_url": picture.get("medium"),
                "large_image_url": picture.get("large") or picture.get("medium"),
            },
            "webp": {
                "image_url": picture.get("medium"),
                "small_image_url": picture.get("medium"),
                "large_image_url": picture.get("large") or picture.get("medium"),
            },
        },
        "type": (anime.get("media_type") or "").upper() or None,
        "source": anime.get("source"),
        "episodes": anime.get("num_episodes"),
        "status": (status or "").replace("_", " ").title() or None,
        "airing": status == "currently_airing",
        "aired": {
            "from": anime.get("start_date"),
            "to": anime.get("end_date"),
            "string": " to ".join(value for value in (anime.get("start_date"), anime.get("end_date")) if value),
        },
        "duration": f"{duration // 60} min per ep" if duration else None,
        "rating": anime.get("rating"),
        "score": anime.get("mean"),
        "scored_by": anime.get("num_scoring_users"),
        "rank": anime.get("rank"),
        "popularity": anime.get("popularity"),
        "members": anime.get("num_list_users"),
        "synopsis": anime.get("synopsis"),
        "background": anime.get("background"),
        "season": season.get("season"),
        "year": season.get("year"),
        "broadcast": {"day": broadcast.get("day_of_the_week"), "time": broadcast.get("start_time")},
        "studios": anime.get("studios", []),
        "genres": anime.get("genres", []),
        "themes": [],
        "demographics": [],
        "relations": _normalize_relations(anime.get("related_anime") or []),
        "streaming": [],
    }


def _pagination(result: dict, page: int) -> dict:
    """Adapt MAL's cursor pagination to the application's page-based response."""
    has_next_page = bool((result.get("paging") or {}).get("next"))
    return {"last_visible_page": page + 1 if has_next_page else page, "has_next_page": has_next_page}


def _season_now() -> tuple[int, str]:
    today = date.today()
    return today.year, ("winter", "spring", "summer", "fall")[(today.month % 12) // 3]


def _season_next() -> tuple[int, str]:
    year, season = _season_now()
    seasons = ("winter", "spring", "summer", "fall")
    index = seasons.index(season) + 1
    return (year + 1 if index == len(seasons) else year), seasons[index % len(seasons)]


async def scrape_top_anime(filter_type: str = "airing", limit: int = 10, anime_type: str | None = None, page: int = 1) -> dict:
    """Get MAL's ranked anime lists."""
    key = f"top:{filter_type}:{anime_type}:{limit}:{page}"
    if cached := cache.get(key, settings.CACHE_TTL_SHORT):
        return cached

    ranking_type = anime_type.lower() if anime_type else filter_type
    valid = {"all", "airing", "upcoming", "tv", "ova", "movie", "special", "bypopularity", "favorite"}
    result = await _request(
        "/anime/ranking",
        {"ranking_type": ranking_type if ranking_type in valid else "all", "limit": min(limit, 100), "offset": (page - 1) * limit, "fields": _FIELDS},
    )
    if not result:
        return {"data": [], "pagination": _pagination({}, page)}

    response = {"data": [_normalize(item) for item in result.get("data", [])], "pagination": _pagination(result, page)}
    cache.set(key, response)
    return response


async def scrape_anime_details(mal_id: int) -> dict | None:
    """Get a full MAL v2 anime record."""
    key = f"anime:{mal_id}"
    if cached := cache.get(key, settings.CACHE_TTL_LONG):
        return cached

    result = await _request(f"/anime/{mal_id}", {"fields": _FIELDS})
    if not result:
        return None
    anime = _normalize(result)
    cache.set(key, anime)
    return anime


async def browse_anime(status: str | None = None, order_by: str | None = None, sort: str = "desc", page: int = 1, limit: int = 25) -> dict:
    """Browse MAL ranking data using the closest available ranking type."""
    ranking = {"airing": "airing", "upcoming": "upcoming", "popularity": "bypopularity"}.get(status or order_by or "", "all")
    return await scrape_top_anime(ranking, limit, page=page)


async def search_anime(query: str, page: int = 1, limit: int = 25) -> tuple[list[dict], int]:
    """Search the MAL catalogue."""
    key = f"search:{query}:{page}:{limit}"
    if cached := cache.get(key, settings.CACHE_TTL_SHORT):
        return cached

    result = await _request("/anime", {"q": query, "limit": min(limit, 100), "offset": (page - 1) * limit, "fields": _FIELDS})
    if not result:
        return [], page
    response = ([_normalize(item) for item in result.get("data", [])], page + 1 if (result.get("paging") or {}).get("next") else page)
    cache.set(key, response)
    return response


async def scrape_seasonal_anime(year: int | None = None, season: str | None = None, limit: int = 25) -> list[dict]:
    """Get a MAL seasonal catalogue."""
    return (await scrape_seasonal_anime_page(year, season, 1, limit))["data"]


async def scrape_next_season(page: int = 1, limit: int = 25) -> dict:
    """Get the next calendar season, including the winter year rollover."""
    year, season = _season_next()
    return await scrape_seasonal_anime_page(year, season, page, limit)


async def scrape_seasonal_anime_page(year: int | None = None, season: str | None = None, page: int = 1, limit: int = 25) -> dict:
    """Get one page of a MAL seasonal catalogue."""
    year, season = (year, season) if year and season else _season_now()
    key = f"seasonal:{year}:{season}:{page}:{limit}"
    if cached := cache.get(key, settings.CACHE_TTL_SHORT):
        return cached

    result = await _request(f"/anime/season/{year}/{season}", {"limit": min(limit, 100), "offset": (page - 1) * limit, "fields": _FIELDS})
    response = {
        "data": [_normalize(item) for item in (result or {}).get("data", [])],
        "pagination": _pagination(result or {}, page),
    }
    cache.set(key, response)
    return response


async def scrape_schedule(day: str | None = None, page: int = 1) -> list[dict]:
    """Get the current MAL season, optionally filtering by broadcast weekday."""
    year, season = _season_now()
    result = await _request(f"/anime/season/{year}/{season}", {"limit": 100, "offset": (page - 1) * 100, "fields": _FIELDS})
    anime = [_normalize(item) for item in (result or {}).get("data", [])]
    return [item for item in anime if not day or item.get("broadcast", {}).get("day") == day]


async def scrape_episode(mal_id: int, episode_num: int) -> dict | None:
    """Return basic episode metadata; MAL v2 does not expose episode titles."""
    anime = await scrape_anime_details(mal_id)
    if not anime or not anime.get("episodes") or episode_num > anime["episodes"]:
        return None
    return {"mal_id": mal_id, "episode": episode_num, "title": None, "title_japanese": None, "title_romanji": None, "aired": None, "filler": False, "recap": False}


async def scrape_all_episodes(mal_id: int) -> list[dict]:
    """Return numbered episodes from MAL's published episode count."""
    anime = await scrape_anime_details(mal_id)
    episode_count = (anime or {}).get("episodes") or 0
    return [{"mal_id": mal_id, "episode": number, "title": None, "title_japanese": None, "title_romanji": None, "aired": None, "filler": False, "recap": False} for number in range(1, episode_count + 1)]


async def scrape_recommendations(mal_id: int, limit: int = 12) -> list[dict]:
    """Get recommendations included in MAL's anime detail response."""
    result = await _request(f"/anime/{mal_id}", {"fields": "recommendations{node{id,title,main_picture}}"})
    return [
        {"mal_id": node.get("id"), "title": node.get("title"), "title_english": None, "images": {"jpg": {"image_url": (node.get("main_picture") or {}).get("medium")}}, "votes": 0}
        for entry in (result or {}).get("recommendations", [])[:limit]
        if (node := entry.get("node"))
    ]


async def scrape_characters(mal_id: int, limit: int = 12) -> list[dict]:
    """MAL v2 does not provide a public anime-character endpoint."""
    return []
