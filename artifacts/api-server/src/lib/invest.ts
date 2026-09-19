import { eq, and } from "drizzle-orm";
import { db, usersTable, investmentsTable } from "@workspace/db";
import { levelForAmount } from "./levels";
import { generateId } from "./auth";

/**
 * تُنشئ أو تُجدّد سجل الاستثمار النشط للمستخدم بناءً على رصيده الحالي.
 * تُستدعى تلقائياً عند كل موافقة إيداع.
 */
export async function autoActivateInvestment(userId: string): Promise<void> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return;

  const balance = Number(user.balance);
  const lvl = levelForAmount(balance);
  if (!lvl) return; // الرصيد أقل من الحد الأدنى 3$

  // إلغاء أي استثمار قديم نشط
  await db
    .update(investmentsTable)
    .set({ active: false })
    .where(and(eq(investmentsTable.userId, userId), eq(investmentsTable.active, true)));

  // إنشاء استثمار جديد بالرصيد الحالي ومستواه
  await db.insert(investmentsTable).values({
    id: generateId("i_"),
    userId,
    amount: String(balance),
    level: lvl.level,
    dailyMinRate: String(lvl.dailyMinRate),
    dailyMaxRate: String(lvl.dailyMaxRate),
    active: true,
  });

  await db
    .update(usersTable)
    .set({ totalInvested: String(balance) })
    .where(eq(usersTable.id, userId));
}
