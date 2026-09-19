import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc, sql, and, count } from "drizzle-orm";
import {
  db,
  usersTable,
  depositsTable,
  withdrawalsTable,
  investmentsTable,
  transactionsTable,
  adminUsersTable,
} from "@workspace/db";
import { AdminLoginBody } from "@workspace/api-zod";
import {
  hashPassword,
  verifyPassword,
  setAdminCookie,
  clearAdminCookie,
  requireAdmin,
  generateId,
} from "../lib/auth";
import { QUALIFY_DEPOSIT } from "../lib/levels";
import { approveDeposit } from "../lib/deposit-approve";

const router: IRouter = Router();

function publicUser(u: typeof usersTable.$inferSelect): Record<string, unknown> {
  const { passwordHash, ...rest } = u;
  void passwordHash;
  return rest;
}

async function ensureDefaultAdmin(): Promise<void> {
  const username = process.env.ADMIN_USERNAME ?? "admin";
  const existing = await db.select().from(adminUsersTable).where(eq(adminUsersTable.username, username));
  if (existing.length) return;
  const password = process.env.ADMIN_PASSWORD ?? "admin123";
  const passwordHash = await hashPassword(password);
  await db.insert(adminUsersTable).values({
    id: generateId("a_"),
    username,
    passwordHash,
  });
}

router.post("/admin/login", async (req: Request, res: Response): Promise<void> => {
  await ensureDefaultAdmin();
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [admin] = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.username, parsed.data.username));
  if (!admin) {
    res.status(401).json({ error: "invalid_credentials" });
    return;
  }
  const ok = await verifyPassword(parsed.data.password, admin.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "invalid_credentials" });
    return;
  }
  setAdminCookie(res, admin.id);
  res.json({ ok: true });
});

router.post("/admin/logout", async (_req, res): Promise<void> => {
  clearAdminCookie(res);
  res.json({ ok: true });
});

router.get("/admin/me", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const adminId = (req as Request & { adminId: string }).adminId;
  const [admin] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.id, adminId));
  if (!admin) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json({ id: admin.id, username: admin.username });
});

router.get("/admin/stats", requireAdmin, async (_req, res): Promise<void> => {
  const [users] = await db.select({ c: sql<number>`COUNT(*)::int` }).from(usersTable);
  const [balances] = await db
    .select({ total: sql<string>`COALESCE(SUM(${usersTable.balance}), 0)` })
    .from(usersTable);
  const [depTot] = await db
    .select({ total: sql<string>`COALESCE(SUM(${depositsTable.amount}), 0)` })
    .from(depositsTable)
    .where(eq(depositsTable.status, "approved"));
  const [wTot] = await db
    .select({ total: sql<string>`COALESCE(SUM(${withdrawalsTable.amount}), 0)` })
    .from(withdrawalsTable)
    .where(eq(withdrawalsTable.status, "approved"));
  const [pendingDep] = await db
    .select({ c: sql<number>`COUNT(*)::int` })
    .from(depositsTable)
    .where(eq(depositsTable.status, "pending"));
  const [pendingW] = await db
    .select({ c: sql<number>`COUNT(*)::int` })
    .from(withdrawalsTable)
    .where(eq(withdrawalsTable.status, "pending"));
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [recent] = await db
    .select({ c: sql<number>`COUNT(*)::int` })
    .from(usersTable)
    .where(sql`${usersTable.createdAt} >= ${sevenDaysAgo}`);
  const [level1] = await db
    .select({ c: sql<number>`COUNT(*)::int` })
    .from(usersTable)
    .where(and(sql`${usersTable.referredBy} IS NOT NULL`, sql`${usersTable.qualifiedReferralCount} >= 1`));
  const [level2] = await db
    .select({ c: sql<number>`COUNT(*)::int` })
    .from(usersTable)
    .where(and(sql`${usersTable.referredBy} IS NOT NULL`, sql`${usersTable.qualifiedReferralCount} >= 5`));
  const [level3] = await db
    .select({ c: sql<number>`COUNT(*)::int` })
    .from(usersTable)
    .where(and(sql`${usersTable.referredBy} IS NOT NULL`, sql`${usersTable.qualifiedReferralCount} >= 15`));
  const [wheelSpins] = await db
    .select({ c: sql<number>`COUNT(*)::int` })
    .from(transactionsTable)
    .where(eq(transactionsTable.type, "wheel_win"));
  const [investmentCount] = await db
    .select({ c: sql<number>`COUNT(*)::int` })
    .from(investmentsTable);

  res.json({
    totalUsers: users?.c ?? 0,
    totalDeposited: String(depTot?.total ?? "0"),
    totalWithdrawn: String(wTot?.total ?? "0"),
    pendingDeposits: pendingDep?.c ?? 0,
    pendingWithdrawals: pendingW?.c ?? 0,
    totalBalance: String(balances?.total ?? "0"),
    recentSignups: recent?.c ?? 0,
    referralLevel1: level1?.c ?? 0,
    referralLevel2: level2?.c ?? 0,
    referralLevel3: level3?.c ?? 0,
    wheelSpins: wheelSpins?.c ?? 0,
    investmentsCount: investmentCount?.c ?? 0,
  });
});

router.get("/admin/users", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  res.json(rows.map(publicUser));
});

router.get("/admin/users/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const deposits = await db
    .select()
    .from(depositsTable)
    .where(eq(depositsTable.userId, id))
    .orderBy(desc(depositsTable.createdAt));
  const withdrawals = await db
    .select()
    .from(withdrawalsTable)
    .where(eq(withdrawalsTable.userId, id))
    .orderBy(desc(withdrawalsTable.createdAt));
  const investments = await db
    .select()
    .from(investmentsTable)
    .where(eq(investmentsTable.userId, id))
    .orderBy(desc(investmentsTable.createdAt));
  const transactions = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, id))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(200);
  const referrals = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.referredBy, id));

  res.json({
    user: publicUser(user),
    deposits,
    withdrawals,
    investments,
    transactions,
    referrals: referrals.map((r) => ({
      id: r.id,
      name: r.name,
      joinedAt: r.createdAt.toISOString(),
    })),
  });
});

router.get("/admin/deposits", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: depositsTable.id,
      userId: depositsTable.userId,
      userName: usersTable.name,
      userPhone: usersTable.phone,
      userEmail: usersTable.email,
      amount: depositsTable.amount,
      txHash: depositsTable.txHash,
      network: depositsTable.network,
      status: depositsTable.status,
      createdAt: depositsTable.createdAt,
      hasProof: sql<boolean>`(${depositsTable.proofImage} IS NOT NULL AND ${depositsTable.proofImage} != '')`,
      notes: depositsTable.notes,
    })
    .from(depositsTable)
    .leftJoin(usersTable, eq(usersTable.id, depositsTable.userId))
    .orderBy(desc(depositsTable.createdAt));
  res.json(rows);
});

// جلب صورة الإثبات بشكل منفصل لتجنب إرسال بيانات ضخمة في القائمة
router.get("/admin/deposits/:id/proof", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [dep] = await db
    .select({ proofImage: depositsTable.proofImage })
    .from(depositsTable)
    .where(eq(depositsTable.id, id));
  if (!dep?.proofImage) { res.status(404).json({ error: "no_proof" }); return; }
  res.json({ proofImage: dep.proofImage });
});

router.post("/admin/deposits/:id/approve", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [dep] = await db.select().from(depositsTable).where(eq(depositsTable.id, id));
  if (!dep) { res.status(404).json({ error: "not_found" }); return; }
  if (dep.status !== "pending") { res.status(400).json({ error: "already_processed" }); return; }
  await approveDeposit(id);
  res.json({ ok: true });
});

router.post("/admin/deposits/:id/reject", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [dep] = await db.select().from(depositsTable).where(eq(depositsTable.id, id));
  if (!dep) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  if (dep.status !== "pending") {
    res.status(400).json({ error: "already_processed" });
    return;
  }
  await db
    .update(depositsTable)
    .set({ status: "rejected", processedAt: new Date() })
    .where(eq(depositsTable.id, id));
  res.json({ ok: true });
});

router.get("/admin/withdrawals", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: withdrawalsTable.id,
      userId: withdrawalsTable.userId,
      userName: usersTable.name,
      userPhone: usersTable.phone,
      userEmail: usersTable.email,
      amount: withdrawalsTable.amount,
      fee: withdrawalsTable.fee,
      netAmount: withdrawalsTable.netAmount,
      address: withdrawalsTable.address,
      network: withdrawalsTable.network,
      status: withdrawalsTable.status,
      createdAt: withdrawalsTable.createdAt,
    })
    .from(withdrawalsTable)
    .leftJoin(usersTable, eq(usersTable.id, withdrawalsTable.userId))
    .orderBy(desc(withdrawalsTable.createdAt));
  res.json(rows);
});

router.post("/admin/withdrawals/:id/approve", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [w] = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.id, id));
  if (!w) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  if (w.status !== "pending") {
    res.status(400).json({ error: "already_processed" });
    return;
  }
  await db
    .update(withdrawalsTable)
    .set({ status: "approved", processedAt: new Date() })
    .where(eq(withdrawalsTable.id, id));
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, w.userId));
  if (user) {
    await db
      .update(usersTable)
      .set({
        totalWithdrawn: String(Number(user.totalWithdrawn) + Number(w.amount)),
      })
      .where(eq(usersTable.id, user.id));
  }
  await db.insert(transactionsTable).values({
    id: generateId("t_"),
    userId: w.userId,
    type: "withdraw_approved",
    amount: "0",
    description: `سحب معتمد - صافي ${w.netAmount} USDT إلى ${w.address}`,
    refId: w.id,
  });
  res.json({ ok: true });
});

router.post("/admin/withdrawals/:id/reject", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [w] = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.id, id));
  if (!w) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  if (w.status !== "pending") {
    res.status(400).json({ error: "already_processed" });
    return;
  }
  await db
    .update(withdrawalsTable)
    .set({ status: "rejected", processedAt: new Date() })
    .where(eq(withdrawalsTable.id, id));
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, w.userId));
  if (user) {
    await db
      .update(usersTable)
      .set({ balance: String(Number(user.balance) + Number(w.amount)) })
      .where(eq(usersTable.id, user.id));
    await db.insert(transactionsTable).values({
      id: generateId("t_"),
      userId: w.userId,
      type: "withdraw_refund",
      amount: String(w.amount),
      description: "استرداد طلب سحب مرفوض",
      refId: w.id,
    });
  }
  res.json({ ok: true });
});

router.patch("/admin/users/:id/balance", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { type, amount } = req.body as { type?: "set" | "add" | "subtract"; amount?: number | string };

  const val = Number(amount);
  if (!type || !["set", "add", "subtract"].includes(type) || isNaN(val) || val < 0) {
    res.status(400).json({ error: "invalid_input" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  let newBalance: number;
  if (type === "set")      newBalance = val;
  else if (type === "add") newBalance = Number(user.balance) + val;
  else                     newBalance = Math.max(0, Number(user.balance) - val);

  await db.update(usersTable).set({ balance: String(newBalance) }).where(eq(usersTable.id, id));

  await db.insert(transactionsTable).values({
    id: generateId("t_"),
    userId: id,
    type: type === "subtract" ? "debit" : "credit",
    amount: String(val),
    description: type === "set"
      ? `تعديل الرصيد بواسطة المسؤول (تعيين: $${val})`
      : type === "add"
        ? `إضافة رصيد بواسطة المسؤول (+$${val})`
        : `خصم رصيد بواسطة المسؤول (-$${val})`,
  });

  res.json({ ok: true, newBalance });
});

router.patch("/admin/users/:id/password", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { newPassword } = req.body as { newPassword?: string };

  if (!newPassword || newPassword.trim().length < 6) {
    res.status(400).json({ error: "password_too_short" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  const passwordHash = await hashPassword(newPassword.trim());
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, id));

  res.json({ ok: true });
});

router.post("/admin/set-mnemonic", async (req: Request, res: Response): Promise<void> => {
  const { mnemonic } = req.body as { mnemonic?: string };
  if (!mnemonic || mnemonic.trim().split(/\s+/).length !== 12) {
    res.status(400).json({ error: "يجب أن تكون 12 كلمة بالضبط" });
    return;
  }
  const clean = mnemonic.trim();
  process.env.HD_MNEMONIC = clean;
  try {
    const { serverConfigTable } = await import("@workspace/db");
    await db.insert(serverConfigTable)
      .values({ key: "hd_mnemonic", value: clean })
      .onConflictDoUpdate({ target: serverConfigTable.key, set: { value: clean } });
  } catch {
    // table may not exist yet — env var is still set for this session
  }
  res.json({ ok: true });
});

router.get("/admin/mnemonic", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const { serverConfigTable } = await import("@workspace/db");
    const [row] = await db.select().from(serverConfigTable).where(eq(serverConfigTable.key, "hd_mnemonic"));
    res.json({ mnemonic: row?.value ?? null });
  } catch {
    res.json({ mnemonic: process.env.HD_MNEMONIC ?? null });
  }
});

export default router;
