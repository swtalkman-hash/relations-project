import { eq, and, count } from "drizzle-orm";
import {
  db,
  usersTable,
  depositsTable,
  transactionsTable,
} from "@workspace/db";
import { REFERRAL_RATES, QUALIFY_DEPOSIT } from "./levels";
import { autoActivateInvestment } from "./invest";
import { generateId } from "./auth";

export async function approveDeposit(depositId: string): Promise<void> {
  const [dep] = await db
    .select()
    .from(depositsTable)
    .where(eq(depositsTable.id, depositId));
  if (!dep || dep.status === "approved") return;

  await db
    .update(depositsTable)
    .set({ status: "approved", processedAt: new Date() })
    .where(eq(depositsTable.id, depositId));

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, dep.userId));
  if (!user) return;

  const amount = Number(dep.amount);

  await db
    .update(usersTable)
    .set({ balance: String(Number(user.balance) + amount) })
    .where(eq(usersTable.id, user.id));

  await db.insert(transactionsTable).values({
    id: generateId("t_"),
    userId: user.id,
    type: "deposit",
    amount: String(amount),
    description: `إيداع ${dep.network}`,
    refId: dep.id,
  });

  if (amount >= QUALIFY_DEPOSIT) {
    const [{ prevApproved }] = await db
      .select({ prevApproved: count() })
      .from(depositsTable)
      .where(
        and(
          eq(depositsTable.userId, user.id),
          eq(depositsTable.status, "approved"),
        ),
      );
    if (Number(prevApproved) === 1) {
      await db
        .update(usersTable)
        .set({ wheelSpinsAvailable: user.wheelSpinsAvailable + 1 })
        .where(eq(usersTable.id, user.id));
    }
  }

  if (amount >= QUALIFY_DEPOSIT && user.referredBy) {
    const [referrer] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, user.referredBy));
    if (referrer) {
      await db
        .update(usersTable)
        .set({
          qualifiedReferralCount: referrer.qualifiedReferralCount + 1,
          wheelSpinsAvailable: referrer.wheelSpinsAvailable + 1,
        })
        .where(eq(usersTable.id, referrer.id));
    }
  }

  await autoActivateInvestment(user.id);

  let currentUserId: string | null = user.referredBy ?? null;
  for (let i = 0; i < REFERRAL_RATES.length && currentUserId; i++) {
    const [up] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, currentUserId));
    if (!up) break;
    const commission = +(amount * REFERRAL_RATES[i]).toFixed(4);
    await db
      .update(usersTable)
      .set({
        balance: String(Number(up.balance) + commission),
        totalEarned: String(Number(up.totalEarned) + commission),
      })
      .where(eq(usersTable.id, up.id));
    await db.insert(transactionsTable).values({
      id: generateId("t_"),
      userId: up.id,
      type: `ref_l${i + 1}`,
      amount: String(commission),
      description: `عمولة فريق المستوى ${i + 1} من إيداع ${user.name}`,
      refId: dep.id,
    });
    currentUserId = up.referredBy ?? null;
  }
}
