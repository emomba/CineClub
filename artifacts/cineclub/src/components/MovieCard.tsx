import { motion } from "framer-motion";
import { Link } from "wouter";
import { Star } from "lucide-react";
import { getPosterUrl } from "@/lib/tmdb";
import { MovieSummary } from "@workspace/api-client-react";

export function MovieCard({
  movie,
  showRating = true,
  fullWidth = false,
}: {
  movie: MovieSummary;
  showRating?: boolean;
  fullWidth?: boolean;
}) {
  const imdbRating = typeof movie.imdbRating === "number" ? movie.imdbRating : null;
  const tmdbRating = typeof movie.voteAverage === "number" ? movie.voteAverage : parseFloat(String(movie.voteAverage ?? "0"));
  const displayRating = imdbRating ?? (tmdbRating > 0 ? tmdbRating : null);
  const isImdb = imdbRating !== null;

  return (
    <Link href={`/movie/${movie.tmdbId}`}>
      <motion.div
        whileHover={{ scale: 1.04, y: -4 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className={`group relative cursor-pointer z-0 hover:z-20 ${fullWidth ? "w-full" : "w-[155px] md:w-[185px] flex-shrink-0"}`}
      >
        {/* Image container */}
        <div className="aspect-[2/3] w-full rounded-xl overflow-hidden bg-[#111] border border-transparent group-hover:border-amber-500/50 group-hover:shadow-[0_8px_24px_rgba(245,158,11,0.2)] transition-all duration-300">
          <img
            src={getPosterUrl(movie.posterPath)}
            alt={movie.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
        </div>

        {/* Info below poster */}
        <div className="pt-2 px-0.5 pb-1">
          <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-amber-400 transition-colors leading-snug">
            {movie.title}
          </h3>
          <div className="flex items-center justify-between mt-0.5 text-xs text-gray-400">
            <span>{movie.releaseYear || "—"}</span>
            {showRating && displayRating !== null && (
              <div className="flex items-center gap-0.5">
                <Star size={11} className="text-amber-500 fill-amber-500 shrink-0" />
                <span className="text-amber-400 font-semibold tabular-nums">{displayRating.toFixed(1)}</span>
                {isImdb && <span className="text-gray-600 text-[9px] ml-0.5">IMDb</span>}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
