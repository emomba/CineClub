import { useState, useEffect } from "react";
import { PageTransition } from "@/components/PageTransition";
import { MovieCard } from "@/components/MovieCard";
import { useSearchMovies, useGetGenreList, useGetMoviesByGenre } from "@workspace/api-client-react";
import { Search as SearchIcon, X } from "lucide-react";
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

export default function Search() {
  const { t } = useLang();
  const [query, setQuery] = useState("");
  const debouncedQuery = useLocalDebounce(query, 500);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);

  const { data: genresData } = useGetGenreList();

  const { data: searchResults, isLoading: searching } = useSearchMovies(
    { q: debouncedQuery, page: 1 },
    { query: { enabled: !!debouncedQuery && !selectedGenre, queryKey: ["searchMovies", debouncedQuery] } }
  );

  const { data: genreResults, isLoading: loadingGenre } = useGetMoviesByGenre(
    selectedGenre || 0,
    { query: { enabled: !!selectedGenre, queryKey: ["moviesByGenre", selectedGenre] } }
  );

  const handleGenreClick = (genreId: number) => {
    if (selectedGenre === genreId) setSelectedGenre(null);
    else { setSelectedGenre(genreId); setQuery(""); }
  };

  const results = selectedGenre ? genreResults?.results : (debouncedQuery ? searchResults?.results : []);
  const isLoading = selectedGenre ? loadingGenre : (debouncedQuery ? searching : false);

  return (
    <PageTransition className="space-y-8">
      <div className="relative max-w-2xl mx-auto">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-amber-500 transition-colors">
            <SearchIcon size={24} />
          </div>
          <Input
            value={query}
            onChange={(e) => { setQuery(e.target.value); if (e.target.value) setSelectedGenre(null); }}
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
            onClick={() => handleGenreClick(genre.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedGenre === genre.id
                ? "bg-gradient-to-r from-amber-500 to-red-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                : "bg-[#111] text-gray-300 hover:bg-[#222] border border-gray-800 hover:border-gray-600"
            }`}
          >
            {genre.name}
          </button>
        ))}
      </div>

      <div className="pt-8">
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
