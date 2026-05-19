import { Router } from "express";
import { eq, and, ilike, inArray, asc } from "drizzle-orm";
import { db, productsTable, productVariantsTable, categoriesTable } from "@workspace/db";
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

const productSelect = {
  id: productsTable.id,
  name: productsTable.name,
  description: productsTable.description,
  price: productsTable.price,
  originalPrice: productsTable.originalPrice,
  categoryId: productsTable.categoryId,
  imageUrl: productsTable.imageUrl,
  images: productsTable.images,
  inStock: productsTable.inStock,
  isActive: productsTable.isActive,
  isDropship: productsTable.isDropship,
  isFeatured: productsTable.isFeatured,
  stockQuantity: productsTable.stockQuantity,
  availabilityTag: productsTable.availabilityTag,
  createdAt: productsTable.createdAt,
  categoryName: categoriesTable.name,
} as const;

interface VariantOut {
  id: number;
  name: string;
  price: number | null;
  stockQuantity: number;
  isActive: boolean;
  sortOrder: number;
}

async function fetchVariantsByProductIds(ids: number[]): Promise<Map<number, VariantOut[]>> {
  const map = new Map<number, VariantOut[]>();
  if (ids.length === 0) return map;
  const rows = await db
    .select()
    .from(productVariantsTable)
    .where(inArray(productVariantsTable.productId, ids))
    .orderBy(asc(productVariantsTable.sortOrder), asc(productVariantsTable.id));
  for (const v of rows) {
    const arr = map.get(v.productId) ?? [];
    arr.push({
      id: v.id,
      name: v.name,
      price: v.price != null ? parseFloat(v.price) : null,
      stockQuantity: v.stockQuantity,
      isActive: v.isActive,
      sortOrder: v.sortOrder,
    });
    map.set(v.productId, arr);
  }
  return map;
}

function mapRow(
  row: {
    id: number;
    name: string;
    description: string | null;
    price: string;
    originalPrice: string | null;
    categoryId: number | null;
    imageUrl: string | null;
    images: string[];
    inStock: boolean;
    isActive: boolean;
    isDropship: boolean;
    isFeatured: boolean;
    stockQuantity: number;
    availabilityTag: string | null;
    createdAt: Date;
    categoryName: string | null;
  },
  variants: VariantOut[] = []
) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: parseFloat(row.price),
    originalPrice: row.originalPrice != null ? parseFloat(row.originalPrice) : null,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    // For legacy rows that pre-date the `images` column, fall back to the
    // single cover. Keep `imageUrl` and `images[0]` in lock-step so existing
    // consumers (cards, OG tags, JSON-LD) keep working.
    imageUrl: row.images.length > 0 ? row.images[0] : row.imageUrl,
    images: row.images.length > 0 ? row.images : (row.imageUrl ? [row.imageUrl] : []),
    inStock: row.inStock,
    isActive: row.isActive,
    isDropship: row.isDropship,
    isFeatured: row.isFeatured,
    stockQuantity: row.stockQuantity,
    availabilityTag: row.availabilityTag,
    variants,
    createdAt: row.createdAt.toISOString(),
  };
}

interface VariantInput {
  id?: number;
  name: string;
  price?: number | null;
  stockQuantity: number;
  isActive?: boolean;
  sortOrder?: number;
}

async function syncVariants(productId: number, variants: VariantInput[]): Promise<void> {
  // Run the whole upsert in a transaction so a mid-operation failure can't
  // leave the product with half its variants deleted.
  await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: productVariantsTable.id })
      .from(productVariantsTable)
      .where(eq(productVariantsTable.productId, productId));
    const existingIds = new Set(existing.map((e) => e.id));

    // Only honour input ids that actually belong to this product. Stray ids
    // would otherwise no-op on UPDATE while the preceding DELETE pass wipes
    // valid rows. Treat unknown ids as inserts instead.
    const normalised = variants.map((v) => ({
      ...v,
      id: v.id != null && existingIds.has(v.id) ? v.id : undefined,
    }));
    const keptIds = new Set(normalised.filter((v) => v.id != null).map((v) => v.id as number));
    const toDelete = [...existingIds].filter((id) => !keptIds.has(id));
    if (toDelete.length > 0) {
      await tx.delete(productVariantsTable).where(inArray(productVariantsTable.id, toDelete));
    }
    for (let i = 0; i < normalised.length; i++) {
      const v = normalised[i];
      const data = {
        name: v.name,
        price: v.price != null ? String(v.price) : null,
        stockQuantity: v.stockQuantity,
        isActive: v.isActive ?? true,
        sortOrder: v.sortOrder ?? i,
      };
      if (v.id != null) {
        await tx
          .update(productVariantsTable)
          .set(data)
          .where(and(eq(productVariantsTable.id, v.id), eq(productVariantsTable.productId, productId)));
      } else {
        await tx.insert(productVariantsTable).values({ productId, ...data });
      }
    }
  });
}

router.get("/products", async (req, res): Promise<void> => {
  const query = ListProductsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { categoryId, search, featured } = query.data;
  const conditions = [eq(productsTable.isActive, true)];

  if (categoryId != null) conditions.push(eq(productsTable.categoryId, categoryId));
  if (search) conditions.push(ilike(productsTable.name, `%${search}%`));
  if (featured === true) conditions.push(eq(productsTable.isFeatured, true));

  const rows = await db
    .select(productSelect)
    .from(productsTable)
    .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
    .where(and(...conditions))
    .orderBy(productsTable.createdAt);

  const variantMap = await fetchVariantsByProductIds(rows.map((r) => r.id));
  res.json(ListProductsResponse.parse(rows.map((r) => mapRow(r, variantMap.get(r.id) ?? []))));
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select(productSelect)
    .from(productsTable)
    .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
    .where(eq(productsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const variantMap = await fetchVariantsByProductIds([row.id]);
  res.json(GetProductResponse.parse(mapRow(row, variantMap.get(row.id) ?? [])));
});

router.get("/admin/products", async (req, res): Promise<void> => {
  const rows = await db
    .select(productSelect)
    .from(productsTable)
    .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
    .orderBy(productsTable.createdAt);

  const variantMap = await fetchVariantsByProductIds(rows.map((r) => r.id));
  res.json(ListAdminProductsResponse.parse(rows.map((r) => mapRow(r, variantMap.get(r.id) ?? []))));
});

router.post("/admin/products", async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { price, originalPrice, variants, images, imageUrl, ...rest } = parsed.data;
  // Normalise the gallery: drop blanks/dupes, and keep `imageUrl` in sync with
  // the cover so single-image consumers keep working.
  const normalisedImages = (images ?? []).map((s) => s.trim()).filter(Boolean);
  const dedupedImages = Array.from(new Set(normalisedImages));
  const coverUrl = dedupedImages[0] ?? (imageUrl?.trim() || null);
  const [product] = await db
    .insert(productsTable)
    .values({
      ...rest,
      price: String(price),
      originalPrice: originalPrice != null ? String(originalPrice) : null,
      images: dedupedImages,
      imageUrl: coverUrl,
    })
    .returning();

  if (variants && variants.length > 0) {
    await syncVariants(product.id, variants);
  }

  const [row] = await db
    .select(productSelect)
    .from(productsTable)
    .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
    .where(eq(productsTable.id, product.id));

  const variantMap = await fetchVariantsByProductIds([row!.id]);
  res.status(201).json(GetProductResponse.parse(mapRow(row!, variantMap.get(row!.id) ?? [])));
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

  const { price, originalPrice, variants, images, imageUrl, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = { ...rest };
  if (price !== undefined) updateData.price = String(price);
  if (originalPrice !== undefined) updateData.originalPrice = originalPrice != null ? String(originalPrice) : null;
  // When the client supplies a gallery, normalise it and keep `imageUrl` in
  // sync with the cover. When only `imageUrl` is supplied, leave `images`
  // untouched — the legacy single-image flow still works.
  if (images !== undefined) {
    const normalised = images.map((s) => s.trim()).filter(Boolean);
    const deduped = Array.from(new Set(normalised));
    updateData.images = deduped;
    updateData.imageUrl = deduped[0] ?? (imageUrl?.trim() || null);
  } else if (imageUrl !== undefined) {
    updateData.imageUrl = imageUrl?.trim() || null;
  }

  const [product] = await db
    .update(productsTable)
    .set(updateData)
    .where(eq(productsTable.id, params.data.id))
    .returning();

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  if (variants !== undefined) {
    await syncVariants(product.id, variants);
  }

  const [row] = await db
    .select(productSelect)
    .from(productsTable)
    .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
    .where(eq(productsTable.id, product.id));

  const variantMap = await fetchVariantsByProductIds([row!.id]);
  res.json(UpdateProductResponse.parse(mapRow(row!, variantMap.get(row!.id) ?? [])));
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
