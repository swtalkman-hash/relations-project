import { pgTable, text, timestamp, numeric, boolean, integer, unique } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").unique(),
  countryCode: text("country_code"),
  email: text("email").unique(),
  passwordHash: text("password_hash").notNull(),
  language: text("language").notNull().default("ar"),
  balance: numeric("balance", { precision: 18, scale: 4 }).notNull().default("3.0000"),
  totalInvested: numeric("total_invested", { precision: 18, scale: 4 }).notNull().default("0"),
  totalEarned: numeric("total_earned", { precision: 18, scale: 4 }).notNull().default("0"),
  totalWithdrawn: numeric("total_withdrawn", { precision: 18, scale: 4 }).notNull().default("0"),
  referralCode: text("referral_code").notNull().unique(),
  referredBy: text("referred_by"),
  hasDoubled: boolean("has_doubled").notNull().default(false),
  qualifiedReferralCount: integer("qualified_referral_count").notNull().default(0),
  wheelSpinsAvailable: integer("wheel_spins_available").notNull().default(0),
  welcomeReason: text("welcome_reason"),
  welcomeShownAt: timestamp("welcome_shown_at", { withTimezone: true }),
  depositIndex: integer("deposit_index"),
  depositAddressTrc20: text("deposit_address_trc20"),
  depositAddressErc20: text("deposit_address_erc20"),
  depositAddressBtc: text("deposit_address_btc"),
  withdrawPinHash: text("withdraw_pin_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique("users_deposit_index_unique").on(t.depositIndex)]);

export type UserRow = typeof usersTable.$inferSelect;
