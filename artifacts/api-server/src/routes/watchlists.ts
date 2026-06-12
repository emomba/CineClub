import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, watchlistsTable, watchlistMoviesTable } from "@workspace/db";
import { requireAuth, getClerkUserId } from "../lib/auth";

const router: IRouter = Router();

router.get("/watchlists", requireAuth, async (req, res): Promise<void> => {
  const clerkId = getClerkUserId(req);
  const lists = await db
    .select()
    .from(watchlistsTable)
    .where(eq(watchlistsTable.userId, clerkId));

  const withCounts = await Promise.all(
    lists.map(async (w) => {
      const [row] = await db
        .select({ count: sql<number>`count(*)` })
        .from(watchlistMoviesTable)
        .where(eq(watchlistMoviesTable.watchlistId, w.id));
      return {
        id: w.id,
        userId: w.userId,
        name: w.name,
        isDefault: w.isDefault === 1,
        movieCount: Number(row?.count ?? 0),
        createdAt: w.createdAt.toISOString(),
      };
    }),
  );
  res.json(withCounts);
});

router.post("/watchlists", requireAuth, async (req, res): Promise<void> => {
  const clerkId = getClerkUserId(req);
  const { name } = req.body;
  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const [created] = await db
    .insert(watchlistsTable)
    .values({ userId: clerkId, name, isDefault: 0 })
    .returning();
  res.status(201).json({
    id: created.id,
    userId: created.userId,
    name: created.name,
    isDefault: created.isDefault === 1,
    movieCount: 0,
    createdAt: created.createdAt.toISOString(),
  });
});

router.patch("/watchlists/:id", requireAuth, async (req, res): Promise<void> => {
  const clerkId = getClerkUserId(req);
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { name } = req.body;
  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const [updated] = await db
    .update(watchlistsTable)
    .set({ name })
    .where(and(eq(watchlistsTable.id, id), eq(watchlistsTable.userId, clerkId)))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Watchlist not found" });
    return;
  }
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(watchlistMoviesTable)
    .where(eq(watchlistMoviesTable.watchlistId, updated.id));
  res.json({
    id: updated.id,
    userId: updated.userId,
    name: updated.name,
    isDefault: updated.isDefault === 1,
    movieCount: Number(row?.count ?? 0),
    createdAt: updated.createdAt.toISOString(),
  });
});

router.delete("/watchlists/:id", requireAuth, async (req, res): Promise<void> => {
  const clerkId = getClerkUserId(req);
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db
    .delete(watchlistsTable)
    .where(and(eq(watchlistsTable.id, id), eq(watchlistsTable.userId, clerkId)));
  res.sendStatus(204);
});

router.get("/watchlists/:id/movies", requireAuth, async (req, res): Promise<void> => {
  const clerkId = getClerkUserId(req);
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const sortBy = String(req.query.sortBy ?? "addedAt");

  const movies = await db
    .select()
    .from(watchlistMoviesTable)
    .where(and(eq(watchlistMoviesTable.watchlistId, id), eq(watchlistMoviesTable.userId, clerkId)));

  const mapped = movies.map((m) => ({
    id: m.id,
    watchlistId: m.watchlistId,
    tmdbId: m.tmdbId,
    title: m.title,
    posterPath: m.posterPath ?? null,
    releaseYear: m.releaseYear ?? null,
    voteAverage: parseFloat(m.voteAverage),
    addedAt: m.addedAt.toISOString(),
  }));

  if (sortBy === "voteAverage") {
    mapped.sort((a, b) => b.voteAverage - a.voteAverage);
  } else if (sortBy === "releaseYear") {
    mapped.sort((a, b) => (b.releaseYear ?? 0) - (a.releaseYear ?? 0));
  } else {
    mapped.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
  }

  res.json(mapped);
});

router.post("/watchlists/:id/movies", requireAuth, async (req, res): Promise<void> => {
  const clerkId = getClerkUserId(req);
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { tmdbId, title, posterPath, releaseYear, voteAverage } = req.body;

  if (!tmdbId || !title) {
    res.status(400).json({ error: "tmdbId and title are required" });
    return;
  }

  // Upsert: remove old entry from this watchlist if exists, then insert
  await db
    .delete(watchlistMoviesTable)
    .where(
      and(
        eq(watchlistMoviesTable.watchlistId, id),
        eq(watchlistMoviesTable.userId, clerkId),
        eq(watchlistMoviesTable.tmdbId, tmdbId),
      ),
    );

  const [created] = await db
    .insert(watchlistMoviesTable)
    .values({
      watchlistId: id,
      userId: clerkId,
      tmdbId,
      title,
      posterPath: posterPath ?? null,
      releaseYear: releaseYear ?? null,
      voteAverage: String(voteAverage ?? 0),
    })
    .returning();

  res.status(201).json({
    id: created.id,
    watchlistId: created.watchlistId,
    tmdbId: created.tmdbId,
    title: created.title,
    posterPath: created.posterPath ?? null,
    releaseYear: created.releaseYear ?? null,
    voteAverage: parseFloat(created.voteAverage),
    addedAt: created.addedAt.toISOString(),
  });
});

router.delete("/watchlists/:id/movies/:tmdbId", requireAuth, async (req, res): Promise<void> => {
  const clerkId = getClerkUserId(req);
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const rawTmdb = Array.isArray(req.params.tmdbId) ? req.params.tmdbId[0] : req.params.tmdbId;
  const id = parseInt(rawId, 10);
  const tmdbId = parseInt(rawTmdb, 10);

  await db
    .delete(watchlistMoviesTable)
    .where(
      and(
        eq(watchlistMoviesTable.watchlistId, id),
        eq(watchlistMoviesTable.userId, clerkId),
        eq(watchlistMoviesTable.tmdbId, tmdbId),
      ),
    );
  res.sendStatus(204);
});

export default router;
