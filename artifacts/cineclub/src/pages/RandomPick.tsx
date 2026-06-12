import { useState } from "react";
import { PageTransition } from "@/components/PageTransition";
import { useGetRandomPick, useGetWatchlists, useGetGenreList } from "@workspace/api-client-react";
import { Dices, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getPosterUrl, getBackdropUrl } from "@/lib/tmdb";
import { Link } from "wouter";

export default function RandomPick() {
  const [sourceType, setSourceType] = useState<"watchlist" | "genre">("watchlist");
  const [sourceId, setSourceId] = useState<number | undefined>(undefined);
  const [isRolling, setIsRolling] = useState(false);
  
  const { data: watchlists } = useGetWatchlists();
  const { data: genresData } = useGetGenreList();
  
  const pickParams = { 
    watchlistId: sourceType === "watchlist" ? sourceId : undefined,
    genreId: sourceType === "genre" ? sourceId : undefined
  };
  const { data: movie, refetch, isFetching } = useGetRandomPick(
    pickParams,
    { query: { enabled: false, queryKey: ["randomPick", pickParams.watchlistId, pickParams.genreId] } }
  );

  const handleRoll = async () => {
    setIsRolling(true);
    // Fake rolling animation delay
    setTimeout(() => {
      refetch().then(() => setIsRolling(false));
    }, 1500);
  };

  return (
    <PageTransition className="min-h-[80vh] flex flex-col items-center justify-center py-10 relative">
      {movie && !isRolling && movie.backdropPath && (
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20 transition-opacity duration-1000 -z-10 pointer-events-none"
          style={{ backgroundImage: `url(${getBackdropUrl(movie.backdropPath)})` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/50 via-[#050505]/80 to-[#050505] -z-10 pointer-events-none" />

      <div className="max-w-xl w-full text-center z-10">
        <div className="inline-flex items-center justify-center p-4 bg-amber-500/10 rounded-full mb-6">
          <Dices size={48} className="text-amber-500" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Ne İzlesek?</h1>
        <p className="text-xl text-gray-400 mb-10">Can't decide? Let the club choose for you.</p>

        <div className="bg-[#111]/80 backdrop-blur-xl border border-gray-800 rounded-3xl p-6 md:p-8 shadow-2xl">
          <div className="flex bg-black p-1 rounded-xl mb-6 border border-gray-800">
            <button 
              onClick={() => { setSourceType("watchlist"); setSourceId(undefined); }}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors ${sourceType === "watchlist" ? "bg-gray-800 text-white" : "text-gray-500 hover:text-white"}`}
            >
              From Watchlist
            </button>
            <button 
              onClick={() => { setSourceType("genre"); setSourceId(undefined); }}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors ${sourceType === "genre" ? "bg-gray-800 text-white" : "text-gray-500 hover:text-white"}`}
            >
              By Genre
            </button>
          </div>

          <div className="mb-8">
            <select 
              className="w-full bg-black border border-gray-800 text-white rounded-xl h-12 px-4 focus:ring-amber-500 focus:border-amber-500 outline-none"
              value={sourceId || ""}
              onChange={(e) => setSourceId(Number(e.target.value) || undefined)}
            >
              <option value="">Any (Surprise me)</option>
              {sourceType === "watchlist" && watchlists?.map(w => (
                <option key={w.id} value={w.id}>{w.name} ({w.movieCount})</option>
              ))}
              {sourceType === "genre" && genresData?.genres.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <AnimatePresence mode="wait">
            {!movie || isRolling ? (
              <motion.div 
                key="button"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="py-8"
              >
                <button 
                  onClick={handleRoll}
                  disabled={isRolling}
                  className="group relative inline-flex items-center justify-center gap-3 bg-gradient-to-r from-amber-500 to-red-500 text-black font-bold text-xl px-10 py-5 rounded-2xl transition-all hover:scale-105 shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:shadow-[0_0_50px_rgba(245,158,11,0.6)] disabled:opacity-80 disabled:hover:scale-100 overflow-hidden"
                >
                  <div className={`absolute inset-0 bg-white/20 transition-transform duration-1000 ${isRolling ? 'translate-x-full' : '-translate-x-full'}`} />
                  <RefreshCw size={28} className={isRolling ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"} />
                  <span>{isRolling ? "Rolling..." : "Roll the Dice"}</span>
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-left"
              >
                <div className="flex gap-6 items-center">
                  <div className="w-1/3 rounded-xl overflow-hidden shadow-2xl border border-gray-700">
                    <img src={getPosterUrl(movie.posterPath)} alt={movie.title} className="w-full h-auto" />
                  </div>
                  <div className="w-2/3 space-y-4">
                    <div className="text-amber-500 font-bold text-sm uppercase tracking-wider">Your Pick</div>
                    <h2 className="text-3xl font-bold leading-tight">{movie.title}</h2>
                    <div className="text-gray-400 text-sm flex gap-3">
                      <span>{movie.releaseYear}</span>
                      <span>★ {movie.voteAverage?.toFixed(1)}</span>
                    </div>
                    <p className="text-gray-300 line-clamp-4 text-sm leading-relaxed">{movie.overview}</p>
                    
                    <div className="pt-2 flex gap-3">
                      <Link href={`/movie/${movie.tmdbId}`} className="flex-1 text-center bg-white/10 hover:bg-white/20 font-medium py-3 rounded-xl transition-colors">
                        View Details
                      </Link>
                      <button 
                        onClick={handleRoll}
                        className="bg-gray-800 hover:bg-gray-700 p-3 rounded-xl transition-colors"
                      >
                        <RefreshCw size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageTransition>
  );
}
