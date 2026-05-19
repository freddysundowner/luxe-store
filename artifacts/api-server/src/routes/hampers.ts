/**
 * /api/hampers — legacy alias over kind='bundle' products. The hampers table
 * is no longer the source of truth; everything reads/writes products. We keep
 * this route for backward compatibility with the GiftFinder, the admin
 * hampers pages, and the AI suggest endpoint until those flows are migrated
 * to /api/products?kind=bundle.
 */
import { Router } from "express";
import { eq, and, inArray, desc } from "drizzle-orm";
import { db, productsTable, productVariantsTable } from "@workspace/db";
import type { BundleItem } from "@workspace/db";
import { validateBundleItems } from "./products.js";

const router = Router();

// Returns a map of productId → total quantity reserved across every *active*
// bundle product. Standalone product availability is base stock minus this
// number, so adding a one-of product to a bundle effectively reserves it.
export async function getHamperReservations(productIds?: number[]): Promise<Map<number, number>> {
  const rows = await db
    .select({ bundleItems: productsTable.bundleItems })
    .from(productsTable)
    .where(and(eq(productsTable.isActive, true), eq(productsTable.kind, "bundle")));
  const out = new Map<number, number>();
  const filter = productIds ? new Set(productIds) : null;
  for (const row of rows) {
    const items = (row.bundleItems ?? []) as BundleItem[];
    for (const it of items) {
      if (filter && !filter.has(it.productId)) continue;
      out.set(it.productId, (out.get(it.productId) ?? 0) + it.quantity);
    }
  }
  return out;
}

interface HamperDto {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  items: BundleItem[];
  isActive: boolean;
  isFeatured: boolean;
  inStock: boolean;
  createdAt: string | null;
}

interface ProductAvailability { stock: number; isActive: boolean }
async function computeAvailabilityMap(items: BundleItem[]): Promise<Record<number, ProductAvailability>> {
  const productIds = Array.from(new Set(items.map((i) => i.productId)));
  if (productIds.length === 0) return {};
  const [products, variants] = await Promise.all([
    db.select().from(productsTable).where(inArray(productsTable.id, productIds)),
    db.select().from(productVariantsTable).where(inArray(productVariantsTable.productId, productIds)),
  ]);
  const variantStockByProduct: Record<number, number> = {};
  for (const v of variants) {
    variantStockByProduct[v.productId] = (variantStockByProduct[v.productId] ?? 0) + (v.stockQuantity ?? 0);
  }
  const result: Record<number, ProductAvailability> = {};
  for (const p of products) {
    const hasVariants = variantStockByProduct[p.id] !== undefined;
    result[p.id] = {
      stock: hasVariants ? variantStockByProduct[p.id] : (p.stockQuantity ?? 0),
      isActive: p.isActive ?? true,
    };
  }
  return result;
}

function isHamperInStock(items: BundleItem[], avail: Record<number, ProductAvailability>): boolean {
  if (items.length === 0) return false;
  const required: Record<number, number> = {};
  for (const it of items) required[it.productId] = (required[it.productId] ?? 0) + it.quantity;
  for (const [pidStr, qty] of Object.entries(required)) {
    const pid = Number(pidStr);
    const a = avail[pid];
    if (!a || !a.isActive || a.stock < qty) return false;
  }
  return true;
}

// Strip the legacy `[bundle:<hamperId>]` marker so legacy clients reading
// /hampers see the same description they did before the unification.
function stripBundleMarker(desc: string | null): string | null {
  if (!desc) return desc;
  return desc.replace(/^\[bundle:\d+\]\n?/, "") || null;
}

function toDto(row: typeof productsTable.$inferSelect, avail: Record<number, ProductAvailability>): HamperDto {
  const items = (row.bundleItems ?? []) as BundleItem[];
  const inStock = isHamperInStock(items, avail);
  return {
    id: row.id,
    name: row.name,
    description: stripBundleMarker(row.description),
    imageUrl: row.imageUrl,
    price: Number(row.price),
    items,
    isActive: row.isActive,
    isFeatured: row.isFeatured,
    inStock,
    createdAt: row.createdAt ? row.createdAt.toISOString() : null,
  };
}

// Public: list active bundles.
router.get("/hampers", async (_req, res) => {
  const rows = await db
    .select()
    .from(productsTable)
    .where(and(eq(productsTable.kind, "bundle"), eq(productsTable.isActive, true)))
    .orderBy(desc(productsTable.isFeatured), desc(productsTable.createdAt));
  const allItems = rows.flatMap((r) => (r.bundleItems ?? []) as BundleItem[]);
  const availability = await computeAvailabilityMap(allItems);
  res.json(rows.map((r) => toDto(r, availability)));
});

router.get("/hampers/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db
    .select()
    .from(productsTable)
    .where(and(eq(productsTable.id, id), eq(productsTable.kind, "bundle")));
  if (!row || !row.isActive) { res.status(404).json({ error: "Not found" }); return; }
  const availability = await computeAvailabilityMap((row.bundleItems ?? []) as BundleItem[]);
  res.json(toDto(row, availability));
});

router.get("/admin/hampers", async (_req, res) => {
  const rows = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.kind, "bundle"))
    .orderBy(desc(productsTable.createdAt));
  const allItems = rows.flatMap((r) => (r.bundleItems ?? []) as BundleItem[]);
  const availability = await computeAvailabilityMap(allItems);
  res.json(rows.map((r) => toDto(r, availability)));
});

interface HamperInputBody {
  name?: unknown;
  description?: unknown;
  imageUrl?: unknown;
  price?: unknown;
  items?: unknown;
  isActive?: unknown;
  isFeatured?: unknown;
}

async function parseInput(body: HamperInputBody): Promise<{
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: string;
  items: BundleItem[];
  isActive: boolean;
  isFeatured: boolean;
} | { error: string }> {
  if (typeof body.name !== "string" || body.name.trim().length === 0) return { error: "name is required" };
  const priceNum = typeof body.price === "number" ? body.price : Number(body.price);
  if (!Number.isFinite(priceNum) || priceNum < 0) return { error: "price must be a non-negative number" };
  // Delegate item validation to the shared bundle validator used by the
  // products admin endpoints — this enforces existence + no-nested-bundles
  // so the legacy /admin/hampers alias cannot create invalid data.
  const validated = await validateBundleItems(body.items);
  if ("error" in validated) return { error: validated.error };
  return {
    name: body.name.trim(),
    description: typeof body.description === "string" ? body.description : null,
    imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : null,
    price: priceNum.toFixed(2),
    items: validated.items,
    isActive: typeof body.isActive === "boolean" ? body.isActive : true,
    isFeatured: typeof body.isFeatured === "boolean" ? body.isFeatured : false,
  };
}

router.post("/admin/hampers", async (req, res): Promise<void> => {
  const parsed = await parseInput(req.body ?? {});
  if ("error" in parsed) { res.status(400).json({ error: parsed.error }); return; }
  const [row] = await db.insert(productsTable).values({
    name: parsed.name,
    description: parsed.description,
    imageUrl: parsed.imageUrl,
    images: parsed.imageUrl ? [parsed.imageUrl] : [],
    price: parsed.price,
    isActive: parsed.isActive,
    isFeatured: parsed.isFeatured,
    kind: "bundle",
    bundleItems: parsed.items,
    stockQuantity: 0,
    inStock: true,
  }).returning();
  const availability = await computeAvailabilityMap(parsed.items);
  res.status(201).json(toDto(row, availability));
});

router.put("/admin/hampers/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = await parseInput(req.body ?? {});
  if ("error" in parsed) { res.status(400).json({ error: parsed.error }); return; }
  const [row] = await db
    .update(productsTable)
    .set({
      name: parsed.name,
      description: parsed.description,
      imageUrl: parsed.imageUrl,
      images: parsed.imageUrl ? [parsed.imageUrl] : [],
      price: parsed.price,
      isActive: parsed.isActive,
      isFeatured: parsed.isFeatured,
      bundleItems: parsed.items,
    })
    .where(and(eq(productsTable.id, id), eq(productsTable.kind, "bundle")))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  const availability = await computeAvailabilityMap(parsed.items);
  res.json(toDto(row, availability));
});

router.delete("/admin/hampers/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db
    .delete(productsTable)
    .where(and(eq(productsTable.id, id), eq(productsTable.kind, "bundle")))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.status(204).end();
});

export default router;
