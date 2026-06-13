import app from "./app";
import { logger } from "./lib/logger";
import { getRecentPopularMovies, enrichMoviesWithImdb } from "./lib/tmdb";

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

  // Pre-seed IMDb ratings for popular films into the persistent DB cache.
  // Runs once in the background after startup — slow concurrency (2) to
  // conserve the OMDb daily budget. Ratings already in DB are skipped.
  setTimeout(async () => {
    try {
      logger.info("Pre-seeding IMDb ratings for popular films…");
      const popular = await getRecentPopularMovies();
      await enrichMoviesWithImdb(popular.results, 2);
      logger.info({ count: popular.results.length }, "IMDb pre-seed complete");
    } catch (err) {
      logger.warn({ err }, "IMDb pre-seed failed (non-fatal)");
    }
  }, 3000); // 3 s delay so the server is fully warm first
});
