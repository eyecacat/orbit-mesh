import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import hayatagiRouter from "./hayatagi";
import observationsRouter from "./observations";
import nabizRouter from "./nabiz";
import missionsRouter from "./missions";
import magnetometerRouter from "./magnetometer";
import openrouterRouter from "./openrouter";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(hayatagiRouter);
router.use(observationsRouter);
router.use(nabizRouter);
router.use(missionsRouter);
router.use(magnetometerRouter);
router.use(openrouterRouter);

export default router;
