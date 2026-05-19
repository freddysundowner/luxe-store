import { Router, type IRouter } from "express";
import healthRouter from "./health";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import settingsRouter from "./settings";
import adminRouter from "./admin";
import aiRouter from "./ai";
import paymentsRouter from "./payments";
import uploadRouter from "./upload";
import giftsRouter from "./gifts";
import availabilityTagsRouter from "./availability-tags";
import hampersRouter from "./hampers";

const router: IRouter = Router();

router.use(healthRouter);
router.use(categoriesRouter);
router.use(productsRouter);
router.use(settingsRouter);
router.use(adminRouter);
router.use(aiRouter);
router.use(paymentsRouter);
router.use(uploadRouter);
router.use(giftsRouter);
router.use(availabilityTagsRouter);
router.use(hampersRouter);

export default router;
