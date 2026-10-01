from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Float, Index, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from .database import Base


class ListStatus(str, enum.Enum):
    PLAN_TO_WATCH = "plan_to_watch"
    WATCHING = "watching"
    COMPLETED = "completed"
    PAUSED = "paused"
    DROPPED = "dropped"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=True)
    hashed_password = Column(String(255), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship to anime list
    anime_list = relationship("AnimeListItem", back_populates="user", cascade="all, delete-orphan", lazy="dynamic")

    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}')>"


class AnimeListItem(Base):
    __tablename__ = "anime_list_items_v2"
    __table_args__ = (
        # Composite unique constraint: one anime per user
        UniqueConstraint("user_id", "anidb_id", name="uq_user_anidb_anime"),
        # Composite index for filtering by user and status (common query)
        Index("ix_anidb_user_status", "user_id", "status"),
        # Index for sorting by updated_at (recent activity)
        Index("ix_anidb_user_updated", "user_id", "updated_at"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    anidb_id = Column(Integer, nullable=False, index=True)
    legacy_id = Column(Integer, unique=True, nullable=True)
    
    # Anime info (cached for quick access)
    title = Column(String(255), nullable=False)
    title_english = Column(String(255), nullable=True)
    image_url = Column(String(500), nullable=True)
    total_episodes = Column(Integer, nullable=True)
    
    # User's tracking data
    status = Column(Enum(ListStatus), default=ListStatus.PLAN_TO_WATCH, nullable=False, index=True)
    episodes_watched = Column(Integer, default=0)
    score = Column(Float, nullable=True)
    notes = Column(String(1000), nullable=True)
    
    # Timestamps
    added_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship to user
    user = relationship("User", back_populates="anime_list")

    def __repr__(self):
        return f"<AnimeListItem(id={self.id}, anidb_id={self.anidb_id}, title='{self.title}')>"
