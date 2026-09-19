import { pgTable, text, timestamp, numeric } from "drizzle-orm/pg-core";

export const withdrawalsTable = pgTable("withdrawals", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  amount: numeric("amount", { precision: 18, scale: 4 }).notNull(),
  fee: numeric("fee", { precision: 18, scale: 4 }).notNull(),
  netAmount: numeric("net_amount", { precision: 18, scale: 4 }).notNull(),
  address: text("address").notNull(),
  network: text("network").notNull().default("TRC20"),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});

export type WithdrawalRow = typeof withdrawalsTable.$inferSelect;
