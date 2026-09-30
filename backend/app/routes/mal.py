"""
MAL Routes
==========

MyAnimeList data via the official MAL v2 API.
"""

import logging
from fastapi import APIRouter, HTTPException, Query

from app.scrapers.mal import (
    browse_anime,
    scrape_anime_details,
    scrape_characters,
    scrape_recommendations,
    scrape_schedule,
    scrape_seasonal_anime,
    scrape_top_anime,
    search_anime,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["MAL"])


# Top Anime
@router.get("/top/anime")
async def get_top_anime(
    filter: str = Query("airing"),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=50),
    type: str = Query(None),
):
    """Get top anime by filter (airing, upcoming, bypopularity, favorite)."""
    return await scrape_top_anime(filter, min(limit, 50), type, page)


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
    return await browse_anime(status, order_by, sort, page, limit)


# Anime Details
@router.get("/anime/{mal_id}")
async def get_anime(mal_id: int):
    """Get anime details by MAL ID."""
    if data := await scrape_anime_details(mal_id):
        return {"data": data}
    raise HTTPException(404, f"Anime {mal_id} not found")


@router.get("/anime/{mal_id}/recommendations")
async def get_recommendations(mal_id: int, limit: int = Query(12, ge=1, le=50)):
    """Get anime recommendations."""
    return {"data": await scrape_recommendations(mal_id, limit)}


@router.get("/anime/{mal_id}/characters")
async def get_characters(mal_id: int, limit: int = Query(12, ge=1, le=50)):
    """Get anime characters with voice actors."""
    return {"data": await scrape_characters(mal_id, limit)}


# Search
@router.get("/anime")
async def search(
    q: str = Query(..., min_length=1),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=25),
):
    """Search anime by query."""
    data, total_pages = await search_anime(q, page, limit)
    return {
        "data": data,
        "pagination": {"last_visible_page": total_pages, "has_next_page": page < total_pages},
    }


# Seasonal
@router.get("/seasons/now")
async def get_current_season(limit: int = Query(25, ge=1, le=50)):
    """Get current season anime."""
    return {"data": await scrape_seasonal_anime(limit=limit), "pagination": {"has_next_page": False}}


@router.get("/seasons/upcoming")
async def get_upcoming(page: int = Query(1, ge=1), limit: int = Query(25, ge=1, le=50)):
    """Get upcoming anime."""
    return await scrape_top_anime("upcoming", limit, None, page)


@router.get("/seasons/{year}/{season}")
async def get_season(year: int, season: str, limit: int = Query(25, ge=1, le=50)):
    """Get anime by season (winter, spring, summer, fall)."""
    if season.lower() not in ("winter", "spring", "summer", "fall"):
        raise HTTPException(400, "Invalid season")
    return {"data": await scrape_seasonal_anime(year, season, limit)}


# Schedule
@router.get("/schedules")
async def get_schedule(filter: str = Query(None), page: int = Query(1, ge=1)):
    """Get weekly broadcast schedule."""
    valid = ("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "unknown")
    if filter and filter.lower() not in valid:
        raise HTTPException(400, f"Filter must be one of: {', '.join(valid)}")

    data = await scrape_schedule(filter.lower() if filter else None, page)
    return {"data": data, "pagination": {"has_next_page": len(data) >= 25}}
