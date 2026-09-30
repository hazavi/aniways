import { NextRequest } from "next/server";

const PLAYER_ORIGIN = "https://plyr.animex.one";
const CONTROL_LAYOUT = `<style id="aniways-player-controls">
  /* Keep the native buttons and their handlers; change only their placement. */
  @media (min-width: 768px) {
    media-controls div:has(> [class~="group/volume"]) > [class~="group/volume"] { order: 1; }
    media-controls div:has(> [class~="group/volume"]) > :last-child { order: 2; }
  }
  @media (max-width: 767px) {
    media-controls .mobile-ctrl-icons:has(.vjs-mute-button) > [class*="ml-auto"] {
      position: fixed;
      right: 0.5rem;
      bottom: 3rem;
      z-index: 40;
      margin-left: 0;
    }
  }
</style>`;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const upstreamUrl = new URL(`/${path.map(encodeURIComponent).join("/")}`, PLAYER_ORIGIN);
  upstreamUrl.search = request.nextUrl.search;

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { Accept: request.headers.get("accept") || "*/*" },
      cache: "no-store",
    });
    const headers = new Headers();
    for (const name of ["content-type", "cache-control", "etag", "last-modified"]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    if (headers.get("content-type")?.includes("text/html")) {
      const html = (await upstream.text()).replace("</head>", `${CONTROL_LAYOUT}</head>`);
      headers.set("cache-control", "no-store");
      headers.delete("etag");
      headers.delete("last-modified");
      return new Response(html, { status: upstream.status, headers });
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    return new Response("AnimeX player is unavailable", { status: 502 });
  }
}
