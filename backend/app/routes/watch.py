"""Resolve AnimeX episodes using MyAnimeList IDs."""

from fastapi import APIRouter, HTTPException

from app.scrapers.animex import get_episode_sources, get_media
from app.scrapers.mal import scrape_all_episodes, scrape_anime_details, scrape_episode

router = APIRouter(prefix="/api", tags=["Watch"])


@router.get("/watch/{mal_id}/{episode}")
async def watch(mal_id: int, episode: int):
    """Get AnimeX Sub and Dub servers for one episode."""
    if episode < 1:
        raise HTTPException(400, "Episode must be positive")
    anime = await scrape_anime_details(mal_id)
    if not anime:
        raise HTTPException(404, "Anime not found on MyAnimeList")
    media = await get_media(mal_id)
    sources = await get_episode_sources(media, episode) if media else []
    if not sources:
        raise HTTPException(404, f"Episode {episode} has no AnimeX sources")
    return {
        "mal_id": mal_id,
        "title": anime.get("title"),
        "episode": episode,
        "episode_info": await scrape_episode(mal_id, episode),
        "uuid": f"animex:{media['id']}",
        "session": str(episode),
        "snapshot": None,
        "sources": sources,
    }


@router.get("/anime/{mal_id}/animex")
async def animex_info(mal_id: int):
    """Get AnimeX availability and episode count for a MAL anime."""
    anime = await scrape_anime_details(mal_id)
    if not anime:
        raise HTTPException(404, "Anime not found on MyAnimeList")
    media = await get_media(mal_id)
    sources = await get_episode_sources(media, 1) if media else []
    if not sources:
        raise HTTPException(404, "Anime not available on AnimeX")
    return {
        "mal_id": mal_id,
        "title": anime.get("title"),
        "match": {"uuid": f"animex:{media['id']}", "title": anime.get("title"), "provider": "animex"},
        "total_episodes": media.get("episodes") or anime.get("episodes") or 1,
    }


@router.get("/anime/{mal_id}/episodes")
async def get_episodes(mal_id: int):
    """Get numbered episodes from MyAnimeList."""
    episodes = await scrape_all_episodes(mal_id)
    return {"mal_id": mal_id, "total": len(episodes), "episodes": episodes}
