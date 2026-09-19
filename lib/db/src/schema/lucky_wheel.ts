import { pgTable, text, timestamp, numeric } from "drizzle-orm/pg-core";

export const wheelSpinsTable = pgTable("wheel_spins", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  prizeLabel: text("prize_label").notNull(),
  prizeAmount: numeric("prize_amount", { precision: 18, scale: 4 }).notNull().default("0"),
  isPhysical: text("is_physical").notNull().default("false"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type WheelSpinRow = typeof wheelSpinsTable.$inferSelect;
