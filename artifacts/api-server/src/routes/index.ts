import { Router, type IRouter } from "express";
import healthRouter from "./health";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import settingsRouter from "./settings";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(categoriesRouter);
router.use(productsRouter);
router.use(settingsRouter);
router.use(adminRouter);

export default router;
