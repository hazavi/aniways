import unittest
from unittest.mock import AsyncMock, patch

from app.scrapers import anidb
from app.utils import cache


class AniDBCatalogueTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        cache.clear()

    async def test_discovery_returns_anidb_ids_once_per_title(self):
        media = [
            {"id": 1, "title": {"romaji": "Cowboy Bebop"}},
            {"id": 2, "title": {"romaji": "Cowboy Bebop Special"}},
            {"id": 3, "title": {"romaji": "Unmapped"}},
        ]
        response = {"Page": {"pageInfo": {"hasNextPage": True}, "media": media}}
        maps = ({1: 23, 2: 23}, {23: 1}, {23: "Cowboy Bebop"})
        with patch("app.scrapers.anidb._graphql", new=AsyncMock(return_value=response)), patch(
            "app.scrapers.anidb._maps", new=AsyncMock(return_value=maps)
        ):
            result = await anidb.seasonal_anime(2026, "fall", page=2)
        self.assertEqual([item["anidb_id"] for item in result["data"]], [23])
        self.assertEqual(result["pagination"], {"last_visible_page": 3, "has_next_page": True})

    async def test_detail_uses_anidb_record_and_relations(self):
        record = {"anidb_id": 23, "title": "Cowboy Bebop", "episodecount": 26,
                  "picture": "cover.jpg", "description": "Space bounty hunters",
                  "relatedanime": [{"anidb_id": 5, "type": "Sequel"}]}
        media = {"id": 1, "title": {"romaji": "Cowboy Bebop"}}
        maps = ({1: 23}, {23: 1}, {5: "Cowboy Bebop Movie"})
        with patch("app.scrapers.anidb._get", new=AsyncMock(return_value=record)), patch(
            "app.scrapers.anidb._maps", new=AsyncMock(return_value=maps)
        ), patch("app.scrapers.anidb.get_anilist_id", new=AsyncMock(return_value=1)), patch(
            "app.scrapers.anidb._graphql", new=AsyncMock(return_value={"Media": media})
        ):
            result = await anidb.anime_details(23)
        self.assertEqual(result["anidb_id"], 23)
        self.assertEqual(result["episodes"], 26)
        self.assertEqual(result["synopsis"], "Space bounty hunters")
        self.assertEqual(result["images"]["jpg"]["image_url"], "https://cdn.anidb.net/images/main/cover.jpg")
        self.assertEqual(result["relations"][0]["entry"][0]["anidb_id"], 5)

    async def test_legacy_ids_map_only_requested_entries(self):
        rows = [{"mal_id": 1, "anidb_id": [23]}, {"mal_id": 2, "anidb_id": [5]}]
        with patch("app.scrapers.anidb._get", new=AsyncMock(return_value=rows)):
            self.assertEqual(await anidb.legacy_ids_to_anidb([1]), {1: 23})

    async def test_detail_remains_available_without_anilist_match(self):
        record = {"anidb_id": 99, "title": "AniDB-only anime", "episodecount": 4}
        with patch("app.scrapers.anidb._get", new=AsyncMock(return_value=record)), patch(
            "app.scrapers.anidb._maps", new=AsyncMock(return_value=({}, {}, {}))
        ), patch("app.scrapers.anidb.get_anilist_id", new=AsyncMock(return_value=None)):
            result = await anidb.anime_details(99)
        self.assertEqual(result["anidb_id"], 99)
        self.assertEqual(result["episodes"], 4)

    async def test_mapped_detail_survives_missing_anidb_mirror_record(self):
        media = {"id": 1, "title": {"romaji": "Cowboy Bebop"}, "episodes": 26}
        with patch("app.scrapers.anidb._get", new=AsyncMock(return_value=None)), patch(
            "app.scrapers.anidb._maps", new=AsyncMock(return_value=({1: 23}, {23: 1}, {}))
        ), patch("app.scrapers.anidb.get_anilist_id", new=AsyncMock(return_value=1)), patch(
            "app.scrapers.anidb._graphql", new=AsyncMock(return_value={"Media": media})
        ):
            result = await anidb.anime_details(23)
        self.assertEqual(result["anidb_id"], 23)
        self.assertEqual(result["episodes"], 26)
