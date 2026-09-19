import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import meRouter from "./me";
import investmentsRouter from "./investments";
import wheelRouter from "./wheel";
import depositsRouter from "./deposits";
import withdrawalsRouter from "./withdrawals";
import referralsRouter from "./referrals";
import tasksRouter from "./tasks";
import pricesRouter from "./prices";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(meRouter);
router.use(investmentsRouter);
router.use(wheelRouter);
router.use(depositsRouter);
router.use(withdrawalsRouter);
router.use(referralsRouter);
router.use(tasksRouter);
router.use(pricesRouter);
router.use(adminRouter);

export default router;
