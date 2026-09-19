import { pgTable, text, timestamp, numeric, primaryKey } from "drizzle-orm/pg-core";

export const dailyTasksTable = pgTable(
  "daily_tasks",
  {
    userId: text("user_id").notNull(),
    taskKey: text("task_key").notNull(),
    completedDate: text("completed_date").notNull(),
    reward: numeric("reward", { precision: 18, scale: 4 }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.taskKey, t.completedDate] })],
);

export type DailyTaskRow = typeof dailyTasksTable.$inferSelect;
