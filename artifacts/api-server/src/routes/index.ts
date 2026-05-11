import { Router, type IRouter } from "express";
import healthRouter from "./health";
import linesRouter from "./lines";
import websitesRouter from "./websites";
import schedulesRouter from "./schedules";
import lineStatusRouter from "./line-status";
import backupAccountsRouter from "./backup-accounts";
import backupGroupsRouter from "./backup-groups";

const router: IRouter = Router();

router.use(healthRouter);
router.use(linesRouter);
router.use(websitesRouter);
router.use(schedulesRouter);
router.use(lineStatusRouter);
router.use(backupAccountsRouter);
router.use(backupGroupsRouter);

export default router;
