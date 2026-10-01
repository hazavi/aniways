const FILENAME = /^\d+\.(?:jpe?g|png|webp)$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  if (!FILENAME.test(filename)) {
    return new Response("Invalid poster", { status: 400 });
  }

  try {
    const upstream = await fetch(`https://cdn.anidb.net/images/main/${filename}`, {
      next: { revalidate: 86400 },
    });
    const contentType = upstream.headers.get("content-type") || "";
    if (!upstream.ok || !contentType.startsWith("image/")) {
      return new Response("Poster unavailable", { status: 404 });
    }
    return new Response(upstream.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch {
    return new Response("Poster unavailable", { status: 502 });
  }
}
