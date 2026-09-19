import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import {
  db,
  usersTable,
  investmentsTable,
  transactionsTable,
  depositsTable,
} from "@workspace/db";
import { CreateInvestmentBody } from "@workspace/api-zod";
import { requireUser, generateId } from "../lib/auth";
import {
  LEVELS,
  levelForAmount,
  TEAM_PROFIT_RATES,
  TEAM_ACTIVE_DEPOSIT_MIN,
} from "../lib/levels";
import { autoActivateInvestment } from "../lib/invest";

const router: IRouter = Router();

// UTC+3 (توقيت السعودية) — التجديد دائماً عند منتصف الليل المحلي
const SAUDI_OFFSET_MS = 3 * 60 * 60 * 1000;

function nextMidnight(lastCollected: Date): Date {
  const localMs = lastCollected.getTime() + SAUDI_OFFSET_MS;
  const nextDayStartLocal = (Math.floor(localMs / 86_400_000) + 1) * 86_400_000;
  return new Date(nextDayStartLocal - SAUDI_OFFSET_MS);
}

async function countActiveDirectMembers(userId: string): Promise<number> {
  const members = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.referredBy, userId));

  if (!members.length) return 0;

  const memberIds = members.map((m) => m.id);

  const qualified = await db
    .selectDistinct({ userId: depositsTable.userId })
    .from(depositsTable)
    .where(
      and(
        inArray(depositsTable.userId, memberIds),
        eq(depositsTable.status, "approved"),
        sql`CAST(${depositsTable.amount} AS NUMERIC) >= ${TEAM_ACTIVE_DEPOSIT_MIN}`,
      ),
    );

  return qualified.length;
}

router.get("/investments/levels", async (_req, res): Promise<void> => {
  res.json(LEVELS);
});

router.get("/investments", requireUser, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;
  const rows = await db
    .select()
    .from(investmentsTable)
    .where(eq(investmentsTable.userId, userId))
    .orderBy(desc(investmentsTable.createdAt));
  res.json(rows);
});

router.post("/investments", requireUser, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "user_not_found" });
    return;
  }

  // الاستثمار يكون بكامل الرصيد دائماً
  const amount = Number(user.balance);

  if (amount < 1) {
    res.status(400).json({ error: "insufficient_balance" });
    return;
  }

  const lvl = levelForAmount(amount);
  if (!lvl) {
    res.status(400).json({ error: "balance_below_minimum", minimum: 3 });
    return;
  }

  // ── التحقق من شرط الفريق لمستويات 2 و 3 ──
  if (lvl.teamRequired > 0) {
    const activeCount = await countActiveDirectMembers(userId);
    if (activeCount < lvl.teamRequired) {
      res.status(400).json({
        error: "team_requirement_not_met",
        required: lvl.teamRequired,
        current: activeCount,
      });
      return;
    }
  }

  await db
    .update(investmentsTable)
    .set({ active: false })
    .where(and(eq(investmentsTable.userId, userId), eq(investmentsTable.active, true)));

  const id = generateId("i_");
  const [inv] = await db
    .insert(investmentsTable)
    .values({
      id,
      userId,
      amount: String(amount),
      level: lvl.level,
      dailyMinRate: String(lvl.dailyMinRate),
      dailyMaxRate: String(lvl.dailyMaxRate),
      active: true,
    })
    .returning();

  // الرصيد لا يُخصم — الاستثمار للحساب والأرباح فقط
  await db
    .update(usersTable)
    .set({
      totalInvested: String(Number(user.totalInvested) + amount),
    })
    .where(eq(usersTable.id, userId));

  res.json(inv);
});

router.post("/investments/collect", requireUser, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;

  // إذا لم يكن هناك استثمار نشط ورصيد كافٍ — أنشئه تلقائياً
  let [inv] = await db
    .select()
    .from(investmentsTable)
    .where(and(eq(investmentsTable.userId, userId), eq(investmentsTable.active, true)))
    .orderBy(desc(investmentsTable.createdAt))
    .limit(1);

  if (!inv) {
    await autoActivateInvestment(userId);
    [inv] = await db
      .select()
      .from(investmentsTable)
      .where(and(eq(investmentsTable.userId, userId), eq(investmentsTable.active, true)))
      .orderBy(desc(investmentsTable.createdAt))
      .limit(1);
  }

  if (!inv) {
    res.status(400).json({ error: "balance_below_minimum" });
    return;
  }
  const now = new Date();
  if (inv.lastCollectedAt) {
    const next = nextMidnight(inv.lastCollectedAt);
    if (next.getTime() > now.getTime()) {
      res.status(400).json({ error: "too_early", nextCollectAt: next.toISOString() });
      return;
    }
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "user_not_found" });
    return;
  }

  // الأرباح تُحسب على الرصيد الحالي في حساب المستخدم وقت الجمع
  const currentBalance = Number(user.balance);
  const minR = Number(inv.dailyMinRate);
  const rate = minR;
  const profit = +(currentBalance * rate).toFixed(4);

  const newBalance = currentBalance + profit;
  const newTotalEarned = Number(user.totalEarned) + profit;
  const hasDoubled = user.hasDoubled || newTotalEarned >= Number(user.totalInvested);

  await db
    .update(usersTable)
    .set({
      balance: String(newBalance),
      totalEarned: String(newTotalEarned),
      hasDoubled,
    })
    .where(eq(usersTable.id, userId));

  await db
    .update(investmentsTable)
    .set({
      lastCollectedAt: now,
      totalCollected: String(Number(inv.totalCollected) + profit),
    })
    .where(eq(investmentsTable.id, inv.id));

  await db.insert(transactionsTable).values({
    id: generateId("t_"),
    userId,
    type: "profit",
    amount: String(profit),
    description: "ربح يومي",
    refId: inv.id,
  });

  // ── توزيع عمولات الفريق (3 مستويات: 10% / 5% / 2%) — مفتوح دائماً ──
  let currentUplineId: string | null = user.referredBy ?? null;
  for (let lvl = 0; lvl < TEAM_PROFIT_RATES.length; lvl++) {
    if (!currentUplineId) break;

    const [referrer] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, currentUplineId))
      .limit(1);

    if (!referrer) break;

    const commission = +(profit * TEAM_PROFIT_RATES[lvl]).toFixed(4);
    if (commission > 0) {
      await db
        .update(usersTable)
        .set({ balance: String(Number(referrer.balance) + commission) })
        .where(eq(usersTable.id, referrer.id));

      await db.insert(transactionsTable).values({
        id: generateId("t_"),
        userId: referrer.id,
        type: `ref_l${lvl + 1}`,
        amount: String(commission),
        description: `عمولة فريق المستوى ${lvl + 1}`,
        refId: userId,
      });
    }

    currentUplineId = referrer.referredBy ?? null;
  }

  res.json({ collected: String(profit), newBalance: String(newBalance) });
});

export default router;
