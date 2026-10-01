from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List

from ..database import get_db, AnimeListItem, ListStatus
from ..auth import (
    AnimeListItemCreate,
    AnimeListItemUpdate,
    AnimeListItemResponse,
    AnimeListResponse,
    ListStatus,
)
from .auth import get_required_user, get_current_user
from ..database import User

router = APIRouter(prefix="/api/list", tags=["Anime List"])


@router.get("", response_model=AnimeListResponse)
async def get_anime_list(
    status_filter: Optional[ListStatus] = Query(None, alias="status"),
    current_user: User = Depends(get_required_user),
    db: Session = Depends(get_db)
):
    """Get user's anime list, optionally filtered by status"""
    query = db.query(AnimeListItem).filter(AnimeListItem.user_id == current_user.id)
    
    if status_filter:
        # Uses ix_user_status composite index
        query = query.filter(AnimeListItem.status == status_filter.value)
    
    # Uses ix_user_updated composite index for sorting
    items = query.order_by(AnimeListItem.updated_at.desc()).all()
    
    return AnimeListResponse(
        items=[AnimeListItemResponse.model_validate(item) for item in items],
        total=len(items)
    )


@router.get("/stats")
async def get_list_stats(
    current_user: User = Depends(get_required_user),
    db: Session = Depends(get_db)
):
    """Get user's anime list statistics efficiently"""
    # Single query to get all counts grouped by status
    stats = db.query(
        AnimeListItem.status,
        func.count(AnimeListItem.id)
    ).filter(
        AnimeListItem.user_id == current_user.id
    ).group_by(AnimeListItem.status).all()
    
    # Convert to dict with defaults
    status_counts = {s.value: 0 for s in ListStatus}
    for status_val, count in stats:
        status_counts[status_val] = count
    
    return {
        **status_counts,
        "total": sum(status_counts.values())
    }


@router.get("/check/{anidb_id}")
async def check_anime_in_list(
    anidb_id: int,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if an anime is in user's list and get its status"""
    if not current_user:
        return {"in_list": False, "item": None}
    
    # Uses uq_user_anime unique constraint index
    item = db.query(AnimeListItem).filter(
        AnimeListItem.user_id == current_user.id,
        AnimeListItem.anidb_id == anidb_id
    ).first()
    
    if item:
        return {
            "in_list": True,
            "item": AnimeListItemResponse.model_validate(item)
        }
    
    return {"in_list": False, "item": None}


@router.post("", response_model=AnimeListItemResponse, status_code=status.HTTP_201_CREATED)
async def add_to_list(
    item_data: AnimeListItemCreate,
    current_user: User = Depends(get_required_user),
    db: Session = Depends(get_db)
):
    """Add an anime to user's list"""
    # Check if already in list
    existing = db.query(AnimeListItem).filter(
        AnimeListItem.user_id == current_user.id,
        AnimeListItem.anidb_id == item_data.anidb_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Anime already in list. Use PUT to update."
        )
    
    # Create new list item
    new_item = AnimeListItem(
        user_id=current_user.id,
        anidb_id=item_data.anidb_id,
        title=item_data.title,
        title_english=item_data.title_english,
        image_url=item_data.image_url,
        total_episodes=item_data.total_episodes,
        status=item_data.status.value,
        episodes_watched=item_data.episodes_watched,
        score=item_data.score,
        notes=item_data.notes
    )
    
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    
    return AnimeListItemResponse.model_validate(new_item)


@router.put("/{anidb_id}", response_model=AnimeListItemResponse)
async def update_list_item(
    anidb_id: int,
    update_data: AnimeListItemUpdate,
    current_user: User = Depends(get_required_user),
    db: Session = Depends(get_db)
):
    """Update an anime in user's list"""
    item = db.query(AnimeListItem).filter(
        AnimeListItem.user_id == current_user.id,
        AnimeListItem.anidb_id == anidb_id
    ).first()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Anime not found in list"
        )
    
    # Update fields if provided
    if update_data.status is not None:
        item.status = update_data.status.value
    if update_data.episodes_watched is not None:
        item.episodes_watched = update_data.episodes_watched
    if update_data.score is not None:
        item.score = update_data.score
    if update_data.notes is not None:
        item.notes = update_data.notes
    
    db.commit()
    db.refresh(item)
    
    return AnimeListItemResponse.model_validate(item)


@router.delete("/{anidb_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_list(
    anidb_id: int,
    current_user: User = Depends(get_required_user),
    db: Session = Depends(get_db)
):
    """Remove an anime from user's list"""
    item = db.query(AnimeListItem).filter(
        AnimeListItem.user_id == current_user.id,
        AnimeListItem.anidb_id == anidb_id
    ).first()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Anime not found in list"
        )
    
    db.delete(item)
    db.commit()
    
    return None


@router.post("/quick-add/{anidb_id}/{status_value}", response_model=AnimeListItemResponse)
async def quick_add_to_list(
    anidb_id: int,
    status_value: ListStatus,
    title: str = Query(...),
    title_english: Optional[str] = Query(None),
    image_url: Optional[str] = Query(None),
    total_episodes: Optional[int] = Query(None),
    current_user: User = Depends(get_required_user),
    db: Session = Depends(get_db)
):
    """Quick add or update anime in list with a specific status"""
    # Check if already in list
    existing = db.query(AnimeListItem).filter(
        AnimeListItem.user_id == current_user.id,
        AnimeListItem.anidb_id == anidb_id
    ).first()
    
    if existing:
        # Update status
        existing.status = status_value.value
        db.commit()
        db.refresh(existing)
        return AnimeListItemResponse.model_validate(existing)
    
    # Create new list item
    new_item = AnimeListItem(
        user_id=current_user.id,
        anidb_id=anidb_id,
        title=title,
        title_english=title_english,
        image_url=image_url,
        total_episodes=total_episodes,
        status=status_value.value,
        episodes_watched=0
    )
    
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    
    return AnimeListItemResponse.model_validate(new_item)
