import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable, watchlistsTable } from "@workspace/db";
import { createToken, requireAuth, getClerkUserId, verifyToken } from "../lib/auth";
import crypto from "crypto";

const router: IRouter = Router();

function generateUserId(): string {
  return "user_" + crypto.randomBytes(16).toString("hex");
}

function validateUsername(username: string): string | null {
  if (!username || username.length < 3) return "Kullanıcı adı en az 3 karakter olmalı";
  if (username.length > 20) return "Kullanıcı adı en fazla 20 karakter olabilir";
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return "Kullanıcı adı sadece harf, rakam ve _ içerebilir";
  return null;
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const { username, password, displayName } = req.body as {
    username?: string;
    password?: string;
    displayName?: string;
  };

  if (!username || !password) {
    res.status(400).json({ error: "Kullanıcı adı ve şifre zorunlu" });
    return;
  }

  const usernameError = validateUsername(username);
  if (usernameError) {
    res.status(400).json({ error: usernameError });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: "Şifre en az 8 karakter olmalı" });
    return;
  }

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username));

  const passwordHash = await bcrypt.hash(password, 12);

  let userId: string;

  if (existing) {
    if (existing.passwordHash) {
      res.status(409).json({ error: "Bu kullanıcı adı zaten alınmış" });
      return;
    }
    // Claim orphaned account (previously Clerk user)
    await db
      .update(usersTable)
      .set({ passwordHash })
      .where(eq(usersTable.username, username));
    userId = existing.clerkId;
  } else {
    userId = generateUserId();
    await db.insert(usersTable).values({
      clerkId: userId,
      username,
      displayName: displayName || username,
      passwordHash,
    });
    // Create default watchlists
    await db.insert(watchlistsTable).values([
      { userId, name: "İzledim", isDefault: 1 },
      { userId, name: "İzleyeceğim", isDefault: 1 },
    ]);
  }

  const token = createToken(userId);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
  res.json({
    token,
    user: {
      id: user.clerkId,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl ?? null,
      bio: user.bio ?? null,
    },
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    res.status(400).json({ error: "Kullanıcı adı ve şifre zorunlu" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username));

  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "Kullanıcı adı veya şifre hatalı" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Kullanıcı adı veya şifre hatalı" });
    return;
  }

  const token = createToken(user.clerkId);
  res.json({
    token,
    user: {
      id: user.clerkId,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl ?? null,
      bio: user.bio ?? null,
    },
  });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const userId = getClerkUserId(req);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    id: user.clerkId,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl ?? null,
    bio: user.bio ?? null,
  });
});

router.patch("/auth/password", requireAuth, async (req, res): Promise<void> => {
  const userId = getClerkUserId(req);
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Mevcut ve yeni şifre zorunlu" });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: "Yeni şifre en az 8 karakter olmalı" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
  if (!user || !user.passwordHash) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Mevcut şifre hatalı" });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.clerkId, userId));
  res.json({ ok: true });
});

export default router;
