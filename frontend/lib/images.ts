const ANIDB_COVER = /^https:\/\/cdn\.anidb\.net\/images\/main\/(\d+\.(?:jpe?g|png|webp))$/i;

/** Same-origin URL for AniDB covers, whose CDN rejects browser hotlinks. */
export function resolveImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  const match = ANIDB_COVER.exec(url);
  return match ? `/api/posters/anidb/${match[1]}` : url;
}
