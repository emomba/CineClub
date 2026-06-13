---
name: OMDb rate limiting
description: OMDb free plan limits, circuit breaker design, and graceful degradation when IMDb data is unavailable.
---

OMDb free plan allows 1000 requests/day. Heavy testing can exhaust this quickly (genre imdb.desc = 60 calls, search = 20 calls per request).

**Circuit breaker** (`fetchImdbRating` in `artifacts/api-server/src/lib/tmdb.ts`):
- When OMDb returns `Response: "False"` + `Error` containing "request limit", sets `omdbRateLimitUntil = Date.now() + 60min`
- All subsequent calls skip OMDb and return null immediately until the timer expires
- Logs a `logger.warn` so operators can see when it trips

**`imdbCache` sharing** (`getMovieDetail`):
- Movie detail page now checks and writes to `imdbCache` (same Map used by `enrichMoviesWithImdb`)
- Avoids re-hitting OMDb on every detail page open for an already-enriched film

**`sortByImdbRating` degradation**:
- When all films in a batch have `imdbRating == null` (OMDb unavailable), the function returns movies in their original TMDB order rather than sorting by voteAverage
- **Why:** TMDB voteAverage can be 10.0 for obscure films with a single vote, causing them to appear at the top — worse than no sort

**How to apply:**
- Any change to OMDb integration must preserve the circuit breaker logic
- Never call `fetchImdbRating` directly from routes — always go through `enrichMoviesWithImdb` or `getMovieDetail`'s cache block
