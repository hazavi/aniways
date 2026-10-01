from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

from ..database.models import ListStatus


# User Schemas
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    username: str  # Can be username or email
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserProfile(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime
    stats: dict  # Will contain list counts

    class Config:
        from_attributes = True


# Anime List Schemas
class AnimeListItemCreate(BaseModel):
    anidb_id: int
    title: str
    title_english: Optional[str] = None
    image_url: Optional[str] = None
    total_episodes: Optional[int] = None
    status: ListStatus = ListStatus.PLAN_TO_WATCH
    episodes_watched: int = 0
    score: Optional[float] = Field(None, ge=1, le=10)
    notes: Optional[str] = None


class AnimeListItemUpdate(BaseModel):
    status: Optional[ListStatus] = None
    episodes_watched: Optional[int] = None
    score: Optional[float] = Field(None, ge=1, le=10)
    notes: Optional[str] = None


class AnimeListItemResponse(BaseModel):
    id: int
    anidb_id: int
    title: str
    title_english: Optional[str] = None
    image_url: Optional[str] = None
    total_episodes: Optional[int] = None
    status: ListStatus
    episodes_watched: int
    score: Optional[float] = None
    notes: Optional[str] = None
    added_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AnimeListResponse(BaseModel):
    items: List[AnimeListItemResponse]
    total: int


# Auth Response
class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
