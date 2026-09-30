import { NextRequest } from "next/server";

const PLAYER_ORIGIN = "https://plyr.animex.one";

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
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    return new Response("AnimeX player is unavailable", { status: 502 });
  }
}
