import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import { db, dailyTasksTable, usersTable, transactionsTable } from "@workspace/db";
import { requireUser, generateId } from "../lib/auth";
import { DAILY_TASKS, todayKey } from "../lib/tasks";

const router: IRouter = Router();

router.get("/tasks", requireUser, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;
  const today = todayKey();
  const completedRows = await db
    .select()
    .from(dailyTasksTable)
    .where(and(eq(dailyTasksTable.userId, userId), eq(dailyTasksTable.completedDate, today)));
  const completedSet = new Set(completedRows.map((r) => r.taskKey));

  res.json(
    DAILY_TASKS.map((t) => ({
      key: t.key,
      title: t.title,
      description: t.description,
      reward: t.reward,
      completed: completedSet.has(t.key),
    })),
  );
});

router.post("/tasks/:key/complete", requireUser, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;
  const rawKey = Array.isArray(req.params.key) ? req.params.key[0] : req.params.key;
  const task = DAILY_TASKS.find((t) => t.key === rawKey);
  if (!task) {
    res.status(404).json({ error: "task_not_found" });
    return;
  }
  const today = todayKey();
  const existing = await db
    .select()
    .from(dailyTasksTable)
    .where(
      and(
        eq(dailyTasksTable.userId, userId),
        eq(dailyTasksTable.taskKey, task.key),
        eq(dailyTasksTable.completedDate, today),
      ),
    );
  if (existing.length) {
    res.status(400).json({ error: "already_completed" });
    return;
  }

  await db.insert(dailyTasksTable).values({
    userId,
    taskKey: task.key,
    completedDate: today,
    reward: String(task.reward),
  });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "user_not_found" });
    return;
  }
  const newBalance = Number(user.balance) + task.reward;
  await db
    .update(usersTable)
    .set({ balance: String(newBalance) })
    .where(eq(usersTable.id, userId));

  await db.insert(transactionsTable).values({
    id: generateId("t_"),
    userId,
    type: "task_reward",
    amount: String(task.reward),
    description: `مكافأة: ${task.title}`,
  });

  res.json({ reward: String(task.reward), newBalance: String(newBalance) });
});

export default router;
