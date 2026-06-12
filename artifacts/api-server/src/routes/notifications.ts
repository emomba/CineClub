import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";
import { requireAuth, getClerkUserId } from "../lib/auth";

const router: IRouter = Router();

function mapNotification(n: typeof notificationsTable.$inferSelect) {
  let data: object;
  try {
    data = JSON.parse(n.data);
  } catch {
    data = {};
  }
  return {
    id: n.id,
    userId: n.userId,
    type: n.type,
    data,
    read: n.read === 1,
    createdAt: n.createdAt.toISOString(),
  };
}

router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const clerkId = getClerkUserId(req);
  const notifications = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, clerkId));

  res.json(notifications.map(mapNotification).reverse());
});

router.patch("/notifications/read-all", requireAuth, async (req, res): Promise<void> => {
  const clerkId = getClerkUserId(req);
  await db
    .update(notificationsTable)
    .set({ read: 1 })
    .where(eq(notificationsTable.userId, clerkId));
  res.json({ success: true });
});

router.patch("/notifications/:id/read", requireAuth, async (req, res): Promise<void> => {
  const clerkId = getClerkUserId(req);
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [updated] = await db
    .update(notificationsTable)
    .set({ read: 1 })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, clerkId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json(mapNotification(updated));
});

export default router;
