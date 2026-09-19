import { Router, type IRouter, type Request, type Response } from "express";
import { eq, or, max, lt } from "drizzle-orm";
import { db, usersTable, transactionsTable, emailOtpsTable } from "@workspace/db";
import { SignupBody, LoginBody } from "@workspace/api-zod";
import {
  hashPassword,
  verifyPassword,
  generateId,
  generateReferralCode,
  setSessionCookie,
  clearSessionCookie,
  requireUser,
} from "../lib/auth";
import { SIGNUP_BONUS } from "../lib/levels";
import { getMnemonic, deriveAddresses } from "../lib/wallet";
import { sendOtpEmail } from "../lib/mailer";

const router: IRouter = Router();

function publicUser(u: typeof usersTable.$inferSelect): Record<string, unknown> {
  const { passwordHash, ...rest } = u;
  void passwordHash;
  return rest;
}

/* ── إرسال OTP عبر البريد ── */
router.post("/auth/send-email-otp", async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body as { email?: string };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "invalid_email" });
    return;
  }

  // حذف الأكواد المنتهية
  await db.delete(emailOtpsTable).where(lt(emailOtpsTable.expiresAt, new Date()));

  // منع الإرسال المتكرر (أقل من دقيقة)
  const [recent] = await db
    .select()
    .from(emailOtpsTable)
    .where(eq(emailOtpsTable.email, email.toLowerCase()));
  if (recent && !recent.used) {
    const elapsed = Date.now() - new Date(recent.createdAt).getTime();
    if (elapsed < 60_000) {
      res.status(429).json({ error: "otp_too_soon", waitSeconds: Math.ceil((60_000 - elapsed) / 1000) });
      return;
    }
  }

  const code = String(Math.floor(100_000 + Math.random() * 900_000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 دقائق

  await db.insert(emailOtpsTable).values({
    id: generateId("otp_"),
    email: email.toLowerCase(),
    code,
    expiresAt,
  });

  try {
    await sendOtpEmail(email, code);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "email_send_failed" });
  }
});

/* ── التحقق من OTP فقط (بدون إنشاء حساب) ── */
router.post("/auth/verify-email-otp", async (req: Request, res: Response): Promise<void> => {
  const { email, code } = req.body as { email?: string; code?: string };
  if (!email || !code) {
    res.status(400).json({ error: "missing_fields" });
    return;
  }
  const [otp] = await db
    .select()
    .from(emailOtpsTable)
    .where(eq(emailOtpsTable.email, email.toLowerCase()));
  if (!otp || otp.used || otp.code !== code || new Date() > otp.expiresAt) {
    res.status(401).json({ error: "invalid_otp" });
    return;
  }
  res.json({ ok: true });
});

router.post("/auth/signup", async (req: Request, res: Response): Promise<void> => {
  const parsed = SignupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { name, phone, email, countryCode, password, referralCode, language } = parsed.data;

  if (!phone && !email) {
    res.status(400).json({ error: "phone_or_email_required" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "password_too_short" });
    return;
  }

  if (phone) {
    const existing = await db.select().from(usersTable).where(eq(usersTable.phone, phone));
    if (existing.length) {
      res.status(409).json({ error: "phone_taken" });
      return;
    }
  }
  if (email) {
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (existing.length) {
      res.status(409).json({ error: "email_taken" });
      return;
    }
  }

  let referrerId: string | null = null;
  if (referralCode) {
    const [referrer] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.referralCode, referralCode.toUpperCase()));
    if (referrer) referrerId = referrer.id;
  }

  let myCode = generateReferralCode();
  for (let i = 0; i < 5; i++) {
    const taken = await db.select().from(usersTable).where(eq(usersTable.referralCode, myCode));
    if (!taken.length) break;
    myCode = generateReferralCode();
  }

  const id = generateId("u_");
  const passwordHash = await hashPassword(password);

  // Assign HD wallet deposit address if mnemonic is configured
  let depositIndex: number | null = null;
  let depositAddressTrc20: string | null = null;
  let depositAddressErc20: string | null = null;
  let depositAddressBtc: string | null = null;
  if (getMnemonic()) {
    const [{ maxIdx }] = await db
      .select({ maxIdx: max(usersTable.depositIndex) })
      .from(usersTable);
    depositIndex = (maxIdx ?? -1) + 1;
    const addrs = deriveAddresses(depositIndex);
    depositAddressTrc20 = addrs.trc20;
    depositAddressErc20 = addrs.erc20;
    depositAddressBtc = addrs.btc;
  }

  const [user] = await db
    .insert(usersTable)
    .values({
      id,
      name,
      phone: phone ?? null,
      email: email ?? null,
      countryCode: countryCode ?? null,
      passwordHash,
      referralCode: myCode,
      referredBy: referrerId,
      language: language ?? "ar",
      balance: String(SIGNUP_BONUS),
      depositIndex,
      depositAddressTrc20,
      depositAddressErc20,
      depositAddressBtc,
    })
    .returning();

  await db.insert(transactionsTable).values({
    id: generateId("t_"),
    userId: id,
    type: "bonus",
    amount: String(SIGNUP_BONUS),
    description: "مكافأة التسجيل",
  });

  setSessionCookie(res, user.id);
  res.json({ user: publicUser(user) });
});

router.post("/auth/login", async (req: Request, res: Response): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { identifier, password } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(or(eq(usersTable.phone, identifier), eq(usersTable.email, identifier)));

  if (!user) {
    res.status(401).json({ error: "invalid_credentials" });
    return;
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "invalid_credentials" });
    return;
  }

  setSessionCookie(res, user.id);
  res.json({ user: publicUser(user) });
});

router.post("/auth/logout", async (_req, res): Promise<void> => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get("/auth/me", requireUser, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as Request & { userId: string }).userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "user_not_found" });
    return;
  }
  res.json(publicUser(user));
});

export default router;
