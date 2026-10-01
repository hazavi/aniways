import unittest
from unittest.mock import AsyncMock, patch

import httpx

from app.core.dependencies import init_dependencies
from app.main import app
from app.scrapers import anidb


class EpisodeTitleTests(unittest.IsolatedAsyncioTestCase):
    async def test_numbered_fallback_uses_anidb_episode_count(self):
        with patch.object(anidb, "anime_details", new=AsyncMock(return_value={"episodes": 3})), patch(
            "app.routes.watch.get_media", new=AsyncMock(return_value=None)
        ):
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as api:
                result = await api.get("/api/anime/9541/episodes")
        self.assertEqual(result.status_code, 200)
        self.assertEqual([item["episode"] for item in result.json()["episodes"]], [1, 2, 3])
        self.assertTrue(all(item["anidb_id"] == 9541 for item in result.json()["episodes"]))

    async def test_animex_titles_are_primary_and_fill_missing_numbers(self):
        def provider(request):
            if request.url.host == "animex.one":
                return httpx.Response(200, text='<script>slug:"attack-on-titan-2jqd0",title:"Attack on Titan"</script>')
            if request.url.host == "pp.animex.one":
                return httpx.Response(200, json=[
                    {"number": 1, "titles": {"en": "To You, 2000 Years in the Future"},
                     "hasSub": True, "hasDub": True, "length": 26},
                    {"number": 3, "titles": {"en": "Humanity Rises Again"}, "isFiller": True},
                ])
            raise AssertionError(f"Unexpected request: {request.url}")

        media = {"id": 16498, "episodes": 3, "title": {"english": "Attack on Titan"}}
        async with httpx.AsyncClient(transport=httpx.MockTransport(provider)) as client:
            init_dependencies(client)
            with patch("app.routes.watch.get_media", new=AsyncMock(return_value=media)), patch.object(
                anidb, "all_episodes", new=AsyncMock()
            ) as fallback:
                async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as api:
                    result = await api.get("/api/anime/9541/episodes")
        self.assertEqual(result.status_code, 200)
        episodes = result.json()["episodes"]
        self.assertEqual(episodes[0]["title"], "To You, 2000 Years in the Future")
        self.assertTrue(episodes[0]["has_sub"])
        self.assertTrue(episodes[0]["has_dub"])
        self.assertIsNone(episodes[1]["title"])
        self.assertTrue(episodes[2]["filler"])
        fallback.assert_not_awaited()
