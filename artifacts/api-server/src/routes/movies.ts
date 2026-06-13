import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, reviewsTable, watchlistMoviesTable } from "@workspace/db";
import { requireAuth, getClerkUserId } from "../lib/auth";
import {
  searchMovies,
  getPopularMovies,
  getRecentPopularMovies,
  getTopRatedMovies,
  getClassicMovies,
  getTrendingMovies,
  getMoviesByGenre,
  getMoviesByLanguage,
  getGenreList,
  getMovieDetail,
  getMovieRecommendations,
  getActorDetail,
  getActorMovies,
  getMoviesByIds,
  getRandomMoviePick,
  enrichMoviesWithImdb,
  sortByImdbRating,
} from "../lib/tmdb";

const router: IRouter = Router();

router.get("/movies/search", async (req, res): Promise<void> => {
  const q = String(req.query.q ?? "");
  const page = parseInt(String(req.query.page ?? "1"), 10);
  if (!q) { res.status(400).json({ error: "q is required" }); return; }
  const data = await searchMovies(q, page);
  const enriched = await enrichMoviesWithImdb(data.results);
  const results = sortByImdbRating(enriched);
  res.json({ ...data, results });
});

router.get("/movies/popular", async (req, res): Promise<void> => {
  const page = parseInt(String(req.query.page ?? "1"), 10);
  const data = await getPopularMovies(page);
  const enriched = await enrichMoviesWithImdb(data.results);
  const results = sortByImdbRating(enriched);
  res.json({ ...data, results });
});

router.get("/movies/recent-popular", async (req, res): Promise<void> => {
  const data = await getRecentPopularMovies();
  const enriched = await enrichMoviesWithImdb(data.results);
  const results = sortByImdbRating(enriched);
  res.json({ ...data, results });
});

router.get("/movies/trending", async (req, res): Promise<void> => {
  const data = await getTrendingMovies();
  const enriched = await enrichMoviesWithImdb(data.results);
  const results = sortByImdbRating(enriched);
  res.json({ ...data, results });
});

router.get("/movies/top-rated", async (req, res): Promise<void> => {
  const page = parseInt(String(req.query.page ?? "1"), 10);
  const data = await getTopRatedMovies(page);
  const enriched = await enrichMoviesWithImdb(data.results);
  const results = sortByImdbRating(enriched);
  res.json({ ...data, results });
});

router.get("/movies/classics", async (req, res): Promise<void> => {
  const page = parseInt(String(req.query.page ?? "1"), 10);
  const data = await getClassicMovies(page);
  const enriched = await enrichMoviesWithImdb(data.results);
  const results = sortByImdbRating(enriched);
  res.json({ ...data, results });
});

router.get("/movies/language/:lang", async (req, res): Promise<void> => {
  const lang = String(req.params.lang);
  const page = parseInt(String(req.query.page ?? "1"), 10);
  const data = await getMoviesByLanguage(lang, page);
  const enriched = await enrichMoviesWithImdb(data.results);
  const results = sortByImdbRating(enriched);
  res.json({ ...data, results });
});

router.get("/movies/genres", async (req, res): Promise<void> => {
  const data = await getGenreList();
  res.json(data);
});

router.get("/movies/genre/:genreId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.genreId) ? req.params.genreId[0] : req.params.genreId;
  const genreId = parseInt(raw, 10);
  const page = parseInt(String(req.query.page ?? "1"), 10);
  const rawSort = String(req.query.sortBy ?? "imdb.desc");
  const runtimeFilter = String(req.query.runtimeFilter ?? "all") as "all" | "movie" | "short";

  if (rawSort === "imdb.desc") {
    // Fetch 3 pages of highly-voted movies for a quality pool, enrich all, sort by IMDb
    // vote_count.gte=500 ensures OMDb has data for all results (avoids null imdbRating)
    // allSettled so a single TMDB 504 on one page doesn't fail the whole request
    const settled = await Promise.allSettled(
      [1, 2, 3].map(p => getMoviesByGenre(genreId, p, "vote_average.desc", runtimeFilter, 500))
    );
    const pages = settled.flatMap(r => r.status === "fulfilled" ? [r.value] : []);
    if (pages.length === 0) { res.status(502).json({ error: "TMDB unavailable" }); return; }
    const seen = new Set<number>();
    const merged = pages.flatMap(d => d.results).filter(m => {
      if (seen.has(m.tmdbId)) return false;
      seen.add(m.tmdbId);
      return true;
    });
    const enriched = await enrichMoviesWithImdb(merged, 10);
    const results = sortByImdbRating(enriched);
    const realTotalPages = pages[0]?.totalPages ?? 1;
    res.json({ results, totalPages: 1, page: 1, _poolTotalPages: realTotalPages });
  } else {
    const data = await getMoviesByGenre(genreId, page, rawSort, runtimeFilter);
    const enriched = await enrichMoviesWithImdb(data.results);
    res.json({ ...data, results: enriched });
  }
});

router.get("/actors/:personId", async (req, res): Promise<void> => {
  const personId = Number(req.params.personId);
  const data = await getActorDetail(personId);
  res.json(data);
});

router.get("/actors/:personId/movies", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.personId) ? req.params.personId[0] : req.params.personId;
  const personId = parseInt(raw, 10);
  if (isNaN(personId)) { res.status(400).json({ error: "Invalid personId" }); return; }
  const data = await getActorMovies(personId);
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
    db.select().from(watchlistMoviesTable).where(
      and(eq(watchlistMoviesTable.userId, clerkId), eq(watchlistMoviesTable.tmdbId, tmdbId))
    ),
    db.select().from(reviewsTable).where(
      and(eq(reviewsTable.userId, clerkId), eq(reviewsTable.tmdbId, tmdbId))
    ).then((r) => r[0] ?? null),
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
  const lang = String(req.query.lang ?? "tr");
  const data = await getMovieDetail(tmdbId, lang);
  res.json(data);
});

router.get("/random-pick", requireAuth, async (req, res): Promise<void> => {
  const clerkId = getClerkUserId(req);
  const watchlistId = req.query.watchlistId ? parseInt(String(req.query.watchlistId), 10) : null;
  const genreId = req.query.genreId ? parseInt(String(req.query.genreId), 10) : null;

  if (watchlistId) {
    const movies = await db.select().from(watchlistMoviesTable).where(
      and(eq(watchlistMoviesTable.watchlistId, watchlistId), eq(watchlistMoviesTable.userId, clerkId))
    );
    if (movies.length === 0) { res.status(404).json({ error: "No movies in watchlist" }); return; }
    const pick = movies[Math.floor(Math.random() * movies.length)];
    res.json({
      tmdbId: pick.tmdbId, title: pick.title, posterPath: pick.posterPath ?? null,
      backdropPath: null, releaseYear: pick.releaseYear ?? null,
      voteAverage: parseFloat(pick.voteAverage), popularity: 0, genreIds: [], overview: "",
    });
    return;
  }

  if (genreId) {
    const data = await getMoviesByGenre(genreId, Math.ceil(Math.random() * 5));
    const movies = data.results;
    if (movies.length === 0) { res.status(404).json({ error: "No movies found" }); return; }
    res.json(movies[Math.floor(Math.random() * movies.length)]);
    return;
  }

  const movie = await getRandomMoviePick();
  res.json(movie);
});

export default router;
