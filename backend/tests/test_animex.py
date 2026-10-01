import unittest
from unittest.mock import AsyncMock, patch

import httpx

from app.core.dependencies import init_dependencies
from app.main import app
from app.utils import cache


class AnimeXTests(unittest.IsolatedAsyncioTestCase):
    async def test_watch_and_availability_return_sub_and_dub_servers(self):
        cache.clear()

        def provider(request):
            if request.url.host == "graphql.anilist.co":
                return httpx.Response(200, json={"data": {"Media": {"id": 136430, "episodes": 24, "title": {"english": "Vinland Saga Season 2"}}}})
            if request.url.host == "animex.one":
                return httpx.Response(200, text='<script>slug:"vinland-saga-season-2-g6nc1",title:"Vinland Saga"; player_url:"https://flixcloud.cc/e/test123?v=1"</script>')
            if request.url.host == "pp.animex.one":
                self.assertEqual(request.url.params["id"], "vinland-saga-season-2-g6nc1")
                return httpx.Response(200, json={
                    "subProviders": [{"id": "yuki", "default": True, "tip": "Soft sub"}, {"id": "zuna", "tip": "Soft sub"}],
                    "dubProviders": [{"id": "yuki", "default": True, "tip": "Dub"}, {"id": "sora", "tip": "Dub"}],
                })
            raise AssertionError(f"Unexpected request: {request.url}")

        async with httpx.AsyncClient(transport=httpx.MockTransport(provider)) as client:
            init_dependencies(client)
            with patch("app.scrapers.animex.get_anilist_id", new=AsyncMock(return_value=136430)), patch("app.routes.watch.anidb.anime_details", new=AsyncMock(return_value={"title": "Vinland Saga Season 2", "episodes": 24})), patch("app.routes.watch.anidb.episode", new=AsyncMock(return_value=None)):
                async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as api:
                    info = await api.get("/api/anime/16426/animex")
                    watch = await api.get("/api/watch/16426/1")

        self.assertEqual(info.status_code, 200)
        self.assertEqual(info.json()["total_episodes"], 24)
        self.assertEqual(watch.status_code, 200)
        self.assertEqual(watch.json()["total_episodes"], 24)
        sources = watch.json()["sources"]
        self.assertEqual([source["server"] for source in sources], ["ANMX Yuki", "ANMX Zuna", "ANMX Yuki", "ANMX Sora", "ZEN"])
        self.assertEqual([source["audio"] for source in sources], ["jpn", "jpn", "eng", "eng", "jpn"])
        self.assertEqual(sources[2]["embed_url"], "/animex-player/e/vinland-saga-season-2-g6nc1/1?lang=dub&s=yuki&autoplay=0")

    async def test_unavailable_anime_does_not_report_a_stream(self):
        with patch("app.routes.watch.anidb.anime_details", new=AsyncMock(return_value={"title": "Missing"})), patch("app.routes.watch.get_media", new=AsyncMock(return_value=None)):
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as api:
                info = await api.get("/api/anime/16498/animex")
                watch = await api.get("/api/watch/16498/1")
        self.assertEqual(info.status_code, 404)
        self.assertEqual(watch.status_code, 404)


if __name__ == "__main__":
    unittest.main()
