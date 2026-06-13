import { PageTransition } from "@/components/PageTransition";
import { MovieCard } from "@/components/MovieCard";
import { useGetTrendingMovies } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useLang } from "@/lib/i18n";
import { useState } from "react";
import { Link } from "wouter";
import { Star, ChevronLeft, ChevronRight, Calendar } from "lucide-react";

type MovieList = { results: any[]; totalPages: number; page: number };

function fetchMovies(path: string): Promise<MovieList> {
  return fetch(path).then(r => r.json());
}

function getPosterUrl(path: string | null) {
  if (!path) return "https://via.placeholder.com/300x450?text=No+Image";
  return `https://image.tmdb.org/t/p/w500${path}`;
}
function getBackdropUrl(path: string | null) {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/w1280${path}`;
}

// Large single-film featured hero for "Şu An Popüler"
function FeaturedHero({ movies, loading }: { movies: any[] | undefined; loading: boolean }) {
  const { t } = useLang();
  const [idx, setIdx] = useState(0);

  if (loading || !movies || movies.length === 0) {
    return (
      <div className="w-full aspect-[21/9] md:aspect-[21/8] rounded-3xl overflow-hidden bg-[#111] animate-pulse" />
    );
  }

  const film = movies[idx];
  const backdropUrl = getBackdropUrl(film.backdropPath);
  const total = movies.length;

  const prev = () => setIdx((i) => (i - 1 + total) % total);
  const next = () => setIdx((i) => (i + 1) % total);

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-gray-800 shadow-2xl" style={{ aspectRatio: "21/9" }}>
      {/* Backdrop */}
      {backdropUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700"
          style={{ backgroundImage: `url(${backdropUrl})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black" />
      )}
      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

      {/* Content */}
      <div className="relative z-10 h-full flex items-end p-6 md:p-10">
        <div className="flex items-end gap-6 w-full">
          {/* Poster */}
          <div className="hidden sm:block w-28 md:w-36 shrink-0 rounded-xl overflow-hidden border border-white/10 shadow-2xl">
            <img src={getPosterUrl(film.posterPath)} alt={film.title} className="w-full h-auto object-cover" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pb-2">
            <div className="flex items-center gap-3 mb-2 text-sm text-gray-300">
              {film.releaseYear && (
                <span className="flex items-center gap-1">
                  <Calendar size={13} className="text-amber-500" />
                  {film.releaseYear}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Star size={13} className="text-amber-500 fill-amber-500" />
                <span className="text-amber-400 font-bold">{film.voteAverage?.toFixed(1)}</span>
              </span>
            </div>

            <h2 className="text-2xl md:text-4xl font-bold text-white tracking-tight leading-tight mb-3 line-clamp-2 drop-shadow-lg">
              {film.title}
            </h2>

            {film.overview && (
              <p className="text-gray-300 text-sm md:text-base line-clamp-2 max-w-xl mb-4 leading-relaxed">
                {film.overview}
              </p>
            )}

            <Link href={`/movie/${film.tmdbId}`}>
              <button className="bg-gradient-to-r from-amber-500 to-red-500 text-black font-bold px-6 py-2.5 rounded-xl text-sm hover:from-amber-400 hover:to-red-400 transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)]">
                {t("viewDetails")}
              </button>
            </Link>
          </div>

          {/* Navigation */}
          <div className="hidden md:flex flex-col items-center gap-3 shrink-0 pb-2">
            <button onClick={prev} className="p-2 bg-white/10 hover:bg-white/20 rounded-full border border-white/10 transition-colors">
              <ChevronLeft size={20} />
            </button>
            <div className="flex flex-col gap-1.5">
              {movies.slice(0, Math.min(total, 10)).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={`rounded-full transition-all ${i === idx ? 'w-2 h-4 bg-amber-500' : 'w-2 h-2 bg-gray-600 hover:bg-gray-400'}`}
                />
              ))}
            </div>
            <button onClick={next} className="p-2 bg-white/10 hover:bg-white/20 rounded-full border border-white/10 transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile arrows */}
      <button onClick={prev} className="md:hidden absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 rounded-full border border-white/10 transition-colors z-20">
        <ChevronLeft size={18} />
      </button>
      <button onClick={next} className="md:hidden absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 rounded-full border border-white/10 transition-colors z-20">
        <ChevronRight size={18} />
      </button>

      {/* Mobile dots */}
      <div className="md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
        {movies.slice(0, Math.min(total, 10)).map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`rounded-full transition-all ${i === idx ? 'w-4 h-1.5 bg-amber-500' : 'w-1.5 h-1.5 bg-gray-500 hover:bg-gray-300'}`}
          />
        ))}
      </div>

      {/* Film counter */}
      <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-gray-300 border border-white/10 z-20">
        {idx + 1} / {total}
      </div>
    </div>
  );
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

  // Recent popular — last 6 months only
  const { data: recentPopular, isLoading: loadingRecent } = useQuery<MovieList>({
    queryKey: ["movies", "recent-popular"],
    queryFn: () => fetchMovies("/api/movies/recent-popular"),
    staleTime: 10 * 60 * 1000,
  });

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

  function dedupe(movies: any[]): any[] {
    const seen = new Set<number>();
    return movies.filter(m => {
      if (seen.has(m.tmdbId)) return false;
      seen.add(m.tmdbId);
      return true;
    });
  }

  const allClassics = dedupe([
    ...(classics1?.results ?? []),
    ...(classics2?.results ?? []),
    ...(classics3?.results ?? []),
    ...(classics4?.results ?? []),
    ...(classics5?.results ?? []),
  ]).slice(0, 100);

  return (
    <PageTransition className="space-y-14">

      {/* Şu An Popüler — featured hero, son 6 ay */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-bold tracking-tight">{t("popularRightNow")}</h2>
          {recentPopular && <span className="text-xs text-gray-600">{recentPopular.results.length} film</span>}
        </div>
        <FeaturedHero movies={recentPopular?.results} loading={loadingRecent} />
      </section>

      {/* Global Trending */}
      <section>
        <div className="mb-5">
          <h2 className="text-2xl font-bold tracking-tight">{t("trending")}</h2>
        </div>
        <MovieGrid movies={trending?.results} loading={loadingTrending} />
      </section>

      {/* Top Rated */}
      <section>
        <div className="mb-5">
          <h2 className="text-2xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-amber-500 to-red-500 bg-clip-text text-transparent">★</span>
            {" "}{t("topRated")}
          </h2>
        </div>
        <MovieRow movies={topRated?.results} loading={loadingTopRated} />
      </section>

      {/* Klasikler — top 100 all-time */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">🎬 {t("classics")}</h2>
            <p className="text-sm text-gray-500 mt-1">{t("classicsDesc")}</p>
          </div>
          {allClassics.length > 0 && <span className="text-sm text-gray-600">{allClassics.length} film</span>}
        </div>
        <MovieGrid
          movies={allClassics.length > 0 ? allClassics : classics1?.results}
          loading={loadingClassics1 && allClassics.length === 0}
        />
      </section>

    </PageTransition>
  );
}
