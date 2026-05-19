import { Router } from "express";
import { eq, asc } from "drizzle-orm";
import { db, availabilityTagsTable } from "@workspace/db";

const router = Router();

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

const DEFAULT_TAGS = [
  { value: "new",         label: "New Arrival",    sortOrder: 0 },
  { value: "sale",        label: "Sale",           sortOrder: 1 },
  { value: "hot",         label: "Hot / Trending", sortOrder: 2 },
  { value: "bestseller",  label: "Bestseller",     sortOrder: 3 },
  { value: "limited",     label: "Limited Edition",sortOrder: 4 },
  { value: "coming_soon", label: "Coming Soon",    sortOrder: 5 },
];

async function ensureDefaults() {
  const existing = await db.select().from(availabilityTagsTable);
  if (existing.length === 0) {
    await db.insert(availabilityTagsTable).values(DEFAULT_TAGS);
  }
}

// GET /availability-tags  (public)
router.get("/availability-tags", async (_req, res): Promise<void> => {
  await ensureDefaults();
  const tags = await db.select().from(availabilityTagsTable).orderBy(asc(availabilityTagsTable.sortOrder), asc(availabilityTagsTable.id));
  res.json(tags);
});

// GET /admin/availability-tags
router.get("/admin/availability-tags", async (_req, res): Promise<void> => {
  await ensureDefaults();
  const tags = await db.select().from(availabilityTagsTable).orderBy(asc(availabilityTagsTable.sortOrder), asc(availabilityTagsTable.id));
  res.json(tags);
});

// POST /admin/availability-tags
router.post("/admin/availability-tags", async (req, res): Promise<void> => {
  const { label } = req.body as { label?: string };
  if (!label || typeof label !== "string" || !label.trim()) {
    res.status(400).json({ error: "label is required" });
    return;
  }
  const value = slugify(label.trim());
  if (!value) {
    res.status(400).json({ error: "label produced an empty slug" });
    return;
  }
  const existing = await db.select().from(availabilityTagsTable).where(eq(availabilityTagsTable.value, value));
  if (existing.length > 0) {
    res.status(409).json({ error: "A tag with that name already exists" });
    return;
  }
  const [created] = await db.insert(availabilityTagsTable).values({ value, label: label.trim(), sortOrder: 99 }).returning();
  res.status(201).json(created);
});

// DELETE /admin/availability-tags/:id
router.delete("/admin/availability-tags/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  await db.delete(availabilityTagsTable).where(eq(availabilityTagsTable.id, id));
  res.status(204).end();
});

export default router;
