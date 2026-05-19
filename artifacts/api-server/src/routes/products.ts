import { Router } from "express";
import { eq, and, ilike, inArray, asc } from "drizzle-orm";
import { db, productsTable, productVariantsTable, categoriesTable } from "@workspace/db";
import type { BundleItem, ProductKind } from "@workspace/db";
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
  kind: productsTable.kind,
  bundleItems: productsTable.bundleItems,
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

interface ProductRow {
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
  kind: ProductKind;
  bundleItems: BundleItem[];
  createdAt: Date;
  categoryName: string | null;
}

// Bundle-product description carries a `[bundle:<hamperId>]` marker prefix
// from the migration script. Strip it so customers/admins don't see the
// internal token. Keep it intact in the DB for idempotency.
function stripBundleMarker(desc: string | null): string | null {
  if (!desc) return desc;
  return desc.replace(/^\[bundle:\d+\]\n?/, "") || null;
}

interface BundleProductSummary {
  id: number;
  name: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
}

function mapRow(
  row: ProductRow,
  variants: VariantOut[] = [],
  bundleProducts: BundleProductSummary[] | null = null,
) {
  return {
    id: row.id,
    name: row.name,
    description: stripBundleMarker(row.description),
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
    kind: row.kind,
    bundleItems: row.bundleItems ?? [],
    bundleProducts,
    createdAt: row.createdAt.toISOString(),
  };
}

// Resolve every bundle's components to a flat per-bundle list of summaries.
// One query fetches all referenced products at once. Returns a Map keyed by
// bundle product id → array of summaries (preserving the bundle's item order).
async function fetchBundleProductsMap(rows: ProductRow[]): Promise<Map<number, BundleProductSummary[]>> {
  const out = new Map<number, BundleProductSummary[]>();
  const bundleRows = rows.filter((r) => r.kind === "bundle" && (r.bundleItems?.length ?? 0) > 0);
  if (bundleRows.length === 0) return out;
  const allIds = Array.from(new Set(bundleRows.flatMap((r) => r.bundleItems.map((i) => i.productId))));
  if (allIds.length === 0) return out;
  const components = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      price: productsTable.price,
      imageUrl: productsTable.imageUrl,
      images: productsTable.images,
      isActive: productsTable.isActive,
    })
    .from(productsTable)
    .where(inArray(productsTable.id, allIds));
  const compById = new Map(components.map((c) => [c.id, c]));
  for (const r of bundleRows) {
    const list: BundleProductSummary[] = [];
    for (const it of r.bundleItems) {
      const c = compById.get(it.productId);
      if (!c) continue; // skip dangling references
      list.push({
        id: c.id,
        name: c.name,
        price: parseFloat(c.price),
        imageUrl: c.images.length > 0 ? c.images[0] : c.imageUrl,
        quantity: it.quantity,
      });
    }
    out.set(r.id, list);
  }
  return out;
}

// Compute bundle-level inStock: every component product must be active and
// have stock ≥ the required quantity (summed across duplicate item entries).
// Uses variant stock when a component has variants; otherwise stockQuantity.
async function computeBundleInStockMap(rows: ProductRow[]): Promise<Map<number, boolean>> {
  const out = new Map<number, boolean>();
  const bundles = rows.filter((r) => r.kind === "bundle");
  if (bundles.length === 0) return out;
  const allIds = Array.from(new Set(bundles.flatMap((r) => r.bundleItems.map((i) => i.productId))));
  if (allIds.length === 0) {
    for (const b of bundles) out.set(b.id, false);
    return out;
  }
  const [components, variants] = await Promise.all([
    db
      .select({ id: productsTable.id, stockQuantity: productsTable.stockQuantity, isActive: productsTable.isActive })
      .from(productsTable)
      .where(inArray(productsTable.id, allIds)),
    db
      .select({ productId: productVariantsTable.productId, stockQuantity: productVariantsTable.stockQuantity })
      .from(productVariantsTable)
      .where(inArray(productVariantsTable.productId, allIds)),
  ]);
  const variantStockByProduct = new Map<number, number>();
  for (const v of variants) {
    variantStockByProduct.set(v.productId, (variantStockByProduct.get(v.productId) ?? 0) + v.stockQuantity);
  }
  const availMap = new Map<number, { stock: number; isActive: boolean }>();
  for (const c of components) {
    const variantStock = variantStockByProduct.get(c.id);
    availMap.set(c.id, {
      stock: variantStock !== undefined ? variantStock : c.stockQuantity,
      isActive: c.isActive,
    });
  }
  for (const b of bundles) {
    if (b.bundleItems.length === 0) { out.set(b.id, false); continue; }
    const required = new Map<number, number>();
    for (const it of b.bundleItems) required.set(it.productId, (required.get(it.productId) ?? 0) + it.quantity);
    let ok = true;
    for (const [pid, qty] of required) {
      const a = availMap.get(pid);
      if (!a || !a.isActive || a.stock < qty) { ok = false; break; }
    }
    out.set(b.id, ok);
  }
  return out;
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

  const { categoryId, search, featured, kind } = query.data;
  const conditions = [eq(productsTable.isActive, true)];

  if (categoryId != null) conditions.push(eq(productsTable.categoryId, categoryId));
  if (search) conditions.push(ilike(productsTable.name, `%${search}%`));
  if (featured === true) conditions.push(eq(productsTable.isFeatured, true));
  if (kind === "simple" || kind === "bundle") conditions.push(eq(productsTable.kind, kind));

  const rows = (await db
    .select(productSelect)
    .from(productsTable)
    .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
    .where(and(...conditions))
    .orderBy(productsTable.createdAt)) as ProductRow[];

  const variantMap = await fetchVariantsByProductIds(rows.map((r) => r.id));
  const reservations = await getHamperReservations(rows.map((r) => r.id));
  const [bundleProductsMap, bundleInStockMap] = await Promise.all([
    fetchBundleProductsMap(rows),
    computeBundleInStockMap(rows),
  ]);
  res.json(
    ListProductsResponse.parse(
      rows.map((r) => {
        const variants = variantMap.get(r.id) ?? [];
        if (r.kind === "bundle") {
          const inStock = bundleInStockMap.get(r.id) ?? false;
          return mapRow({ ...r, inStock, stockQuantity: 0 }, [], bundleProductsMap.get(r.id) ?? []);
        }
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

  const [row] = (await db
    .select(productSelect)
    .from(productsTable)
    .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
    .where(eq(productsTable.id, params.data.id))) as ProductRow[];

  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  if (row.kind === "bundle") {
    const [bundleProductsMap, bundleInStockMap] = await Promise.all([
      fetchBundleProductsMap([row]),
      computeBundleInStockMap([row]),
    ]);
    res.json(GetProductResponse.parse(
      mapRow(
        { ...row, inStock: bundleInStockMap.get(row.id) ?? false, stockQuantity: 0 },
        [],
        bundleProductsMap.get(row.id) ?? [],
      ),
    ));
    return;
  }

  const variantMap = await fetchVariantsByProductIds([row.id]);
  const variants = variantMap.get(row.id) ?? [];
  const reservations = await getHamperReservations([row.id]);
  const adjusted = applyReservation(row, reservations.get(row.id) ?? 0, variants.length > 0);
  res.json(GetProductResponse.parse(mapRow({ ...row, ...adjusted }, variants)));
});

router.get("/admin/products", async (_req, res): Promise<void> => {
  const rows = (await db
    .select(productSelect)
    .from(productsTable)
    .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
    .orderBy(productsTable.createdAt)) as ProductRow[];

  const variantMap = await fetchVariantsByProductIds(rows.map((r) => r.id));
  const [bundleProductsMap, bundleInStockMap] = await Promise.all([
    fetchBundleProductsMap(rows),
    computeBundleInStockMap(rows),
  ]);
  res.json(
    ListAdminProductsResponse.parse(
      rows.map((r) => {
        if (r.kind === "bundle") {
          return mapRow(
            { ...r, inStock: bundleInStockMap.get(r.id) ?? false, stockQuantity: 0 },
            [],
            bundleProductsMap.get(r.id) ?? [],
          );
        }
        return mapRow(r, variantMap.get(r.id) ?? []);
      }),
    ),
  );
});

// Validate bundle items: non-empty array of {productId,quantity≥1} pointing
// to existing simple products. Returns sanitised items or an error string.
export async function validateBundleItems(raw: unknown): Promise<{ items: BundleItem[] } | { error: string }> {
  if (!Array.isArray(raw) || raw.length === 0) return { error: "bundleItems must be a non-empty array" };
  const items: BundleItem[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") return { error: "invalid bundle item" };
    const o = r as { productId?: unknown; quantity?: unknown };
    const productId = typeof o.productId === "number" ? o.productId : Number(o.productId);
    const quantity = typeof o.quantity === "number" ? o.quantity : Number(o.quantity);
    if (!Number.isInteger(productId) || productId <= 0) return { error: "invalid bundle item productId" };
    if (!Number.isInteger(quantity) || quantity <= 0) return { error: "invalid bundle item quantity" };
    items.push({ productId, quantity });
  }
  // Verify all referenced products exist and are not themselves bundles
  // (no nested bundles — keeps stock logic and cart resolution simple).
  const ids = Array.from(new Set(items.map((i) => i.productId)));
  const found = await db
    .select({ id: productsTable.id, kind: productsTable.kind })
    .from(productsTable)
    .where(inArray(productsTable.id, ids));
  const foundIds = new Set(found.map((f) => f.id));
  for (const id of ids) if (!foundIds.has(id)) return { error: `bundle item references unknown product #${id}` };
  if (found.some((f) => f.kind === "bundle")) return { error: "bundle items cannot themselves be bundles" };
  return { items };
}

router.post("/admin/products", async (req, res): Promise<void> => {
  console.log("[POST /admin/products] req.body kind=", (req.body as { kind?: unknown })?.kind, "bundleItems=", JSON.stringify((req.body as { bundleItems?: unknown })?.bundleItems));
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { price, originalPrice, variants, images, imageUrl, imageSettings, kind, bundleItems, ...rest } = parsed.data;
  const productKind: ProductKind = kind === "bundle" ? "bundle" : "simple";

  let validatedBundleItems: BundleItem[] = [];
  if (productKind === "bundle") {
    const result = await validateBundleItems(bundleItems);
    if ("error" in result) { res.status(400).json({ error: result.error }); return; }
    validatedBundleItems = result.items;
  }

  // Normalise the gallery: drop blanks/dupes, and keep `imageUrl` in sync with
  // the cover so single-image consumers keep working.
  const normalisedImages = (images ?? []).map((s) => s.trim()).filter(Boolean);
  const dedupedImages = Array.from(new Set(normalisedImages));
  const coverUrl = dedupedImages[0] ?? (imageUrl?.trim() || null);
  const effectiveGallery = dedupedImages.length > 0
    ? dedupedImages
    : (coverUrl ? [coverUrl] : []);
  const prunedSettings = pruneImageSettings(imageSettings, effectiveGallery);
  const [product] = await db
    .insert(productsTable)
    .values({
      ...rest,
      // Bundles ignore stockQuantity; force 0 so the column doesn't leak misleading data.
      stockQuantity: productKind === "bundle" ? 0 : rest.stockQuantity,
      price: String(price),
      originalPrice: originalPrice != null ? String(originalPrice) : null,
      images: dedupedImages,
      imageUrl: coverUrl,
      imageSettings: prunedSettings,
      kind: productKind,
      bundleItems: validatedBundleItems,
    })
    .returning();

  // Bundles never have variants — silently ignore any `variants` payload.
  if (productKind === "simple" && variants && variants.length > 0) {
    await syncVariants(product.id, variants);
  }

  const [row] = (await db
    .select(productSelect)
    .from(productsTable)
    .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
    .where(eq(productsTable.id, product.id))) as ProductRow[];

  if (row.kind === "bundle") {
    const [bp, bs] = await Promise.all([fetchBundleProductsMap([row]), computeBundleInStockMap([row])]);
    res.status(201).json(GetProductResponse.parse(
      mapRow({ ...row, inStock: bs.get(row.id) ?? false, stockQuantity: 0 }, [], bp.get(row.id) ?? []),
    ));
    return;
  }
  const variantMap = await fetchVariantsByProductIds([row.id]);
  res.status(201).json(GetProductResponse.parse(mapRow(row, variantMap.get(row.id) ?? [])));
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

  const { price, originalPrice, variants, images, imageUrl, imageSettings, kind, bundleItems, ...rest } = parsed.data;
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

  // Kind + bundleItems handling. If switching to bundle (or already bundle and
  // updating items), validate. Switching to simple wipes the bundleItems blob.
  let effectiveKind: ProductKind | undefined;
  if (kind === "simple" || kind === "bundle") {
    effectiveKind = kind;
    updateData.kind = kind;
    if (kind === "simple") updateData.bundleItems = [];
  }
  if (bundleItems !== undefined) {
    const result = await validateBundleItems(bundleItems);
    if ("error" in result) { res.status(400).json({ error: result.error }); return; }
    updateData.bundleItems = result.items;
    // If kind wasn't explicitly set but items were supplied, ensure kind=bundle.
    if (effectiveKind === undefined) {
      effectiveKind = "bundle";
      updateData.kind = "bundle";
    }
  }
  // If the effective kind is bundle, the row must end up with a non-empty
  // bundleItems array — either supplied in this request or already present.
  // Reject attempts to promote a product to bundle without items.
  if (effectiveKind === "bundle" && bundleItems === undefined) {
    const [existingBundle] = await db
      .select({ bundleItems: productsTable.bundleItems, kind: productsTable.kind })
      .from(productsTable)
      .where(eq(productsTable.id, params.data.id));
    const existingItems = (existingBundle?.bundleItems ?? []) as BundleItem[];
    if (existingItems.length === 0) {
      res.status(400).json({ error: "bundleItems must be a non-empty array" });
      return;
    }
  }
  if (effectiveKind === "bundle") {
    updateData.stockQuantity = 0;
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

  if (variants !== undefined && product.kind !== "bundle") {
    await syncVariants(product.id, variants);
  } else if (product.kind === "bundle") {
    // Defensive: bundles never have variants. If we just switched a product to
    // bundle, drop any pre-existing variants so they don't ghost the UI.
    await db.delete(productVariantsTable).where(eq(productVariantsTable.productId, product.id));
  }

  const [row] = (await db
    .select(productSelect)
    .from(productsTable)
    .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
    .where(eq(productsTable.id, product.id))) as ProductRow[];

  if (row.kind === "bundle") {
    const [bp, bs] = await Promise.all([fetchBundleProductsMap([row]), computeBundleInStockMap([row])]);
    res.json(UpdateProductResponse.parse(
      mapRow({ ...row, inStock: bs.get(row.id) ?? false, stockQuantity: 0 }, [], bp.get(row.id) ?? []),
    ));
    return;
  }
  const variantMap = await fetchVariantsByProductIds([row.id]);
  res.json(UpdateProductResponse.parse(mapRow(row, variantMap.get(row.id) ?? [])));
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
