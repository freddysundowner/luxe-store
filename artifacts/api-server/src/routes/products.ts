import { Router } from "express";
import { eq, and, ilike, inArray, asc } from "drizzle-orm";
import { db, productsTable, productVariantsTable, categoriesTable } from "@workspace/db";
import { getHamperReservations } from "./hampers";
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

type ImageSettingsBlob = Record<string, { fit: "cover" | "contain"; focalX: number; focalY: number }>;

// Keep only entries whose URL is still in the gallery. When `images` is
// undefined (caller didn't touch the gallery), we keep every entry — pruning
// would lose settings on routine field updates.
function pruneImageSettings(
  settings: ImageSettingsBlob | undefined,
  images: string[] | undefined,
): ImageSettingsBlob {
  if (!settings) return {};
  if (!images) return settings;
  const allowed = new Set(images);
  const out: ImageSettingsBlob = {};
  for (const [url, cfg] of Object.entries(settings)) {
    if (allowed.has(url)) out[url] = cfg;
  }
  return out;
}

const productSelect = {
  id: productsTable.id,
  name: productsTable.name,
  description: productsTable.description,
  price: productsTable.price,
  originalPrice: productsTable.originalPrice,
  categoryId: productsTable.categoryId,
  imageUrl: productsTable.imageUrl,
  images: productsTable.images,
  imageSettings: productsTable.imageSettings,
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

// Apply hamper reservations: standalone stock = base - reservedInActiveHampers.
// Reservation only affects products WITHOUT variants (hampers reference
// productIds, not variants); variant-backed products keep their variant stock.
function applyReservation(
  row: { stockQuantity: number; inStock: boolean },
  reserved: number,
  hasVariants: boolean,
): { stockQuantity: number; inStock: boolean } {
  if (hasVariants || reserved <= 0) return { stockQuantity: row.stockQuantity, inStock: row.inStock };
  const effective = Math.max(0, row.stockQuantity - reserved);
  return { stockQuantity: effective, inStock: row.inStock && effective > 0 };
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
    imageSettings: Record<string, { fit: "cover" | "contain"; focalX: number; focalY: number }>;
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
    imageSettings: row.imageSettings ?? {},
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
  const reservations = await getHamperReservations(rows.map((r) => r.id));
  res.json(
    ListProductsResponse.parse(
      rows.map((r) => {
        const variants = variantMap.get(r.id) ?? [];
        const adjusted = applyReservation(r, reservations.get(r.id) ?? 0, variants.length > 0);
        return mapRow({ ...r, ...adjusted }, variants);
      }),
    ),
  );
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
  const variants = variantMap.get(row.id) ?? [];
  const reservations = await getHamperReservations([row.id]);
  const adjusted = applyReservation(row, reservations.get(row.id) ?? 0, variants.length > 0);
  res.json(GetProductResponse.parse(mapRow({ ...row, ...adjusted }, variants)));
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

  const { price, originalPrice, variants, images, imageUrl, imageSettings, ...rest } = parsed.data;
  // Normalise the gallery: drop blanks/dupes, and keep `imageUrl` in sync with
  // the cover so single-image consumers keep working.
  const normalisedImages = (images ?? []).map((s) => s.trim()).filter(Boolean);
  const dedupedImages = Array.from(new Set(normalisedImages));
  const coverUrl = dedupedImages[0] ?? (imageUrl?.trim() || null);
  // Effective gallery for settings pruning: when the caller used the legacy
  // single-image path (no `images`, just `imageUrl`), the cover is still the
  // one valid URL and its settings must be preserved.
  const effectiveGallery = dedupedImages.length > 0
    ? dedupedImages
    : (coverUrl ? [coverUrl] : []);
  const prunedSettings = pruneImageSettings(imageSettings, effectiveGallery);
  const [product] = await db
    .insert(productsTable)
    .values({
      ...rest,
      price: String(price),
      originalPrice: originalPrice != null ? String(originalPrice) : null,
      images: dedupedImages,
      imageUrl: coverUrl,
      imageSettings: prunedSettings,
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

  const { price, originalPrice, variants, images, imageUrl, imageSettings, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = { ...rest };
  if (price !== undefined) updateData.price = String(price);
  if (originalPrice !== undefined) updateData.originalPrice = originalPrice != null ? String(originalPrice) : null;
  // When the client supplies a gallery, normalise it and keep `imageUrl` in
  // sync with the cover. When only `imageUrl` is supplied, leave `images`
  // untouched — the legacy single-image flow still works.
  let finalImages: string[] | undefined;
  if (images !== undefined) {
    const normalised = images.map((s) => s.trim()).filter(Boolean);
    const deduped = Array.from(new Set(normalised));
    updateData.images = deduped;
    updateData.imageUrl = deduped[0] ?? (imageUrl?.trim() || null);
    finalImages = deduped;
  } else if (imageUrl !== undefined) {
    updateData.imageUrl = imageUrl?.trim() || null;
  }
  // Image settings handling — two cases:
  //  1. Client sent `imageSettings`: trust it, but prune to the final gallery
  //     so removed URLs don't leave orphaned focal points.
  //  2. Client didn't send `imageSettings` but DID change `images`: load the
  //     existing settings and prune them too, otherwise stale entries linger
  //     in the jsonb blob forever.
  if (imageSettings !== undefined) {
    updateData.imageSettings = pruneImageSettings(imageSettings, finalImages);
  } else if (finalImages !== undefined) {
    const [existing] = await db
      .select({ imageSettings: productsTable.imageSettings })
      .from(productsTable)
      .where(eq(productsTable.id, params.data.id));
    if (existing) {
      updateData.imageSettings = pruneImageSettings(existing.imageSettings ?? {}, finalImages);
    }
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
