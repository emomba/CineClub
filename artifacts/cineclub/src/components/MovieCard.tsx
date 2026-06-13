import { motion } from "framer-motion";
import { Link } from "wouter";
import { Star } from "lucide-react";
import { getPosterUrl } from "@/lib/tmdb";
import { MovieSummary } from "@workspace/api-client-react";

export function MovieCard({ movie, showRating = true }: { movie: MovieSummary, showRating?: boolean }) {
  return (
    <Link href={`/movie/${movie.tmdbId}`}>
      <motion.div 
        whileHover={{ scale: 1.05, y: -5 }}
        className="group relative z-0 hover:z-10 rounded-xl overflow-hidden cursor-pointer bg-[#111] border border-transparent hover:border-amber-500/50 hover:shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-all duration-300 w-[160px] md:w-[200px] flex-shrink-0"
      >
        <div className="aspect-[2/3] w-full relative">
          <img 
            src={getPosterUrl(movie.posterPath)} 
            alt={movie.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
        
        <div className="p-3">
          <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-amber-400 transition-colors">{movie.title}</h3>
          <div className="flex items-center justify-between mt-1 text-xs text-gray-400">
            <span>{movie.releaseYear || "TBD"}</span>
            {showRating && (
              <div className="flex items-center gap-1">
                <Star size={12} className="text-amber-500 fill-amber-500" />
                <span className="text-amber-500 font-medium">{movie.voteAverage?.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
