/**
 * /api/hampers — read-only alias over kind='bundle' products. The hampers
 * table is no longer the source of truth; everything reads from products.
 * Admin CRUD has moved to /api/admin/products (with kind='bundle'); these
 * public endpoints are retained for back-compat with GiftFinder.
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

// Admin hamper CRUD removed — bundles are now managed via /admin/products
// (kind='bundle'). The public read-only /hampers endpoints above are kept
// as a thin alias for GiftFinder/AI back-compat.

export default router;
