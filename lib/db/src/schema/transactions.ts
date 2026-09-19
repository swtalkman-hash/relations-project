import { pgTable, text, timestamp, numeric } from "drizzle-orm/pg-core";

export const transactionsTable = pgTable("transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  amount: numeric("amount", { precision: 18, scale: 4 }).notNull(),
  description: text("description"),
  refId: text("ref_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TransactionRow = typeof transactionsTable.$inferSelect;
