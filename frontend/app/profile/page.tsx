"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { resolveImageUrl } from "@/lib/images";
import { useAuth } from "@/components/auth-provider";
import { authApi, listApi, AnimeListItem, ListStatus } from "@/lib/auth";
import { statusIcons } from "@/components/add-to-list-button";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { User, LogOut, Calendar, X } from "lucide-react";

const ITEMS_PER_PAGE = 12; // 6 columns x 2 rows

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const [profile, setProfile] = useState<Awaited<
    ReturnType<typeof authApi.getProfile>
  > | null>(null);
  const [animeList, setAnimeList] = useState<AnimeListItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    // Only load data when we have a user (token is properly set)
    if (!authLoading && isAuthenticated && user) {
      loadData();
    }
  }, [authLoading, isAuthenticated, user]);

  const loadData = async () => {
    try {
      const [profileData, listData] = await Promise.all([
        authApi.getProfile(),
        listApi.getList(),
      ]);
      setProfile(profileData);
      setAnimeList(listData.items || []);
    } catch (error) {
      console.error("Failed to load data:", error);
      // If auth fails, redirect to login
      if (error instanceof Error && error.message.includes("authenticated")) {
        router.push("/login");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFromList = async (anidbId: number) => {
    try {
      await listApi.removeFromList(anidbId);
      setAnimeList((prev) => prev.filter((item) => item.anidb_id !== anidbId));
      // Refresh profile stats
      const profileData = await authApi.getProfile();
      setProfile(profileData);
    } catch (error) {
      console.error("Failed to remove from list:", error);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const filteredList =
    activeTab === "all"
      ? animeList
      : animeList.filter((item) => item.status === activeTab);

  // Pagination
  const totalPages = Math.ceil(filteredList.length / ITEMS_PER_PAGE);
  const paginatedList = filteredList.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  // Reset to page 1 when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  if (authLoading || (!isAuthenticated && !authLoading)) {
    return (
      <div className="space-y-6 shadow-sm sm:space-y-10 mt-6 sm:mt-10 px-2 sm:px-10 md:px-20 lg:px-30">
        <div className="py-5 px-10 rounded-2xl border border-border/50">
          {/* Profile Header Skeleton */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-9 w-24" />
          </div>

          {/* Tabs Skeleton */}
          <div className="flex flex-wrap gap-2 mb-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-24 rounded-full" />
            ))}
          </div>

          {/* Grid Skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-[2/3] rounded-lg" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 shadow-sm sm:space-y-10 mt-6 sm:mt-10 px-2 sm:px-10 md:px-20 lg:px-30">
      <div className="py-5 px-10 rounded-2xl border border-border/50">
        {/* Profile Header - Minimal */}
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{user?.username}</h1>
              {profile && (
                <p className="text-muted-foreground text-xs flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Joined {new Date(profile.created_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="cursor-pointer"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Anime List */}
        <div>
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="flex flex-wrap h-auto gap-1 mb-6 bg-transparent p-0">
              <TabsTrigger
                value="all"
                className="text-xs cursor-pointer data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4"
              >
                All ({animeList.length})
              </TabsTrigger>
              <TabsTrigger
                value="watching"
                className="text-xs cursor-pointer data-[state=active]:bg-green-600 data-[state=active]:text-white rounded-full px-4"
              >
                Watching (
                {animeList.filter((i) => i.status === "watching").length})
              </TabsTrigger>
              <TabsTrigger
                value="plan_to_watch"
                className="text-xs cursor-pointer data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-full px-4"
              >
                Plan to Watch (
                {animeList.filter((i) => i.status === "plan_to_watch").length})
              </TabsTrigger>
              <TabsTrigger
                value="completed"
                className="text-xs cursor-pointer data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-full px-4"
              >
                Completed (
                {animeList.filter((i) => i.status === "completed").length})
              </TabsTrigger>
              <TabsTrigger
                value="paused"
                className="text-xs cursor-pointer data-[state=active]:bg-yellow-600 data-[state=active]:text-white rounded-full px-4"
              >
                Paused ({animeList.filter((i) => i.status === "paused").length})
              </TabsTrigger>
              <TabsTrigger
                value="dropped"
                className="text-xs cursor-pointer data-[state=active]:bg-red-600 data-[state=active]:text-white rounded-full px-4"
              >
                Dropped (
                {animeList.filter((i) => i.status === "dropped").length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-0">
              {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  {[...Array(12)].map((_, i) => (
                    <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
                  ))}
                </div>
              ) : filteredList.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No anime in this list yet.</p>
                  <Link href="/browse/popular">
                    <Button variant="link" className="mt-2 cursor-pointer">
                      Browse anime to add
                    </Button>
                  </Link>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                    {paginatedList.map((item) => (
                      <AnimeListCard
                        key={item.id}
                        item={item}
                        onRemove={handleRemoveFromList}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <Pagination className="mt-6">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() =>
                              setCurrentPage((p) => Math.max(1, p - 1))
                            }
                            className={
                              currentPage === 1
                                ? "pointer-events-none opacity-50"
                                : "cursor-pointer"
                            }
                          />
                        </PaginationItem>
                        {Array.from(
                          { length: totalPages },
                          (_, i) => i + 1,
                        ).map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <PaginationNext
                            onClick={() =>
                              setCurrentPage((p) => Math.min(totalPages, p + 1))
                            }
                            className={
                              currentPage === totalPages
                                ? "pointer-events-none opacity-50"
                                : "cursor-pointer"
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function AnimeListCard({
  item,
  onRemove,
}: {
  item: AnimeListItem;
  onRemove: (anidbId: number) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  const statusColors: Record<ListStatus, string> = {
    plan_to_watch: "bg-blue-600/90",
    watching: "bg-green-600/90",
    completed: "bg-purple-600/90",
    paused: "bg-yellow-500/90",
    dropped: "bg-red-500/90",
  };

  return (
    <div
      className="relative group cursor-pointer"
      onMouseEnter={() => setShowMenu(true)}
      onMouseLeave={() => setShowMenu(false)}
    >
      <Link href={`/anime/${item.anidb_id}`}>
        <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-muted">
          {item.image_url ? (
            <Image
              src={resolveImageUrl(item.image_url)}
              alt={item.title}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 16vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
              No Image
            </div>
          )}

          {/* Status badge with icon */}
          <span
            className={`absolute top-2 left-2 p-1 rounded-full text-white backdrop-blur-sm shadow-sm ${statusColors[item.status]}`}
          >
            {statusIcons[item.status]}
          </span>
        </div>
      </Link>

      <h3 className="mt-1.5 text-xs font-medium line-clamp-2 leading-tight">
        {item.title_english || item.title}
      </h3>

      {/* Delete button on hover */}
      {showMenu && (
        <button
          className="absolute top-1.5 right-1.5 z-10 h-6 w-6 rounded-full px-1 bg-zinc-900/100 hover:bg-red-600 flex items-center justify-center cursor-pointer transition-colors"
          onClick={(e) => {
            e.preventDefault();
            onRemove(item.anidb_id);
          }}
          title="Remove from list"
        >
          <X className="h-5 w-5 text-white" />
        </button>
      )}
    </div>
  );
}
