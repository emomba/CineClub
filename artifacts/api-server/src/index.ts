import app from "./app";
import { logger } from "./lib/logger";
import { getRecentPopularMovies, getTrendingMovies, getTopRatedMovies, getClassicMovies, enrichMoviesWithImdb, catchupImdbRatings } from "./lib/tmdb";

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

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Pre-seed IMDb ratings for all home-page sections into the persistent DB cache.
  // Runs once in the background after startup — concurrency 2 to conserve the
  // OMDb daily budget. Films already cached in DB are skipped automatically.
  setTimeout(async () => {
    try {
      logger.info("IMDb pre-seed: fetching all home-page sections…");

      // Fetch all sections in parallel (TMDB calls — free, no OMDb budget used)
      const [popular, trending, topRated, classics1, classics2, classics3] = await Promise.all([
        getRecentPopularMovies().catch(() => ({ results: [] })),
        getTrendingMovies().catch(() => ({ results: [] })),
        getTopRatedMovies(1).catch(() => ({ results: [] })),
        getClassicMovies(1).catch(() => ({ results: [] })),
        getClassicMovies(2).catch(() => ({ results: [] })),
        getClassicMovies(3).catch(() => ({ results: [] })),
      ]);

      // De-duplicate across sections
      const seen = new Set<number>();
      const allMovies: Array<{ tmdbId: number }> = [];
      for (const m of [
        ...popular.results,
        ...trending.results,
        ...topRated.results,
        ...classics1.results,
        ...classics2.results,
        ...classics3.results,
      ]) {
        if (!seen.has(m.tmdbId)) {
          seen.add(m.tmdbId);
          allMovies.push(m);
        }
      }

      logger.info({ total: allMovies.length }, "IMDb pre-seed: enriching with OMDb…");
      // concurrency=2 → gentle on OMDb budget; DB-cached films skip OMDb entirely
      await enrichMoviesWithImdb(allMovies, 2);
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
