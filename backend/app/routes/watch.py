"""Resolve AnimeX episodes using AniDB IDs."""

from fastapi import APIRouter, HTTPException

from app.scrapers.animex import get_animex_episodes, get_episode_sources, get_media
from app.scrapers import anidb

router = APIRouter(prefix="/api", tags=["Watch"])


@router.get("/watch/{anidb_id}/{episode}")
async def watch(anidb_id: int, episode: int):
    """Get AnimeX Sub and Dub servers for one episode."""
    if episode < 1:
        raise HTTPException(400, "Episode must be positive")
    anime = await anidb.anime_details(anidb_id)
    if not anime:
        raise HTTPException(404, "Anime not found in the catalogue")
    media = await get_media(anidb_id)
    sources = await get_episode_sources(media, episode) if media else []
    if not sources:
        raise HTTPException(404, f"Episode {episode} has no AnimeX sources")
    return {
        "anidb_id": anidb_id,
        "title": anime.get("title"),
        "episode": episode,
        "total_episodes": media.get("episodes") or anime.get("episodes") or 0,
        "episode_info": await anidb.episode(anidb_id, episode),
        "uuid": f"animex:{media['id']}",
        "session": str(episode),
        "snapshot": None,
        "sources": sources,
    }


@router.get("/anime/{anidb_id}/animex")
async def animex_info(anidb_id: int):
    """Get AnimeX availability and episode count for an AniDB anime."""
    anime = await anidb.anime_details(anidb_id)
    if not anime:
        raise HTTPException(404, "Anime not found in the catalogue")
    media = await get_media(anidb_id)
    sources = await get_episode_sources(media, 1) if media else []
    if not sources:
        raise HTTPException(404, "Anime not available on AnimeX")
    return {
        "anidb_id": anidb_id,
        "title": anime.get("title"),
        "match": {"uuid": f"animex:{media['id']}", "title": anime.get("title"), "provider": "animex"},
        "total_episodes": media.get("episodes") or anime.get("episodes") or 1,
    }


@router.get("/anime/{anidb_id}/episodes")
async def get_episodes(anidb_id: int):
    """Get AnimeX episode titles with numbered AniDB fallback."""
    media = await get_media(anidb_id)
    episodes = await get_animex_episodes(anidb_id, media) if media else []
    if not any(episode.get("title") for episode in episodes):
        episodes = await anidb.all_episodes(anidb_id, (media or {}).get("episodes") or 0)
    return {"anidb_id": anidb_id, "total": len(episodes), "episodes": episodes}
