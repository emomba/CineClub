import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { PageTransition } from "@/components/PageTransition";
import { MovieCard } from "@/components/MovieCard";
import { useSearchMovies, useGetGenreList } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon, X, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/i18n";

function useLocalDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

const SORT_OPTIONS = [
  { value: "popularity.desc", labelKey: "sortPopularity" },
  { value: "vote_average.desc", labelKey: "sortRating" },
  { value: "title.asc", labelKey: "sortTitle" },
  { value: "primary_release_date.desc", labelKey: "sortYearDesc" },
  { value: "primary_release_date.asc", labelKey: "sortYearAsc" },
] as const;

export default function Search() {
  const { t } = useLang();
  const [location] = useLocation();
  const [query, setQuery] = useState("");
  const debouncedQuery = useLocalDebounce(query, 500);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [selectedGenreName, setSelectedGenreName] = useState<string>("");
  const [sortBy, setSortBy] = useState("popularity.desc");
  const [sortOpen, setSortOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const genre = params.get("genre");
    const genreName = params.get("genreName");
    if (genre) {
      setSelectedGenre(Number(genre));
      setSelectedGenreName(genreName ? decodeURIComponent(genreName) : "");
      setQuery("");
    }
  }, [location]);

  const { data: genresData } = useGetGenreList();

  const { data: searchResults, isLoading: searching } = useSearchMovies(
    { q: debouncedQuery, page: 1 },
    { query: { enabled: !!debouncedQuery && !selectedGenre, queryKey: ["searchMovies", debouncedQuery] } }
  );

  const { data: genreResults, isLoading: loadingGenre } = useQuery<{ results: any[] }>({
    queryKey: ["moviesByGenre", selectedGenre, sortBy],
    queryFn: () =>
      fetch(`/api/movies/genre/${selectedGenre}?sortBy=${sortBy}`).then(r => r.json()),
    enabled: !!selectedGenre,
    staleTime: 5 * 60 * 1000,
  });

  const handleGenreClick = (genreId: number, genreName: string) => {
    if (selectedGenre === genreId) {
      setSelectedGenre(null);
      setSelectedGenreName("");
    } else {
      setSelectedGenre(genreId);
      setSelectedGenreName(genreName);
      setQuery("");
    }
  };

  const results = selectedGenre ? genreResults?.results : (debouncedQuery ? searchResults?.results : []);
  const isLoading = selectedGenre ? loadingGenre : (debouncedQuery ? searching : false);

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.labelKey ?? "sortPopularity";

  return (
    <PageTransition className="space-y-6">
      <div className="relative max-w-2xl mx-auto">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-amber-500 transition-colors">
            <SearchIcon size={24} />
          </div>
          <Input
            value={query}
            onChange={(e) => { setQuery(e.target.value); if (e.target.value) { setSelectedGenre(null); setSelectedGenreName(""); } }}
            placeholder={t("searchPlaceholder")}
            className="w-full h-14 pl-12 pr-10 bg-[#111] border-gray-800 text-lg rounded-2xl focus-visible:ring-amber-500 focus-visible:border-amber-500 transition-all placeholder:text-gray-500"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white">
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {genresData?.genres.map(genre => (
          <button
            key={genre.id}
            onClick={() => handleGenreClick(genre.id, genre.name)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedGenre === genre.id
                ? "bg-gradient-to-r from-amber-500 to-red-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                : "bg-[#111] text-gray-300 border border-gray-800 hover:bg-gradient-to-r hover:from-amber-500 hover:to-red-500 hover:text-black hover:border-transparent"
            }`}
          >
            {genre.name}
          </button>
        ))}
      </div>

      {selectedGenre && (
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {selectedGenreName || t("browseByGenre")}
          </h2>
          <div className="relative">
            <button
              onClick={() => setSortOpen(v => !v)}
              className="flex items-center gap-2 bg-[#111] border border-gray-800 text-gray-300 hover:text-white px-4 py-2 rounded-xl text-sm transition-all hover:border-amber-500/50"
            >
              <ArrowUpDown size={15} className="text-amber-500" />
              <span>{t(currentSortLabel as any)}</span>
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-full mt-1 bg-[#111] border border-gray-800 rounded-xl overflow-hidden shadow-xl z-50 min-w-[180px]">
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setSortBy(opt.value); setSortOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      sortBy === opt.value
                        ? "bg-gradient-to-r from-amber-500/20 to-red-500/20 text-amber-400"
                        : "text-gray-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {t(opt.labelKey as any)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="pt-2">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[...Array(12)].map((_, i) => <Skeleton key={i} className="w-full aspect-[2/3] rounded-xl bg-[#111]" />)}
          </div>
        ) : results && results.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {results.map((movie) => (
              <div key={movie.tmdbId} className="w-full"><MovieCard movie={movie} /></div>
            ))}
          </div>
        ) : (debouncedQuery || selectedGenre) ? (
          <div className="text-center text-gray-500 py-20">
            <p className="text-xl">{t("noMoviesFound")}</p>
            <p className="text-sm mt-2">{t("tryAdjusting")}</p>
          </div>
        ) : (
          <div className="text-center text-gray-600 py-20 flex flex-col items-center">
            <SearchIcon size={48} className="mb-4 opacity-20" />
            <p className="text-xl font-medium">{t("findNextFavorite")}</p>
            <p className="text-sm mt-2">{t("searchByTitle")}</p>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
