import { logger } from "./logger";
import { db, imdbCacheTable } from "@workspace/db";
import { eq, isNull, isNotNull, and } from "drizzle-orm";

const TMDB_BASE = "https://api.themoviedb.org/3";

// Explicit blocklist — low-quality or unwanted films by TMDB ID
const BLOCKED_IDS = new Set<number>([
  11012,   // Ölesiye
  817581,  // Ölesiye Sevmek
]);

// Title keyword patterns to exclude (case-insensitive, Turkish low-quality content)
const BLOCKED_TITLE_PATTERNS = [
  /^ölesiye/i,
];

function isBlocked(m: { id?: number; tmdbId?: number; title?: string }): boolean {
  const id = m.id ?? m.tmdbId ?? 0;
  if (BLOCKED_IDS.has(id)) return true;
  const title = m.title ?? "";
  return BLOCKED_TITLE_PATTERNS.some(p => p.test(title));
}

// Map app lang codes → TMDB language strings
const TMDB_LANG: Record<string, string> = {
  tr: "tr-TR",
  en: "en-US",
  de: "de-DE",
  es: "es-ES",
  fr: "fr-FR",
};

async function tmdbFetch(
  path: string,
  params: Record<string, string | number> = {},
  lang = "tr-TR",
): Promise<any> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error("TMDB_API_KEY not set");

  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", lang);
  url.searchParams.set("include_adult", "false");
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    logger.warn({ status: res.status, path }, "TMDB fetch failed");
    throw new Error(`TMDB error ${res.status}`);
  }
  return res.json();
}

function mapMovie(m: any) {
  const releaseYear = m.release_date
    ? parseInt(m.release_date.split("-")[0], 10)
    : null;
  return {
    tmdbId: m.id,
    title: m.title,
    posterPath: m.poster_path || null,
    backdropPath: m.backdrop_path || null,
    releaseYear: isNaN(releaseYear as number) ? null : releaseYear,
    voteAverage: m.vote_average ?? 0,
    popularity: m.popularity ?? 0,
    genreIds: m.genre_ids ?? [],
    overview: m.overview ?? "",
  };
}

export async function searchMovies(q: string, page = 1) {
  const data = await tmdbFetch("/search/movie", { query: q, page });
  return {
    results: (data.results ?? []).map(mapMovie),
    totalPages: data.total_pages ?? 1,
    page: data.page ?? 1,
  };
}

export async function getPopularMovies(page = 1) {
  const data = await tmdbFetch("/movie/popular", { page });
  return {
    results: (data.results ?? []).filter((m: any) => !m.adult && !isBlocked(m)).map(mapMovie),
    totalPages: data.total_pages ?? 1,
    page: data.page ?? 1,
  };
}

// TMDB ID pinned at position #1 in the "Şu An Popüler" list
const PINNED_POPULAR_ID = 1339713; // Saplantı (2026)

export async function getRecentPopularMovies() {
  // Films released in the last 6 months, sorted by popularity — min quality threshold
  const today = new Date();
  const sixMonthsAgo = new Date(today);
  sixMonthsAgo.setMonth(today.getMonth() - 6);
  const dateGte = sixMonthsAgo.toISOString().split("T")[0];
  const dateLte = today.toISOString().split("T")[0];

  const [page1, page2, pinnedRaw] = await Promise.all([
    tmdbFetch("/discover/movie", {
      sort_by: "popularity.desc",
      "primary_release_date.gte": dateGte,
      "primary_release_date.lte": dateLte,
      "vote_count.gte": 200,
      "vote_average.gte": 6.0,
      page: 1,
    }),
    tmdbFetch("/discover/movie", {
      sort_by: "popularity.desc",
      "primary_release_date.gte": dateGte,
      "primary_release_date.lte": dateLte,
      "vote_count.gte": 200,
      "vote_average.gte": 6.0,
      page: 2,
    }),
    tmdbFetch(`/movie/${PINNED_POPULAR_ID}`, {}, "tr-TR").catch(() => null),
  ]);

  const seen = new Set<number>();
  const results: any[] = [];

  // Prepend pinned film at position #1
  if (pinnedRaw && pinnedRaw.id && !pinnedRaw.adult) {
    const pinned = mapMovie({ ...pinnedRaw, genre_ids: (pinnedRaw.genres ?? []).map((g: any) => g.id) });
    if (pinned.posterPath) {
      seen.add(pinned.tmdbId);
      results.push(pinned);
    }
  }

  for (const item of [...(page1.results ?? []), ...(page2.results ?? [])]) {
    const m = mapMovie(item);
    if (!seen.has(m.tmdbId) && m.posterPath && !item.adult && !isBlocked(item) && m.voteAverage >= 6.0) {
      seen.add(m.tmdbId);
      results.push(m);
    }
  }

  // Return up to 60 candidates so the route can filter to IMDb-rated films first
  return { results: results.slice(0, 60), totalPages: 1, page: 1 };
}

export async function getTopRatedMovies(page = 1) {
  const data = await tmdbFetch("/movie/top_rated", { page });
  return {
    results: (data.results ?? []).filter((m: any) => !m.adult && !isBlocked(m)).map(mapMovie),
    totalPages: data.total_pages ?? 1,
    page: data.page ?? 1,
  };
}

export async function getTrendingMovies() {
  // Fetch trending + popular in parallel — quality-filtered global mix
  const [trendingData, popularData, intlData] = await Promise.all([
    tmdbFetch("/trending/movie/week"),
    tmdbFetch("/movie/popular", { page: 2 }),
    tmdbFetch("/discover/movie", {
      sort_by: "popularity.desc",
      "vote_count.gte": 500,
      "vote_average.gte": 6.5,
      page: 1,
    }),
  ]);

  const seen = new Set<number>();
  const combined: any[] = [];
  for (const item of [
    ...(trendingData.results ?? []),
    ...(popularData.results ?? []),
    ...(intlData.results ?? []),
  ]) {
    const mapped = mapMovie(item);
    if (
      !seen.has(mapped.tmdbId) &&
      mapped.posterPath &&
      item.adult !== true &&
      !isBlocked(item) &&
      mapped.voteAverage >= 6.5
    ) {
      seen.add(mapped.tmdbId);
      combined.push(mapped);
    }
  }

  // Shuffle to mix sources
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  // Return up to 60 candidates so the route can filter to IMDb-rated films first
  return {
    results: combined.slice(0, 60),
    totalPages: 1,
    page: 1,
  };
}

export async function getClassicMovies(page = 1) {
  const data = await tmdbFetch("/discover/movie", {
    sort_by: "vote_count.desc",
    "vote_average.gte": 7.5,
    "vote_count.gte": 5000,
    "primary_release_date.lte": "2005-12-31",
    page,
  });
  return {
    results: (data.results ?? []).filter((m: any) => !m.adult && !isBlocked(m)).map(mapMovie),
    totalPages: data.total_pages ?? 1,
    page: data.page ?? 1,
  };
}

export async function getMoviesByGenre(
  genreId: number,
  page = 1,
  sortBy = "popularity.desc",
  runtimeFilter: "all" | "movie" | "short" = "all",
  voteCountGte?: number,
) {
  const params: Record<string, string | number> = {
    with_genres: genreId,
    page,
    sort_by: sortBy,
  };
  if (runtimeFilter === "movie") params["with_runtime.gte"] = 60;
  if (runtimeFilter === "short") { params["with_runtime.gte"] = 1; params["with_runtime.lte"] = 59; }
  if (voteCountGte != null) params["vote_count.gte"] = voteCountGte;

  const data = await tmdbFetch("/discover/movie", params);
  return {
    results: (data.results ?? []).filter((m: any) => !m.adult && !isBlocked(m)).map(mapMovie),
    totalPages: data.total_pages ?? 1,
    page: data.page ?? 1,
  };
}

export async function getMoviesByLanguage(language: string, page = 1) {
  const data = await tmdbFetch("/discover/movie", {
    with_original_language: language,
    sort_by: "popularity.desc",
    "vote_count.gte": 100,
    page,
  });
  return {
    results: (data.results ?? []).filter((m: any) => !m.adult && !isBlocked(m)).map(mapMovie),
    totalPages: data.total_pages ?? 1,
    page: data.page ?? 1,
  };
}

export async function getGenreList() {
  const data = await tmdbFetch("/genre/movie/list");
  return { genres: data.genres ?? [] };
}

// Circuit breaker: when OMDb reports "Request limit reached!", pause all OMDb calls
// until this timestamp (ms). Resets to 0 when limit expires.
let omdbRateLimitUntil = 0;

async function fetchImdbRating(imdbId: string | null): Promise<number | null> {
  if (!imdbId) return null;
  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey) return null;
  if (Date.now() < omdbRateLimitUntil) return null; // circuit open
  try {
    const res = await fetch(`https://www.omdbapi.com/?i=${imdbId}&apikey=${apiKey}`);
    if (!res.ok) return null;
    const data = await res.json() as Record<string, string>;
    if (data.Response === "False") {
      if (data.Error && data.Error.toLowerCase().includes("request limit")) {
        // Open circuit for 60 minutes so we stop hammering a rate-limited key
        omdbRateLimitUntil = Date.now() + 60 * 60 * 1000;
        logger.warn({ imdbId }, "OMDb daily request limit reached – pausing OMDb calls for 60 min");
      }
      return null;
    }
    if (!data.imdbRating || data.imdbRating === "N/A") return null;
    return parseFloat(data.imdbRating);
  } catch {
    return null;
  }
}

// In-memory cache: tmdbId → { imdbId, imdbRating }
// Only entries WITH a real imdbRating are stored — null-rating entries are not
// cached in memory so they retry OMDb on the next request once the circuit opens.
const imdbCache = new Map<number, { imdbId: string | null; imdbRating: number | null }>();

async function fetchImdbForMovie(tmdbId: number): Promise<{ imdbId: string | null; imdbRating: number | null }> {
  // 1. In-memory cache — only populated for confirmed ratings
  const mem = imdbCache.get(tmdbId);
  if (mem) return mem;

  // 2. Persistent DB cache
  try {
    const rows = await db.select().from(imdbCacheTable).where(eq(imdbCacheTable.tmdbId, tmdbId)).limit(1);
    if (rows.length > 0) {
      const row = rows[0];
      // Has imdbId but no rating yet — try OMDb now if circuit is closed
      if (row.imdbId && !row.imdbRating && Date.now() >= omdbRateLimitUntil) {
        const freshRating = await fetchImdbRating(row.imdbId);
        if (freshRating !== null) {
          db.update(imdbCacheTable)
            .set({ imdbRating: freshRating.toString(), fetchedAt: new Date() })
            .where(eq(imdbCacheTable.tmdbId, tmdbId))
            .catch(() => {});
          const result = { imdbId: row.imdbId, imdbRating: freshRating };
          imdbCache.set(tmdbId, result);
          return result;
        }
      }
      const result = { imdbId: row.imdbId ?? null, imdbRating: row.imdbRating ? parseFloat(row.imdbRating) : null };
      if (result.imdbRating !== null) imdbCache.set(tmdbId, result);
      return result;
    }
  } catch { /* DB unavailable — fall through */ }

  // 3. Live fetch: TMDB external_ids (FREE — no OMDb budget) → OMDb
  try {
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) return { imdbId: null, imdbRating: null };
    const url = new URL(`${TMDB_BASE}/movie/${tmdbId}/external_ids`);
    url.searchParams.set("api_key", apiKey);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`TMDB external_ids ${res.status}`);
    const extIds = await res.json() as Record<string, unknown>;
    const imdbId: string | null = (extIds.imdb_id as string) ?? null;

    // Attempt OMDb rating (may be null if rate-limited)
    const imdbRating = await fetchImdbRating(imdbId);
    const result = { imdbId, imdbRating };

    // Always save imdbId to DB — even when OMDb is rate-limited.
    // TMDB external_ids is free and this link never expires.
    if (imdbId) {
      if (imdbRating !== null) {
        // Full entry: both imdbId and rating
        db.insert(imdbCacheTable).values({ tmdbId, imdbId, imdbRating: imdbRating.toString() })
          .onConflictDoUpdate({ target: imdbCacheTable.tmdbId, set: { imdbId, imdbRating: imdbRating.toString(), fetchedAt: new Date() } })
          .catch(() => {});
      } else {
        // Partial entry: save imdbId now, rating will be filled by hourly catchup
        db.insert(imdbCacheTable).values({ tmdbId, imdbId, imdbRating: null })
          .onConflictDoUpdate({ target: imdbCacheTable.tmdbId, set: { imdbId } }) // preserve existing rating
          .catch(() => {});
      }
    }

    // Only cache in memory when we have a real rating
    if (imdbRating !== null) imdbCache.set(tmdbId, result);
    return result;
  } catch {
    return { imdbId: null, imdbRating: null };
  }
}

/**
 * Hourly catchup: find all DB entries that have an imdbId but no rating yet,
 * and fill them in from OMDb. Runs automatically once per hour after startup.
 * Returns the number of ratings that were successfully filled.
 */
export async function catchupImdbRatings(): Promise<number> {
  if (Date.now() < omdbRateLimitUntil) return 0; // Circuit still open — skip

  let filled = 0;
  try {
    // Fetch up to 80 pending entries (conservative to stay within daily budget)
    const pending = await db
      .select()
      .from(imdbCacheTable)
      .where(and(isNotNull(imdbCacheTable.imdbId), isNull(imdbCacheTable.imdbRating)))
      .limit(80);

    for (const entry of pending) {
      if (Date.now() < omdbRateLimitUntil) break; // Circuit opened mid-loop
      if (!entry.imdbId) continue;
      const rating = await fetchImdbRating(entry.imdbId);
      if (rating !== null) {
        await db.update(imdbCacheTable)
          .set({ imdbRating: rating.toString(), fetchedAt: new Date() })
          .where(eq(imdbCacheTable.tmdbId, entry.tmdbId))
          .catch(() => {});
        imdbCache.delete(entry.tmdbId); // Invalidate stale in-memory entry
        filled++;
      }
    }
  } catch { /* non-fatal */ }

  return filled;
}

export async function enrichMoviesWithImdb<T extends { tmdbId: number }>(
  movies: T[],
  concurrency = 5,
): Promise<(T & { imdbRating: number | null })[]> {
  const enriched: (T & { imdbRating: number | null })[] = [];
  for (let i = 0; i < movies.length; i += concurrency) {
    const batch = movies.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map(async (movie) => {
        const { imdbRating } = await fetchImdbForMovie(movie.tmdbId);
        return { ...movie, imdbRating };
      }),
    );
    enriched.push(...results);
  }
  return enriched;
}

export function sortByImdbRating<T extends { imdbRating?: number | null; voteAverage?: number }>(
  movies: T[],
): T[] {
  // If no film has an IMDb rating (e.g. OMDb rate-limited), preserve the
  // original TMDB order so that unreliable voteAverage doesn't surface
  // niche films with a perfect-but-one-vote score at the top.
  const hasAnyImdb = movies.some((m) => m.imdbRating != null);
  if (!hasAnyImdb) return movies;
  return [...movies].sort((a, b) => {
    const ratingA = a.imdbRating ?? (a.voteAverage ?? 0) / 10;
    const ratingB = b.imdbRating ?? (b.voteAverage ?? 0) / 10;
    return ratingB - ratingA;
  });
}

export async function getMovieDetail(tmdbId: number, langCode = "tr") {
  const tmdbLang = TMDB_LANG[langCode] ?? "tr-TR";
  const fallbackLang = tmdbLang === "en-US" ? null : "en-US";

  const [detail, credits, videos] = await Promise.all([
    tmdbFetch(`/movie/${tmdbId}`, {}, tmdbLang),
    tmdbFetch(`/movie/${tmdbId}/credits`, {}, tmdbLang),
    tmdbFetch(`/movie/${tmdbId}/videos`, {}, tmdbLang),
  ]);

  const releaseYear = detail.release_date
    ? parseInt(detail.release_date.split("-")[0], 10)
    : null;

  const cast = (credits.cast ?? []).slice(0, 12).map((c: any) => ({
    id: c.id,
    name: c.name,
    character: c.character,
    profilePath: c.profile_path || null,
  }));

  // Trailer: prefer requested lang, fall back to EN
  let trailer = (videos.results ?? []).find(
    (v: any) => v.type === "Trailer" && v.site === "YouTube",
  );
  if (!trailer && fallbackLang) {
    try {
      const enVideos = await tmdbFetch(`/movie/${tmdbId}/videos`, {}, "en-US");
      trailer = (enVideos.results ?? []).find(
        (v: any) => v.type === "Trailer" && v.site === "YouTube",
      );
    } catch {}
  }

  // Overview: fall back to English if requested lang has no overview
  let overview = detail.overview ?? "";
  if (!overview.trim() && fallbackLang) {
    try {
      const enDetail = await tmdbFetch(`/movie/${tmdbId}`, {}, "en-US");
      overview = enDetail.overview ?? "";
    } catch {}
  }

  const imdbIdFromTmdb: string | null = detail.imdb_id ?? null;

  // Use shared imdbCache so repeated detail views don't re-hit OMDb
  const { imdbId, imdbRating } = await (async () => {
    const tmdbIdNum: number = detail.id;
    if (imdbCache.has(tmdbIdNum)) return imdbCache.get(tmdbIdNum)!;
    const rating = await fetchImdbRating(imdbIdFromTmdb);
    const entry = { imdbId: imdbIdFromTmdb, imdbRating: rating };
    imdbCache.set(tmdbIdNum, entry);
    return entry;
  })();

  return {
    tmdbId: detail.id,
    title: detail.title,
    overview,
    posterPath: detail.poster_path || null,
    backdropPath: detail.backdrop_path || null,
    releaseYear: isNaN(releaseYear as number) ? null : releaseYear,
    voteAverage: detail.vote_average ?? 0,
    imdbRating,
    imdbId,
    popularity: detail.popularity ?? 0,
    runtime: detail.runtime || null,
    genres: detail.genres ?? [],
    cast,
    trailerKey: trailer ? trailer.key : null,
    dominantColor: null as string | null,
  };
}

export async function getMovieRecommendations(tmdbId: number) {
  const data = await tmdbFetch(`/movie/${tmdbId}/recommendations`);
  return {
    results: (data.results ?? []).map(mapMovie),
    totalPages: data.total_pages ?? 1,
    page: data.page ?? 1,
  };
}

export async function getActorDetail(personId: number) {
  const [person, credits] = await Promise.all([
    tmdbFetch(`/person/${personId}`),
    tmdbFetch(`/person/${personId}/movie_credits`),
  ]);

  const today = new Date();
  const birthDate = person.birthday ? new Date(person.birthday) : null;
  const age = birthDate
    ? today.getFullYear() - birthDate.getFullYear() -
      (today < new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate()) ? 1 : 0)
    : null;

  const movies = (credits.cast ?? [])
    .filter((m: any) => m.poster_path && m.vote_count > 5)
    .sort((a: any, b: any) => (b.popularity ?? 0) - (a.popularity ?? 0))
    .slice(0, 40)
    .map(mapMovie);

  return {
    id: person.id,
    name: person.name,
    profilePath: person.profile_path ?? null,
    biography: person.biography ?? null,
    birthday: person.birthday ?? null,
    deathday: person.deathday ?? null,
    placeOfBirth: person.place_of_birth ?? null,
    age,
    knownForDepartment: person.known_for_department ?? null,
    movies,
  };
}

export async function getActorMovies(personId: number) {
  const data = await tmdbFetch(`/person/${personId}/movie_credits`);
  const results = (data.cast ?? [])
    .filter((m: any) => m.poster_path && (m.vote_count ?? 0) > 20)
    .sort((a: any, b: any) => (b.popularity ?? 0) - (a.popularity ?? 0))
    .slice(0, 20)
    .map(mapMovie);
  return { results };
}

export async function getMoviesByIds(tmdbIds: number[]) {
  const results = await Promise.all(
    tmdbIds.slice(0, 20).map((id) =>
      tmdbFetch(`/movie/${id}`).then(mapMovie).catch(() => null),
    ),
  );
  return results.filter(Boolean);
}

export async function getRandomMoviePick(): Promise<ReturnType<typeof mapMovie>> {
  const strategy = Math.random();
  const randomPage = Math.floor(Math.random() * 12) + 1;

  let data: any;
  try {
    if (strategy < 0.35) {
      // Obscure but high-rated gems
      data = await tmdbFetch("/discover/movie", {
        sort_by: "vote_average.desc",
        "vote_count.gte": 300,
        "vote_count.lte": 5000,
        "vote_average.gte": 7.2,
        "primary_release_date.lte": "2023-12-31",
        page: Math.floor(Math.random() * 8) + 1,
      });
    } else if (strategy < 0.65) {
      // Top rated classics and modern classics
      data = await tmdbFetch("/movie/top_rated", { page: randomPage });
    } else {
      // Popular films from different years
      data = await tmdbFetch("/discover/movie", {
        sort_by: "popularity.desc",
        "vote_count.gte": 500,
        "primary_release_date.lte": "2024-12-31",
        page: randomPage,
      });
    }
  } catch {
    data = await tmdbFetch("/movie/top_rated", { page: 1 });
  }

  const movies = (data.results ?? []).map(mapMovie).filter((m: any) => m.posterPath);
  if (movies.length === 0) {
    const fallback = await tmdbFetch("/movie/top_rated", { page: 1 });
    const fallbackMovies = (fallback.results ?? []).map(mapMovie);
    return fallbackMovies[Math.floor(Math.random() * fallbackMovies.length)];
  }
  return movies[Math.floor(Math.random() * movies.length)];
}
