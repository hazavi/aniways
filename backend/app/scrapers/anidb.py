"""Credential-free AniDB catalogue with AniList discovery.

AniDB does not offer paginated popularity/season searches. AniList supplies
discovery and ratings; all public anime IDs are AniDB IDs.
"""

import logging
import re
from datetime import date, datetime, timedelta, timezone
from html import unescape

from app.core.config import settings
from app.core.dependencies import get_client
from app.utils import cache

logger = logging.getLogger(__name__)
_ANILIST = "https://graphql.anilist.co"
_ANIMAP = "https://animap.id"
_FIELDS = """id title { romaji english native } coverImage { large extraLarge }
description format status episodes duration averageScore meanScore popularity favourites
season seasonYear startDate { year month day } endDate { year month day }
genres source isAdult nextAiringEpisode { airingAt } studios(isMain: true) { nodes { id name } }
relations { edges { relationType node { id title { romaji english } coverImage { large } } } }
recommendations(perPage: 12) { nodes { rating mediaRecommendation { id title { romaji english } coverImage { large } } } }"""
_PAGE = """query ($page: Int!, $limit: Int!, $search: String, $season: MediaSeason,
 $year: Int, $status: MediaStatus, $format: MediaFormat, $sort: [MediaSort]) {
 Page(page: $page, perPage: $limit) { pageInfo { hasNextPage }
 media(type: ANIME, isAdult: false, search: $search, season: $season,
 seasonYear: $year, status: $status, format: $format, sort: $sort) { %s } }
}""" % _FIELDS
_DETAIL = "query ($id: Int!) { Media(id: $id, type: ANIME) { %s } }" % _FIELDS
_SCHEDULE = """query ($start: Int!, $end: Int!, $page: Int!) {
 Page(page: $page, perPage: 50) { pageInfo { hasNextPage }
 airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) {
 airingAt media { %s } } }
}""" % _FIELDS


async def _graphql(query: str, variables: dict) -> dict:
    try:
        response = await get_client().post(_ANILIST, json={"query": query, "variables": variables})
        response.raise_for_status()
        body = response.json()
        if body.get("errors"):
            logger.warning("AniList catalogue error: %s", body["errors"])
            return {}
        return body.get("data") or {}
    except Exception as exc:
        logger.warning("AniList catalogue request failed: %s", exc)
        return {}


async def _get(path: str) -> dict | list | None:
    try:
        response = await get_client().get(f"{_ANIMAP}{path}")
        if response.status_code == 404:
            return None
        response.raise_for_status()
        return response.json()
    except Exception as exc:
        logger.warning("AniDB mirror request failed for %s: %s", path, exc)
        return None


async def _maps() -> tuple[dict[int, int], dict[int, int], dict[int, str]]:
    """Load the compact AniList/AniDB cross-reference once per day."""
    key = "anidb:id_maps"
    if cached := cache.get(key, 86400):
        return cached
    rows = await _get("/api/map/anilist")
    by_anilist: dict[int, int] = {}
    by_anidb: dict[int, int] = {}
    titles: dict[int, str] = {}
    for row in rows if isinstance(rows, list) else []:
        ani_id = row.get("anilist_id")
        aids = row.get("anidb_id") or []
        if isinstance(ani_id, int) and aids and isinstance(aids[0], int):
            by_anilist[ani_id] = aids[0]
            by_anidb.setdefault(aids[0], ani_id)
            if row.get("title"):
                titles.setdefault(aids[0], row["title"])
    result = by_anilist, by_anidb, titles
    if by_anilist:
        cache.set(key, result)
    return result


async def get_anilist_id(anidb_id: int) -> int | None:
    """Resolve playback's AniList ID from an AniDB ID."""
    _, reverse, _ = await _maps()
    if anidb_id in reverse:
        return reverse[anidb_id]
    mapping = await _get(f"/api/map/anidb/{anidb_id}")
    ids = (mapping or {}).get("anilist_id") or []
    return ids[0] if ids and isinstance(ids[0], int) else None


async def legacy_ids_to_anidb(ids: list[int]) -> dict[int, int]:
    """One-time lookup for data created before the AniDB ID switch."""
    rows = cache.get("anidb:legacy_map", 86400)
    if rows is None:
        rows = await _get("/api/map")
        if isinstance(rows, list):
            cache.set("anidb:legacy_map", rows)
    wanted = set(ids)
    return {row["mal_id"]: row["anidb_id"][0] for row in (rows if isinstance(rows, list) else [])
            if row.get("mal_id") in wanted and row.get("anidb_id")}


def _date(value: dict | None) -> str | None:
    if not value or not value.get("year"):
        return None
    return "-".join(f"{value[key]:02d}" if value.get(key) else "01" for key in ("year", "month", "day"))


def _plain(value: str | None) -> str | None:
    if not value:
        return None
    return unescape(re.sub(r"<[^>]+>|\[/?[a-z]+(?:=[^]]+)?\]", "", value)).strip() or None


def _normalize(media: dict, anidb_id: int, id_map: dict[int, int] | None = None) -> dict:
    title = media.get("title") or {}
    image = media.get("coverImage") or {}
    poster = image.get("extraLarge") or image.get("large")
    start, end = _date(media.get("startDate")), _date(media.get("endDate"))
    status = media.get("status") or ""
    relations = []
    id_map = id_map or {}
    for edge in ((media.get("relations") or {}).get("edges") or []):
        node = edge.get("node") or {}
        related_id = id_map.get(node.get("id"))
        if related_id:
            relations.append({"relation": (edge.get("relationType") or "Related").replace("_", " ").title(),
                              "entry": [{"anidb_id": related_id, "type": "anime",
                                         "name": (node.get("title") or {}).get("english") or (node.get("title") or {}).get("romaji"),
                                         "image": (node.get("coverImage") or {}).get("large")}]})
    next_airing = (media.get("nextAiringEpisode") or {}).get("airingAt")
    day = datetime.fromtimestamp(next_airing, timezone.utc).strftime("%A").lower() if next_airing else None
    return {
        "anidb_id": anidb_id, "url": f"https://anidb.net/anime/{anidb_id}",
        "title": title.get("romaji") or title.get("english"), "title_english": title.get("english"),
        "title_japanese": title.get("native"), "title_synonyms": [],
        "images": {kind: {"image_url": poster, "small_image_url": poster, "large_image_url": poster} for kind in ("jpg", "webp")},
        "type": media.get("format"), "source": (media.get("source") or "").replace("_", " ").title() or None,
        "episodes": media.get("episodes"), "status": status.replace("_", " ").title() or None,
        "airing": status == "RELEASING", "aired": {"from": start, "to": end, "string": " to ".join(x for x in (start, end) if x)},
        "duration": f"{media['duration']} min per ep" if media.get("duration") else None,
        "rating": None, "score": (media.get("averageScore") or media.get("meanScore") or 0) / 10 or None,
        "scored_by": None, "rank": None, "popularity": media.get("popularity"), "members": media.get("popularity"),
        "synopsis": _plain(media.get("description")), "background": None,
        "season": (media.get("season") or "").lower() or None, "year": media.get("seasonYear"),
        "broadcast": {"day": day, "time": None},
        "studios": [{"id": x.get("id"), "name": x.get("name")} for x in ((media.get("studios") or {}).get("nodes") or [])],
        "genres": [{"id": index, "name": name} for index, name in enumerate(media.get("genres") or [], 1)],
        "themes": [], "demographics": [], "relations": relations, "streaming": [],
    }


def _pagination(page_info: dict, page: int) -> dict:
    more = bool(page_info.get("hasNextPage"))
    return {"last_visible_page": page + int(more), "has_next_page": more}


def season_now() -> tuple[int, str]:
    today = date.today()
    return today.year, ("winter", "spring", "summer", "fall")[(today.month % 12) // 3]


def season_next() -> tuple[int, str]:
    year, season = season_now()
    seasons = ("winter", "spring", "summer", "fall")
    index = seasons.index(season) + 1
    return year + (index == len(seasons)), seasons[index % len(seasons)]


async def _page(page: int = 1, limit: int = 25, **filters) -> dict:
    key = f"anidb:page:{page}:{limit}:{sorted(filters.items())}"
    if cached := cache.get(key, settings.CACHE_TTL_SHORT):
        return cached
    data = await _graphql(_PAGE, {"page": page, "limit": min(limit, 50), **filters})
    result = data.get("Page") or {}
    id_map, _, _ = await _maps()
    seen: set[int] = set()
    anime = []
    for item in result.get("media") or []:
        aid = id_map.get((item or {}).get("id"))
        if aid and aid not in seen:
            seen.add(aid)
            anime.append(_normalize(item, aid, id_map))
    response = {"data": anime,
                "pagination": _pagination(result.get("pageInfo") or {}, page)}
    if data:
        cache.set(key, response)
    return response


async def top_anime(filter_type="airing", limit=10, anime_type=None, page=1) -> dict:
    filters = {"sort": ["POPULARITY_DESC"]}
    if filter_type == "airing":
        filters["status"] = "RELEASING"
    elif filter_type == "upcoming":
        filters["status"] = "NOT_YET_RELEASED"
    elif filter_type == "favorite":
        filters["sort"] = ["FAVOURITES_DESC"]
    elif filter_type not in ("bypopularity", "all"):
        anime_type = anime_type or filter_type
    if anime_type:
        filters["format"] = anime_type.upper()
    return await _page(page, limit, **filters)


async def browse_anime(status=None, order_by=None, sort="desc", page=1, limit=25) -> dict:
    filters = {"sort": [{"score": "SCORE", "popularity": "POPULARITY", "members": "POPULARITY", "start_date": "START_DATE"}.get(order_by or "", "POPULARITY") + ("" if sort == "asc" else "_DESC")]}
    if status in ("airing", "complete", "upcoming"):
        filters["status"] = {"airing": "RELEASING", "complete": "FINISHED", "upcoming": "NOT_YET_RELEASED"}[status]
    return await _page(page, limit, **filters)


async def search_anime(query: str, page=1, limit=25) -> tuple[list[dict], int]:
    result = await _page(page, limit, search=query, sort=["SEARCH_MATCH"])
    return result["data"], result["pagination"]["last_visible_page"]


async def seasonal_anime(year: int, season: str, page=1, limit=25) -> dict:
    return await _page(page, limit, season=season.upper(), year=year, sort=["POPULARITY_DESC"])


async def episode(anidb_id: int, number: int) -> dict | None:
    anime = await anime_details(anidb_id)
    if not anime or (anime.get("episodes") and number > anime["episodes"]):
        return None
    return {"anidb_id": anidb_id, "episode": number, "title": None,
            "title_japanese": None, "title_romanji": None, "aired": None,
            "filler": False, "recap": False}


async def all_episodes(anidb_id: int, minimum: int = 0) -> list[dict]:
    anime = await anime_details(anidb_id)
    count = max((anime or {}).get("episodes") or 0, minimum)
    return [{"anidb_id": anidb_id, "episode": number, "title": None,
             "title_japanese": None, "title_romanji": None, "aired": None,
             "filler": False, "recap": False}
            for number in range(1, count + 1)]


async def anime_details(anidb_id: int) -> dict | None:
    key = f"anidb:anime:{anidb_id}"
    if cached := cache.get(key, settings.CACHE_TTL_LONG):
        return cached
    record = await _get(f"/api/anidb/{anidb_id}")
    if isinstance(record, dict) and record.get("restricted"):
        return None
    id_map, _, _ = await _maps()
    ani_id = await get_anilist_id(anidb_id)
    media = (await _graphql(_DETAIL, {"id": ani_id})).get("Media") if ani_id else None
    if not record and not media:
        return None
    record = record if isinstance(record, dict) else {}
    anime = _normalize(media, anidb_id, id_map) if media else _normalize({}, anidb_id)
    poster = f"https://cdn.anidb.net/images/main/{record['picture']}" if record.get("picture") else None
    if poster:
        for images in anime["images"].values():
            images.update({"image_url": poster, "small_image_url": poster, "large_image_url": poster})
    anime.update({"title": record.get("title") or anime["title"],
                  "title_english": record.get("title_english") or anime["title_english"],
                  "title_japanese": record.get("title_native") or anime["title_japanese"],
                  "title_synonyms": record.get("synonyms") or [],
                  "synopsis": _plain(record.get("description")) or anime["synopsis"],
                  "episodes": record.get("episodecount") or anime["episodes"],
                  "type": {"TV Series": "TV", "Web": "ONA"}.get(record.get("type"), record.get("type") or anime["type"]),
                  "year": record.get("startyear") or anime["year"]})
    if record.get("startdate"):
        anime["aired"]["from"] = record["startdate"]
    if record.get("enddate"):
        anime["aired"]["to"] = record["enddate"]
    anime["aired"]["string"] = " to ".join(x for x in (anime["aired"]["from"], anime["aired"]["to"]) if x)
    if record.get("tags"):
        anime["genres"] = [{"id": tag.get("anidb_tag_id"), "name": tag.get("name")} for tag in record["tags"][:12] if tag.get("name")]
    if record.get("relatedanime"):
        _, _, titles = await _maps()
        known = {entry["anidb_id"]: entry for group in anime["relations"] for entry in group["entry"]}
        anime["relations"] = [{"relation": (relation.get("type") or "Related").replace("_", " ").title(),
                               "entry": [{"anidb_id": relation["anidb_id"], "type": "anime",
                                          "name": titles.get(relation["anidb_id"]) or known.get(relation["anidb_id"], {}).get("name") or f"Anime {relation['anidb_id']}",
                                          "url": f"https://anidb.net/anime/{relation['anidb_id']}",
                                          "image": known.get(relation["anidb_id"], {}).get("image")}]}
                              for relation in record["relatedanime"] if relation.get("anidb_id")]
    cache.set(key, anime)
    return anime


async def recommendations(anidb_id: int, limit=12) -> list[dict]:
    ani_id = await get_anilist_id(anidb_id)
    if not ani_id:
        return []
    data = await _graphql(_DETAIL, {"id": ani_id})
    id_map, _, _ = await _maps()
    nodes = ((data.get("Media") or {}).get("recommendations") or {}).get("nodes") or []
    result = []
    for item in nodes[:limit]:
        media = (item or {}).get("mediaRecommendation") or {}
        mapped_id = id_map.get(media.get("id"))
        if mapped_id:
            image = (media.get("coverImage") or {}).get("large")
            result.append({"anidb_id": mapped_id, "title": (media.get("title") or {}).get("romaji"),
                           "title_english": (media.get("title") or {}).get("english"),
                           "images": {"jpg": {"image_url": image}}, "votes": item.get("rating") or 0})
    return result


async def schedule(day: str | None = None, page: int = 1) -> list[dict]:
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=today.weekday())
    if day and day != "unknown":
        start += timedelta(days=("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday").index(day))
        end = start + timedelta(days=1)
    else:
        end = start + timedelta(days=7)
    variables = {"start": int(datetime.combine(start, datetime.min.time(), timezone.utc).timestamp()),
                 "end": int(datetime.combine(end, datetime.min.time(), timezone.utc).timestamp()) - 1,
                 "page": page}
    data = await _graphql(_SCHEDULE, variables)
    items = ((data.get("Page") or {}).get("airingSchedules") or [])
    id_map, _, _ = await _maps()
    return [_normalize(item["media"], id_map[item["media"]["id"]], id_map)
            for item in items if item.get("media") and item["media"].get("id") in id_map]
