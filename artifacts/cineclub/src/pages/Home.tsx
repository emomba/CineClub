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
        <div key={movie.tmdbId} className="w-full"><MovieCard movie={movie} /></div>
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

  const { data: classics1, isLoading: loadingClassics1 } = useQuery<MovieList>({
    queryKey: ["movies", "classics", 1],
    queryFn: () => fetchMovies("/api/movies/classics?page=1"),
    staleTime: 30 * 60 * 1000,
  });

  const { data: classics2 } = useQuery<MovieList>({
    queryKey: ["movies", "classics", 2],
    queryFn: () => fetchMovies("/api/movies/classics?page=2"),
    staleTime: 30 * 60 * 1000,
  });

  const { data: classics3 } = useQuery<MovieList>({
    queryKey: ["movies", "classics", 3],
    queryFn: () => fetchMovies("/api/movies/classics?page=3"),
    staleTime: 30 * 60 * 1000,
  });

  const { data: classics4 } = useQuery<MovieList>({
    queryKey: ["movies", "classics", 4],
    queryFn: () => fetchMovies("/api/movies/classics?page=4"),
    staleTime: 30 * 60 * 1000,
  });

  const { data: classics5 } = useQuery<MovieList>({
    queryKey: ["movies", "classics", 5],
    queryFn: () => fetchMovies("/api/movies/classics?page=5"),
    staleTime: 30 * 60 * 1000,
  });

  // Deduplicate by tmdbId helper
  function dedupe(movies: any[]): any[] {
    const seen = new Set<number>();
    return movies.filter(m => {
      if (seen.has(m.tmdbId)) return false;
      seen.add(m.tmdbId);
      return true;
    });
  }

  const allPopular = dedupe([
    ...(popular1?.results ?? []),
    ...(popular2?.results ?? []),
    ...(popular3?.results ?? []),
  ]);

  const allClassics = dedupe([
    ...(classics1?.results ?? []),
    ...(classics2?.results ?? []),
    ...(classics3?.results ?? []),
    ...(classics4?.results ?? []),
    ...(classics5?.results ?? []),
  ]).slice(0, 100);

  return (
    <PageTransition className="space-y-12">
      {/* Popular - horizontal scroll carousel */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-bold tracking-tight">{t("popularRightNow")}</h2>
          {allPopular.length > 0 && <span className="text-sm text-gray-600">{allPopular.length} film</span>}
        </div>
        <MovieRow movies={allPopular.length > 0 ? allPopular : popular1?.results} loading={l1 && allPopular.length === 0} />
      </section>

      {/* Global Trending - grid with diverse mix */}
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

      {/* Classics - grid of 100 all-time greatest */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">🎬 {t("classics")}</h2>
            <p className="text-sm text-gray-500 mt-1">{t("classicsDesc")}</p>
          </div>
          {allClassics.length > 0 && <span className="text-sm text-gray-600">{allClassics.length} film</span>}
        </div>
        <MovieGrid movies={allClassics.length > 0 ? allClassics : classics1?.results} loading={loadingClassics1 && allClassics.length === 0} />
      </section>
    </PageTransition>
  );
}
