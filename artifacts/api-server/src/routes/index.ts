import { Router, type IRouter } from "express";
import healthRouter from "./health";
import linesRouter from "./lines";
import websitesRouter from "./websites";
import schedulesRouter from "./schedules";
import lineStatusRouter from "./line-status";

const router: IRouter = Router();

router.use(healthRouter);
router.use(linesRouter);
router.use(websitesRouter);
router.use(schedulesRouter);
router.use(lineStatusRouter);

export default router;
