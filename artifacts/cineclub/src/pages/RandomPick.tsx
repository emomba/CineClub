import { useState } from "react";
import { PageTransition } from "@/components/PageTransition";
import { useGetRandomPick } from "@workspace/api-client-react";
import { Dices, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getPosterUrl, getBackdropUrl } from "@/lib/tmdb";
import { Link } from "wouter";
import { useLang } from "@/lib/i18n";

export default function RandomPick() {
  const [isRolling, setIsRolling] = useState(false);
  const [rollKey, setRollKey] = useState(0);
  const { t } = useLang();

  const { data: movie, refetch, isFetching } = useGetRandomPick(
    {},
    { query: { enabled: false, queryKey: ["randomPick", rollKey] } }
  );

  const handleRoll = async () => {
    setIsRolling(true);
    setRollKey(k => k + 1);
    setTimeout(() => {
      refetch().then(() => setIsRolling(false));
    }, 1200);
  };

  return (
    <PageTransition className="min-h-[80vh] flex flex-col items-center justify-center py-10 relative">
      {movie && !isRolling && movie.backdropPath && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-15 transition-opacity duration-1000 -z-10 pointer-events-none"
          style={{ backgroundImage: `url(${getBackdropUrl(movie.backdropPath)})` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/50 via-[#050505]/80 to-[#050505] -z-10 pointer-events-none" />

      <div className="max-w-xl w-full text-center z-10">
        <div className="inline-flex items-center justify-center p-4 bg-amber-500/10 rounded-full mb-6">
          <Dices size={48} className="text-amber-500" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">{t("randomPickTitle")}</h1>
        <p className="text-lg text-gray-400 mb-10">{t("randomPickSubtitle")}</p>

        <div className="bg-[#111]/80 backdrop-blur-xl border border-gray-800 rounded-3xl p-6 md:p-8 shadow-2xl">
          <AnimatePresence mode="wait">
            {!movie || isRolling ? (
              <motion.div
                key="button"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="py-8 flex justify-center"
              >
                <button
                  onClick={handleRoll}
                  disabled={isRolling || isFetching}
                  className="group relative inline-flex items-center justify-center gap-3 bg-gradient-to-r from-amber-500 to-red-500 text-black font-bold text-xl px-12 py-5 rounded-2xl transition-all hover:scale-105 shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:shadow-[0_0_50px_rgba(245,158,11,0.6)] disabled:opacity-80 disabled:hover:scale-100 overflow-hidden"
                >
                  <div className={`absolute inset-0 bg-white/20 transition-transform duration-1000 ${isRolling ? 'translate-x-full' : '-translate-x-full'}`} />
                  <RefreshCw size={28} className={isRolling ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"} />
                  <span>{isRolling ? t("rolling") : t("surpriseMe")}</span>
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
                  <div className="w-1/3 rounded-xl overflow-hidden shadow-2xl border border-gray-700 flex-shrink-0">
                    <img src={getPosterUrl(movie.posterPath)} alt={movie.title} className="w-full h-auto" />
                  </div>
                  <div className="w-2/3 space-y-4">
                    <div className="text-amber-500 font-bold text-xs uppercase tracking-widest">{t("yourPick")}</div>
                    <h2 className="text-2xl font-bold leading-tight">{movie.title}</h2>
                    <div className="text-gray-400 text-sm flex gap-3">
                      <span>{movie.releaseYear}</span>
                      <span>★ {movie.voteAverage?.toFixed(1)}</span>
                    </div>
                    {movie.overview && (
                      <p className="text-gray-300 line-clamp-3 text-sm leading-relaxed">{movie.overview}</p>
                    )}

                    <div className="pt-2 flex gap-3">
                      <Link href={`/movie/${movie.tmdbId}`} className="flex-1 text-center bg-gradient-to-r from-amber-500 to-red-500 text-black font-bold py-3 rounded-xl transition-all hover:opacity-90">
                        {t("viewDetails")}
                      </Link>
                      <button
                        onClick={handleRoll}
                        className="bg-gray-800 hover:bg-gray-700 p-3 rounded-xl transition-colors"
                        title={t("rollAgain")}
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
