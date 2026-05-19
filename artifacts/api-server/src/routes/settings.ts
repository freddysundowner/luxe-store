import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, storeSettingsTable } from "@workspace/db";
import {
  GetSettingsResponse,
  UpdateSettingsBody,
  UpdateSettingsResponse,
} from "@workspace/api-zod";

const router = Router();

const DEFAULT_PRICE_TIERS = [
  { name: "Under Ksh 500", min: 0, max: 500 },
  { name: "Ksh 500 – 2,000", min: 500, max: 2000 },
  { name: "Ksh 2,000 – 5,000", min: 2000, max: 5000 },
  { name: "Over Ksh 5,000", min: 5000, max: null },
];

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
  res.json(GetSettingsResponse.parse({
    ...settings,
    priceTiers: settings.priceTiers ?? DEFAULT_PRICE_TIERS,
  }));
});

router.put("/admin/settings", async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await getOrCreateSettings();
  const { priceTiers, salesNotificationEmail, ...restData } = parsed.data;
  const normalizedSalesEmail =
    typeof salesNotificationEmail === "string"
      ? salesNotificationEmail.trim() || null
      : salesNotificationEmail;
  const dbSet = {
    ...restData,
    ...(salesNotificationEmail !== undefined ? { salesNotificationEmail: normalizedSalesEmail } : {}),
    ...(priceTiers !== undefined
      ? { priceTiers: priceTiers.map((t) => ({ name: t.name, min: t.min, max: t.max ?? null })) }
      : {}),
  };
  const [updated] = await db
    .update(storeSettingsTable)
    .set(dbSet)
    .where(eq(storeSettingsTable.id, existing.id))
    .returning();

  res.json(UpdateSettingsResponse.parse({
    ...updated,
    priceTiers: updated.priceTiers ?? DEFAULT_PRICE_TIERS,
  }));
});

export default router;
