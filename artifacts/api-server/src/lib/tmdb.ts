import { logger } from "./logger";

const TMDB_BASE = "https://api.themoviedb.org/3";

async function tmdbFetch(path: string, params: Record<string, string | number> = {}): Promise<any> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error("TMDB_API_KEY not set");

  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", "tr-TR");
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
    results: (data.results ?? []).map(mapMovie),
    totalPages: data.total_pages ?? 1,
    page: data.page ?? 1,
  };
}

export async function getTopRatedMovies(page = 1) {
  const data = await tmdbFetch("/movie/top_rated", { page });
  return {
    results: (data.results ?? []).map(mapMovie),
    totalPages: data.total_pages ?? 1,
    page: data.page ?? 1,
  };
}

export async function getTrendingMovies() {
  const data = await tmdbFetch("/trending/movie/week");
  return {
    results: (data.results ?? []).map(mapMovie),
    totalPages: data.total_pages ?? 1,
    page: data.page ?? 1,
  };
}

export async function getMoviesByGenre(genreId: number, page = 1, sortBy = "popularity.desc") {
  const data = await tmdbFetch("/discover/movie", {
    with_genres: genreId,
    page,
    sort_by: sortBy,
  });
  return {
    results: (data.results ?? []).map(mapMovie),
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
    results: (data.results ?? []).map(mapMovie),
    totalPages: data.total_pages ?? 1,
    page: data.page ?? 1,
  };
}

export async function getGenreList() {
  const data = await tmdbFetch("/genre/movie/list");
  return { genres: data.genres ?? [] };
}

export async function getMovieDetail(tmdbId: number) {
  const [detail, credits, videos] = await Promise.all([
    tmdbFetch(`/movie/${tmdbId}`),
    tmdbFetch(`/movie/${tmdbId}/credits`),
    tmdbFetch(`/movie/${tmdbId}/videos`),
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

  const trailer = (videos.results ?? []).find(
    (v: any) => v.type === "Trailer" && v.site === "YouTube",
  );

  return {
    tmdbId: detail.id,
    title: detail.title,
    overview: detail.overview ?? "",
    posterPath: detail.poster_path || null,
    backdropPath: detail.backdrop_path || null,
    releaseYear: isNaN(releaseYear as number) ? null : releaseYear,
    voteAverage: detail.vote_average ?? 0,
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

export async function getMoviesByIds(tmdbIds: number[]) {
  const results = await Promise.all(
    tmdbIds.slice(0, 20).map((id) =>
      tmdbFetch(`/movie/${id}`).then(mapMovie).catch(() => null),
    ),
  );
  return results.filter(Boolean);
}

export async function getRandomMoviePick(): Promise<ReturnType<typeof mapMovie>> {
  // Pick a random page between 1-15 and a random movie from that page
  const randomPage = Math.floor(Math.random() * 15) + 1;
  // Alternate between popular and top-rated for variety
  const useTopRated = Math.random() > 0.5;
  const data = useTopRated
    ? await tmdbFetch("/movie/top_rated", { page: randomPage })
    : await tmdbFetch("/movie/popular", { page: randomPage });

  const movies = (data.results ?? []).map(mapMovie).filter((m: any) => m.posterPath);
  if (movies.length === 0) {
    // Fallback to page 1 popular
    const fallback = await tmdbFetch("/movie/popular", { page: 1 });
    const fallbackMovies = (fallback.results ?? []).map(mapMovie);
    return fallbackMovies[Math.floor(Math.random() * fallbackMovies.length)];
  }
  return movies[Math.floor(Math.random() * movies.length)];
}
