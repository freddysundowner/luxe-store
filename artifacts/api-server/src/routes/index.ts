import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { requireAdmin } from "../middleware/require-admin";
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

// Gate every /admin/* endpoint behind bearer-token auth, except /admin/login
// which is how clients obtain a token in the first place.
router.use("/admin", (req: Request, res: Response, next: NextFunction) => {
  if (req.path === "/login") return next();
  return requireAdmin(req, res, next);
});

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
