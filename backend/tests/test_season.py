import unittest
from unittest.mock import AsyncMock, patch

import httpx

from app.main import app
from app.utils import cache


class CurrentSeasonTests(unittest.IsolatedAsyncioTestCase):
    async def test_current_season_uses_page_offset_and_reports_next_page(self):
        cache.clear()
        response = {
            "data": [{"node": {"id": 1, "title": "Seasonal Anime"}}],
            "paging": {"next": "https://api.myanimelist.net/v2/anime/season/next"},
        }
        with patch("app.scrapers.mal._season_now", return_value=(2026, "fall")), patch(
            "app.scrapers.mal._request", new_callable=AsyncMock, return_value=response
        ) as request:
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
                result = await client.get("/api/seasons/now", params={"page": 2, "limit": 24})

        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()["data"][0]["mal_id"], 1)
        self.assertEqual(result.json()["pagination"], {"last_visible_page": 3, "has_next_page": True})
        self.assertEqual(request.call_args.args[0], "/anime/season/2026/fall")
        self.assertEqual(request.call_args.args[1]["offset"], 24)
        self.assertEqual(request.call_args.args[1]["limit"], 24)

    async def test_upcoming_season_is_winter_after_fall(self):
        cache.clear()
        response = {"data": [{"node": {"id": 2, "title": "Winter Anime"}}], "paging": {}}
        with patch("app.scrapers.mal._season_now", return_value=(2026, "fall")), patch(
            "app.scrapers.mal._request", new_callable=AsyncMock, return_value=response
        ) as request:
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
                result = await client.get("/api/seasons/upcoming", params={"page": 2, "limit": 24})

        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()["data"][0]["mal_id"], 2)
        self.assertEqual(result.json()["pagination"]["has_next_page"], False)
        self.assertEqual(request.call_args.args[0], "/anime/season/2027/winter")
        self.assertEqual(request.call_args.args[1]["offset"], 24)


if __name__ == "__main__":
    unittest.main()
