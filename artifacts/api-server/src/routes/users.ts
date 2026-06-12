import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, usersTable, watchlistsTable, watchlistMoviesTable, reviewsTable, friendshipsTable } from "@workspace/db";
import { requireAuth, getClerkUserId } from "../lib/auth";

const router: IRouter = Router();

async function getOrCreateUser(clerkId: string) {
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (existing) return existing;
  // Create with default username from clerkId
  const username = `user_${clerkId.slice(-8)}`;
  const [created] = await db
    .insert(usersTable)
    .values({ clerkId, username, displayName: username })
    .returning();
  // Create default watchlists
  await db.insert(watchlistsTable).values([
    { userId: clerkId, name: "İzledim", isDefault: 1 },
    { userId: clerkId, name: "İzleyeceğim", isDefault: 1 },
  ]);
  return created;
}

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
  const user = await getOrCreateUser(clerkId);
  const profile = await buildUserProfile(user);
  res.json(profile);
});

router.patch("/users/me", requireAuth, async (req, res): Promise<void> => {
  const clerkId = getClerkUserId(req);
  const user = await getOrCreateUser(clerkId);
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

export { getOrCreateUser, buildUserProfile };
export default router;
