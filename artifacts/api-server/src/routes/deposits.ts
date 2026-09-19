import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db, depositsTable, usersTable } from "@workspace/db";
import { CreateDepositBody } from "@workspace/api-zod";
import { requireUser, generateId } from "../lib/auth";
import { verifyDeposit, ADMIN_TRC20, ADMIN_ERC20, ADMIN_BTC } from "../lib/verify";
import { approveDeposit } from "../lib/deposit-approve";

const router: IRouter = Router();

router.get("/deposits", requireUser, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;
  const rows = await db
    .select()
    .from(depositsTable)
    .where(eq(depositsTable.userId, userId))
    .orderBy(desc(depositsTable.createdAt));
  res.json(rows);
});

router.post("/deposits", requireUser, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;
  const parsed = CreateDepositBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (parsed.data.amount <= 0) {
    res.status(400).json({ error: "invalid_amount" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "user_not_found" });
    return;
  }

  // منع إعادة استخدام نفس رقم العملية
  if (parsed.data.txHash) {
    const [existing] = await db
      .select({ id: depositsTable.id })
      .from(depositsTable)
      .where(eq(depositsTable.txHash, parsed.data.txHash));
    if (existing) {
      res.status(409).json({ error: "tx_already_used" });
      return;
    }
  }

  const network = parsed.data.network;
  const EVM_ADDRESS = ADMIN_ERC20;
  const toAddress =
    network === "TRC20" ? ADMIN_TRC20 :
    network === "ERC20" ? ADMIN_ERC20 :
    network === "BTC"   ? ADMIN_BTC :
    network === "BEP20" ? EVM_ADDRESS :
    network === "ETH"   ? EVM_ADDRESS :
    network === "BNB"   ? EVM_ADDRESS :
    null;

  const proofImage = (req.body as { proofImage?: string }).proofImage ?? null;

  const [deposit] = await db
    .insert(depositsTable)
    .values({
      id: generateId("d_"),
      userId,
      amount: String(parsed.data.amount),
      txHash: parsed.data.txHash ?? null,
      network,
      status: "pending",
      proofImage,
    })
    .returning();

  res.json({ ...deposit, verifying: !!parsed.data.txHash });

  if (!parsed.data.txHash || !toAddress) return;

  // Run verification completely detached from the request handler so the
  // proxy forwards the response immediately without waiting for blockchain queries.
  const depositId = deposit.id;
  const txHashVal = parsed.data.txHash;
  const amountVal = parsed.data.amount;
  setImmediate(() => {
    verifyDeposit(network, txHashVal, toAddress!, amountVal)
      .then(async (result) => {
        if (result.ok === true) {
          await approveDeposit(depositId);
        }
        await db
          .update(depositsTable)
          .set({ notes: result.note })
          .where(eq(depositsTable.id, depositId));
      })
      .catch(() => {
        // verification error — stays pending for manual review
      });
  });
});

export default router;
