import { Router, type IRouter } from "express";
import { eq, and, inArray } from "drizzle-orm";
import { db, reviewsTable, watchlistMoviesTable } from "@workspace/db";
import { requireAuth, getClerkUserId } from "../lib/auth";
import {
  searchMovies,
  getPopularMovies,
  getTopRatedMovies,
  getTrendingMovies,
  getMoviesByGenre,
  getMoviesByLanguage,
  getGenreList,
  getMovieDetail,
  getMovieRecommendations,
  getMoviesByIds,
  getRandomMoviePick,
} from "../lib/tmdb";

const router: IRouter = Router();

router.get("/movies/search", async (req, res): Promise<void> => {
  const q = String(req.query.q ?? "");
  const page = parseInt(String(req.query.page ?? "1"), 10);
  if (!q) {
    res.status(400).json({ error: "q is required" });
    return;
  }
  const data = await searchMovies(q, page);
  res.json(data);
});

router.get("/movies/popular", async (req, res): Promise<void> => {
  const page = parseInt(String(req.query.page ?? "1"), 10);
  const data = await getPopularMovies(page);
  res.json(data);
});

router.get("/movies/trending", async (req, res): Promise<void> => {
  const data = await getTrendingMovies();
  res.json(data);
});

router.get("/movies/top-rated", async (req, res): Promise<void> => {
  const page = parseInt(String(req.query.page ?? "1"), 10);
  const data = await getTopRatedMovies(page);
  res.json(data);
});

router.get("/movies/language/:lang", async (req, res): Promise<void> => {
  const lang = String(req.params.lang);
  const page = parseInt(String(req.query.page ?? "1"), 10);
  const data = await getMoviesByLanguage(lang, page);
  res.json(data);
});

router.get("/movies/genres", async (req, res): Promise<void> => {
  const data = await getGenreList();
  res.json(data);
});

router.get("/movies/genre/:genreId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.genreId) ? req.params.genreId[0] : req.params.genreId;
  const genreId = parseInt(raw, 10);
  const page = parseInt(String(req.query.page ?? "1"), 10);
  const sortBy = String(req.query.sortBy ?? "popularity.desc");
  const data = await getMoviesByGenre(genreId, page, sortBy);
  res.json(data);
});

router.get("/movies/:tmdbId/recommendations", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.tmdbId) ? req.params.tmdbId[0] : req.params.tmdbId;
  const tmdbId = parseInt(raw, 10);
  const data = await getMovieRecommendations(tmdbId);
  res.json(data);
});

router.get("/movies/:tmdbId/user-status", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.tmdbId) ? req.params.tmdbId[0] : req.params.tmdbId;
  const tmdbId = parseInt(raw, 10);
  const clerkId = getClerkUserId(req);

  const [watchlistEntries, review] = await Promise.all([
    db
      .select()
      .from(watchlistMoviesTable)
      .where(
        and(
          eq(watchlistMoviesTable.userId, clerkId),
          eq(watchlistMoviesTable.tmdbId, tmdbId),
        ),
      ),
    db
      .select()
      .from(reviewsTable)
      .where(and(eq(reviewsTable.userId, clerkId), eq(reviewsTable.tmdbId, tmdbId)))
      .then((r) => r[0] ?? null),
  ]);

  res.json({
    watchlistIds: watchlistEntries.map((e) => e.watchlistId),
    hasReview: !!review,
    rating: review ? parseFloat(review.rating) : null,
  });
});

router.get("/movies/:tmdbId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.tmdbId) ? req.params.tmdbId[0] : req.params.tmdbId;
  const tmdbId = parseInt(raw, 10);
  const data = await getMovieDetail(tmdbId);
  res.json(data);
});

router.get("/random-pick", requireAuth, async (req, res): Promise<void> => {
  const clerkId = getClerkUserId(req);
  const watchlistId = req.query.watchlistId ? parseInt(String(req.query.watchlistId), 10) : null;
  const genreId = req.query.genreId ? parseInt(String(req.query.genreId), 10) : null;

  if (watchlistId) {
    const movies = await db
      .select()
      .from(watchlistMoviesTable)
      .where(and(eq(watchlistMoviesTable.watchlistId, watchlistId), eq(watchlistMoviesTable.userId, clerkId)));

    if (movies.length === 0) {
      res.status(404).json({ error: "No movies in watchlist" });
      return;
    }
    const pick = movies[Math.floor(Math.random() * movies.length)];
    res.json({
      tmdbId: pick.tmdbId,
      title: pick.title,
      posterPath: pick.posterPath ?? null,
      backdropPath: null,
      releaseYear: pick.releaseYear ?? null,
      voteAverage: parseFloat(pick.voteAverage),
      popularity: 0,
      genreIds: [],
      overview: "",
    });
    return;
  }

  if (genreId) {
    const data = await getMoviesByGenre(genreId, Math.ceil(Math.random() * 5));
    const movies = data.results;
    if (movies.length === 0) {
      res.status(404).json({ error: "No movies found" });
      return;
    }
    const pick = movies[Math.floor(Math.random() * movies.length)];
    res.json(pick);
    return;
  }

  // Truly random pick from popular/top-rated with random page
  const movie = await getRandomMoviePick();
  res.json(movie);
});

export default router;
