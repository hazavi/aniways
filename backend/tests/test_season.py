import unittest
from unittest.mock import AsyncMock, patch

import httpx

from app.main import app
from app.scrapers import anidb


class SeasonTests(unittest.IsolatedAsyncioTestCase):
    async def test_current_season_routes_to_anidb(self):
        response = {"data": [{"anidb_id": 23, "title": "Anime"}],
                    "pagination": {"last_visible_page": 3, "has_next_page": True}}
        with patch.object(anidb, "season_now", return_value=(2026, "fall")), patch.object(
            anidb, "seasonal_anime", new=AsyncMock(return_value=response)
        ) as seasonal:
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
                result = await client.get("/api/seasons/now", params={"page": 2, "limit": 24})
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()["data"][0]["anidb_id"], 23)
        seasonal.assert_awaited_once_with(2026, "fall", 2, 24)

    async def test_next_season_rolls_over_after_fall(self):
        with patch.object(anidb, "season_now", return_value=(2026, "fall")):
            self.assertEqual(anidb.season_next(), (2027, "winter"))
