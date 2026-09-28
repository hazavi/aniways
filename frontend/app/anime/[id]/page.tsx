"use client";

import { useCallback, useEffect, useState, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { api, type Anime } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useLanguage } from "@/components/language-provider";
import { AnimeInfoPopover } from "@/components/anime-info-popover";
import { AddToListButton } from "@/components/add-to-list-button";
import { Play, ChevronRight, ChevronLeft } from "lucide-react";

interface AnimeDetailPageProps {
  params: Promise<{ id: string }>;
}

interface Recommendation {
  mal_id: number;
  title: string;
  title_english?: string;
  images: Anime["images"];
  votes: number;
}

interface Character {
  mal_id: number;
  name: string;
  images: { jpg?: { image_url?: string } };
  role: string;
  voice_actor?: {
    mal_id: number;
    name: string;
    images: { jpg?: { image_url?: string } };
  } | null;
}

export default function AnimeDetailPage({ params }: AnimeDetailPageProps) {
  const { id } = use(params);
  const [anime, setAnime] = useState<Anime | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [characterPage, setCharacterPage] = useState(0);
  const [relationPage, setRelationPage] = useState(0);
  const [episodeStatus, setEpisodeStatus] = useState<"checking" | "available" | "unavailable" | "blocked">("checking");
  const [loading, setLoading] = useState(true);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [showFullSynopsis, setShowFullSynopsis] = useState(false);
  const { getTitle } = useLanguage();

  const checkEpisodes = useCallback(async () => {
    setEpisodeStatus("checking");
    try {
      const info = await api.getAnimepaheInfo(parseInt(id));
      setEpisodeStatus(info.total_episodes > 0 ? "available" : "unavailable");
    } catch (error) {
      setEpisodeStatus(error instanceof Error && error.message.includes("503") ? "blocked" : "unavailable");
    }
  }, [id]);

  useEffect(() => {
    if (anime) {
      document.title = `${getTitle(anime)} - Aniways`;
    } else {
      document.title = "Loading... - Aniways";
    }
  }, [anime, getTitle]);

  useEffect(() => {
    async function fetchData() {
      try {
        const animeRes = await api.getAnime(parseInt(id));
        setAnime(animeRes.data);

        // Fetch recommendations
        setLoadingRecs(true);
        try {
          const recsRes = await api.getRecommendations(parseInt(id), 16);
          setRecommendations(recsRes.data);
        } catch {
          setRecommendations([]);
        } finally {
          setLoadingRecs(false);
        }

        // Fetch characters
        try {
          const charsRes = await api.getCharacters(parseInt(id), 24);
          setCharacters(charsRes.data);
        } catch {
          setCharacters([]);
        }

        // Check if episodes are available on Animepahe
        await checkEpisodes();
      } catch (error) {
        console.error("Failed to fetch anime:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id, checkEpisodes]);

  if (loading) {
    return <AnimeDetailSkeleton />;
  }

  if (!anime) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">Anime not found</p>
      </div>
    );
  }

  const isSynopsisLong = anime.synopsis && anime.synopsis.length > 300;

  return (
    <div className="space-y-6 mt-6 mb-10 px-4 md:px-10 lg:px-20">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {anime.type && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <span>{anime.type}</span>
              </BreadcrumbItem>
            </>
          )}
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="truncate max-w-[200px]">
              {getTitle(anime)}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: Poster */}
        <div className="flex-shrink-0 mx-auto lg:mx-0">
          <div className="relative w-52 md:w-60 aspect-[3/4] rounded-lg overflow-hidden shadow-xl">
            <Image
              src={
                anime.images.jpg.large_image_url || anime.images.jpg.image_url
              }
              alt={anime.title}
              fill
              className="object-cover"
              priority
            />
            {/* Rating badge */}
            {anime.rating && (
              <Badge className="absolute top-2 left-2 bg-pink-600 text-white text-xs">
                {anime.rating.split(" ")[0]}
              </Badge>
            )}
          </div>
        </div>

        {/* Middle: Main Info */}
        <div className="flex-1 space-y-4 min-w-0">
          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold leading-tight">
            {getTitle(anime)}
          </h1>

          {/* Quick Info Badges */}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {anime.rating && (
              <Badge variant="outline" className="text-xs font-medium">
                {anime.rating.split(" ")[0]}
              </Badge>
            )}
            <Badge
              variant="outline"
              className="text-xs font-medium bg-primary/10"
            >
              HD
            </Badge>
            {anime.episodes && (
              <Badge variant="outline" className="text-xs font-medium">
                EP {anime.episodes}
              </Badge>
            )}
            <span className="text-muted-foreground">•</span>
            {anime.type && (
              <span className="text-muted-foreground">{anime.type}</span>
            )}
            {anime.duration && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">
                  {anime.duration.replace(" per ep", "")}
                </span>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {episodeStatus === "available" ? (
              <Link href={`/watch/${id}/1`}>
                <Button className="gap-2 bg-primary hover:bg-primary/90 cursor-pointer">
                  <Play className="h-4 w-4 fill-current" />
                  Watch now
                </Button>
              </Link>
            ) : episodeStatus === "blocked" ? (
              <Button className="gap-2 cursor-pointer" onClick={checkEpisodes}>
                Retry AnimePahe
              </Button>
            ) : (
              <Button className="gap-2 cursor-not-allowed" disabled>
                <Play className="h-4 w-4" />
                {episodeStatus === "checking" ? "Checking..." : "Not Available"}
              </Button>
            )}
            <AddToListButton
              malId={anime.mal_id}
              title={anime.title}
              titleEnglish={anime.title_english}
              imageUrl={
                anime.images.jpg.large_image_url || anime.images.jpg.image_url
              }
              totalEpisodes={anime.episodes}
            />
          </div>
          {episodeStatus === "blocked" && (
            <p className="text-sm text-muted-foreground" role="status">
              AnimePahe is blocking stream lookup. Refresh its access cookies, then retry.
            </p>
          )}

          {/* Synopsis */}
          {anime.synopsis && (
            <div className="space-y-2">
              <p
                className={`text-muted-foreground leading-relaxed ${
                  !showFullSynopsis && isSynopsisLong ? "line-clamp-3" : ""
                }`}
              >
                {anime.synopsis}
              </p>
              {isSynopsisLong && (
                <button
                  onClick={() => setShowFullSynopsis(!showFullSynopsis)}
                  className="text-primary text-sm font-medium hover:underline cursor-pointer"
                >
                  {showFullSynopsis ? "- Less" : "+ More"}
                </button>
              )}
            </div>
          )}

          {/* Mobile Info Section */}
          <div className="lg:hidden space-y-3 text-sm pt-4 border-t border-border/50">
            <div className="grid grid-cols-2 gap-3">
              {anime.status && (
                <div>
                  <span className="text-muted-foreground">Status: </span>
                  <span className={anime.airing ? "text-green-500" : ""}>
                    {anime.status}
                  </span>
                </div>
              )}
              {anime.score && (
                <div>
                  <span className="text-muted-foreground">Score: </span>
                  <span>{anime.score.toFixed(2)}</span>
                </div>
              )}
              {anime.season && anime.year && (
                <div>
                  <span className="text-muted-foreground">Premiered: </span>
                  <span>
                    {anime.season.charAt(0).toUpperCase() +
                      anime.season.slice(1)}{" "}
                    {anime.year}
                  </span>
                </div>
              )}
              {anime.duration && (
                <div>
                  <span className="text-muted-foreground">Duration: </span>
                  <span>{anime.duration.replace(" per ep", "")}</span>
                </div>
              )}
            </div>
            {anime.genres && anime.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {anime.genres.map((genre, index) => (
                  <Badge
                    key={`genre-${genre.mal_id ?? genre.name}-${index}`}
                    variant="outline"
                    className="text-xs"
                  >
                    {genre.name}
                  </Badge>
                ))}
              </div>
            )}
            {anime.studios && anime.studios.length > 0 && (
              <div>
                <span className="text-muted-foreground">Studios: </span>
                <span>{anime.studios.map((s) => s.name).join(", ")}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Info Sidebar - Desktop only */}
        <div className="lg:w-72 flex-shrink-0 space-y-4 text-sm hidden lg:block">
          {/* Japanese Title */}
          {anime.title_japanese && (
            <InfoRow label="Japanese" value={anime.title_japanese} />
          )}

          {/* Synonyms */}
          {anime.title_english && anime.title_english !== anime.title && (
            <InfoRow label="Synonyms" value={anime.title} />
          )}

          {/* Aired */}
          {anime.aired?.string && (
            <InfoRow label="Aired" value={anime.aired.string} />
          )}

          {/* Premiered */}
          {anime.season && anime.year && (
            <InfoRow
              label="Premiered"
              value={`${
                anime.season.charAt(0).toUpperCase() + anime.season.slice(1)
              } ${anime.year}`}
            />
          )}

          {/* Duration */}
          {anime.duration && (
            <InfoRow
              label="Duration"
              value={anime.duration.replace(" per ep", "")}
            />
          )}

          {/* Status */}
          {anime.status && (
            <InfoRow
              label="Status"
              value={anime.status}
              valueClassName={anime.airing ? "text-green-500" : ""}
            />
          )}

          {/* MAL Score */}
          <InfoRow
            label="MAL Score"
            value={anime.score ? anime.score.toFixed(2) : "?"}
          />

          {/* Genres */}
          {anime.genres && anime.genres.length > 0 && (
            <div className="space-y-2">
              <span className="text-muted-foreground font-medium">Genres:</span>
              <div className="flex flex-wrap gap-1.5">
                {anime.genres.map((genre, index) => (
                  <Badge
                    key={`genre-${genre.mal_id ?? genre.name}-${index}`}
                    variant="outline"
                    className="text-xs"
                  >
                    {genre.name}
                  </Badge>
                ))}
                {anime.demographics?.map((demo, index) => (
                  <Badge
                    key={`demographic-${demo.mal_id ?? demo.name}-${index}`}
                    variant="outline"
                    className="text-xs"
                  >
                    {demo.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Studios */}
          {anime.studios && anime.studios.length > 0 && (
            <InfoRow
              label="Studios"
              value={anime.studios.map((s) => s.name).join(", ")}
            />
          )}

          {/* Producers */}
          {anime.producers && anime.producers.length > 0 && (
            <InfoRow
              label="Producers"
              value={anime.producers
                .slice(0, 3)
                .map((p) => p.name)
                .join(", ")}
            />
          )}
        </div>
      </div>

      {/* Relations & Characters Tabs */}
      {((anime.relations && anime.relations.length > 0) ||
        characters.length > 0) && (
        <Tabs
          defaultValue={
            anime.relations && anime.relations.length > 0
              ? "relations"
              : "characters"
          }
          className="w-full"
        >
          <TabsList>
            {anime.relations && anime.relations.length > 0 && (
              <TabsTrigger className="hover:cursor-pointer" value="relations">
                Relations
              </TabsTrigger>
            )}
            {characters.length > 0 && (
              <TabsTrigger className="hover:cursor-pointer" value="characters">
                Characters
              </TabsTrigger>
            )}
          </TabsList>

          {anime.relations && anime.relations.length > 0 && (
            <TabsContent value="relations" className="mt-4">
              {(() => {
                // Flatten all relation entries
                const allRelations = anime.relations.flatMap((rel) =>
                  (rel.entry ?? []).map((entry) => ({
                    ...entry,
                    relation: rel.relation,
                  })),
                );
                const relsPerPage = 10; // 5 columns x 2 rows
                const totalPages = Math.ceil(allRelations.length / relsPerPage);
                const startIdx = relationPage * relsPerPage;
                const visibleRels = allRelations.slice(
                  startIdx,
                  startIdx + relsPerPage,
                );

                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                      {visibleRels.map((entry) => (
                        <Link
                          key={entry.mal_id}
                          href={`/anime/${entry.mal_id}`}
                          className="group flex items-center justify-between gap-2 p-2.5 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="min-w-0 space-y-1">
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {entry.relation}
                            </Badge>
                            <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">
                              {entry.name}
                            </p>
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        </Link>
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 hover:cursor-pointer"
                          onClick={() =>
                            setRelationPage((p) => Math.max(0, p - 1))
                          }
                          disabled={relationPage === 0}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          {relationPage + 1} / {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 hover:cursor-pointer"
                          onClick={() =>
                            setRelationPage((p) =>
                              Math.min(totalPages - 1, p + 1),
                            )
                          }
                          disabled={relationPage === totalPages - 1}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </TabsContent>
          )}

          {characters.length > 0 && (
            <TabsContent value="characters" className="mt-4">
              {(() => {
                const charsPerPage = 12; // 6 columns x 2 rows
                const totalPages = Math.ceil(characters.length / charsPerPage);
                const startIdx = characterPage * charsPerPage;
                const visibleChars = characters.slice(
                  startIdx,
                  startIdx + charsPerPage,
                );

                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {visibleChars.map((char) => (
                        <div
                          key={char.mal_id}
                          className="flex gap-2 p-2 rounded-md bg-muted/50"
                        >
                          {/* Character image */}
                          <div className="relative w-12 h-16 rounded overflow-hidden flex-shrink-0 bg-muted">
                            {char.images.jpg?.image_url && (
                              <Image
                                src={char.images.jpg.image_url}
                                alt={char.name}
                                fill
                                className="object-cover"
                                sizes="48px"
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium line-clamp-1">
                              {char.name}
                            </p>
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1 py-0 mt-0.5"
                            >
                              {char.role}
                            </Badge>
                            {char.voice_actor && (
                              <p className="text-[10px] text-muted-foreground line-clamp-1 mt-1">
                                CV: {char.voice_actor.name}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 hover:cursor-pointer"
                          onClick={() =>
                            setCharacterPage((p) => Math.max(0, p - 1))
                          }
                          disabled={characterPage === 0}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          {characterPage + 1} / {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 hover:cursor-pointer"
                          onClick={() =>
                            setCharacterPage((p) =>
                              Math.min(totalPages - 1, p + 1),
                            )
                          }
                          disabled={characterPage === totalPages - 1}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </TabsContent>
          )}
        </Tabs>
      )}

      {/* Recommendations Section */}
      {(loadingRecs || recommendations.length > 0) && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Recommendations</h2>
          {loadingRecs ? (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-[3/4] rounded-lg" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-4">
              {recommendations.slice(0, 16).map((rec) => (
                <div key={rec.mal_id} className="group mt-2">
                  <div className="overflow-hidden transition-transform hover:scale-105">
                    <div className="relative aspect-[3/4] overflow-hidden rounded-lg">
                      <Link href={`/anime/${rec.mal_id}`}>
                        <Image
                          src={
                            rec.images.jpg?.large_image_url ||
                            rec.images.jpg?.image_url ||
                            ""
                          }
                          alt={rec.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        />
                        {/* Play overlay */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="w-8 h-8 text-white fill-white" />
                        </div>
                      </Link>

                      {/* Info button with hover popup */}
                      <AnimeInfoPopover
                        anime={{
                          mal_id: rec.mal_id,
                          title: rec.title,
                          title_english: rec.title_english,
                        }}
                        compact
                      />
                    </div>
                    <Link href={`/anime/${rec.mal_id}`}>
                      <div className="mt-1.5">
                        <h3 className="line-clamp-1 text-xs font-medium leading-tight group-hover:text-primary transition-colors">
                          {getTitle(rec)}
                        </h3>
                      </div>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({
  label,
  value,
  valueClassName = "",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground font-medium whitespace-nowrap">
        {label}:
      </span>
      <span className={`text-foreground ${valueClassName}`}>{value}</span>
    </div>
  );
}

function AnimeDetailSkeleton() {
  return (
    <div className="space-y-6 mt-6 mb-10 px-4 md:px-10 lg:px-20">
      {/* Breadcrumb skeleton */}
      <Skeleton className="h-5 w-64" />

      {/* Main content */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Poster */}
        <div className="flex-shrink-0 mx-auto lg:mx-0">
          <Skeleton className="w-52 md:w-60 aspect-[3/4] rounded-lg" />
        </div>

        {/* Middle */}
        <div className="flex-1 space-y-4 min-w-0">
          {/* Title */}
          <Skeleton className="h-9 w-3/4" />
          {/* Quick Info Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-10" />
            <Skeleton className="h-5 w-14" />
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-16" />
          </div>

          {/* Action Button */}
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>

          {/* Synopsis */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:w-72 flex-shrink-0 space-y-4 hidden lg:block">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <div className="space-y-2 pt-2">
            <Skeleton className="h-4 w-16" />
            <div className="flex flex-wrap gap-1.5">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-14" />
              <Skeleton className="h-5 w-18" />
              <Skeleton className="h-5 w-12" />
            </div>
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>

      {/* Relations/Characters Tabs */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-md" />
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="space-y-4">
        <Skeleton className="h-7 w-48" />
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[3/4] rounded-lg" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
