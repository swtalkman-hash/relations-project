import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  usersTable,
  wheelSpinsTable,
  transactionsTable,
} from "@workspace/db";
import { requireUser, generateId } from "../lib/auth";
import { WHEEL_PRIZES, pickPrize } from "../lib/wheel";

const router: IRouter = Router();

router.get("/wheel/status", requireUser, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "user_not_found" });
    return;
  }
  let reason = "";
  if (user.qualifiedReferralCount < 1) {
    reason = "ادعُ صديقاً ليودع 125$ على الأقل لفتح عجلة الحظ";
  } else if (user.wheelSpinsAvailable < 1) {
    reason = "لقد استخدمت لفتك المتاحة، ادعُ المزيد لفتح المزيد";
  }
  res.json({
    eligible: user.wheelSpinsAvailable > 0,
    spinsAvailable: user.wheelSpinsAvailable,
    reason,
    prizes: WHEEL_PRIZES.map((p) => ({
      label: p.label,
      amount: p.amount,
      isPhysical: p.isPhysical,
    })),
  });
});

router.post("/wheel/spin", requireUser, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "user_not_found" });
    return;
  }
  if (user.wheelSpinsAvailable < 1) {
    res.status(400).json({ error: "no_spins_available" });
    return;
  }

  const prize = pickPrize();

  const newBalance = Number(user.balance) + prize.amount;
  const newSpins = user.wheelSpinsAvailable - 1;

  await db
    .update(usersTable)
    .set({ wheelSpinsAvailable: newSpins, balance: String(newBalance) })
    .where(eq(usersTable.id, userId));

  await db.insert(wheelSpinsTable).values({
    id: generateId("w_"),
    userId,
    prizeLabel: prize.label,
    prizeAmount: String(prize.amount),
    isPhysical: prize.isPhysical ? "true" : "false",
  });

  if (prize.amount > 0) {
    await db.insert(transactionsTable).values({
      id: generateId("t_"),
      userId,
      type: "wheel_prize",
      amount: String(prize.amount),
      description: `جائزة عجلة الحظ: ${prize.label}`,
    });
  }

  res.json({
    prize: { label: prize.label, amount: prize.amount, isPhysical: prize.isPhysical },
    newBalance: String(newBalance),
    spinsRemaining: newSpins,
  });
});

export default router;
