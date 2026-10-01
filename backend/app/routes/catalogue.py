"""
Catalogue Routes
================

AniDB anime records with AniList discovery.
"""

from fastapi import APIRouter, HTTPException, Query, Body

from app.scrapers import anidb

router = APIRouter(prefix="/api", tags=["Catalogue"])


@router.post("/ids/legacy")
async def migrate_legacy_ids(ids: list[int] = Body(...)):
    """Resolve IDs in watch histories written by older app versions."""
    if len(ids) > 500 or any(anime_id < 1 for anime_id in ids):
        raise HTTPException(400, "Expected up to 500 positive IDs")
    return {"data": await anidb.legacy_ids_to_anidb(ids)}


# Top Anime
@router.get("/top/anime")
async def get_top_anime(
    filter: str = Query("airing"),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=50),
    type: str = Query(None),
):
    """Get top anime by filter (airing, upcoming, bypopularity, favorite)."""
    return await anidb.top_anime(filter, min(limit, 50), type, page)


# Browse
@router.get("/browse/anime")
async def get_browse_anime(
    status: str = Query(None),
    order_by: str = Query(None),
    sort: str = Query("desc"),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=25),
):
    """Browse anime with filters and sorting."""
    return await anidb.browse_anime(status, order_by, sort, page, limit)


# Anime Details
@router.get("/anime/{anidb_id}")
async def get_anime(anidb_id: int):
    """Get anime details by AniDB ID."""
    if data := await anidb.anime_details(anidb_id):
        return {"data": data}
    raise HTTPException(404, f"Anime {anidb_id} not found")


@router.get("/anime/{anidb_id}/recommendations")
async def get_recommendations(anidb_id: int, limit: int = Query(12, ge=1, le=50)):
    """Get anime recommendations."""
    return {"data": await anidb.recommendations(anidb_id, limit)}


@router.get("/anime/{anidb_id}/characters")
async def get_characters(anidb_id: int, limit: int = Query(12, ge=1, le=50)):
    """Get anime characters with voice actors."""
    return {"data": []}


# Search
@router.get("/anime")
async def search(
    q: str = Query(..., min_length=1),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=25),
):
    """Search anime by query."""
    data, total_pages = await anidb.search_anime(q, page, limit)
    return {
        "data": data,
        "pagination": {"last_visible_page": total_pages, "has_next_page": page < total_pages},
    }


# Seasonal
@router.get("/seasons/now")
async def get_current_season(page: int = Query(1, ge=1), limit: int = Query(25, ge=1, le=50)):
    """Get current season anime."""
    year, season = anidb.season_now()
    return await anidb.seasonal_anime(year, season, page, limit)


@router.get("/seasons/upcoming")
async def get_upcoming(page: int = Query(1, ge=1), limit: int = Query(25, ge=1, le=50)):
    """Get anime from the next calendar season."""
    year, season = anidb.season_next()
    return await anidb.seasonal_anime(year, season, page, limit)


@router.get("/seasons/{year}/{season}")
async def get_season(year: int, season: str, page: int = Query(1, ge=1), limit: int = Query(25, ge=1, le=50)):
    """Get anime by season (winter, spring, summer, fall)."""
    if season.lower() not in ("winter", "spring", "summer", "fall"):
        raise HTTPException(400, "Invalid season")
    return await anidb.seasonal_anime(year, season, page, limit)


# Schedule
@router.get("/schedules")
async def get_schedule(filter: str = Query(None), page: int = Query(1, ge=1)):
    """Get weekly broadcast schedule."""
    valid = ("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "unknown")
    if filter and filter.lower() not in valid:
        raise HTTPException(400, f"Filter must be one of: {', '.join(valid)}")

    data = await anidb.schedule(filter.lower() if filter else None, page)
    return {"data": data, "pagination": {"has_next_page": len(data) >= 25}}
