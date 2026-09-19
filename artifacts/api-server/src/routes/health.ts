import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

// رقم الإصدار — ارفعه كلما أردت إجبار المستخدمين على التحديث
const APP_VERSION = "3";

router.get("/app-version", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ version: APP_VERSION });
});

export default router;
