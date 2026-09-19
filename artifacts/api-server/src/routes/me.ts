import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  db,
  usersTable,
  investmentsTable,
  transactionsTable,
} from "@workspace/db";
import {
  UpdateSettingsBody,
  ChangePasswordBody,
  SetWelcomeReasonBody,
} from "@workspace/api-zod";
import { requireUser, hashPassword, verifyPassword } from "../lib/auth";

const router: IRouter = Router();

// UTC+3 (توقيت السعودية) — التجديد عند منتصف الليل المحلي
const SAUDI_OFFSET_MS = 3 * 60 * 60 * 1000;

function nextMidnight(lastCollected: Date): Date {
  const localMs = lastCollected.getTime() + SAUDI_OFFSET_MS;
  const nextDayStartLocal = (Math.floor(localMs / 86_400_000) + 1) * 86_400_000;
  return new Date(nextDayStartLocal - SAUDI_OFFSET_MS);
}

function publicUser(u: typeof usersTable.$inferSelect): Record<string, unknown> {
  const { passwordHash, ...rest } = u;
  void passwordHash;
  return rest;
}

router.get("/me/dashboard", requireUser, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  const [activeInv] = await db
    .select()
    .from(investmentsTable)
    .where(and(eq(investmentsTable.userId, userId), eq(investmentsTable.active, true)))
    .orderBy(desc(investmentsTable.createdAt))
    .limit(1);

  let canCollect = false;
  let nextCollectAt: string | null = null;
  if (activeInv) {
    if (!activeInv.lastCollectedAt) {
      canCollect = true;
    } else {
      const next = nextMidnight(activeInv.lastCollectedAt);
      canCollect = next.getTime() <= Date.now();
      nextCollectAt = next.toISOString();
    }
  }

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const [todayRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(${transactionsTable.amount}), 0)` })
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.userId, userId),
        eq(transactionsTable.type, "profit"),
        sql`${transactionsTable.createdAt} >= ${todayStart.toISOString()}`,
      ),
    );

  const [refCount] = await db
    .select({ c: sql<number>`COUNT(*)::int` })
    .from(usersTable)
    .where(eq(usersTable.referredBy, userId));

  res.json({
    user: publicUser(user),
    activeInvestment: activeInv ?? null,
    canCollect,
    nextCollectAt,
    todayEarnings: String(todayRow?.total ?? "0"),
    totalReferrals: refCount?.c ?? 0,
  });
});

router.patch("/me/settings", requireUser, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updates: Record<string, string> = {};
  if (parsed.data.name) updates.name = parsed.data.name;
  if (parsed.data.language) updates.language = parsed.data.language;
  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, userId))
    .returning();
  res.json(publicUser(updated));
});

router.patch("/me/password", requireUser, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;
  const parsed = ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (parsed.data.newPassword.length < 6) {
    res.status(400).json({ error: "password_too_short" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const ok = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "wrong_password" });
    return;
  }
  const newHash = await hashPassword(parsed.data.newPassword);
  await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, userId));
  res.json({ ok: true });
});

router.post("/me/welcome", requireUser, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;
  const parsed = SetWelcomeReasonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db
    .update(usersTable)
    .set({ welcomeReason: parsed.data.reason, welcomeShownAt: new Date() })
    .where(eq(usersTable.id, userId))
    .returning();
  res.json(publicUser(updated));
});

/* ── رمز سحب مكوّن من 6 أرقام ── */
router.get("/me/withdraw-pin", requireUser, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  res.json({ hasPin: !!user?.withdrawPinHash });
});

router.post("/me/withdraw-pin", requireUser, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;
  const { pin } = req.body as { pin?: string };
  if (!pin || !/^\d{6}$/.test(pin)) {
    res.status(400).json({ error: "pin_must_be_6_digits" });
    return;
  }
  const pinHash = await hashPassword(pin);
  await db.update(usersTable).set({ withdrawPinHash: pinHash }).where(eq(usersTable.id, userId));
  res.json({ ok: true });
});

router.get("/me/transactions", requireUser, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;
  const rows = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, userId))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(100);
  res.json(rows);
});

router.get("/me/profit-history", requireUser, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;

  const rows = await db
    .select({
      day: sql<string>`DATE(${transactionsTable.createdAt})`,
      total: sql<string>`SUM(CAST(${transactionsTable.amount} AS NUMERIC))`,
    })
    .from(transactionsTable)
    .where(and(eq(transactionsTable.userId, userId), eq(transactionsTable.type, "profit")))
    .groupBy(sql`DATE(${transactionsTable.createdAt})`)
    .orderBy(sql`DATE(${transactionsTable.createdAt}) ASC`)
    .limit(30);

  let cumulative = 0;
  const result = rows.map((r) => {
    cumulative += Number(r.total);
    return { day: r.day, profit: Number(r.total), cumulative: +cumulative.toFixed(4) };
  });

  res.json(result);
});

export default router;
