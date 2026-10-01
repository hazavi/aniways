"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  Search,
  ChevronDown,
  Loader2,
  Star,
  Menu,
  X,
  User,
  LogIn,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { useLanguage } from "@/components/language-provider";
import { useAuth } from "@/components/auth-provider";
import { api, type Anime } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const types = [
  { name: "Movies", href: "/type/movie" },
  { name: "TV Series", href: "/type/tv" },
  { name: "OVAs", href: "/type/ova" },
  { name: "ONAs", href: "/type/ona" },
  { name: "Specials", href: "/type/special" },
];

const browse = [
  { name: "New Releases", href: "/browse/new-releases" },
  { name: "Popular", href: "/browse/popular" },
  { name: "Top Rated", href: "/browse/top-rated" },
];

export function Navbar() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Anime[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const { language, setLanguage } = useLanguage();
  const { getTitle } = useLanguage();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  // Debounced search for suggestions
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.searchAnime(query, 1);
        // Deduplicate by anidb_id to avoid duplicate key errors
        const unique = res.data?.filter(
          (anime: Anime, index: number, self: Anime[]) =>
            index === self.findIndex((a) => a.anidb_id === anime.anidb_id),
        );
        setSuggestions(unique?.slice(0, 6) || []);
      } catch (error) {
        console.error("Search failed:", error);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setShowSuggestions(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleSuggestionClick = (anime: Anime) => {
    setShowSuggestions(false);
    setQuery("");
    setMobileSearchOpen(false);
    router.push(`/anime/${anime.anidb_id}`);
  };

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileSearchOpen(false);
  }, []);

  return (
    <div className="pt-5 pb-8">
      <header className="sticky top-5 z-50 mx-4 md:mx-auto max-w-6xl border rounded-full px-4 md:px-6 border-border/50 shadow-sm bg-background/80 backdrop-blur-sm">
        <div className="flex h-14 items-center justify-between gap-2 md:gap-4">
          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 hover:bg-accent/50 rounded-full transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>

          <Link href="/" className="text-xl font-black shrink-0 text-logo">
            Aniways
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/schedule"
              className="px-3 py-2 text-sm font-medium rounded-full hover:bg-accent/50 transition-colors cursor-pointer"
            >
              Schedule
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-full hover:bg-accent/50 transition-colors cursor-pointer outline-none">
                Types
                <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40">
                {types.map((type) => (
                  <DropdownMenuItem
                    key={type.name}
                    asChild
                    className="hover:cursor-pointer"
                  >
                    <Link href={type.href}>{type.name}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-full hover:bg-accent/50 transition-colors cursor-pointer outline-none">
                Browse
                <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40">
                {browse.map((item) => (
                  <DropdownMenuItem
                    key={item.name}
                    asChild
                    className="hover:cursor-pointer"
                  >
                    <Link href={item.href}>{item.name}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          {/* Desktop Search */}
          <div
            ref={searchRef}
            className="relative hidden md:block flex-1 max-w-xs"
          >
            <form onSubmit={handleSearch}>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground animate-spin" />
              )}
              <Input
                ref={inputRef}
                type="search"
                placeholder="Search anime..."
                className="w-full pl-10 pr-4 rounded-full border-border/50 bg-background/50 focus:bg-background/80 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
              />
            </form>

            {/* Search Dropdown */}
            {showSuggestions && query.trim().length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-background/80 backdrop-blur-xs border-border/50 rounded-xl shadow-xl overflow-hidden z-50">
                {isSearching ? (
                  <div className="p-3 text-center text-muted-foreground text-sm">
                    Searching...
                  </div>
                ) : suggestions.length > 0 ? (
                  <>
                    {suggestions.map((anime) => (
                      <button
                        key={anime.anidb_id}
                        onClick={() => handleSuggestionClick(anime)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent/50 transition-colors text-left hover:cursor-pointer"
                      >
                        <img
                          src={anime.images.jpg.image_url}
                          alt={anime.title}
                          className="w-10 h-14 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {getTitle(anime)}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <span>
                              {anime.type} • {anime.year || "N/A"}
                              {anime.type !== "Movie" && anime.episodes
                                ? ` • ${anime.episodes} Ep`
                                : ""}
                            </span>
                            {anime.score && (
                              <span className="flex items-center gap-0.5">
                                •{" "}
                                <Star className="h-2.5 w-2.5 fill-yellow-500 text-yellow-500" />
                                {anime.score}
                              </span>
                            )}
                          </p>
                          {anime.genres && anime.genres.length > 0 && (
                            <p className="text-xs text-muted-foreground/70 truncate">
                              {anime.genres
                                .slice(0, 3)
                                .map((g: { name: string }) => g.name)
                                .join(", ")}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                    <button
                      onClick={handleSearch}
                      className="w-full py-2 px-3 text-sm text-purple-400 hover:bg-accent/50 transition-colors border-t border-border/50 hover:cursor-pointer text-center"
                    >
                      View all results for &quot;{query}&quot;
                    </button>
                  </>
                ) : (
                  <div className="p-3 text-center text-muted-foreground text-sm">
                    No results found
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            {/* Mobile Search Button */}
            <button
              className="md:hidden p-2 hover:bg-accent/50 rounded-full transition-colors"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Language Toggle - Hidden on mobile */}
            <div className="hidden sm:flex items-center rounded-full bg-muted p-1">
              <button
                onClick={() => setLanguage("en")}
                className={`hover:cursor-pointer px-3 py-1 text-sm font-medium rounded-full transition-colors ${
                  language === "en"
                    ? "bg-purple-500 text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                en
              </button>
              <button
                onClick={() => setLanguage("jp")}
                className={`hover:cursor-pointer px-3 py-1 text-sm font-medium rounded-full transition-colors ${
                  language === "jp"
                    ? "bg-purple-500 text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                jp
              </button>
            </div>

            <ThemeToggle />

            {/* User Menu */}
            {!authLoading &&
              (isAuthenticated ? (
                <Link
                  href="/profile"
                  className="p-2 hover:bg-accent/50 rounded-full transition-colors"
                  title={user?.username}
                >
                  <User className="h-5 w-5" />
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="p-2 hover:bg-accent/50 rounded-full transition-colors"
                  title="Login"
                >
                  <LogIn className="h-5 w-5" />
                </Link>
              ))}
          </div>
        </div>
      </header>

      {/* Mobile Search Overlay */}
      {mobileSearchOpen && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm md:hidden">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <form onSubmit={handleSearch} className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={mobileSearchRef}
                  type="search"
                  placeholder="Search anime..."
                  className="w-full pl-10 pr-4 h-12 text-base"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                />
              </form>
              <button
                onClick={() => setMobileSearchOpen(false)}
                className="p-2 hover:bg-accent/50 rounded-full"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            {/* Mobile Search Results */}
            {query.trim().length >= 2 && (
              <div className="space-y-2">
                {isSearching ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Searching...
                  </div>
                ) : suggestions.length > 0 ? (
                  suggestions.map((anime) => (
                    <button
                      key={anime.anidb_id}
                      onClick={() => handleSuggestionClick(anime)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <img
                        src={anime.images.jpg.image_url}
                        alt={anime.title}
                        className="w-12 h-16 object-cover rounded"
                      />
                      <div className="flex-1 min-w-0 text-left">
                        <p className="font-medium truncate">
                          {getTitle(anime)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {anime.type} • {anime.year || "N/A"}
                          {anime.score && (
                            <span className="ml-2">★ {anime.score}</span>
                          )}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No results found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur-sm md:hidden">
          <div className="pt-20 px-6 space-y-2">
            <Link
              href="/schedule"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-3 px-4 text-lg font-medium rounded-lg hover:bg-accent/50 transition-colors"
            >
              Schedule
            </Link>
            <div className="py-2 px-4">
              <p className="text-sm text-muted-foreground mb-2">Types</p>
              <div className="space-y-1 pl-2">
                {types.map((type) => (
                  <Link
                    key={type.name}
                    href={type.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-2 px-3 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    {type.name}
                  </Link>
                ))}
              </div>
            </div>
            <div className="py-2 px-4">
              <p className="text-sm text-muted-foreground mb-2">Browse</p>
              <div className="space-y-1 pl-2">
                {browse.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-2 px-3 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
            {/* Mobile Language Toggle */}
            <div className="py-4 px-4 border-t border-border/50 mt-4">
              <p className="text-sm text-muted-foreground mb-2">Language</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLanguage("en")}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    language === "en"
                      ? "bg-purple-500 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  English
                </button>
                <button
                  onClick={() => setLanguage("jp")}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    language === "jp"
                      ? "bg-purple-500 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  Japanese
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
