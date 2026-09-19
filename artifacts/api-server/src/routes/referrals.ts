import { Router, type IRouter, type Request, type Response } from "express";
import { eq, inArray, and, sql } from "drizzle-orm";
import { db, usersTable, depositsTable, transactionsTable } from "@workspace/db";
import { requireUser } from "../lib/auth";
import {
  REFERRAL_RATES,
  TEAM_ACTIVE_DEPOSIT_MIN,
} from "../lib/levels";

const router: IRouter = Router();

async function getDescendants(userId: string): Promise<{
  l1: string[];
  l2: string[];
  l3: string[];
}> {
  const l1Rows = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.referredBy, userId));
  const l1 = l1Rows.map((r) => r.id);

  const l2Rows = l1.length
    ? await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(inArray(usersTable.referredBy, l1))
    : [];
  const l2 = l2Rows.map((r) => r.id);

  const l3Rows = l2.length
    ? await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(inArray(usersTable.referredBy, l2))
    : [];
  const l3 = l3Rows.map((r) => r.id);

  return { l1, l2, l3 };
}

async function countActiveMembers(ids: string[]): Promise<number> {
  if (!ids.length) return 0;
  const qualified = await db
    .selectDistinct({ userId: depositsTable.userId })
    .from(depositsTable)
    .where(
      and(
        inArray(depositsTable.userId, ids),
        eq(depositsTable.status, "approved"),
        sql`CAST(${depositsTable.amount} AS NUMERIC) >= ${TEAM_ACTIVE_DEPOSIT_MIN}`,
      ),
    );
  return qualified.length;
}

async function tierFor(
  ids: string[],
  rate: number,
  userId: string,
  tierIdx: number,
): Promise<{
  count: number;
  commissionRate: number;
  totalEarned: string;
  members: Array<{ id: string; name: string; joinedAt: string; totalDeposited: string; qualified: boolean }>;
}> {
  if (!ids.length) {
    return { count: 0, commissionRate: rate, totalEarned: "0", members: [] };
  }
  const users = await db.select().from(usersTable).where(inArray(usersTable.id, ids));

  const deposits = await db
    .select({
      userId: depositsTable.userId,
      total: sql<string>`COALESCE(SUM(${depositsTable.amount}), 0)`,
    })
    .from(depositsTable)
    .where(and(inArray(depositsTable.userId, ids), eq(depositsTable.status, "approved")))
    .groupBy(depositsTable.userId);

  const dMap = new Map(deposits.map((d) => [d.userId, d.total]));

  const tierType = `ref_l${tierIdx + 1}`;
  const [earned] = await db
    .select({ total: sql<string>`COALESCE(SUM(${transactionsTable.amount}), 0)` })
    .from(transactionsTable)
    .where(and(eq(transactionsTable.userId, userId), eq(transactionsTable.type, tierType)));

  const members = users.map((u) => {
    const totalDep = Number(dMap.get(u.id) ?? "0");
    return {
      id: u.id,
      name: u.name,
      joinedAt: u.createdAt.toISOString(),
      totalDeposited: String(totalDep),
      qualified: totalDep >= TEAM_ACTIVE_DEPOSIT_MIN,
    };
  });

  return {
    count: users.length,
    commissionRate: rate,
    totalEarned: String(earned?.total ?? "0"),
    members,
  };
}

router.get("/referrals", requireUser, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  const { l1, l2, l3 } = await getDescendants(userId);

  // عدد الأعضاء المباشرين الفاعلين (أودعوا ≥$50)
  const activeDirectCount = await countActiveMembers(l1);

  // عمولات الفريق مفتوحة دائماً للجميع
  const unlockedLevels = [true, true, true];

  const tier1 = await tierFor(l1, REFERRAL_RATES[0], userId, 0);
  const tier2 = await tierFor(l2, REFERRAL_RATES[1], userId, 1);
  const tier3 = await tierFor(l3, REFERRAL_RATES[2], userId, 2);

  const totalCommission =
    Number(tier1.totalEarned) + Number(tier2.totalEarned) + Number(tier3.totalEarned);

  const baseUrl = process.env.PUBLIC_BASE_URL ?? "";
  const link = `${baseUrl}/?ref=${user.referralCode}`;

  res.json({
    code: user.referralCode,
    link,
    totalReferrals: tier1.count + tier2.count + tier3.count,
    qualifiedReferrals: user.qualifiedReferralCount,
    totalCommission: String(totalCommission),
    activeDirectCount,
    unlockedLevels,
    level1: tier1,
    level2: tier2,
    level3: tier3,
  });
});

export default router;
