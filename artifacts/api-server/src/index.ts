import app from "./app";
import { logger } from "./lib/logger";
import {
  getRecentPopularMovies,
  getPopularMovies,
  getTrendingMovies,
  getTopRatedMovies,
  getClassicMovies,
  getMoviesByGenre,
  enrichMoviesWithImdb,
  catchupImdbRatings,
} from "./lib/tmdb";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Top TMDB genre IDs to pre-seed
const TOP_GENRES = [28, 18, 35, 53, 878, 10749, 27]; // Action, Drama, Comedy, Thriller, Sci-Fi, Romance, Horror

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Pre-seed IMDb ratings for all browsable sections into the persistent DB cache.
  // Runs once in the background after startup — concurrency 3 to fill DB quickly.
  // DB-cached films are skipped automatically (no wasted OMDb budget).
  setTimeout(async () => {
    try {
      logger.info("IMDb pre-seed: fetching all browsable sections…");

      // Fetch everything in parallel — these are TMDB calls (free, unlimited)
      const [
        recentPopular,
        trending,
        popular1, popular2, popular3,
        topRated1, topRated2, topRated3, topRated4, topRated5,
        classics1, classics2, classics3, classics4, classics5,
        ...genrePages
      ] = await Promise.all([
        getRecentPopularMovies().catch(() => ({ results: [] })),
        getTrendingMovies().catch(() => ({ results: [] })),
        // Popular (general) — 3 pages
        getPopularMovies(1).catch(() => ({ results: [] })),
        getPopularMovies(2).catch(() => ({ results: [] })),
        getPopularMovies(3).catch(() => ({ results: [] })),
        // Top-rated — 5 pages
        getTopRatedMovies(1).catch(() => ({ results: [] })),
        getTopRatedMovies(2).catch(() => ({ results: [] })),
        getTopRatedMovies(3).catch(() => ({ results: [] })),
        getTopRatedMovies(4).catch(() => ({ results: [] })),
        getTopRatedMovies(5).catch(() => ({ results: [] })),
        // Classics — 5 pages
        getClassicMovies(1).catch(() => ({ results: [] })),
        getClassicMovies(2).catch(() => ({ results: [] })),
        getClassicMovies(3).catch(() => ({ results: [] })),
        getClassicMovies(4).catch(() => ({ results: [] })),
        getClassicMovies(5).catch(() => ({ results: [] })),
        // Top genres × 2 pages each
        ...TOP_GENRES.flatMap((genreId) => [
          getMoviesByGenre(genreId, 1, "popularity.desc", "all", 500).catch(() => ({ results: [] })),
          getMoviesByGenre(genreId, 2, "popularity.desc", "all", 500).catch(() => ({ results: [] })),
        ]),
      ]);

      // De-duplicate across all sections
      const seen = new Set<number>();
      const allMovies: Array<{ tmdbId: number }> = [];
      const allSections = [
        recentPopular, trending,
        popular1, popular2, popular3,
        topRated1, topRated2, topRated3, topRated4, topRated5,
        classics1, classics2, classics3, classics4, classics5,
        ...genrePages,
      ];
      for (const section of allSections) {
        for (const m of section.results) {
          if (!seen.has(m.tmdbId)) {
            seen.add(m.tmdbId);
            allMovies.push(m);
          }
        }
      }

      logger.info({ total: allMovies.length }, "IMDb pre-seed: enriching with OMDb…");
      // concurrency=3 — fills quickly; DB-cached films skip OMDb entirely
      await enrichMoviesWithImdb(allMovies, 3);
      logger.info({ total: allMovies.length }, "IMDb pre-seed complete");
    } catch (err) {
      logger.warn({ err }, "IMDb pre-seed failed (non-fatal)");
    }
  }, 3000); // 3 s after startup so the server is fully warm

  // Hourly catchup: fill OMDb ratings for films that have imdbId but no rating yet.
  // This runs automatically when OMDb rate-limit resets — no server restart needed.
  setInterval(async () => {
    try {
      const filled = await catchupImdbRatings();
      if (filled > 0) logger.info({ filled }, "IMDb hourly catchup: filled ratings");
    } catch (err) {
      logger.warn({ err }, "IMDb hourly catchup failed (non-fatal)");
    }
  }, 60 * 60 * 1000); // every hour
});
