"""Copy saved entries from the previous ID scheme without changing old rows."""

import logging
from datetime import datetime

from sqlalchemy import inspect, text

from app.database.database import SessionLocal, engine
from app.database.models import AnimeListItem
from app.scrapers.anidb import legacy_ids_to_anidb

logger = logging.getLogger(__name__)


def _timestamp(value):
    return datetime.fromisoformat(value) if isinstance(value, str) else value


async def migrate_saved_list() -> None:
    old_table = "anime_list_items"
    if old_table not in inspect(engine).get_table_names():
        return
    columns = {column["name"] for column in inspect(engine).get_columns(old_table)}
    if "mal_id" not in columns:
        return

    with engine.connect() as connection:
        rows = connection.execute(text(f"SELECT * FROM {old_table}")).mappings().all()
    if not rows:
        return

    with SessionLocal() as db:
        migrated = {row[0] for row in db.query(AnimeListItem.legacy_id).filter(AnimeListItem.legacy_id.is_not(None)).all()}
    pending = [row for row in rows if row["id"] not in migrated]
    if not pending:
        return

    mapping = await legacy_ids_to_anidb([row["mal_id"] for row in pending])
    if not mapping:
        logger.warning("Saved-list ID migration is pending; the old table remains intact")
        return

    copied = 0
    pending.sort(key=lambda row: row["updated_at"] or "", reverse=True)
    with SessionLocal() as db:
        for row in pending:
            anidb_id = mapping.get(row["mal_id"])
            if not anidb_id:
                continue
            existing = db.query(AnimeListItem).filter_by(user_id=row["user_id"], anidb_id=anidb_id).first()
            if existing:
                if existing.legacy_id is None:
                    existing.legacy_id = row["id"]
                continue
            db.add(AnimeListItem(
                user_id=row["user_id"], anidb_id=anidb_id, legacy_id=row["id"],
                title=row["title"], title_english=row["title_english"], image_url=row["image_url"],
                total_episodes=row["total_episodes"], status=row["status"],
                episodes_watched=row["episodes_watched"], score=row["score"], notes=row["notes"],
                added_at=_timestamp(row["added_at"]), updated_at=_timestamp(row["updated_at"]),
            ))
            db.flush()
            copied += 1
        db.commit()
    logger.info("Copied %s saved anime to AniDB IDs; previous data remains available", copied)
