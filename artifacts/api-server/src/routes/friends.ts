import { Router, type IRouter } from "express";
import { eq, and, or, sql } from "drizzle-orm";
import { db, friendshipsTable, usersTable, reviewsTable } from "@workspace/db";
import { requireAuth, getClerkUserId } from "../lib/auth";
import { buildUserProfile, getOrCreateUser } from "./users";
import { notificationsTable } from "@workspace/db";

const router: IRouter = Router();

async function getFriendshipWithUser(friendship: typeof friendshipsTable.$inferSelect, myClerkId: string) {
  const otherUserId = friendship.requesterId === myClerkId ? friendship.receiverId : friendship.requesterId;
  const [otherUser] = await db.select().from(usersTable).where(eq(usersTable.clerkId, otherUserId));
  return {
    id: friendship.id,
    requesterId: friendship.requesterId,
    receiverId: friendship.receiverId,
    status: friendship.status,
    createdAt: friendship.createdAt.toISOString(),
    otherUser: otherUser ? await buildUserProfile(otherUser) : null,
  };
}

router.get("/friends", requireAuth, async (req, res): Promise<void> => {
  const clerkId = getClerkUserId(req);
  const friendships = await db
    .select()
    .from(friendshipsTable)
    .where(
      and(
        or(eq(friendshipsTable.requesterId, clerkId), eq(friendshipsTable.receiverId, clerkId)),
        eq(friendshipsTable.status, "accepted"),
      ),
    );

  const result = await Promise.all(friendships.map((f) => getFriendshipWithUser(f, clerkId)));
  res.json(result);
});

router.get("/friends/requests", requireAuth, async (req, res): Promise<void> => {
  const clerkId = getClerkUserId(req);
  const requests = await db
    .select()
    .from(friendshipsTable)
    .where(and(eq(friendshipsTable.receiverId, clerkId), eq(friendshipsTable.status, "pending")));

  const result = await Promise.all(requests.map((f) => getFriendshipWithUser(f, clerkId)));
  res.json(result);
});

router.post("/friends/request", requireAuth, async (req, res): Promise<void> => {
  const clerkId = getClerkUserId(req);
  const { targetUsername } = req.body;
  if (!targetUsername) {
    res.status(400).json({ error: "targetUsername is required" });
    return;
  }

  const [targetUser] = await db.select().from(usersTable).where(eq(usersTable.username, targetUsername));
  if (!targetUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (targetUser.clerkId === clerkId) {
    res.status(400).json({ error: "Cannot add yourself" });
    return;
  }

  // Check existing
  const [existing] = await db
    .select()
    .from(friendshipsTable)
    .where(
      or(
        and(eq(friendshipsTable.requesterId, clerkId), eq(friendshipsTable.receiverId, targetUser.clerkId)),
        and(eq(friendshipsTable.requesterId, targetUser.clerkId), eq(friendshipsTable.receiverId, clerkId)),
      ),
    );
  if (existing) {
    res.status(409).json({ error: "Friendship already exists" });
    return;
  }

  const [created] = await db
    .insert(friendshipsTable)
    .values({ requesterId: clerkId, receiverId: targetUser.clerkId, status: "pending" })
    .returning();

  // Create notification for receiver
  const senderUser = await getOrCreateUser(clerkId);
  await db.insert(notificationsTable).values({
    userId: targetUser.clerkId,
    type: "friend_request",
    data: JSON.stringify({ friendshipId: created.id, fromUsername: senderUser.username, fromDisplayName: senderUser.displayName }),
  });

  const result = await getFriendshipWithUser(created, clerkId);
  res.status(201).json(result);
});

router.patch("/friends/:id/accept", requireAuth, async (req, res): Promise<void> => {
  const clerkId = getClerkUserId(req);
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [updated] = await db
    .update(friendshipsTable)
    .set({ status: "accepted" })
    .where(and(eq(friendshipsTable.id, id), eq(friendshipsTable.receiverId, clerkId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  const result = await getFriendshipWithUser(updated, clerkId);
  res.json(result);
});

router.patch("/friends/:id/reject", requireAuth, async (req, res): Promise<void> => {
  const clerkId = getClerkUserId(req);
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [updated] = await db
    .update(friendshipsTable)
    .set({ status: "rejected" })
    .where(and(eq(friendshipsTable.id, id), eq(friendshipsTable.receiverId, clerkId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  res.json(await getFriendshipWithUser(updated, clerkId));
});

router.delete("/friends/:id", requireAuth, async (req, res): Promise<void> => {
  const clerkId = getClerkUserId(req);
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  await db
    .delete(friendshipsTable)
    .where(
      and(
        eq(friendshipsTable.id, id),
        or(eq(friendshipsTable.requesterId, clerkId), eq(friendshipsTable.receiverId, clerkId)),
      ),
    );
  res.sendStatus(204);
});

router.get("/friends/movie/:tmdbId", requireAuth, async (req, res): Promise<void> => {
  const clerkId = getClerkUserId(req);
  const raw = Array.isArray(req.params.tmdbId) ? req.params.tmdbId[0] : req.params.tmdbId;
  const tmdbId = parseInt(raw, 10);

  const acceptedFriendships = await db
    .select()
    .from(friendshipsTable)
    .where(
      and(
        or(eq(friendshipsTable.requesterId, clerkId), eq(friendshipsTable.receiverId, clerkId)),
        eq(friendshipsTable.status, "accepted"),
      ),
    );

  const friendIds = acceptedFriendships.map((f) =>
    f.requesterId === clerkId ? f.receiverId : f.requesterId,
  );

  if (friendIds.length === 0) {
    res.json([]);
    return;
  }

  const reviews = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.tmdbId, tmdbId));

  const friendReviews = reviews.filter((r) => friendIds.includes(r.userId));

  const result = await Promise.all(
    friendReviews.map(async (r) => {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, r.userId));
      return {
        user: user ? await buildUserProfile(user) : null,
        rating: parseFloat(r.rating),
        review: r.content,
        isSpoiler: r.isSpoiler === 1,
      };
    }),
  );

  res.json(result);
});

export default router;
