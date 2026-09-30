"use client";

import { useEffect, useState } from "react";
import { api, type Anime } from "@/lib/api";
import { AnimeGrid, AnimeGridSkeleton } from "@/components/anime-grid";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";

export default function CurrentSeasonPage() {
  const [results, setResults] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    document.title = "Current Season - Aniways";
    fetchSeason(1);
  }, []);

  async function fetchSeason(pageNum: number) {
    setLoading(true);
    try {
      const res = await api.getCurrentSeason(pageNum, 24);
      setResults(res.data || []);
      setHasNextPage(res.pagination?.has_next_page || false);
      setTotalPages(res.pagination?.last_visible_page || 1);
    } catch (error) {
      console.error("Fetch current season failed:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
    fetchSeason(newPage);
  };

  if (loading) {
    return <AnimeGridSkeleton count={24} title="Current Season" compact />;
  }

  return (
    <div className="space-y-8 mt-10">
      {results.length > 0 ? (
        <>
          <AnimeGrid anime={results} title="Current Season" compact hideDuration />

          {(hasNextPage || page > 1) && (
            <Pagination className="pt-4">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => handlePageChange(page - 1)}
                    className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="text-sm text-muted-foreground px-4">
                    Page {page} of {totalPages}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    onClick={() => handlePageChange(page + 1)}
                    className={!hasNextPage ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No anime found</p>
        </div>
      )}
    </div>
  );
}
