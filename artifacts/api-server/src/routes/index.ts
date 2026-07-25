import { Router, type IRouter } from "express";
import healthRouter from "./health";
import aiRouter from "./ai";
import satellitesRouter from "./satellites";
import spaceWeatherRouter from "./space-weather";
import nasaRouter from "./nasa";
import openrouterRouter from "./openrouter";
import apodRouter from "./apod";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/ai", aiRouter);
router.use(satellitesRouter);
router.use(spaceWeatherRouter);
router.use(nasaRouter);
router.use(openrouterRouter);
router.use(apodRouter);

export default router;
