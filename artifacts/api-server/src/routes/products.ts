import { Router } from "express";
import { eq, and, ilike } from "drizzle-orm";
import { db, productsTable, categoriesTable } from "@workspace/db";
import {
  ListProductsQueryParams,
  ListProductsResponse,
  GetProductParams,
  GetProductResponse,
  UpdateProductParams,
  UpdateProductBody,
  UpdateProductResponse,
  DeleteProductParams,
  ListAdminProductsResponse,
  CreateProductBody,
} from "@workspace/api-zod";

const router = Router();

function mapRow(row: {
  id: number;
  name: string;
  description: string | null;
  price: string;
  originalPrice: string | null;
  categoryId: number | null;
  imageUrl: string | null;
  inStock: boolean;
  isActive: boolean;
  isDropship: boolean;
  isFeatured: boolean;
  categoryName: string | null;
}) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: parseFloat(row.price),
    originalPrice: row.originalPrice != null ? parseFloat(row.originalPrice) : null,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    imageUrl: row.imageUrl,
    inStock: row.inStock,
    isActive: row.isActive,
    isDropship: row.isDropship,
    isFeatured: row.isFeatured,
  };
}

router.get("/products", async (req, res): Promise<void> => {
  const query = ListProductsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { categoryId, search, featured } = query.data;
  const conditions = [eq(productsTable.isActive, true)];

  if (categoryId != null) {
    conditions.push(eq(productsTable.categoryId, categoryId));
  }
  if (search) {
    conditions.push(ilike(productsTable.name, `%${search}%`));
  }
  if (featured === true) {
    conditions.push(eq(productsTable.isFeatured, true));
  }

  const rows = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      description: productsTable.description,
      price: productsTable.price,
      originalPrice: productsTable.originalPrice,
      categoryId: productsTable.categoryId,
      imageUrl: productsTable.imageUrl,
      inStock: productsTable.inStock,
      isActive: productsTable.isActive,
      isDropship: productsTable.isDropship,
      isFeatured: productsTable.isFeatured,
      categoryName: categoriesTable.name,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
    .where(and(...conditions))
    .orderBy(productsTable.createdAt);

  res.json(ListProductsResponse.parse(rows.map(mapRow)));
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      description: productsTable.description,
      price: productsTable.price,
      originalPrice: productsTable.originalPrice,
      categoryId: productsTable.categoryId,
      imageUrl: productsTable.imageUrl,
      inStock: productsTable.inStock,
      isActive: productsTable.isActive,
      isDropship: productsTable.isDropship,
      isFeatured: productsTable.isFeatured,
      categoryName: categoriesTable.name,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
    .where(eq(productsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json(GetProductResponse.parse(mapRow(row)));
});

router.get("/admin/products", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      description: productsTable.description,
      price: productsTable.price,
      originalPrice: productsTable.originalPrice,
      categoryId: productsTable.categoryId,
      imageUrl: productsTable.imageUrl,
      inStock: productsTable.inStock,
      isActive: productsTable.isActive,
      isDropship: productsTable.isDropship,
      isFeatured: productsTable.isFeatured,
      categoryName: categoriesTable.name,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
    .orderBy(productsTable.createdAt);

  res.json(ListAdminProductsResponse.parse(rows.map(mapRow)));
});

router.post("/admin/products", async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { price, originalPrice, ...rest } = parsed.data;
  const [product] = await db
    .insert(productsTable)
    .values({
      ...rest,
      price: String(price),
      originalPrice: originalPrice != null ? String(originalPrice) : null,
    })
    .returning();

  const [row] = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      description: productsTable.description,
      price: productsTable.price,
      originalPrice: productsTable.originalPrice,
      categoryId: productsTable.categoryId,
      imageUrl: productsTable.imageUrl,
      inStock: productsTable.inStock,
      isActive: productsTable.isActive,
      isDropship: productsTable.isDropship,
      isFeatured: productsTable.isFeatured,
      categoryName: categoriesTable.name,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
    .where(eq(productsTable.id, product.id));

  res.status(201).json(GetProductResponse.parse(mapRow(row!)));
});

router.put("/admin/products/:id", async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { price, originalPrice, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = { ...rest };
  if (price !== undefined) updateData.price = String(price);
  if (originalPrice !== undefined) updateData.originalPrice = originalPrice != null ? String(originalPrice) : null;

  const [product] = await db
    .update(productsTable)
    .set(updateData)
    .where(eq(productsTable.id, params.data.id))
    .returning();

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const [row] = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      description: productsTable.description,
      price: productsTable.price,
      originalPrice: productsTable.originalPrice,
      categoryId: productsTable.categoryId,
      imageUrl: productsTable.imageUrl,
      inStock: productsTable.inStock,
      isActive: productsTable.isActive,
      isDropship: productsTable.isDropship,
      isFeatured: productsTable.isFeatured,
      categoryName: categoriesTable.name,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
    .where(eq(productsTable.id, product.id));

  res.json(UpdateProductResponse.parse(mapRow(row!)));
});

router.delete("/admin/products/:id", async (req, res): Promise<void> => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [product] = await db
    .delete(productsTable)
    .where(eq(productsTable.id, params.data.id))
    .returning();

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
