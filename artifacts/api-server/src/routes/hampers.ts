import { Router } from "express";
import { eq, inArray, desc } from "drizzle-orm";
import { db, hampersTable, productsTable, productVariantsTable } from "@workspace/db";
import type { HamperItem as DbHamperItem } from "@workspace/db";

const router = Router();

// Returns a map of productId -> total quantity reserved across every *active*
// hamper. Standalone product availability is base stock minus this number, so
// adding a one-of product to a hamper effectively reserves that unit and
// removes it from solo sale.
export async function getHamperReservations(productIds?: number[]): Promise<Map<number, number>> {
  const rows = await db
    .select({ items: hampersTable.items })
    .from(hampersTable)
    .where(eq(hampersTable.isActive, true));
  const out = new Map<number, number>();
  const filter = productIds ? new Set(productIds) : null;
  for (const row of rows) {
    const items = (row.items ?? []) as DbHamperItem[];
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
  items: { productId: number; quantity: number }[];
  isActive: boolean;
  isFeatured: boolean;
  inStock: boolean;
  createdAt: string | null;
}

// A hamper is in stock when every component product has enough inventory for
// the configured quantity. Products without variants use stockQuantity; for
// products with variants, we sum variant stock as the total available.
// Returns a map of productId -> available stock units, plus product activity.
// `inStock` for a hamper is computed downstream by summing the *required*
// quantity per product (across duplicate item entries) and comparing against
// available stock — so a hamper needing 3× of a product with stock 1 is OoS.
interface ProductAvailability { stock: number; isActive: boolean }
async function computeAvailabilityMap(items: DbHamperItem[]): Promise<Record<number, ProductAvailability>> {
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

function isHamperInStock(items: DbHamperItem[], avail: Record<number, ProductAvailability>): boolean {
  if (items.length === 0) return false;
  // Aggregate required quantity across duplicate productId entries.
  const required: Record<number, number> = {};
  for (const it of items) required[it.productId] = (required[it.productId] ?? 0) + it.quantity;
  for (const [pidStr, qty] of Object.entries(required)) {
    const pid = Number(pidStr);
    const a = avail[pid];
    if (!a || !a.isActive || a.stock < qty) return false;
  }
  return true;
}

function toDto(row: typeof hampersTable.$inferSelect, avail: Record<number, ProductAvailability>): HamperDto {
  const items = (row.items ?? []) as DbHamperItem[];
  const inStock = isHamperInStock(items, avail);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    imageUrl: row.imageUrl,
    price: Number(row.price),
    items,
    isActive: row.isActive,
    isFeatured: row.isFeatured,
    inStock,
    createdAt: row.createdAt ? row.createdAt.toISOString() : null,
  };
}

// Public: list active hampers.
router.get("/hampers", async (_req, res) => {
  const rows = await db
    .select()
    .from(hampersTable)
    .where(eq(hampersTable.isActive, true))
    .orderBy(desc(hampersTable.isFeatured), desc(hampersTable.createdAt));
  const allItems = rows.flatMap((r) => (r.items ?? []) as DbHamperItem[]);
  const availability = await computeAvailabilityMap(allItems);
  res.json(rows.map((r) => toDto(r, availability)));
});

// Public: single hamper by id (still requires isActive=true for safety).
router.get("/hampers/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.select().from(hampersTable).where(eq(hampersTable.id, id));
  if (!row || !row.isActive) { res.status(404).json({ error: "Not found" }); return; }
  const availability = await computeAvailabilityMap((row.items ?? []) as DbHamperItem[]);
  res.json(toDto(row, availability));
});

// Admin: list everything (including inactive).
router.get("/admin/hampers", async (_req, res) => {
  const rows = await db
    .select()
    .from(hampersTable)
    .orderBy(desc(hampersTable.createdAt));
  const allItems = rows.flatMap((r) => (r.items ?? []) as DbHamperItem[]);
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

function parseInput(body: HamperInputBody): {
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: string;
  items: DbHamperItem[];
  isActive: boolean;
  isFeatured: boolean;
} | { error: string } {
  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    return { error: "name is required" };
  }
  const priceNum = typeof body.price === "number" ? body.price : Number(body.price);
  if (!Number.isFinite(priceNum) || priceNum < 0) {
    return { error: "price must be a non-negative number" };
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return { error: "items must be a non-empty array" };
  }
  const items: DbHamperItem[] = [];
  for (const raw of body.items) {
    if (!raw || typeof raw !== "object") return { error: "invalid item" };
    const r = raw as { productId?: unknown; quantity?: unknown };
    const productId = typeof r.productId === "number" ? r.productId : Number(r.productId);
    const quantity = typeof r.quantity === "number" ? r.quantity : Number(r.quantity);
    if (!Number.isInteger(productId) || productId <= 0) return { error: "invalid productId" };
    if (!Number.isInteger(quantity) || quantity <= 0) return { error: "invalid quantity" };
    items.push({ productId, quantity });
  }
  return {
    name: body.name.trim(),
    description: typeof body.description === "string" ? body.description : null,
    imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : null,
    price: priceNum.toFixed(2),
    items,
    isActive: typeof body.isActive === "boolean" ? body.isActive : true,
    isFeatured: typeof body.isFeatured === "boolean" ? body.isFeatured : false,
  };
}

router.post("/admin/hampers", async (req, res): Promise<void> => {
  const parsed = parseInput(req.body ?? {});
  if ("error" in parsed) { res.status(400).json({ error: parsed.error }); return; }
  const [row] = await db.insert(hampersTable).values(parsed).returning();
  const availability = await computeAvailabilityMap(row.items as DbHamperItem[]);
  res.status(201).json(toDto(row, availability));
});

router.put("/admin/hampers/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = parseInput(req.body ?? {});
  if ("error" in parsed) { res.status(400).json({ error: parsed.error }); return; }
  const [row] = await db
    .update(hampersTable)
    .set(parsed)
    .where(eq(hampersTable.id, id))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  const availability = await computeAvailabilityMap(row.items as DbHamperItem[]);
  res.json(toDto(row, availability));
});

router.delete("/admin/hampers/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.delete(hampersTable).where(eq(hampersTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.status(204).end();
});

export default router;
