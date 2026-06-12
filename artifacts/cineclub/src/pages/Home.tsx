import { PageTransition } from "@/components/PageTransition";
import { MovieCard } from "@/components/MovieCard";
import { useGetPopularMovies, useGetTrendingMovies } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { data: popular, isLoading: loadingPopular } = useGetPopularMovies({ page: 1 });
  const { data: trending, isLoading: loadingTrending } = useGetTrendingMovies();

  return (
    <PageTransition className="space-y-10">
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Popular Right Now</h2>
        </div>
        
        <div className="relative">
          {loadingPopular ? (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="w-[160px] md:w-[200px] aspect-[2/3] rounded-xl flex-shrink-0 bg-[#111]" />
              ))}
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar">
              {popular?.results.map((movie) => (
                <div key={movie.tmdbId} className="snap-start">
                  <MovieCard movie={movie} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Trending</h2>
        </div>
        
        {loadingTrending ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[...Array(12)].map((_, i) => (
              <Skeleton key={i} className="w-full aspect-[2/3] rounded-xl bg-[#111]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {trending?.results.map((movie) => (
              <div key={movie.tmdbId} className="w-full">
                <MovieCard movie={movie} />
              </div>
            ))}
          </div>
        )}
      </section>
    </PageTransition>
  );
}
