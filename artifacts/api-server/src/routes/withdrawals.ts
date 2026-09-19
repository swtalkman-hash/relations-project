import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db, usersTable, withdrawalsTable, transactionsTable } from "@workspace/db";
import { CreateWithdrawalBody } from "@workspace/api-zod";
import { requireUser, generateId } from "../lib/auth";
import { MIN_WITHDRAWAL, FEE_BEFORE_DOUBLE, FEE_AFTER_DOUBLE } from "../lib/levels";

const router: IRouter = Router();

router.get("/withdrawals", requireUser, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;
  const rows = await db
    .select()
    .from(withdrawalsTable)
    .where(eq(withdrawalsTable.userId, userId))
    .orderBy(desc(withdrawalsTable.createdAt));
  res.json(rows);
});

router.post("/withdrawals", requireUser, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;
  const parsed = CreateWithdrawalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const amount = parsed.data.amount;
  if (amount < MIN_WITHDRAWAL) {
    res.status(400).json({ error: "below_minimum", min: MIN_WITHDRAWAL });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "user_not_found" });
    return;
  }

  if (Number(user.balance) < amount) {
    res.status(400).json({ error: "insufficient_balance" });
    return;
  }

  const feeRate = user.hasDoubled ? FEE_AFTER_DOUBLE : FEE_BEFORE_DOUBLE;
  const fee = +(amount * feeRate).toFixed(4);
  const net = +(amount - fee).toFixed(4);

  const newTotalInvested = Math.max(0, Number(user.totalInvested) - amount);

  await db
    .update(usersTable)
    .set({
      balance: String(Number(user.balance) - amount),
      totalInvested: String(newTotalInvested),
    })
    .where(eq(usersTable.id, userId));

  const [w] = await db
    .insert(withdrawalsTable)
    .values({
      id: generateId("wd_"),
      userId,
      amount: String(amount),
      fee: String(fee),
      netAmount: String(net),
      address: parsed.data.address,
      network: parsed.data.network,
      status: "pending",
    })
    .returning();

  await db.insert(transactionsTable).values({
    id: generateId("t_"),
    userId,
    type: "withdraw_request",
    amount: String(-amount),
    description: `طلب سحب (رسوم ${(feeRate * 100).toFixed(0)}%)`,
    refId: w.id,
  });

  res.json(w);
});

router.post("/withdrawals/:id/cancel", requireUser, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;
  const { id } = req.params;

  const [w] = await db
    .select()
    .from(withdrawalsTable)
    .where(eq(withdrawalsTable.id, id));

  if (!w) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  if (w.userId !== userId) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  if (w.status !== "pending") {
    res.status(400).json({ error: "already_processed" });
    return;
  }

  await db
    .update(withdrawalsTable)
    .set({ status: "cancelled" })
    .where(eq(withdrawalsTable.id, id));

  const [currentUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  await db
    .update(usersTable)
    .set({
      balance: String(Number(currentUser.balance) + Number(w.amount)),
      totalInvested: String(Number(currentUser.totalInvested) + Number(w.amount)),
    })
    .where(eq(usersTable.id, userId));

  await db.insert(transactionsTable).values({
    id: generateId("t_"),
    userId,
    type: "withdraw_refund",
    amount: String(w.amount),
    description: `استرداد طلب سحب ملغي`,
    refId: w.id,
  });

  res.json({ ok: true });
});

export default router;
