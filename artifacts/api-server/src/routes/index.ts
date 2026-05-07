import { Router, type IRouter } from "express";
import healthRouter from "./health";
import linesRouter from "./lines";
import websitesRouter from "./websites";
import schedulesRouter from "./schedules";

const router: IRouter = Router();

router.use(healthRouter);
router.use(linesRouter);
router.use(websitesRouter);
router.use(schedulesRouter);

export default router;
