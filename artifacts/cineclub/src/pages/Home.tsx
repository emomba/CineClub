import { PageTransition } from "@/components/PageTransition";
import { MovieCard } from "@/components/MovieCard";
import { useGetPopularMovies, useGetTrendingMovies } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useLang } from "@/lib/i18n";

type MovieList = { results: any[]; totalPages: number; page: number };

function fetchMovies(path: string): Promise<MovieList> {
  return fetch(path).then(r => r.json());
}

function MovieRow({ movies, loading }: { movies: any[] | undefined; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="w-[150px] md:w-[185px] aspect-[2/3] rounded-xl flex-shrink-0 bg-[#111]" />
        ))}
      </div>
    );
  }
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar">
      {movies?.map((movie) => (
        <div key={movie.tmdbId} className="snap-start flex-shrink-0">
          <MovieCard movie={movie} />
        </div>
      ))}
    </div>
  );
}

function MovieGrid({ movies, loading }: { movies: any[] | undefined; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {[...Array(18)].map((_, i) => (
          <Skeleton key={i} className="w-full aspect-[2/3] rounded-xl bg-[#111]" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {movies?.map((movie) => (
        <div key={movie.tmdbId} className="w-full">
          <MovieCard movie={movie} />
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const { t } = useLang();

  const { data: popular1, isLoading: l1 } = useGetPopularMovies({ page: 1 });
  const { data: popular2 } = useGetPopularMovies({ page: 2 });
  const { data: popular3 } = useGetPopularMovies({ page: 3 });

  const { data: trending, isLoading: loadingTrending } = useGetTrendingMovies();

  const { data: topRated, isLoading: loadingTopRated } = useQuery<MovieList>({
    queryKey: ["movies", "top-rated"],
    queryFn: () => fetchMovies("/api/movies/top-rated"),
    staleTime: 5 * 60 * 1000,
  });

  const { data: englishMovies, isLoading: loadingEn } = useQuery<MovieList>({
    queryKey: ["movies", "language", "en"],
    queryFn: () => fetchMovies("/api/movies/language/en"),
    staleTime: 5 * 60 * 1000,
  });

  const { data: germanMovies, isLoading: loadingDe } = useQuery<MovieList>({
    queryKey: ["movies", "language", "de"],
    queryFn: () => fetchMovies("/api/movies/language/de"),
    staleTime: 5 * 60 * 1000,
  });

  // Merge popular pages, deduplicate by tmdbId
  const allPopular = (() => {
    const seen = new Set<number>();
    const merged = [
      ...(popular1?.results ?? []),
      ...(popular2?.results ?? []),
      ...(popular3?.results ?? []),
    ];
    return merged.filter(m => {
      if (seen.has(m.tmdbId)) return false;
      seen.add(m.tmdbId);
      return true;
    });
  })();

  return (
    <PageTransition className="space-y-12">
      {/* Popular - horizontal scroll */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-bold tracking-tight">{t("popularRightNow")}</h2>
          <span className="text-sm text-gray-500">{allPopular.length > 0 ? `${allPopular.length} film` : ""}</span>
        </div>
        <MovieRow movies={allPopular.length > 0 ? allPopular : popular1?.results} loading={l1 && allPopular.length === 0} />
      </section>

      {/* Trending - grid */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-bold tracking-tight">{t("trending")}</h2>
        </div>
        <MovieGrid movies={trending?.results} loading={loadingTrending} />
      </section>

      {/* Top Rated - horizontal scroll */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-amber-500 to-red-500 bg-clip-text text-transparent">★</span>
            {" "}{t("topRated")}
          </h2>
        </div>
        <MovieRow movies={topRated?.results} loading={loadingTopRated} />
      </section>

      {/* American & British - horizontal scroll */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-bold tracking-tight">🇺🇸🇬🇧 {t("americanBritish")}</h2>
        </div>
        <MovieRow movies={englishMovies?.results} loading={loadingEn} />
      </section>

      {/* German Films - horizontal scroll */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-bold tracking-tight">🇩🇪 {t("germanFilms")}</h2>
        </div>
        <MovieRow movies={germanMovies?.results} loading={loadingDe} />
      </section>
    </PageTransition>
  );
}
