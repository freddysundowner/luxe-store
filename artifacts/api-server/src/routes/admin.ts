import { Router } from "express";
import { db, productsTable, categoriesTable } from "@workspace/db";
import {
  AdminLoginBody,
  AdminLoginResponse,
  GetAdminStatsResponse,
} from "@workspace/api-zod";
import { issueAdminToken } from "../middleware/require-admin";

const router = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";

router.post("/admin/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (parsed.data.password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }

  const token = issueAdminToken();
  res.json(AdminLoginResponse.parse({ token, success: true }));
});

router.get("/admin/stats", async (_req, res): Promise<void> => {
  const [products, categories] = await Promise.all([
    db.select().from(productsTable),
    db.select().from(categoriesTable),
  ]);

  const stats = {
    totalProducts: products.length,
    totalCategories: categories.length,
    activeProducts: products.filter((p) => p.isActive).length,
    featuredProducts: products.filter((p) => p.isFeatured).length,
    dropshipProducts: products.filter((p) => p.isDropship).length,
    outOfStockProducts: products.filter((p) => !p.inStock).length,
  };

  res.json(GetAdminStatsResponse.parse(stats));
});

export default router;
