import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.database import migration
from app.database.models import AnimeListItem


class SavedListMigrationTests(unittest.IsolatedAsyncioTestCase):
    async def test_copies_saved_entry_once_and_preserves_old_table(self):
        with tempfile.TemporaryDirectory() as directory:
            engine = create_engine(f"sqlite:///{Path(directory) / 'test.db'}")
            Base.metadata.create_all(engine)
            with engine.begin() as connection:
                connection.execute(text("CREATE TABLE anime_list_items (id INTEGER PRIMARY KEY, user_id INTEGER, mal_id INTEGER, title TEXT, title_english TEXT, image_url TEXT, total_episodes INTEGER, status TEXT, episodes_watched INTEGER, score REAL, notes TEXT, added_at TEXT, updated_at TEXT)"))
                connection.execute(text("INSERT INTO users (id, username, hashed_password) VALUES (1, 'viewer', 'hash')"))
                connection.execute(text("INSERT INTO anime_list_items (id, user_id, mal_id, title, status, episodes_watched, added_at, updated_at) VALUES (7, 1, 1, 'Cowboy Bebop', 'WATCHING', 8, '2026-01-02 03:04:05', '2026-01-03 04:05:06')"))
            session_factory = sessionmaker(bind=engine, autoflush=False)
            with patch.object(migration, "engine", engine), patch.object(migration, "SessionLocal", session_factory), patch.object(
                migration, "legacy_ids_to_anidb", new=AsyncMock(return_value={1: 23})
            ):
                await migration.migrate_saved_list()
                await migration.migrate_saved_list()
            with session_factory() as db:
                items = db.query(AnimeListItem).all()
                self.assertEqual(len(items), 1)
                self.assertEqual(items[0].anidb_id, 23)
                self.assertEqual(items[0].episodes_watched, 8)
                self.assertEqual(items[0].legacy_id, 7)
                self.assertEqual(items[0].updated_at, migration._timestamp("2026-01-03 04:05:06"))
            with engine.connect() as connection:
                self.assertEqual(connection.execute(text("SELECT count(*) FROM anime_list_items")).scalar(), 1)
            engine.dispose()
