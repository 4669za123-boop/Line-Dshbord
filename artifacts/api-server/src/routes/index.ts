import { Router, type IRouter } from "express";
import healthRouter from "./health";
import linesRouter from "./lines";

const router: IRouter = Router();

router.use(healthRouter);
router.use(linesRouter);

export default router;
