import { pgTable, text, timestamp, numeric, integer, boolean } from "drizzle-orm/pg-core";

export const investmentsTable = pgTable("investments", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  amount: numeric("amount", { precision: 18, scale: 4 }).notNull(),
  level: integer("level").notNull(),
  dailyMinRate: numeric("daily_min_rate", { precision: 6, scale: 4 }).notNull(),
  dailyMaxRate: numeric("daily_max_rate", { precision: 6, scale: 4 }).notNull(),
  totalCollected: numeric("total_collected", { precision: 18, scale: 4 }).notNull().default("0"),
  lastCollectedAt: timestamp("last_collected_at", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type InvestmentRow = typeof investmentsTable.$inferSelect;
