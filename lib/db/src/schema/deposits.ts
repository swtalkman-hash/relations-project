import { pgTable, text, timestamp, numeric } from "drizzle-orm/pg-core";

export const depositsTable = pgTable("deposits", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  amount: numeric("amount", { precision: 18, scale: 4 }).notNull(),
  txHash: text("tx_hash"),
  network: text("network").notNull().default("TRC20"),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  proofImage: text("proof_image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});

export type DepositRow = typeof depositsTable.$inferSelect;
