import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import clubsRouter from "./clubs";
import athletesRouter from "./athletes";
import paymentsRouter from "./payments";
import competitionsRouter from "./competitions";
import fightsRouter from "./fights";
import { listFightsHandler } from "./fights";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/clubs", clubsRouter);
router.use("/athletes", athletesRouter);
router.use("/payments", paymentsRouter);
router.use("/competitions", competitionsRouter);
router.use("/competitions/:competitionId/fights", (req, res) => listFightsHandler(req, res));
router.use("/fights", fightsRouter);

export default router;
