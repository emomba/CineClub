import { PageTransition } from "@/components/PageTransition";
import { MovieCard } from "@/components/MovieCard";
import { useGetTrendingMovies } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useLang } from "@/lib/i18n";
import { useState } from "react";
import { Link } from "wouter";
import { Star, ChevronUp, ChevronDown, Calendar, User, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useGetMe } from "@workspace/api-client-react";

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
  const [dir, setDir] = useState(1); // +1 = next (slide up), -1 = prev (slide down)

  if (loading || !movies || movies.length === 0) {
    return (
      <div className="w-full aspect-[21/9] md:aspect-[21/8] rounded-3xl overflow-hidden bg-[#111] animate-pulse" />
    );
  }

  const film = movies[idx];
  const backdropUrl = getBackdropUrl(film.backdropPath);
  const total = movies.length;

  // Sliding dot window: show at most 10 dots centered around current index
  const DOT_WINDOW = Math.min(total, 10);
  const halfWin = Math.floor(DOT_WINDOW / 2);
  let winStart = Math.max(0, idx - halfWin);
  if (winStart + DOT_WINDOW > total) winStart = Math.max(0, total - DOT_WINDOW);
  const visibleDots = Array.from({ length: DOT_WINDOW }, (_, k) => winStart + k);

  const prev = () => { setDir(-1); setIdx((i) => (i - 1 + total) % total); };
  const next = () => { setDir(1); setIdx((i) => (i + 1) % total); };
  const goTo = (i: number) => { setDir(i > idx ? 1 : -1); setIdx(i); };

  const variants = {
    enter: (d: number) => ({ y: d * 40, opacity: 0 }),
    center: { y: 0, opacity: 1 },
    exit: (d: number) => ({ y: -d * 40, opacity: 0 }),
  };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-gray-800 shadow-2xl" style={{ aspectRatio: "21/9" }}>
      {/* Backdrop — transitions on change */}
      <AnimatePresence mode="sync" custom={dir}>
        <motion.div
          key={`bg-${idx}`}
          custom={dir}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0"
        >
          {backdropUrl ? (
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${backdropUrl})` }} />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black" />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent z-[1]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-[1]" />

      {/* Content — slides up/down on change */}
      <div className="relative z-10 h-full flex items-end p-6 md:p-10 overflow-hidden">
        <div className="flex items-end gap-6 w-full">
          {/* Poster */}
          <AnimatePresence mode="popLayout" custom={dir}>
            <motion.div
              key={`poster-${idx}`}
              custom={dir}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: [0.32, 0, 0.67, 0] }}
              className="hidden sm:block w-28 md:w-36 shrink-0 rounded-xl overflow-hidden border border-white/10 shadow-2xl"
            >
              <img src={getPosterUrl(film.posterPath)} alt={film.title} className="w-full h-auto object-cover" />
            </motion.div>
          </AnimatePresence>

          {/* Info */}
          <AnimatePresence mode="popLayout" custom={dir}>
            <motion.div
              key={`info-${idx}`}
              custom={dir}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: [0.32, 0, 0.67, 0], delay: 0.05 }}
              className="flex-1 min-w-0 pb-2"
            >
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
            </motion.div>
          </AnimatePresence>

          {/* Desktop vertical navigation */}
          <div className="hidden md:flex flex-col items-center gap-2 shrink-0 pb-2 max-h-[calc(21vw*9/21-2rem)] overflow-hidden">
            <button onClick={prev} className="p-2 bg-white/10 hover:bg-amber-500/30 rounded-full border border-white/10 hover:border-amber-500/50 transition-all shrink-0">
              <ChevronUp size={18} />
            </button>
            <div className="flex flex-col gap-1.5 overflow-hidden">
              {visibleDots.map((filmIdx) => (
                <button
                  key={filmIdx}
                  onClick={() => goTo(filmIdx)}
                  className={`rounded-full transition-all duration-300 ${
                    filmIdx === idx
                      ? 'w-2 h-5 bg-amber-500'
                      : 'w-2 h-2 bg-gray-600 hover:bg-gray-400'
                  }`}
                />
              ))}
              {total > DOT_WINDOW && (
                <span className="text-[9px] text-gray-600 text-center leading-tight">{idx + 1}/{total}</span>
              )}
            </div>
            <button onClick={next} className="p-2 bg-white/10 hover:bg-amber-500/30 rounded-full border border-white/10 hover:border-amber-500/50 transition-all shrink-0">
              <ChevronDown size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile up/down arrows */}
      <button onClick={prev} className="md:hidden absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 rounded-full border border-white/10 transition-colors z-20">
        <ChevronUp size={18} />
      </button>
      <button onClick={next} className="md:hidden absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 rounded-full border border-white/10 transition-colors z-20">
        <ChevronDown size={18} />
      </button>

      {/* Mobile dots — all films */}
      <div className="md:hidden absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-20">
        {visibleDots.map((filmIdx) => (
          <button
            key={filmIdx}
            onClick={() => goTo(filmIdx)}
            className={`rounded-full transition-all ${filmIdx === idx ? 'w-4 h-1.5 bg-amber-500' : 'w-1.5 h-1.5 bg-gray-500 hover:bg-gray-300'}`}
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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-6">
      {movies?.map((movie) => (
        <MovieCard key={movie.tmdbId} movie={movie} fullWidth />
      ))}
    </div>
  );
}

export default function Home() {
  const { t } = useLang();
  const { data: myProfile } = useGetMe();

  const isAutoGenerated = (s: string | null | undefined) =>
    !s || /^user_[a-z0-9]{6,10}$/i.test(s);

  const rawDisplay = myProfile?.displayName || myProfile?.username;
  const displayName = isAutoGenerated(rawDisplay) ? "" : (rawDisplay ?? "");
  const avatarUrl = myProfile?.avatarUrl || null;

  // Recent popular — last 6 months only
  const { data: recentPopular, isLoading: loadingRecent } = useQuery<MovieList>({
    queryKey: ["movies", "recent-popular"],
    queryFn: () => fetchMovies("/api/movies/recent-popular"),
    staleTime: 10 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
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

      {/* Profile card */}
      <Link href="/profile">
        <div className="flex items-center gap-4 bg-[#111] border border-white/8 rounded-2xl px-5 py-4 hover:border-amber-500/30 hover:bg-[#161616] transition-all cursor-pointer group">
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/10 shrink-0 bg-[#1a1a1a] group-hover:border-amber-500/40 transition-colors">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName || "Profil"} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User size={24} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {displayName ? (
              <>
                <p className="text-lg font-bold text-white truncate leading-tight">{displayName}</p>
                <p className="text-sm text-gray-500 mt-0.5">Profilini görüntüle</p>
              </>
            ) : (
              <>
                <p className="text-lg font-bold text-white leading-tight">Profilim</p>
                <p className="text-sm text-gray-500 mt-0.5">İsim ve avatar ekle</p>
              </>
            )}
          </div>
          <ChevronRight size={18} className="text-gray-700 group-hover:text-amber-500 transition-colors shrink-0" />
        </div>
      </Link>

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
