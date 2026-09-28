import unittest
from unittest.mock import AsyncMock, patch

import httpx

from app.scrapers.animepahe.client import AnimepaheScraper
from app.scrapers.animepahe.errors import AnimepaheAccessError
from app.scrapers.animepahe.sources import parse_sources
from app.core.dependencies import init_dependencies
from app.main import app


class AnimepaheTests(unittest.IsolatedAsyncioTestCase):
    async def test_cloudflare_block_is_not_an_empty_search(self):
        async with httpx.AsyncClient() as client:
            scraper = AnimepaheScraper(client)
            with patch.object(scraper.browser_client, "get", new=AsyncMock(return_value=httpx.Response(403, text="Just a moment..."))):
                with self.assertRaises(AnimepaheAccessError):
                    await scraper.search("Shingeki no Kyojin")

                init_dependencies(client, scraper)
                with patch("app.routes.watch.scrape_anime_details", new=AsyncMock(return_value={"title": "Shingeki no Kyojin"})), patch("app.routes.watch.get_media", new=AsyncMock(return_value=None)):
                    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as api:
                        response = await api.get("/api/anime/16498/animepahe")
                self.assertEqual(response.status_code, 503)
            await scraper.close()

    async def test_animex_fallback_returns_flixcloud_embed(self):
        from app.utils import cache

        cache.clear()

        async def provider(request):
            if request.url.host == "graphql.anilist.co":
                return httpx.Response(200, json={"data": {"Media": {"id": 136430, "episodes": 24, "title": {"english": "Vinland Saga Season 2", "romaji": "VINLAND SAGA SEASON 2"}}}})
            if request.url.host == "animex.one":
                self.assertIn("vinland-saga-season-2-136430-episode-1", str(request.url))
                return httpx.Response(200, text='<script>player_url:"https://flixcloud.cc/e/test123?v=1"</script>')
            raise AssertionError(f"Unexpected request: {request.url}")

        async with httpx.AsyncClient(transport=httpx.MockTransport(provider)) as client:
            scraper = AnimepaheScraper(client)
            init_dependencies(client, scraper)
            with patch.object(scraper.browser_client, "get", new=AsyncMock(return_value=httpx.Response(403))):
                with patch("app.routes.watch.scrape_anime_details", new=AsyncMock(return_value={"title": "Vinland Saga Season 2", "title_english": "Vinland Saga Season 2"})), patch("app.routes.watch.scrape_episode", new=AsyncMock(return_value=None)):
                    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as api:
                        info = await api.get("/api/anime/49387/animepahe")
                        watch = await api.get("/api/watch/49387/1")
            self.assertEqual(info.status_code, 200)
            self.assertEqual(info.json()["total_episodes"], 24)
            self.assertEqual(watch.status_code, 200)
            self.assertEqual(watch.json()["sources"][0]["embed_url"], "https://flixcloud.cc/e/test123?v=1")
            await scraper.close()

    def test_source_options_allow_different_attribute_order(self):
        html = '''
          <button data-resolution='720' data-audio='jpn'
                  data-src='https://kwik.cx/e/low'></button>
          <button data-src="https://kwik.cx/e/high" data-av1="1"
                  data-resolution="1080" data-fansub="SubsPlease"></button>
        '''
        sources = parse_sources(html)
        self.assertEqual([source["resolution"] for source in sources], [1080, 720])
        self.assertTrue(sources[0]["av1"])
        self.assertEqual(sources[0]["fansub"], "SubsPlease")


if __name__ == "__main__":
    unittest.main()
