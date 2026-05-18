import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, storeSettingsTable } from "@workspace/db";
import {
  GetSettingsResponse,
  UpdateSettingsBody,
  UpdateSettingsResponse,
} from "@workspace/api-zod";

const router = Router();

async function getOrCreateSettings() {
  const rows = await db.select().from(storeSettingsTable).limit(1);
  if (rows.length > 0) return rows[0];

  const [created] = await db
    .insert(storeSettingsTable)
    .values({
      storeName: "My Shop",
      whatsappNumber: "",
      currency: "KES",
      currencySymbol: "KSh",
    })
    .returning();

  return created;
}

router.get("/settings", async (req, res): Promise<void> => {
  const settings = await getOrCreateSettings();
  res.json(GetSettingsResponse.parse(settings));
});

router.put("/admin/settings", async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await getOrCreateSettings();
  const [updated] = await db
    .update(storeSettingsTable)
    .set(parsed.data)
    .where(eq(storeSettingsTable.id, existing.id))
    .returning();

  res.json(UpdateSettingsResponse.parse(updated));
});

export default router;
