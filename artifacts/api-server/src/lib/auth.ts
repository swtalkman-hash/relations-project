import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

const JWT_SECRET =
  process.env.JWT_SECRET ??
  process.env.SESSION_SECRET ??
  "ounsa-dev-secret-change-me-please-change-me";

const COOKIE_NAME = "ounsa_session";
const ADMIN_COOKIE_NAME = "ounsa_admin_session";
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export type SessionPayload = { userId: string };
export type AdminSessionPayload = { adminId: string };

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function generateId(prefix = ""): string {
  return prefix + randomBytes(12).toString("hex");
}

export function generateReferralCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

export function setSessionCookie(res: Response, userId: string): void {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: SEVEN_DAYS,
    path: "/",
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

export function setAdminCookie(res: Response, adminId: string): void {
  const token = jwt.sign({ adminId }, JWT_SECRET, { expiresIn: "7d" });
  res.cookie(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: SEVEN_DAYS,
    path: "/",
  });
}

export function clearAdminCookie(res: Response): void {
  res.clearCookie(ADMIN_COOKIE_NAME, { path: "/" });
}

export function readSession(req: Request): SessionPayload | null {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as SessionPayload;
    return decoded;
  } catch {
    return null;
  }
}

export function readAdminSession(req: Request): AdminSessionPayload | null {
  const token = req.cookies?.[ADMIN_COOKIE_NAME];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AdminSessionPayload;
    return decoded;
  } catch {
    return null;
  }
}

export function requireUser(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const session = readSession(req);
  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as Request & { userId: string }).userId = session.userId;
  next();
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const session = readAdminSession(req);
  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as Request & { adminId: string }).adminId = session.adminId;
  next();
}
