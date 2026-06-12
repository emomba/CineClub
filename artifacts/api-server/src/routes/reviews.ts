import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, reviewsTable, usersTable } from "@workspace/db";
import { requireAuth, getClerkUserId } from "../lib/auth";
import { buildUserProfile } from "./users";

const router: IRouter = Router();

router.post("/reviews", requireAuth, async (req, res): Promise<void> => {
  const clerkId = getClerkUserId(req);
  const { tmdbId, movieTitle, moviePosterPath, rating, content, isSpoiler } = req.body;

  if (!tmdbId || rating == null || content == null) {
    res.status(400).json({ error: "tmdbId, rating, and content are required" });
    return;
  }

  // Upsert: delete existing review for this movie by this user
  await db
    .delete(reviewsTable)
    .where(and(eq(reviewsTable.userId, clerkId), eq(reviewsTable.tmdbId, tmdbId)));

  const [created] = await db
    .insert(reviewsTable)
    .values({
      userId: clerkId,
      tmdbId,
      movieTitle: movieTitle ?? null,
      moviePosterPath: moviePosterPath ?? null,
      rating: String(rating),
      content,
      isSpoiler: isSpoiler ? 1 : 0,
    })
    .returning();

  res.json({
    id: created.id,
    userId: created.userId,
    tmdbId: created.tmdbId,
    movieTitle: created.movieTitle ?? null,
    moviePosterPath: created.moviePosterPath ?? null,
    rating: parseFloat(created.rating),
    content: created.content,
    isSpoiler: created.isSpoiler === 1,
    createdAt: created.createdAt.toISOString(),
  });
});

router.get("/reviews/movie/:tmdbId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.tmdbId) ? req.params.tmdbId[0] : req.params.tmdbId;
  const tmdbId = parseInt(raw, 10);

  const reviews = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.tmdbId, tmdbId));

  const withUsers = await Promise.all(
    reviews.map(async (r) => {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, r.userId));
      return {
        id: r.id,
        userId: r.userId,
        tmdbId: r.tmdbId,
        rating: parseFloat(r.rating),
        content: r.content,
        isSpoiler: r.isSpoiler === 1,
        createdAt: r.createdAt.toISOString(),
        user: user ? await buildUserProfile(user) : null,
      };
    }),
  );

  res.json(withUsers);
});

router.get("/reviews/user/:userId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const reviews = await db.select().from(reviewsTable).where(eq(reviewsTable.userId, raw));

  res.json(
    reviews.map((r) => ({
      id: r.id,
      userId: r.userId,
      tmdbId: r.tmdbId,
      movieTitle: r.movieTitle ?? null,
      moviePosterPath: r.moviePosterPath ?? null,
      rating: parseFloat(r.rating),
      content: r.content,
      isSpoiler: r.isSpoiler === 1,
      createdAt: r.createdAt.toISOString(),
    })),
  );
});

router.delete("/reviews/:id", requireAuth, async (req, res): Promise<void> => {
  const clerkId = getClerkUserId(req);
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db
    .delete(reviewsTable)
    .where(and(eq(reviewsTable.id, id), eq(reviewsTable.userId, clerkId)));
  res.sendStatus(204);
});

export default router;
