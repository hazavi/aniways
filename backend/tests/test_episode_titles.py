import unittest
from unittest.mock import AsyncMock, patch

import httpx

from app.core.dependencies import init_dependencies
from app.main import app
from app.utils import cache


class EpisodeTitleTests(unittest.IsolatedAsyncioTestCase):
    async def test_mal_episode_titles_and_later_pages(self):
        cache.clear()
        requests = []

        def row(number, title, romanji=""):
            return (
                f'<tr><td class="episode-number">{number}</td>'
                f'<td class="episode-title"><a>{title}</a><span class="di-ib">{romanji}</span></td>'
                '<td class="episode-aired">Apr 7, 2013</td></tr>'
            )

        def provider(request):
            self.assertEqual(request.url.path, "/anime/16498/_/episode")
            offset = int(request.url.params["offset"])
            requests.append(offset)
            rows = (
                row(1, "To You, 2,000 Years in the Future", "Nisen-nengo no Kimi e (1) (二千年後の君へ)")
                + "".join(row(number, f"Title {number}") for number in range(2, 101))
                if offset == 0 else row(101, "Later Episode")
            )
            return httpx.Response(200, text=f'<table class="js-watch-episode-list"><tbody>{rows}</tbody></table>')

        async with httpx.AsyncClient(transport=httpx.MockTransport(provider)) as client:
            init_dependencies(client)
            with patch("app.scrapers.mal.scrape_anime_details", new=AsyncMock(return_value={"episodes": 101})), patch("app.routes.watch.get_media", new=AsyncMock(return_value=None)):
                async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as api:
                    result = await api.get("/api/anime/16498/episodes")

        self.assertEqual(result.status_code, 200)
        self.assertEqual(requests, [0, 100])
        self.assertEqual(result.json()["total"], 101)
        self.assertEqual(result.json()["episodes"][0]["title"], "To You, 2,000 Years in the Future")
        self.assertEqual(result.json()["episodes"][0]["title_romanji"], "Nisen-nengo no Kimi e (1)")
        self.assertEqual(result.json()["episodes"][0]["title_japanese"], "二千年後の君へ")
        self.assertEqual(result.json()["episodes"][100]["title"], "Later Episode")

    async def test_mal_page_failure_keeps_numbered_episodes(self):
        cache.clear()
        async with httpx.AsyncClient(transport=httpx.MockTransport(lambda request: httpx.Response(403))) as client:
            init_dependencies(client)
            with patch("app.scrapers.mal.scrape_anime_details", new=AsyncMock(return_value={"episodes": 2})), patch("app.routes.watch.get_media", new=AsyncMock(return_value=None)):
                async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as api:
                    result = await api.get("/api/anime/16498/episodes")

        self.assertEqual(result.status_code, 200)
        self.assertEqual([episode["episode"] for episode in result.json()["episodes"]], [1, 2])
        self.assertIsNone(result.json()["episodes"][0]["title"])

    async def test_animex_titles_are_primary_and_fill_missing_numbers(self):
        cache.clear()

        def provider(request):
            if request.url.host == "animex.one":
                self.assertEqual(request.url.path, "/anime/attack-on-titan-16498")
                return httpx.Response(200, text='<script>slug:"attack-on-titan-2jqd0",idMal:16498</script>')
            if request.url.host == "pp.animex.one":
                self.assertEqual(request.url.params["id"], "attack-on-titan-2jqd0")
                return httpx.Response(200, json=[
                    {"number": 1, "titles": {"en": "To You, 2000 Years in the Future", "ja": "二千年後の君へ", "x-jat": "Nisen-nengo no Kimi e"}, "airDateUtc": "2013-04-06T15:30:00Z", "isFiller": False, "hasSub": True, "hasDub": True, "img": "https://artworks.thetvdb.com/episode.jpg", "description": "The walls are breached.", "length": 26},
                    {"number": 3, "titles": {"en": "Humanity Rises Again"}, "isFiller": True},
                ])
            raise AssertionError(f"Unexpected request: {request.url}")

        media = {"id": 16498, "episodes": 3, "title": {"english": "Attack on Titan"}}
        async with httpx.AsyncClient(transport=httpx.MockTransport(provider)) as client:
            init_dependencies(client)
            with patch("app.routes.watch.get_media", new=AsyncMock(return_value=media)), patch("app.routes.watch.scrape_all_episodes", new=AsyncMock()) as fallback:
                async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as api:
                    result = await api.get("/api/anime/16498/episodes")

        self.assertEqual(result.status_code, 200)
        episodes = result.json()["episodes"]
        self.assertEqual(result.json()["total"], 3)
        self.assertEqual(episodes[0]["title"], "To You, 2000 Years in the Future")
        self.assertEqual(episodes[0]["title_romanji"], "Nisen-nengo no Kimi e")
        self.assertEqual(episodes[0]["title_japanese"], "二千年後の君へ")
        self.assertTrue(episodes[0]["has_sub"])
        self.assertTrue(episodes[0]["has_dub"])
        self.assertEqual(episodes[0]["image"], "https://artworks.thetvdb.com/episode.jpg")
        self.assertEqual(episodes[0]["description"], "The walls are breached.")
        self.assertEqual(episodes[0]["duration"], 1560)
        self.assertIsNone(episodes[1]["title"])
        self.assertFalse(episodes[1]["has_sub"])
        self.assertTrue(episodes[2]["filler"])
        fallback.assert_not_awaited()


if __name__ == "__main__":
    unittest.main()
