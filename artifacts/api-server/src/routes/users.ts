import { Router, type IRouter } from "express";
import { eq, sql, and } from "drizzle-orm";
import { db, usersTable, watchlistsTable, watchlistMoviesTable, reviewsTable, friendshipsTable } from "@workspace/db";
import { requireAuth, getClerkUserId } from "../lib/auth";

const router: IRouter = Router();

async function buildUserProfile(user: typeof usersTable.$inferSelect) {
  const [watchedCount, reviewCount, friendCount] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(watchlistMoviesTable)
      .where(eq(watchlistMoviesTable.userId, user.clerkId))
      .then((r) => Number(r[0]?.count ?? 0)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(reviewsTable)
      .where(eq(reviewsTable.userId, user.clerkId))
      .then((r) => Number(r[0]?.count ?? 0)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(friendshipsTable)
      .where(
        sql`(${friendshipsTable.requesterId} = ${user.clerkId} OR ${friendshipsTable.receiverId} = ${user.clerkId}) AND ${friendshipsTable.status} = 'accepted'`,
      )
      .then((r) => Number(r[0]?.count ?? 0)),
  ]);
  return {
    id: user.id,
    clerkId: user.clerkId,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl ?? null,
    bio: user.bio ?? null,
    createdAt: user.createdAt.toISOString(),
    watchedCount,
    reviewCount,
    friendCount,
  };
}

router.get("/users/me", requireAuth, async (req, res): Promise<void> => {
  const clerkId = getClerkUserId(req);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const profile = await buildUserProfile(user);
  res.json(profile);
});

router.patch("/users/me", requireAuth, async (req, res): Promise<void> => {
  const clerkId = getClerkUserId(req);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const { displayName, username, avatarUrl, bio } = req.body;

  if (username && username !== user.username) {
    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username));
    if (existing) {
      res.status(409).json({ error: "Username already taken" });
      return;
    }
  }

  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (displayName) updates.displayName = displayName;
  if (username) updates.username = username;
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
  if (bio !== undefined) updates.bio = bio;

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.clerkId, clerkId))
    .returning();

  res.json(await buildUserProfile(updated));
});

router.get("/users/:username", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.username) ? req.params.username[0] : req.params.username;
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, raw));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(await buildUserProfile(user));
});

router.get("/users/:username/watched", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.username) ? req.params.username[0] : req.params.username;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, raw));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const [watchedList] = await db
    .select()
    .from(watchlistsTable)
    .where(and(eq(watchlistsTable.userId, user.clerkId), eq(watchlistsTable.isDefault, 1)))
    .limit(1);

  if (!watchedList) { res.json([]); return; }

  const movies = await db
    .select()
    .from(watchlistMoviesTable)
    .where(eq(watchlistMoviesTable.watchlistId, watchedList.id));

  res.json(movies.map(m => ({
    tmdbId: m.tmdbId,
    title: m.title,
    posterPath: m.posterPath ?? null,
    releaseYear: m.releaseYear ?? null,
    voteAverage: parseFloat(m.voteAverage ?? "0"),
    addedAt: m.addedAt.toISOString(),
  })));
});

router.get("/users/:username/overlap", requireAuth, async (req, res): Promise<void> => {
  const myClerkId = getClerkUserId(req);
  const raw = Array.isArray(req.params.username) ? req.params.username[0] : req.params.username;
  const [targetUser] = await db.select().from(usersTable).where(eq(usersTable.username, raw));
  if (!targetUser) { res.status(404).json({ error: "User not found" }); return; }

  const [myWatchedList] = await db
    .select().from(watchlistsTable)
    .where(and(eq(watchlistsTable.userId, myClerkId), eq(watchlistsTable.isDefault, 1)))
    .limit(1);

  const [theirWatchedList] = await db
    .select().from(watchlistsTable)
    .where(and(eq(watchlistsTable.userId, targetUser.clerkId), eq(watchlistsTable.isDefault, 1)))
    .limit(1);

  if (!myWatchedList || !theirWatchedList) { res.json({ commonWatched: [] }); return; }

  const [myMovies, theirMovies] = await Promise.all([
    db.select().from(watchlistMoviesTable).where(eq(watchlistMoviesTable.watchlistId, myWatchedList.id)),
    db.select().from(watchlistMoviesTable).where(eq(watchlistMoviesTable.watchlistId, theirWatchedList.id)),
  ]);

  const myTmdbIds = new Set(myMovies.map(m => m.tmdbId));
  const commonWatched = theirMovies
    .filter(m => myTmdbIds.has(m.tmdbId))
    .map(m => ({
      tmdbId: m.tmdbId,
      title: m.title,
      posterPath: m.posterPath ?? null,
      releaseYear: m.releaseYear ?? null,
      voteAverage: parseFloat(m.voteAverage ?? "0"),
    }));

  res.json({ commonWatched });
});

export { buildUserProfile };
export default router;
