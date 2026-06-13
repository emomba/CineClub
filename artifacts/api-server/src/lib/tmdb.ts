import { logger } from "./logger";

const TMDB_BASE = "https://api.themoviedb.org/3";

async function tmdbFetch(path: string, params: Record<string, string | number> = {}): Promise<any> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error("TMDB_API_KEY not set");

  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", "tr-TR");
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
    results: (data.results ?? []).filter((m: any) => !m.adult).map(mapMovie),
    totalPages: data.total_pages ?? 1,
    page: data.page ?? 1,
  };
}

export async function getRecentPopularMovies() {
  // Films released in the last 6 months, sorted by popularity — min quality threshold
  const today = new Date();
  const sixMonthsAgo = new Date(today);
  sixMonthsAgo.setMonth(today.getMonth() - 6);
  const dateGte = sixMonthsAgo.toISOString().split("T")[0];
  const dateLte = today.toISOString().split("T")[0];

  const [page1, page2] = await Promise.all([
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
  ]);

  const seen = new Set<number>();
  const results: any[] = [];
  for (const item of [...(page1.results ?? []), ...(page2.results ?? [])]) {
    const m = mapMovie(item);
    if (!seen.has(m.tmdbId) && m.posterPath && !item.adult && m.voteAverage >= 6.0) {
      seen.add(m.tmdbId);
      results.push(m);
    }
  }

  return { results: results.slice(0, 20), totalPages: 1, page: 1 };
}

export async function getTopRatedMovies(page = 1) {
  const data = await tmdbFetch("/movie/top_rated", { page });
  return {
    results: (data.results ?? []).filter((m: any) => !m.adult).map(mapMovie),
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

  return {
    results: combined.slice(0, 20),
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
    results: (data.results ?? []).filter((m: any) => !m.adult).map(mapMovie),
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
    results: (data.results ?? []).filter((m: any) => !m.adult).map(mapMovie),
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
    results: (data.results ?? []).filter((m: any) => !m.adult).map(mapMovie),
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

  // Trailer: prefer TR, fall back to any YouTube trailer
  let trailer = (videos.results ?? []).find(
    (v: any) => v.type === "Trailer" && v.site === "YouTube",
  );
  if (!trailer) {
    // Retry without language restriction for English trailer
    try {
      const enVideos = await fetch(
        `https://api.themoviedb.org/3/movie/${tmdbId}/videos?api_key=${process.env.TMDB_API_KEY}&language=en-US`
      ).then(r => r.json());
      trailer = (enVideos.results ?? []).find(
        (v: any) => v.type === "Trailer" && v.site === "YouTube",
      );
    } catch {}
  }

  // Overview: fall back to English if TR is empty
  let overview = detail.overview ?? "";
  if (!overview.trim()) {
    try {
      const enDetail = await fetch(
        `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${process.env.TMDB_API_KEY}&language=en-US`
      ).then(r => r.json());
      overview = enDetail.overview ?? "";
    } catch {}
  }

  return {
    tmdbId: detail.id,
    title: detail.title,
    overview,
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
