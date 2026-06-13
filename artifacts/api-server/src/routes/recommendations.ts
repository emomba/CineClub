import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, recommendationsTable, usersTable, notificationsTable } from "@workspace/db";
import { requireAuth, getClerkUserId } from "../lib/auth";
import { buildUserProfile, getOrCreateUser } from "./users";

const router: IRouter = Router();

router.post("/recommendations", requireAuth, async (req, res): Promise<void> => {
  const clerkId = getClerkUserId(req);
  const { toUserId, tmdbId, movieTitle, moviePosterPath, message, rating } = req.body;

  if (!toUserId || !tmdbId) {
    res.status(400).json({ error: "toUserId and tmdbId are required" });
    return;
  }

  const [created] = await db
    .insert(recommendationsTable)
    .values({
      fromUserId: clerkId,
      toUserId,
      tmdbId,
      movieTitle: movieTitle ?? null,
      moviePosterPath: moviePosterPath ?? null,
      message: message ?? null,
      rating: rating ? String(rating) : null,
      seen: 0,
    })
    .returning();

  // Notify recipient
  const sender = await getOrCreateUser(clerkId);
  await db.insert(notificationsTable).values({
    userId: toUserId,
    type: "recommendation",
    data: JSON.stringify({
      recommendationId: created.id,
      fromUsername: sender.username,
      movieTitle: movieTitle,
      moviePosterPath: moviePosterPath ?? null,
      tmdbId,
      rating: rating ?? null,
    }),
  });

  res.status(201).json({
    id: created.id,
    fromUserId: created.fromUserId,
    toUserId: created.toUserId,
    tmdbId: created.tmdbId,
    message: created.message ?? null,
    rating: created.rating ?? null,
    seen: created.seen === 1,
    createdAt: created.createdAt.toISOString(),
  });
});

router.get("/recommendations/inbox", requireAuth, async (req, res): Promise<void> => {
  const clerkId = getClerkUserId(req);
  const recs = await db
    .select()
    .from(recommendationsTable)
    .where(eq(recommendationsTable.toUserId, clerkId));

  const result = await Promise.all(
    recs.map(async (r) => {
      const [fromUser] = await db.select().from(usersTable).where(eq(usersTable.clerkId, r.fromUserId));
      return {
        id: r.id,
        fromUserId: r.fromUserId,
        toUserId: r.toUserId,
        tmdbId: r.tmdbId,
        message: r.message ?? null,
        rating: r.rating ?? null,
        seen: r.seen === 1,
        createdAt: r.createdAt.toISOString(),
        movie: {
          tmdbId: r.tmdbId,
          title: r.movieTitle ?? "",
          posterPath: r.moviePosterPath ?? null,
          backdropPath: null,
          releaseYear: null,
          voteAverage: 0,
          popularity: 0,
          genreIds: [],
          overview: "",
        },
        fromUser: fromUser ? await buildUserProfile(fromUser) : null,
      };
    }),
  );

  res.json(result);
});

router.patch("/recommendations/:id/read", requireAuth, async (req, res): Promise<void> => {
  const clerkId = getClerkUserId(req);
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [updated] = await db
    .update(recommendationsTable)
    .set({ seen: 1 })
    .where(and(eq(recommendationsTable.id, id), eq(recommendationsTable.toUserId, clerkId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json({
    id: updated.id,
    fromUserId: updated.fromUserId,
    toUserId: updated.toUserId,
    tmdbId: updated.tmdbId,
    message: updated.message ?? null,
    seen: updated.seen === 1,
    createdAt: updated.createdAt.toISOString(),
  });
});

router.get("/recommendations/sent", requireAuth, async (req, res): Promise<void> => {
  const clerkId = getClerkUserId(req);
  const recs = await db
    .select()
    .from(recommendationsTable)
    .where(eq(recommendationsTable.fromUserId, clerkId));

  const result = await Promise.all(
    recs.map(async (r) => {
      const [toUser] = await db.select().from(usersTable).where(eq(usersTable.clerkId, r.toUserId));
      return {
        id: r.id,
        fromUserId: r.fromUserId,
        toUserId: r.toUserId,
        tmdbId: r.tmdbId,
        message: r.message ?? null,
        rating: r.rating ?? null,
        seen: r.seen === 1,
        createdAt: r.createdAt.toISOString(),
        movie: {
          tmdbId: r.tmdbId,
          title: r.movieTitle ?? "",
          posterPath: r.moviePosterPath ?? null,
        },
        toUser: toUser ? await buildUserProfile(toUser) : null,
      };
    }),
  );

  res.json(result);
});

export default router;
